const UserOtp = require("../models/userOtp.js");
const sendMail = require("../utils/sendMail.js");
const JobSeeker = require("../models/jobSeeker.js");
const Job = require("../models/job.js");
const Employer = require("../models/employer.js");
const JobAssessment = require("../models/jobAssessment.js");
const JobApplication = require("../models/jobApplication.js");
const VideoProctoringAssessment = require("../models/videoProctoringAssessment.js");
const Payment = require("../models/payment.js");
const Razorpay = require('razorpay');
const crypto = require('crypto');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const assessmentGenerator = require("../services/assessmentGenerator.js");
const readinessReviewer = require("../services/readinessReviewer.js");
const assessmentProfileRequirements = require("../config/assessmentProfileRequirements.js");
const resumeEnrichmentService = require("../services/resumeEnrichmentService.js");
const JobSeekerResumeAnalysis = require("../models/jobSeekerResumeAnalysis.js");
const JobSeekerReferralStats = require("../models/jobSeekerReferralStats.js");
const { getIO } = require("../socket/socketServer.js");

// Lazy Razorpay initialization for assessment retest payments
let razorpayInstance = null;

const getRazorpayInstance = () => {
    if (!razorpayInstance) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
        }

        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }
    return razorpayInstance;
};



// Email Regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password regex: upper, lower, number, special, 8+ chars
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const RESUME_SHARE_TOKEN_TTL = process.env.RESUME_SHARE_TOKEN_TTL || "7d";
const RESUME_ANALYSIS_MAX_ATTEMPTS = 3;
const RESUME_ANALYSIS_RETRY_DELAY_MS = 10 * 60 * 1000; // 10 minutes
const resumeAnalysisTimers = new Map();

const emitResumeAnalysisUpdate = (jobSeekerId, payload) => {
    try {
        const io = getIO();
        io.to(`jobseeker:${jobSeekerId}`).emit("resume:analysis", payload);
    } catch (err) {
        console.error("Socket emit resume:analysis failed:", err?.message || err);
    }
};

const generateOtp = async (req, res) => {
    try {
        const { loginType, loginValue } = req.body;

        if (!loginType || !loginValue) {
            return res.status(400).json({
                success: false,
                message: "loginType and loginValue are required"
            });
        }


        // Field selection
        const field = loginType === "E-Mail" ? "email" : "mobileNumber";

        // Check if JobSeeker already exists
        const jobSeeker = await JobSeeker.findOne({
            [field]: loginValue.toLowerCase()
        });

        if (jobSeeker) {
            return res.status(200).json({
                success: false,
                alreadyExists: true,
                message: "Account already exists with this email. Use a different email to continue."
            });
        }

        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000);

        // Save or update OTP
        await UserOtp.findOneAndUpdate(
            { userData: loginValue },
            { userOtp: otp },
            { new: true, upsert: true }
        );

        // Send email OTP
        if (loginType === "E-Mail") {
            const htmlContent = `
                <div style="font-family: Roboto, sans-serif; max-width: 500px; margin: auto; border-radius: 10px; padding: 25px; border: 1px solid #e5e7eb;">
                    <h2 style="text-align:center; color:#2563eb; margin-bottom:20px;">Your Atract Login OTP</h2>

                    <p style="font-size:15px; color:#374151;">Hello,</p>
                    <p style="font-size:15px; color:#374151;">Use the OTP below to verify your login request:</p>

                    <div style="text-align:center; margin: 25px 0;">
                        <span style="display:inline-block; padding:12px 20px; font-size:28px; font-weight:bold; border-radius:8px; background:#f3f4f6; letter-spacing:10px;">
                            ${otp}
                        </span>
                    </div>

                    <p style="font-size:15px; color:#374151;">
                        If you did not initiate this request, please ignore this email.
                    </p>

                    <p style="font-size:14px; color:#6b7280; text-align:center; margin-top:25px;">
                        © ${new Date().getFullYear()} Atract — Smart AI Hiring Platform
                    </p>
                </div>
            `;

            await sendMail(loginValue, "Your OTP to Login - Atract", htmlContent);
        }

        return res.status(201).json({
            success: true,
            message: "OTP generated and sent successfully",
        });

    } catch (error) {
        console.error("OTP Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};



const checkOtp = async (req, res) => {
    try {
        const { loginType, loginValue, otp } = req.body;

        if (!loginType || !loginValue || !otp) {
            return res.status(400).json({
                success: false,
                message: "Missing loginType, loginValue or otp"
            });
        }

        // Find OTP record
        const otpRecord = await UserOtp.findOne({ userData: loginValue });

        if (!otpRecord) {
            return res.status(200).json({
                success: false,
                message: `OTP not found for this ${loginType}`
            });
        }

        const otpString = Array.isArray(otp) ? otp.join("") : otp.toString();
        const otpNumber = parseInt(otpString, 10);

        if (otpRecord.userOtp !== otpNumber) {
            return res.status(200).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        // OTP is valid → delete OTP entry
        await UserOtp.deleteMany({ userData: loginValue });

        // Field selection
        const field = loginType === "E-Mail" ? "email" : "mobileNumber";

        // Check if JobSeeker already exists
        const jobSeeker = await JobSeeker.findOne({
            [field]: loginValue.toLowerCase()
        });

        if (jobSeeker) {
            return res.status(200).json({
                success: false,
                alreadyExists: true,
                message: "Account already exists with this email. Use a different email to continue."
            });
        }

        // OTP success and user does not exist → allow registration to continue
        return res.status(200).json({
            success: true,
            message: "OTP verified successfully. Proceed to registration."
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};



const registerJobSeeker = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        console.log(fullName, email, password)


        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Full name, email and password are required",
            });
        }

        if (fullName.length < 3 || fullName.length > 40) {
            return res.status(400).json({
                success: false,
                message: "Full name must be between 3 and 40 characters",
            });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email",
            });
        }

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must contain uppercase, lowercase, number, special character & minimum 8 characters",
            });
        }

        // Check if email already taken
        const existingUser = await JobSeeker.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return res.status(200).json({
                success: false,
                alreadyExists: true,
                message:
                    "Account already exists with this email. Use a different email to continue.",
            });
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new User
        const newUser = await JobSeeker.create({
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,
        });

        const token = jwt.sign({ userId: newUser._id, userName: newUser.fullName }, process.env.JWT_SECRET);

        // Track referral if redirect param exists (check both redirect and returnUrl for compatibility)
        const redirectTo = req.query.redirect || req.body.redirect || req.query.returnUrl || req.body.returnUrl;
        if (redirectTo) {
            try {
                console.log(`[REFERRAL TRACKING] Creating tracking document for new user ${newUser._id}, redirectTo: ${redirectTo}`);
                // Create tracking document (new user, didn't have account)
                await JobSeekerReferralStats.create({
                    userId: newUser._id,
                    redirectTo: redirectTo,
                    alreadyHadAccount: false,
                    isResumeSaved: false,
                    isOtherDetailsFilled: false,
                });
                console.log(`[REFERRAL TRACKING] Successfully created tracking document for user ${newUser._id}`);
            } catch (trackingError) {
                console.error("Error tracking referral stats on registration:", trackingError);
                // Don't fail registration if tracking fails
            }
        } else {
            console.log(`[REFERRAL TRACKING] No redirect param found for user ${newUser._id}. Query:`, req.query, "Body:", req.body);
        }

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: newUser
        });

    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};



const loginJobSeeker = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email",
            });
        }

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must contain uppercase, lowercase, number, special character & minimum 8 characters",
            });
        }

        const user = await JobSeeker.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(200).json({
                success: false,
                message: "Account not found with this email",
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(200).json({
                success: false,
                message: "Incorrect password",
            });
        }

        const token = jwt.sign(
            { userId: user._id, userName: user.fullName },
            process.env.JWT_SECRET || "A123B456cdef1234567",
            // { expiresIn: "7d" }
        );

        // Send email alert if enabled
        if (user.emailAlertOnLogin) {
            try {
                const loginTime = new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });

                const htmlContent = `
                    <div style="font-family: Roboto, sans-serif; max-width: 500px; margin: auto; border-radius: 10px; padding: 25px; border: 1px solid #e5e7eb;">
                        <h2 style="text-align:center; color:#2563eb; margin-bottom:20px;">Login Alert - Atract</h2>

                        <p style="font-size:15px; color:#374151;">Hello ${user.fullName},</p>
                        <p style="font-size:15px; color:#374151;">Your account was successfully logged in.</p>

                        <div style="background:#f3f4f6; border-radius:8px; padding:16px; margin:20px 0;">
                            <p style="margin:0; font-size:14px; color:#6b7280;"><strong>Login Details:</strong></p>
                            <p style="margin:8px 0 0 0; font-size:14px; color:#374151;">Time: ${loginTime}</p>
                            <p style="margin:4px 0 0 0; font-size:14px; color:#374151;">Email: ${user.email}</p>
                        </div>

                        <p style="font-size:14px; color:#6b7280;">
                            If you did not perform this login, please secure your account immediately.
                        </p>

                        <p style="font-size:14px; color:#6b7280; text-align:center; margin-top:25px;">
                            © ${new Date().getFullYear()} Atract — Smart AI Hiring Platform
                        </p>
                    </div>
                `;

                await sendMail(user.email, "Login Alert - Atract", htmlContent);
            } catch (emailError) {
                console.error("Failed to send login alert email:", emailError);
                // Don't fail login if email fails
            }
        }

        // Track referral if redirect param exists (check both redirect and returnUrl for compatibility)
        const redirectTo = req.query.redirect || req.body.redirect || req.query.returnUrl || req.body.returnUrl;
        if (redirectTo) {
            try {
                console.log(`[REFERRAL TRACKING] Processing tracking for existing user ${user._id}, redirectTo: ${redirectTo}`);
                
                // Check if resume is saved
                const hasResume = user.resume && user.resume.trim().length > 0;
                
                // Check if other details are filled (exclude name and email as they're given at account creation)
                const hasOtherDetails = !!(
                    user.mobileNumber ||
                    user.skills?.length > 0 ||
                    user.experienceInYears ||
                    user.currentLocation ||
                    user.highestQualification ||
                    user.languages?.length > 0 ||
                    user.gender ||
                    user.dateOfBirth ||
                    user.passoutYear ||
                    user.noticePeriod ||
                    user.currentCTC ||
                    user.expectedCTC ||
                    user.linkedinUrl ||
                    user.githubUrl ||
                    user.address ||
                    user.profilePicture
                );
                
                // Check if tracking document already exists
                let referralStats = await JobSeekerReferralStats.findOne({ userId: user._id });
                
                if (!referralStats) {
                    // Create new tracking document (user already had account)
                    await JobSeekerReferralStats.create({
                        userId: user._id,
                        redirectTo: redirectTo,
                        alreadyHadAccount: true,
                        isResumeSaved: hasResume,
                        isOtherDetailsFilled: hasOtherDetails,
                    });
                    console.log(`[REFERRAL TRACKING] Created new tracking document for existing user ${user._id}, resume: ${hasResume}, otherDetails: ${hasOtherDetails}`);
                } else {
                    // Update existing document
                    let updated = false;
                    if (referralStats.redirectTo !== redirectTo) {
                        referralStats.redirectTo = redirectTo;
                        updated = true;
                    }
                    // Update resume and other details status if they've changed
                    if (referralStats.isResumeSaved !== hasResume) {
                        referralStats.isResumeSaved = hasResume;
                        updated = true;
                    }
                    if (referralStats.isOtherDetailsFilled !== hasOtherDetails) {
                        referralStats.isOtherDetailsFilled = hasOtherDetails;
                        updated = true;
                    }
                    if (updated) {
                        await referralStats.save();
                        console.log(`[REFERRAL TRACKING] Updated tracking document for user ${user._id}, resume: ${hasResume}, otherDetails: ${hasOtherDetails}`);
                    }
                }
            } catch (trackingError) {
                console.error("Error tracking referral stats on login:", trackingError);
                // Don't fail login if tracking fails
            }
        } else {
            console.log(`[REFERRAL TRACKING] No redirect param found for user ${user._id}. Query:`, req.query, "Body:", req.body);
        }

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            // user: {
            //     id: user._id,
            //     fullName: user.fullName,
            //     email: user.email,
            // }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// Get job seeker profile
const getProfile = async (req, res) => {
    try {
        const jobSeeker = await JobSeeker.findById(req.userId).select('-password');

        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        const latestAnalysis = await JobSeekerResumeAnalysis.findOne({ jobSeekerId: req.userId }).sort({ createdAt: -1 });

        const responseData = jobSeeker.toObject();
        if (latestAnalysis) {
            responseData.resumeParsedDetails = {
                skills: latestAnalysis.skills || [], // Already in order (top most first)
                mobileNumber: latestAnalysis.mobileNumber || null,
                gender: latestAnalysis.gender || null,
                dateOfBirth: latestAnalysis.dateOfBirth ? latestAnalysis.dateOfBirth.toISOString() : null,
                address: latestAnalysis.address || null,
                currentLocation: latestAnalysis.currentLocation || null,
                highestQualification: latestAnalysis.highestQualification || null,
                passoutYear: latestAnalysis.passoutYear ?? null,
                languages: latestAnalysis.languages || [],
                linkedinUrl: latestAnalysis.linkedinUrl || null,
                githubUrl: latestAnalysis.githubUrl || null,
                experienceYears: latestAnalysis.experienceYears ?? null,
                jobTitles: latestAnalysis.jobTitles || [],
                education: latestAnalysis.education || null,
                certifications: latestAnalysis.certifications || [],
                projects: latestAnalysis.projects || [],
                preferredLocation: latestAnalysis.preferredLocation || null,
                summary: latestAnalysis.summary || null,
                aboutMe: latestAnalysis.aboutMe || null,
                atsInsights: latestAnalysis.atsInsights || [],
                missingSkills: latestAnalysis.missingSkills || [],
                weaknesses: latestAnalysis.weaknesses || [],
                rawText: latestAnalysis.rawText || null,
                fileUrl: latestAnalysis.fileUrl || null,
                embedding: latestAnalysis.embedding || [],
                atsScore: latestAnalysis.atsScore ?? null
            };
            responseData.resumeAnalysis = {
                inProgress: latestAnalysis.inProgress,
                status: latestAnalysis.status,
                attempts: latestAnalysis.attempts,
                lastStartedAt: latestAnalysis.lastStartedAt,
                lastCompletedAt: latestAnalysis.lastCompletedAt,
                nextRetryAt: latestAnalysis.nextRetryAt,
                lastError: latestAnalysis.lastError,
                provider: latestAnalysis.provider,
                model: latestAnalysis.model,
                embedModel: latestAnalysis.embedModel,
                resumePathSnapshot: latestAnalysis.resumePath
            };
        }

        return res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error("Get Profile Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getAssessmentProfileRequirements = async (req, res) => {
    try {
        const jobSeeker = await JobSeeker.findById(req.userId)
            .select('fullName email mobileNumber resume highestQualification passoutYear experienceInYears noticePeriod currentCTC');

        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        const snapshot = buildAssessmentProfileRequirementSnapshot(jobSeeker);

        return res.status(200).json({
            success: true,
            data: snapshot
        });
    } catch (error) {
        console.error("Get assessment requirements error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch profile requirements"
        });
    }
};

// Helper function to delete old resume file
const deleteOldResume = async (resumePath) => {
    if (!resumePath) return;

    try {
        // Resume path format: /uploads/resumes/{userId}/resume-{timestamp}.{ext}
        // Convert URL path to file system path
        const filePath = resumePath.startsWith('/uploads/') 
            ? path.join(__dirname, '../..', resumePath)
            : path.join(__dirname, '../../uploads/resumes', resumePath);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old resume: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error deleting old resume: ${error.message}`);
        // Don't throw error - continue with update even if deletion fails
    }
};

const resolveResumeAbsolutePath = (resumePath) => {
    if (!resumePath) return null;
    return resumePath.startsWith('/uploads/')
        ? path.join(__dirname, '../..', resumePath)
        : path.join(__dirname, '../../uploads/resumes', resumePath);
};

const baseParsedDetails = {
    skills: [],
    experienceYears: null,
    jobTitles: [],
    education: null,
    certifications: [],
    projects: [],
    preferredLocation: null,
    summary: null,
    aboutMe: null,
    atsInsights: [],
    missingSkills: [],
    weaknesses: [],
    rawText: null,
    fileUrl: null,
    embedding: []
};

const stopScheduledAnalysis = (jobSeekerId) => {
    const key = jobSeekerId.toString();
    const existing = resumeAnalysisTimers.get(key);
    if (existing) {
        clearTimeout(existing);
        resumeAnalysisTimers.delete(key);
    }
};

const scheduleResumeAnalysisJob = ({ jobSeekerId, resumePath, delayMs = 0 }) => {
    if (!resumeEnrichmentService.isEnabled()) {
        return;
    }
    stopScheduledAnalysis(jobSeekerId);
    const timer = setTimeout(() => {
        runResumeAnalysisJob(jobSeekerId, resumePath).catch((err) => {
            console.error("Background resume analysis error:", err?.message || err);
        });
    }, Math.max(0, delayMs));
    resumeAnalysisTimers.set(jobSeekerId.toString(), timer);
};

const runResumeAnalysisJob = async (jobSeekerId, resumePath) => {
    const config = resumeEnrichmentService.getConfig();
    const jobSeeker = await JobSeeker.findById(jobSeekerId);
    if (!jobSeeker) {
        stopScheduledAnalysis(jobSeekerId);
        return;
    }

    // If resume changed after scheduling, stop
    if (!jobSeeker.resume || jobSeeker.resume !== resumePath) {
        stopScheduledAnalysis(jobSeekerId);
        return;
    }

    let analysisRecord = await JobSeekerResumeAnalysis.findOne({ jobSeekerId, resumePath }).sort({ createdAt: -1 });
    if (!analysisRecord) {
        analysisRecord = await JobSeekerResumeAnalysis.create({
            jobSeekerId,
            resumePath,
            status: "processing",
            inProgress: true
        });
    }

    if (!resumeEnrichmentService.isEnabled()) {
        await JobSeekerResumeAnalysis.findByIdAndUpdate(analysisRecord._id, {
            $set: {
                status: "disabled",
                inProgress: false,
                nextRetryAt: null,
                lastError: null
            }
        });
        stopScheduledAnalysis(jobSeekerId);
        return;
    }

    const attempt = (analysisRecord.attempts || 0) + 1;
    const startedAt = new Date();

    try {
        const absolutePath = resolveResumeAbsolutePath(resumePath);
        if (!absolutePath || !fs.existsSync(absolutePath)) {
            throw new Error("Resume file not found for analysis");
        }

        const analysis = await resumeEnrichmentService.analyzeResumeFile(absolutePath, resumePath);
        if (!analysis.enabled) {
            await JobSeekerResumeAnalysis.findByIdAndUpdate(analysisRecord._id, {
                $set: {
                    status: "disabled",
                    inProgress: false,
                    attempts: attempt,
                    lastCompletedAt: new Date(),
                    provider: null,
                    model: null,
                    embedModel: null,
                    nextRetryAt: null,
                    lastError: null
                }
            });
            stopScheduledAnalysis(jobSeekerId);
            return;
        }

        const parsed = {
            ...baseParsedDetails,
            ...analysis.parsed,
            rawText: analysis.parsed.rawText || analysis.rawText || null,
            fileUrl: resumePath,
            embedding: Array.isArray(analysis.parsed.embedding) ? analysis.parsed.embedding : []
        };

        await JobSeekerResumeAnalysis.findByIdAndUpdate(analysisRecord._id, {
            $set: {
                status: "completed",
                inProgress: false,
                attempts: attempt,
                lastStartedAt: startedAt,
                lastCompletedAt: new Date(),
                nextRetryAt: null,
                lastError: null,
                provider: analysis.provider || config.provider || null,
                model: analysis.model || config.model || null,
                embedModel: analysis.embedModel || config.embedModel || null,
                resumePath,
                rawText: parsed.rawText,
                atsScore: parsed.atsScore ?? null,
                atsInsights: parsed.atsInsights || [],
                missingSkills: parsed.missingSkills || [],
                skills: parsed.skills || [], // Skills are already in order (top most first)
                mobileNumber: parsed.mobileNumber || null,
                gender: parsed.gender || null,
                dateOfBirth: parsed.dateOfBirth || null,
                address: parsed.address || null,
                currentLocation: parsed.currentLocation || null,
                highestQualification: parsed.highestQualification || null,
                passoutYear: parsed.passoutYear ?? null,
                languages: parsed.languages || [],
                linkedinUrl: parsed.linkedinUrl || null,
                githubUrl: parsed.githubUrl || null,
                experienceYears: parsed.experienceYears ?? null,
                jobTitles: parsed.jobTitles || [],
                education: parsed.education || null,
                certifications: parsed.certifications || [],
                projects: parsed.projects || [],
                preferredLocation: parsed.preferredLocation || null,
                summary: parsed.summary || null,
                aboutMe: parsed.aboutMe || null,
                weaknesses: parsed.weaknesses || [],
                fileUrl: parsed.fileUrl || resumePath,
                embedding: parsed.embedding || []
            }
        });

        // Reset match attempts for this job seeker since resume embedding has changed
        setImmediate(() => {
            const { resetMatchAttemptsForJobSeeker } = require('../services/jobMatchingService');
            resetMatchAttemptsForJobSeeker(jobSeekerId).catch(err => {
                console.error('Error resetting match attempts for job seeker:', err);
            });
        });

        emitResumeAnalysisUpdate(jobSeekerId, {
            status: "completed",
            inProgress: false,
            attempts: attempt,
            lastStartedAt: startedAt,
            lastCompletedAt: new Date(),
            resumePath: resumePath,
            atsScore: parsed.atsScore ?? null,
            atsInsights: parsed.atsInsights || [],
            missingSkills: parsed.missingSkills || [],
            skills: parsed.skills || [], // Already in order (top most first)
            mobileNumber: parsed.mobileNumber || null,
            gender: parsed.gender || null,
            dateOfBirth: parsed.dateOfBirth ? parsed.dateOfBirth.toISOString() : null,
            address: parsed.address || null,
            currentLocation: parsed.currentLocation || null,
            highestQualification: parsed.highestQualification || null,
            passoutYear: parsed.passoutYear ?? null,
            languages: parsed.languages || [],
            linkedinUrl: parsed.linkedinUrl || null,
            githubUrl: parsed.githubUrl || null,
            experienceYears: parsed.experienceYears ?? null,
            jobTitles: parsed.jobTitles || [],
            education: parsed.education || null,
            certifications: parsed.certifications || [],
            projects: parsed.projects || [],
            preferredLocation: parsed.preferredLocation || null,
            summary: parsed.summary || null,
            aboutMe: parsed.aboutMe || null,
            weaknesses: parsed.weaknesses || []
        });
        stopScheduledAnalysis(jobSeekerId);
    } catch (error) {
        console.error("Resume analysis attempt failed:", error?.message || error);
        const shouldRetry = attempt < RESUME_ANALYSIS_MAX_ATTEMPTS;
        const nextRetryAt = shouldRetry ? new Date(Date.now() + RESUME_ANALYSIS_RETRY_DELAY_MS) : null;

        await JobSeekerResumeAnalysis.findByIdAndUpdate(analysisRecord._id, {
            $set: {
                status: shouldRetry ? "retry_scheduled" : "failed",
                inProgress: shouldRetry,
                attempts: attempt,
                lastError: error?.message || "Analysis failed",
                nextRetryAt,
                lastStartedAt: startedAt
            }
        });

        if (shouldRetry) {
            emitResumeAnalysisUpdate(jobSeekerId, {
                status: "retry_scheduled",
                inProgress: true,
                attempts: attempt,
                nextRetryAt
            });
            scheduleResumeAnalysisJob({ jobSeekerId, resumePath, delayMs: RESUME_ANALYSIS_RETRY_DELAY_MS });
        } else {
            emitResumeAnalysisUpdate(jobSeekerId, {
                status: "failed",
                inProgress: false,
                attempts: attempt,
                lastError: error?.message || "Analysis failed"
            });
            stopScheduledAnalysis(jobSeekerId);
        }
    }
};

// Update job seeker profile
const updateProfile = async (req, res) => {
    try {
        // Parse skills if it's a string (from FormData)
        let skillsData = req.body.skills;
        if (typeof skillsData === 'string') {
            try {
                skillsData = JSON.parse(skillsData);
            } catch (e) {
                skillsData = [];
            }
        }

        // Parse languages if it's a string (from FormData)
        let languagesData = req.body.languages;
        if (typeof languagesData === 'string') {
            try {
                languagesData = JSON.parse(languagesData);
            } catch (e) {
                languagesData = [];
            }
        }

        const {
            fullName,
            mobileNumber,
            gender,
            dateOfBirth,
            highestQualification,
            passoutYear,
            experienceInYears,
            noticePeriod,
            currentCTC,
            expectedCTC,
            linkedinUrl,
            githubUrl,
            address,
            currentLocation,
            profilePicture,
            removeProfilePicture
        } = req.body;

        // Get current job seeker to check for old resume
        const currentJobSeeker = await JobSeeker.findById(req.userId);
        if (!currentJobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        // Build update object
        const updateData = {};

        if (fullName !== undefined) {
            if (fullName.length < 3 || fullName.length > 40) {
                return res.status(400).json({
                    success: false,
                    message: "Full name must be between 3 and 40 characters"
                });
            }
            updateData.fullName = fullName.trim();
        }

        if (mobileNumber !== undefined) {
            const mobileRegex = /^[6-9]\d{9}$/;
            if (mobileNumber && !mobileRegex.test(mobileNumber)) {
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid 10-digit mobile number"
                });
            }
            updateData.mobileNumber = mobileNumber ? mobileNumber.trim() : "";
        }

        if (gender !== undefined) {
            if (gender && !["male", "female", "other"].includes(gender)) {
                return res.status(400).json({
                    success: false,
                    message: "Gender must be male, female, or other"
                });
            }
            // Convert empty string to null to avoid enum validation error
            updateData.gender = (gender && gender.trim()) ? gender.trim() : null;
        }

        if (dateOfBirth !== undefined) {
            if (dateOfBirth) {
                const dob = new Date(dateOfBirth);
                const today = new Date();
                if (dob > today) {
                    return res.status(400).json({
                        success: false,
                        message: "Date of birth cannot be in the future"
                    });
                }
                updateData.dateOfBirth = dob;
            } else {
                updateData.dateOfBirth = null;
            }
        }

        if (highestQualification !== undefined) {
            updateData.highestQualification = highestQualification ? highestQualification.trim() : "";
        }

        if (passoutYear !== undefined) {
            if (passoutYear) {
                const currentYear = new Date().getFullYear();
                if (passoutYear < 1950 || passoutYear > currentYear + 10) {
                    return res.status(400).json({
                        success: false,
                        message: `Passout year must be between 1950 and ${currentYear + 10}`
                    });
                }
            }
            updateData.passoutYear = passoutYear || null;
        }

        if (experienceInYears !== undefined) {
            if (experienceInYears !== null && (experienceInYears < 0 || experienceInYears > 50)) {
                return res.status(400).json({
                    success: false,
                    message: "Experience must be between 0 and 50 years"
                });
            }
            updateData.experienceInYears = experienceInYears !== null ? experienceInYears : null;
        }

        if (noticePeriod !== undefined) {
            if (noticePeriod !== null && noticePeriod !== "") {
                const noticePeriodNum = parseFloat(noticePeriod);
                if (isNaN(noticePeriodNum) || noticePeriodNum < 0 || noticePeriodNum > 365) {
                    return res.status(400).json({
                        success: false,
                        message: "Notice period must be between 0 and 365 days"
                    });
                }
                updateData.noticePeriod = noticePeriodNum;
            } else {
                updateData.noticePeriod = null;
            }
        }

        if (currentCTC !== undefined) {
            if (currentCTC !== null && currentCTC !== "") {
                const currentCTCNum = parseFloat(currentCTC);
                if (isNaN(currentCTCNum) || currentCTCNum < 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Current CTC must be a positive number"
                    });
                }
                updateData.currentCTC = currentCTCNum;
            } else {
                updateData.currentCTC = null;
            }
        }

        if (expectedCTC !== undefined) {
            if (expectedCTC !== null && expectedCTC !== "") {
                const expectedCTCNum = parseFloat(expectedCTC);
                if (isNaN(expectedCTCNum) || expectedCTCNum < 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Expected CTC must be a positive number"
                    });
                }
                updateData.expectedCTC = expectedCTCNum;
            } else {
                updateData.expectedCTC = null;
            }
        }

        if (linkedinUrl !== undefined) {
            if (linkedinUrl && linkedinUrl.trim()) {
                const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/.+/i;
                if (!linkedinRegex.test(linkedinUrl)) {
                    return res.status(400).json({
                        success: false,
                        message: "Enter a valid LinkedIn URL"
                    });
                }
            }
            updateData.linkedinUrl = linkedinUrl ? linkedinUrl.trim() : "";
        }

        if (githubUrl !== undefined) {
            if (githubUrl && githubUrl.trim()) {
                const githubRegex = /^(https?:\/\/)?(www\.)?github\.com\/.+/i;
                if (!githubRegex.test(githubUrl)) {
                    return res.status(400).json({
                        success: false,
                        message: "Enter a valid GitHub URL"
                    });
                }
            }
            updateData.githubUrl = githubUrl ? githubUrl.trim() : "";
        }

        if (address !== undefined) {
            updateData.address = address ? address.trim() : "";
        }

        if (currentLocation !== undefined) {
            const cleanedLocation = currentLocation ? currentLocation.toString().trim() : "";
            if (cleanedLocation && (cleanedLocation.length < 2 || cleanedLocation.length > 80)) {
                return res.status(400).json({
                    success: false,
                    message: "Current location must be between 2 and 80 characters"
                });
            }
            updateData.currentLocation = cleanedLocation;
        }

        if (skillsData !== undefined) {
            if (Array.isArray(skillsData)) {
                updateData.skills = skillsData.filter(skill => skill && skill.trim()).map(skill => skill.trim());
            } else {
                updateData.skills = [];
            }
        }

        if (languagesData !== undefined) {
            if (Array.isArray(languagesData)) {
                // Validate each language object
                const validLanguages = languagesData.filter(lang => {
                    return lang && 
                           lang.language && 
                           lang.language.trim() && 
                           lang.proficiency && 
                           ["Basic", "Conversational", "Fluent", "Native"].includes(lang.proficiency);
                }).map(lang => ({
                    language: lang.language.trim(),
                    proficiency: lang.proficiency,
                    read: lang.read === true || lang.read === "true",
                    write: lang.write === true || lang.write === "true",
                    speak: lang.speak === true || lang.speak === "true"
                }));
                updateData.languages = validLanguages;
            } else {
                updateData.languages = [];
            }
        }

        if (removeProfilePicture === true || removeProfilePicture === "true") {
            updateData.profilePicture = null;
        } else if (profilePicture !== undefined) {
            updateData.profilePicture = profilePicture || null;
        }

        let resumeUpdated = false;
        let newResumePath = null;
        let config;
        let analysisEnabled;

        // Handle resume file upload
        if (req.file) {
            // Delete old resume if exists
            if (currentJobSeeker.resume) {
                await deleteOldResume(currentJobSeeker.resume);
            }

            // Store the relative path to the resume file
            // Format: /uploads/resumes/{userId}/{filename}
            const resumePath = `/uploads/resumes/${req.userId}/${req.file.filename}`;
            updateData.resume = resumePath;
            resumeUpdated = true;
            newResumePath = resumePath;

            // Capture provider/model config for downstream record creation
            config = resumeEnrichmentService.getConfig();
            analysisEnabled = resumeEnrichmentService.isEnabled();
        }

        // Update the job seeker
        const updatedJobSeeker = await JobSeeker.findByIdAndUpdate(
            req.userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedJobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        // Update referral tracking stats if document exists
        try {
            const referralStats = await JobSeekerReferralStats.findOne({ userId: req.userId });
            if (referralStats) {
                // Check if resume is saved
                const hasResume = updatedJobSeeker.resume && updatedJobSeeker.resume.trim().length > 0;
                
                // Check if other details are filled (exclude name and email as they're given at account creation)
                const hasOtherDetails = !!(
                    updatedJobSeeker.mobileNumber ||
                    updatedJobSeeker.skills?.length > 0 ||
                    updatedJobSeeker.experienceInYears ||
                    updatedJobSeeker.currentLocation ||
                    updatedJobSeeker.highestQualification ||
                    updatedJobSeeker.languages?.length > 0 ||
                    updatedJobSeeker.gender ||
                    updatedJobSeeker.dateOfBirth ||
                    updatedJobSeeker.passoutYear ||
                    updatedJobSeeker.noticePeriod ||
                    updatedJobSeeker.currentCTC ||
                    updatedJobSeeker.expectedCTC ||
                    updatedJobSeeker.linkedinUrl ||
                    updatedJobSeeker.githubUrl ||
                    updatedJobSeeker.address ||
                    updatedJobSeeker.profilePicture
                );

                // Update tracking fields
                referralStats.isResumeSaved = hasResume;
                referralStats.isOtherDetailsFilled = hasOtherDetails;
                await referralStats.save();
            }
        } catch (trackingError) {
            console.error("Error updating referral stats:", trackingError);
            // Don't fail profile update if tracking fails
        }

        // Kick off resume analysis in background if a new resume was uploaded
        if (resumeUpdated) {
            stopScheduledAnalysis(req.userId);
            const configLocal = config || resumeEnrichmentService.getConfig();
            const analysisEnabledLocal = analysisEnabled ?? resumeEnrichmentService.isEnabled();
            // create fresh analysis record and remove older for this user
            await JobSeekerResumeAnalysis.deleteMany({ jobSeekerId: req.userId, resumePath: { $ne: newResumePath } });
            await JobSeekerResumeAnalysis.create({
                jobSeekerId: req.userId,
                resumePath: newResumePath,
                status: analysisEnabledLocal ? "processing" : "disabled",
                inProgress: analysisEnabledLocal,
                attempts: 0,
                provider: analysisEnabledLocal ? configLocal.provider : null,
                model: analysisEnabledLocal ? configLocal.model : null,
                embedModel: analysisEnabledLocal ? configLocal.embedModel : null
            });

            if (analysisEnabledLocal) {
                scheduleResumeAnalysisJob({ jobSeekerId: req.userId, resumePath: newResumePath });
                emitResumeAnalysisUpdate(req.userId, {
                    status: "processing",
                    inProgress: true,
                    resumePath: newResumePath,
                    attempts: 0
                });
            }

            // Send email notifications for resume upload/update
            try {
                await sendResumeUploadNotifications({
                    jobSeeker: updatedJobSeeker,
                    resumePath: newResumePath,
                    isUpdate: !!currentJobSeeker.resume
                });
            } catch (emailError) {
                console.error("Error sending resume upload notifications:", emailError);
                // Don't fail profile update if email fails
            }
        }

        // Hydrate response with latest analysis snapshot for immediate UI update
        let latestAnalysis = null;
        if (resumeUpdated) {
            latestAnalysis = await JobSeekerResumeAnalysis.findOne({ jobSeekerId: req.userId }).sort({ createdAt: -1 });
        } else {
            latestAnalysis = await JobSeekerResumeAnalysis.findOne({ jobSeekerId: req.userId }).sort({ createdAt: -1 });
        }
        const responseData = updatedJobSeeker.toObject();
        if (latestAnalysis) {
            responseData.resumeParsedDetails = {
                skills: latestAnalysis.skills || [],
                experienceYears: latestAnalysis.experienceYears ?? null,
                jobTitles: latestAnalysis.jobTitles || [],
                education: latestAnalysis.education || null,
                certifications: latestAnalysis.certifications || [],
                projects: latestAnalysis.projects || [],
                preferredLocation: latestAnalysis.preferredLocation || null,
                summary: latestAnalysis.summary || null,
                aboutMe: latestAnalysis.aboutMe || null,
                atsInsights: latestAnalysis.atsInsights || [],
                missingSkills: latestAnalysis.missingSkills || [],
                weaknesses: latestAnalysis.weaknesses || [],
                rawText: latestAnalysis.rawText || null,
                fileUrl: latestAnalysis.fileUrl || null,
                embedding: latestAnalysis.embedding || [],
                atsScore: latestAnalysis.atsScore ?? null
            };
            responseData.resumeAnalysis = {
                inProgress: latestAnalysis.inProgress,
                status: latestAnalysis.status,
                attempts: latestAnalysis.attempts,
                lastStartedAt: latestAnalysis.lastStartedAt,
                lastCompletedAt: latestAnalysis.lastCompletedAt,
                nextRetryAt: latestAnalysis.nextRetryAt,
                lastError: latestAnalysis.lastError,
                provider: latestAnalysis.provider,
                model: latestAnalysis.model,
                embedModel: latestAnalysis.embedModel,
                resumePathSnapshot: latestAnalysis.resumePath
            };
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: responseData
        });

    } catch (error) {
        console.error("Update Profile Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Helper function to get resume file
const getResumeFile = async (userId) => {
    const jobSeeker = await JobSeeker.findById(userId);

    if (!jobSeeker || !jobSeeker.resume) {
        return null;
    }

    // Get the file path
    const filePath = jobSeeker.resume.startsWith('/uploads/') 
        ? path.join(__dirname, '../..', jobSeeker.resume)
        : path.join(__dirname, '../../uploads/resumes', jobSeeker.resume);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return null;
    }

    return filePath;
};

// View resume (opens in browser)
const viewResume = async (req, res) => {
    try {
        const filePath = await getResumeFile(req.userId);

        if (!filePath) {
            return res.status(404).json({
                success: false,
                message: "Resume not found"
            });
        }

        const filename = path.basename(filePath);
        
        // Determine content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/pdf'; // default
        if (ext === '.doc') {
            contentType = 'application/msword';
        } else if (ext === '.docx') {
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (ext === '.pdf') {
            contentType = 'application/pdf';
        }
        
        // Set headers for inline viewing (opens in browser)
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Content-Type', contentType);

        // Send the file
        res.sendFile(path.resolve(filePath));

    } catch (error) {
        console.error("View Resume Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// View resume via signed share link (used by employers)
const viewSharedResume = async (req, res) => {
    const { token } = req.params;

    if (!token) {
        return res.status(400).json({
            success: false,
            message: "Resume link is invalid"
        });
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        const status = error?.name === "TokenExpiredError" ? 410 : 400;
        return res.status(status).json({
            success: false,
            message:
                error?.name === "TokenExpiredError"
                    ? "This resume link has expired. Please ask the candidate to resubmit their application."
                    : "Resume link is invalid"
        });
    }

    if (!payload || payload.scope !== "resume_share" || !payload.jobSeekerId) {
        return res.status(400).json({
            success: false,
            message: "Resume link is invalid"
        });
    }

    try {
        const jobSeeker = await JobSeeker.findById(payload.jobSeekerId).select("resume");
        if (!jobSeeker || !jobSeeker.resume) {
            return res.status(404).json({
                success: false,
                message: "Resume not found"
            });
        }

        if (jobSeeker.resume !== payload.resumePath) {
            return res.status(410).json({
                success: false,
                message: "This resume link is no longer valid because the candidate uploaded a newer resume."
            });
        }

        const filePath = await getResumeFile(payload.jobSeekerId);
        if (!filePath) {
            return res.status(404).json({
                success: false,
                message: "Resume not found"
            });
        }

        const filename = path.basename(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let contentType = "application/pdf";
        if (ext === ".doc") {
            contentType = "application/msword";
        } else if (ext === ".docx") {
            contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }

        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        res.setHeader("Content-Type", contentType);
        res.sendFile(path.resolve(filePath));
    } catch (error) {
        console.error("Shared Resume View Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Download resume (secure endpoint)
const downloadResume = async (req, res) => {
    try {
        const filePath = await getResumeFile(req.userId);

        if (!filePath) {
            return res.status(404).json({
                success: false,
                message: "Resume not found"
            });
        }

        const filename = path.basename(filePath);
        
        // Determine content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/pdf'; // default
        if (ext === '.doc') {
            contentType = 'application/msword';
        } else if (ext === '.docx') {
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (ext === '.pdf') {
            contentType = 'application/pdf';
        }
        
        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', contentType);

        // Send the file
        res.sendFile(path.resolve(filePath));

    } catch (error) {
        console.error("Download Resume Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Delete resume
const deleteResume = async (req, res) => {
    try {
        const jobSeeker = await JobSeeker.findById(req.userId);

        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        if (!jobSeeker.resume) {
            return res.status(404).json({
                success: false,
                message: "Resume not found"
            });
        }

        // Delete the file
        await deleteOldResume(jobSeeker.resume);

        // Clean analysis records
        await JobSeekerResumeAnalysis.deleteMany({ jobSeekerId: req.userId });
        stopScheduledAnalysis(req.userId);

        // Update job seeker to remove resume
        const updatedJobSeeker = await JobSeeker.findByIdAndUpdate(
            req.userId,
            { $set: { 
                resume: null
            } },
            { new: true }
        ).select('-password');

        return res.status(200).json({
            success: true,
            message: "Resume deleted successfully",
            data: updatedJobSeeker
        });

    } catch (error) {
        console.error("Delete Resume Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Toggle save/unsave job
const toggleSaveJob = async (req, res) => {
    try {
        const { jobId } = req.body;

        if (!jobId) {
            return res.status(400).json({
                success: false,
                message: "Job ID is required"
            });
        }

        // Validate jobId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }

        // Check if job exists
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        const jobSeeker = await JobSeeker.findById(req.userId);
        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        const savedJobIds = jobSeeker.savedJobIds || [];
        const jobObjectId = new mongoose.Types.ObjectId(jobId);
        const isSaved = savedJobIds.some(id => id.toString() === jobId);

        let updatedSavedJobIds;
        if (isSaved) {
            // Unsave: remove jobId from array
            updatedSavedJobIds = savedJobIds.filter(id => id.toString() !== jobId);
        } else {
            // Save: add jobId to array
            updatedSavedJobIds = [...savedJobIds, jobObjectId];
        }

        jobSeeker.savedJobIds = updatedSavedJobIds;
        await jobSeeker.save();

        // Populate job with employerId to get company details
        const populatedJob = await Job.findById(jobId)
            .populate('employerId', 'companyName companyLogo')
            .lean();

        return res.status(200).json({
            success: true,
            message: isSaved ? "Job unsaved successfully" : "Job saved successfully",
            isSaved: !isSaved,
            savedCount: updatedSavedJobIds.length,
            job: populatedJob // Return full job object with company image
        });

    } catch (error) {
        console.error("Toggle Save Job Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get saved jobs with pagination, search, filters, and sort
const getSavedJobs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = "",
            status = "",
            jobType = "",
            workMode = "",
            sortBy = "createdAt",
            sortOrder = "desc"
        } = req.query;

        const jobSeeker = await JobSeeker.findById(req.userId).select('savedJobIds');
        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        const savedJobIds = jobSeeker.savedJobIds || [];
        
        if (savedJobIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 0,
                    totalJobs: 0,
                    limit: parseInt(limit),
                    hasNextPage: false,
                    hasPrevPage: false
                }
            });
        }

        // Build query
        const query = { _id: { $in: savedJobIds } };

        // Search filter (searches in jobTitle, companyName, location)
        if (search && search.trim()) {
            query.$or = [
                { jobTitle: { $regex: search.trim(), $options: "i" } },
                { companyName: { $regex: search.trim(), $options: "i" } },
                { location: { $regex: search.trim(), $options: "i" } }
            ];
        }

        // Status filter
        if (status && status.trim()) {
            query.status = status.trim();
        }

        // Job Type filter
        if (jobType && jobType.trim()) {
            query.jobType = jobType.trim();
        }

        // Work Mode filter
        if (workMode && workMode.trim()) {
            query.workMode = workMode.trim();
        }

        // Build sort object
        const sortObj = {};
        const validSortFields = ['createdAt', 'applicationOpeningDate', 'applicationClosingDate', 'jobTitle', 'status'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        sortObj[sortField] = sortOrder === 'asc' ? 1 : -1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        // Get total count
        const totalJobs = await Job.countDocuments(query);

        // Get jobs with pagination
        const jobs = await Job.find(query)
            .populate('employerId', 'companyName companyLogo')
            .sort(sortObj)
            .skip(skip)
            .limit(limitNum)
            .lean();

        const totalPages = Math.ceil(totalJobs / limitNum);

        return res.status(200).json({
            success: true,
            data: jobs,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalJobs,
                limit: limitNum,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error("Get Saved Jobs Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Check if job is saved
const checkJobSaved = async (req, res) => {
    try {
        const { jobId } = req.params;

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }

        const jobSeeker = await JobSeeker.findById(req.userId).select('savedJobIds');
        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        const savedJobIds = jobSeeker.savedJobIds || [];
        const isSaved = savedJobIds.some(id => id.toString() === jobId);

        return res.status(200).json({
            success: true,
            isSaved
        });
    } catch (error) {
        console.error("Check Job Saved Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getJobApplicationsList = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = "",
            status = "",
            submissionType = "",
            jobType = "",
            workMode = "",
            sort = "recent"
        } = req.query;

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(50, Math.max(parseInt(limit, 10) || 20, 1));
        const skip = (pageNum - 1) * limitNum;
        const jobSeekerId = new mongoose.Types.ObjectId(req.userId);

        const applicantMatch = {
            "applicants.jobSeeker": jobSeekerId
        };

        if (status?.trim()) {
            applicantMatch["applicants.status"] = status.trim();
        }

        if (submissionType?.trim()) {
            applicantMatch["applicants.submissionType"] = submissionType.trim();
        }

        const jobMatch = {};

        if (jobType?.trim()) {
            jobMatch["jobData.jobType"] = jobType.trim();
        }

        if (workMode?.trim()) {
            jobMatch["jobData.workMode"] = workMode.trim();
        }

        const trimmedSearch = search?.trim() || "";
        if (trimmedSearch) {
            const safeSearch = escapeRegex(trimmedSearch);
            const regex = new RegExp(safeSearch, "i");
            jobMatch.$or = [
                { "jobData.jobTitle": regex },
                { "jobData.companyName": regex },
                { "jobData.location": regex }
            ];
        }

        const pipeline = [
            { $match: { "applicants.jobSeeker": jobSeekerId } },
            { $unwind: "$applicants" },
            { $match: applicantMatch },
            {
                $lookup: {
                    from: "jobs",
                    localField: "job",
                    foreignField: "_id",
                    as: "jobData"
                }
            },
            { $unwind: "$jobData" },
            {
                $lookup: {
                    from: "employers",
                    localField: "jobData.employerId",
                    foreignField: "_id",
                    as: "employerData"
                }
            },
            { $unwind: { path: "$employerData", preserveNullAndEmptyArrays: true } }
        ];

        if (Object.keys(jobMatch).length > 0) {
            pipeline.push({ $match: jobMatch });
        }

        pipeline.push({
            $addFields: {
                latestUpdateAt: {
                    $ifNull: [
                        { $max: "$applicants.statusTimeline.createdAt" },
                        "$applicants.appliedAt"
                    ]
                }
            }
        });

        pipeline.push({ $sort: buildApplicationSortStage(sort) });

        pipeline.push({
            $facet: {
                results: [
                    { $skip: skip },
                    { $limit: limitNum }
                ],
                totalStats: [
                    {
                        $group: {
                            _id: null,
                            totalApplications: { $sum: 1 },
                            totalUpdates: {
                                $sum: {
                                    $size: { $ifNull: ["$applicants.statusTimeline", []] }
                                }
                            }
                        }
                    }
                ],
                statusStats: [
                    {
                        $group: {
                            _id: "$applicants.status",
                            count: { $sum: 1 }
                        }
                    }
                ]
            }
        });

        const aggregated = await JobApplication.aggregate(pipeline);
        const facets = aggregated[0] || {};
        const rawResults = facets.results || [];
        const totalStats = facets.totalStats?.[0] || { totalApplications: 0, totalUpdates: 0 };
        const statusStats = facets.statusStats || [];

        const totalApplications = totalStats.totalApplications || 0;
        const totalPages = totalApplications === 0 ? 0 : Math.ceil(totalApplications / limitNum);

        const formattedResults = rawResults.map((entry) => {
            const job = entry.jobData || {};
            const employer = entry.employerData || {};
            const timeline = Array.isArray(entry.applicants?.statusTimeline)
                ? entry.applicants.statusTimeline
                : [];
            return {
                applicationId: entry.applicants?._id?.toString(),
                jobId: entry.job?.toString(),
                jobTitle: job.jobTitle,
                companyName: job.companyName,
                companyInitial: deriveCompanyInitial(job.companyName || employer.companyName),
                companyLogo: resolveCompanyLogoAsset(employer?.companyLogo),
                location: job.location,
                workMode: job.workMode,
                jobType: job.jobType,
                shortId: job.shortId,
                status: entry.applicants?.status,
                submissionType: entry.applicants?.submissionType,
                appliedAt: entry.applicants?.appliedAt,
                latestUpdateAt: entry.latestUpdateAt || entry.applicants?.appliedAt,
                requiresBasicTest: entry.applicants?.requiresBasicTest,
                requiresVideoProctoredTest: entry.applicants?.requiresVideoProctoredTest,
                statusTimeline: timeline,
                employerEngagement: entry.applicants?.employerEngagement || buildDefaultEmployerEngagement(),
                totalUpdates: timeline.length,
                employerUpdates: countEmployerTimelineUpdates(timeline)
            };
        });

        return res.status(200).json({
            success: true,
            data: formattedResults,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalRecords: totalApplications,
                limit: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            },
            summary: {
                totalApplications,
                totalUpdates: totalStats.totalUpdates || 0,
                statusBreakdown: statusStats.map((statusItem) => ({
                    status: statusItem._id,
                    count: statusItem.count
                }))
            }
        });
    } catch (error) {
        console.error("Get Job Applications Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

const getJobAssessmentStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const includeQuestions = req.query?.includeQuestions === 'true';

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }

        const job = await Job.findById(jobId)
            .select('jobTitle companyName jobDescription responsibilities requirements skills experience workMode location department status applicationClosingDate updatedAt');

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        let assessment = await JobAssessment.findOne({ job: jobId, jobSeeker: req.userId });

        if (!assessment) {
            return res.status(200).json({
                success: true,
                data: {
                    jobId,
                    jobSeekerId: req.userId,
                    status: 'not-started',
                    hasPassed: false,
                    jobUpdatedAt: job.updatedAt,
                    requiresRegeneration: false,
                    jobVersionRequiresRefresh: false,
                    basicQuestions: [],
                    attemptsSummary: [],
                    activeAttemptId: null
                }
            });
        }

        const mutated = syncAssessmentWithJobVersion(assessment, job);

        if (mutated) {
            assessment.status = computeAssessmentStatus(assessment);
            assessment.lastInteractionAt = new Date();
            await assessment.save();
        }

        const payload = buildAssessmentResponse({
            assessment,
            job,
            includeQuestions
        });

        return res.status(200).json({
            success: true,
            data: payload
        });
    } catch (error) {
        console.error("Get assessment status error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch assessment details"
        });
    }
};

const startJobAssessment = async (req, res) => {
    try {
        const { jobId } = req.params;
        const regenerateBasics = Boolean(req.body?.regenerateBasics);
        const forceRetake = Boolean(req.body?.forceRetake);

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }

        const job = await Job.findById(jobId)
            .select('jobTitle companyName jobDescription responsibilities requirements skills experience workMode location department status applicationClosingDate updatedAt');

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        const today = new Date();
        const closingDate = job.applicationClosingDate ? new Date(job.applicationClosingDate) : null;
        const isClosed = closingDate && closingDate < today;

        if (job.status !== 'Active' || isClosed) {
            return res.status(400).json({
                success: false,
                message: "This job is not accepting applications right now."
            });
        }

        const jobSeeker = await JobSeeker.findById(req.userId)
            .select('fullName email mobileNumber resume highestQualification passoutYear experienceInYears noticePeriod currentCTC skills');

        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        const requirementsSnapshot = buildAssessmentProfileRequirementSnapshot(jobSeeker);
        if (!requirementsSnapshot.allSatisfied) {
            return res.status(412).json({
                success: false,
                code: "profile_incomplete",
                message: "Please complete the highlighted profile details to take this assessment.",
                data: requirementsSnapshot
            });
        }

        let assessment = await JobAssessment.findOne({ job: jobId, jobSeeker: req.userId });

        if (!assessment) {
            assessment = new JobAssessment({
                job: jobId,
                jobSeeker: req.userId
            });
        }

        // Check retest payment requirements for attempts beyond the first
        const calculatedNextAttemptNumber = (assessment.latestAttemptNumber || 0) + 1;
        if (calculatedNextAttemptNumber > 1) {
            // Max 3 attempts allowed
            if (calculatedNextAttemptNumber > 3) {
                return res.status(400).json({
                    success: false,
                    message: "Maximum assessment attempts (3) reached. You cannot take this assessment again."
                });
            }

            // Check if payment was made for retest
            if (!assessment.retestAmountPaid) {
                return res.status(402).json({
                    success: false,
                    code: "payment_required",
                    message: "Payment required to take retest. Please pay ₹99 to unlock the next attempt.",
                    data: {
                        amount: 99,
                        currency: "INR",
                        attemptNumber: calculatedNextAttemptNumber,
                        maxAttempts: 3
                    }
                });
            }
        }

        const versionDrift = syncAssessmentWithJobVersion(assessment, job);
        if (versionDrift) {
            assessment.status = computeAssessmentStatus(assessment);
        }

        const activeAttempt = assessment.attempts.find(attempt => attempt.status === 'in-progress');
        const requiresRegeneration = Boolean(
            job.updatedAt &&
            assessment.jobVersionForQuestions &&
            job.updatedAt > assessment.jobVersionForQuestions
        );

        if (assessment.status === 'passed' && !requiresRegeneration) {
            return res.status(200).json({
                success: true,
                message: "You already passed this assessment.",
                data: buildAssessmentResponse({
                    assessment,
                    job,
                    includeQuestions: true
                })
            });
        }

        if (activeAttempt && !requiresRegeneration && !forceRetake && !regenerateBasics) {
            return res.status(200).json({
                success: true,
                message: "Assessment already in progress",
                data: buildAssessmentResponse({
                    assessment,
                    job,
                    includeQuestions: true
                })
            });
        }

        if (activeAttempt && (requiresRegeneration || forceRetake || regenerateBasics)) {
            activeAttempt.status = requiresRegeneration ? 'invalidated' : 'submitted';
            activeAttempt.completedAt = new Date();
            activeAttempt.jobDetailsChanged = Boolean(requiresRegeneration);
            activeAttempt.remarks = requiresRegeneration
                ? 'Attempt invalidated because job details changed.'
                : 'Attempt closed before regenerating a new set.';
        }

        const nextAttemptNumber = (assessment.latestAttemptNumber || 0) + 1;
        const experienceBand = deriveExperienceBand(job.experience, jobSeeker.experienceInYears);
        const attemptContext = {
            attemptNumber: nextAttemptNumber,
            mode: nextAttemptNumber > 1 ? 'retake' : 'fresh',
            weakAreas: assessment.attempts.length
                ? (assessment.attempts[assessment.attempts.length - 1]?.weakAreas || [])
                : []
        };

        const jobPayload = job.toObject ? job.toObject() : job;
        const profileSnapshot = pickJobSeekerProfileSnapshot(jobSeeker);

        const previousMcqContext = buildPreviousMcqPromptContext(assessment.attempts);
        attemptContext.previousMcqPrompts = previousMcqContext.promptExamples;
        const needsBasicRegeneration = !assessment.basicQuestions.length || regenerateBasics || requiresRegeneration;

        const generationOutput = await produceAssessmentQuestionSet({
            mode: needsBasicRegeneration ? 'full' : 'mcq-only',
            generatorParams: {
                job: jobPayload,
                experienceBand,
                jobSeekerProfile: profileSnapshot,
                attemptContext
            },
            attemptNumber: nextAttemptNumber,
            previousPromptSet: previousMcqContext.normalizedSet
        });

        if (needsBasicRegeneration) {
            const normalizedBasics = generationOutput.normalizedBasics || [];
            if (normalizedBasics.length !== 5) {
                throw new Error('Unable to generate base questions right now. Please try again.');
            }
            assessment.basicQuestions = normalizedBasics;
            assessment.jobVersionForQuestions = job.updatedAt;
            assessment.jobVersionRequiresRefresh = false;
        }

        const normalizedMcqs = generationOutput.normalizedMcqs;

        const previousAttempt = assessment.attempts.length
            ? assessment.attempts[assessment.attempts.length - 1]
            : null;

        const previousResponsesMap = new Map();
        if (nextAttemptNumber > 1 && previousAttempt?.basicResponses?.length) {
            previousAttempt.basicResponses.forEach((response) => {
                if (response?.questionId) {
                    previousResponsesMap.set(response.questionId, response);
                }
            });
        }

        const seededBasicResponses = assessment.basicQuestions.map((question) => {
            const prev = previousResponsesMap.get(question.questionId);
            const inheritedAnswer = prev?.answerText ? prev.answerText : '';
            return {
                questionId: question.questionId,
                answerText: inheritedAnswer,
                answeredAt: inheritedAnswer
                    ? (prev?.answeredAt ? new Date(prev.answeredAt) : new Date())
                    : null
            };
        });

        const newAttempt = {
            attemptNumber: nextAttemptNumber,
            status: 'in-progress',
            jobSnapshotVersion: job.updatedAt,
            jobDetailsChanged: false,
            generationMeta: generationOutput.generationMeta,
            mcqQuestions: normalizedMcqs,
            basicResponses: seededBasicResponses
        };
        ensureAttemptIntegrity(newAttempt);

        assessment.attempts.push(newAttempt);
        assessment.latestAttemptNumber = nextAttemptNumber;
        assessment.status = computeAssessmentStatus(assessment);
        assessment.lastInteractionAt = new Date();

        await assessment.save();

        const payload = buildAssessmentResponse({
            assessment,
            job,
            includeQuestions: true
        });

        return res.status(201).json({
            success: true,
            message: "Assessment ready",
            data: payload
        });
    } catch (error) {
        console.error("Start assessment error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to start assessment right now"
        });
    }
};

const updateJobAssessmentProgress = async (req, res) => {
    try {
        const { jobId } = req.params;
        const {
            attemptId,
            questionId,
            type,
            answerText,
            selectedOption,
            isMarked
        } = req.body || {};

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }

        if (!attemptId || !questionId || !type) {
            return res.status(400).json({
                success: false,
                message: "Missing attemptId, questionId or type"
            });
        }

        const assessment = await JobAssessment.findOne({ job: jobId, jobSeeker: req.userId });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Assessment not found"
            });
        }

        const attempt = assessment.attempts.find(item => item.attemptId === attemptId);

        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Attempt not found"
            });
        }

        if (attempt.status !== 'in-progress') {
            return res.status(400).json({
                success: false,
                message: "This attempt is no longer active"
            });
        }

        const normalizedType = String(type).toLowerCase();
        let updatedQuestionPayload = null;

        if (normalizedType === 'basic') {
            const basicQuestion = assessment.basicQuestions.find(q => q.questionId === questionId);
            if (!basicQuestion) {
                return res.status(404).json({
                    success: false,
                    message: "Question not found"
                });
            }

            let responseEntry = attempt.basicResponses.find(resp => resp.questionId === questionId);

            if (!responseEntry) {
                responseEntry = {
                    questionId,
                    answerText: '',
                    answeredAt: null
                };
                attempt.basicResponses.push(responseEntry);
            }

            const formattedAnswer = typeof answerText === 'string'
                ? answerText.trim().slice(0, 2000)
                : '';

            responseEntry.answerText = formattedAnswer;
            responseEntry.answeredAt = formattedAnswer ? new Date() : null;

            updatedQuestionPayload = mergeBasicFlow(assessment.basicQuestions, attempt.basicResponses)
                .find(item => item.questionId === questionId);
        } else if (normalizedType === 'mcq') {
            const mcq = attempt.mcqQuestions.find(question => question.questionId === questionId);
            if (!mcq) {
                return res.status(404).json({
                    success: false,
                    message: "Question not found"
                });
            }

            if (selectedOption !== undefined && selectedOption !== null) {
                const parsedOption = clampOptionIndex(selectedOption);
                mcq.selectedOption = parsedOption;
                mcq.answeredAt = new Date();
            }

            if (typeof isMarked === 'boolean') {
                mcq.isMarked = isMarked;
            }

            updatedQuestionPayload = {
                questionId: mcq.questionId,
                prompt: mcq.prompt,
                summary: mcq.summary,
                skillFocus: mcq.skillFocus,
                difficulty: mcq.difficulty,
                experienceAlignment: mcq.experienceAlignment,
                options: mcq.options,
                selectedOption: typeof mcq.selectedOption === 'number' ? mcq.selectedOption : null,
                isMarked: mcq.isMarked,
                answeredAt: mcq.answeredAt
            };
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid question type"
            });
        }

        assessment.lastInteractionAt = new Date();
        await assessment.save();

        return res.status(200).json({
            success: true,
            data: {
                attemptId: attempt.attemptId,
                questionId,
                type: normalizedType,
                question: updatedQuestionPayload,
                progress: buildProgressSummary(attempt)
            }
        });
    } catch (error) {
        console.error("Update assessment progress error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to save progress"
        });
    }
};

const recordJobAssessmentActivity = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { attemptId, eventType, timestamp } = req.body || {};

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }

        if (!attemptId || !eventType) {
            return res.status(400).json({
                success: false,
                message: "attemptId and eventType are required"
            });
        }

        const allowedEvents = ['focus-start', 'focus-end', 'copy', 'paste', 'tab-blur', 'window-blur'];
        if (!allowedEvents.includes(eventType)) {
            return res.status(400).json({
                success: false,
                message: "Unsupported event type"
            });
        }

        const assessment = await JobAssessment.findOne({ job: jobId, jobSeeker: req.userId });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Assessment not found"
            });
        }

        const attempt = assessment.attempts.find(item => item.attemptId === attemptId);

        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Attempt not found"
            });
        }

        if (attempt.status !== 'in-progress') {
            return res.status(400).json({
                success: false,
                message: "This attempt is no longer active"
            });
        }

        const eventTime = timestamp ? new Date(timestamp) : new Date();
        if (Number.isNaN(eventTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid timestamp"
            });
        }

        applyIntegrityEvent(attempt, eventType, eventTime);
        assessment.lastInteractionAt = new Date();
        await assessment.save();

        return res.status(204).send();
    } catch (error) {
        console.error("Record assessment activity error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to record activity"
        });
    }
};

const submitJobAssessment = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { attemptId } = req.body || {};

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }

        if (!attemptId) {
            return res.status(400).json({
                success: false,
                message: "attemptId is required"
            });
        }

        const job = await Job.findById(jobId)
            .select('jobTitle companyName location experience skills employerId hiringManagerEmail updatedAt requiresBasicTest requiresVideoProctoredTest');

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        const jobSeekerProfile = await JobSeeker.findById(req.userId)
            .select('fullName email mobileNumber resume highestQualification passoutYear experienceInYears noticePeriod skills');

        if (!jobSeekerProfile) {
            return res.status(404).json({
                success: false,
                message: "Job seeker profile not found"
            });
        }

        let employerProfile = null;
        if (job.employerId) {
            employerProfile = await Employer.findById(job.employerId).select('email fullName companyName notificationPreferences');
        }

        const assessment = await JobAssessment.findOne({ job: jobId, jobSeeker: req.userId });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Assessment not found"
            });
        }

        const attempt = assessment.attempts.find(item => item.attemptId === attemptId);

        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Attempt not found"
            });
        }

        if (attempt.status !== 'in-progress') {
            return res.status(400).json({
                success: false,
                message: "Attempt is already submitted"
            });
        }

        const jobChangedDuringAttempt = Boolean(
            job.updatedAt &&
            attempt.jobSnapshotVersion &&
            job.updatedAt > attempt.jobSnapshotVersion
        );

        if (jobChangedDuringAttempt) {
            attempt.status = 'invalidated';
            attempt.jobDetailsChanged = true;
            attempt.completedAt = new Date();
            attempt.remarks = 'Attempt invalidated because job details were updated during the test.';
            assessment.status = computeAssessmentStatus(assessment);
            assessment.lastInteractionAt = new Date();
            await assessment.save();

            return res.status(409).json({
                success: false,
                message: "Job details changed. Please regenerate the assessment and try again."
            });
        }

        closeActiveFocusSession(attempt, new Date());

        let correctCount = 0;
        let unansweredCount = 0;
        const weakAreas = new Set();

        attempt.mcqQuestions.forEach((question) => {
            if (typeof question.selectedOption !== 'number') {
                unansweredCount += 1;
                question.scoreAwarded = 0;
                return;
            }

            const isCorrect = question.selectedOption === question.correctOption;
            question.scoreAwarded = isCorrect ? 10 : 0;

            if (isCorrect) {
                correctCount += 1;
            } else if (question.skillFocus) {
                weakAreas.add(question.skillFocus);
            }
        });

        const totalMcq = attempt.mcqQuestions.length;
        const incorrectCount = Math.max(totalMcq - correctCount - unansweredCount, 0);
        const score = correctCount * 10;
        const passed = score >= 80;

        attempt.score = score;
        attempt.completedAt = new Date();
        attempt.status = passed ? 'passed' : 'failed';
        attempt.jobDetailsChanged = false;
        attempt.weakAreas = Array.from(weakAreas);

        const technicalSummary = {
            score,
            totalQuestions: totalMcq,
            correctAnswers: correctCount,
            incorrectAnswers: incorrectCount,
            unanswered: unansweredCount,
            passed,
            weakAreas: Array.from(weakAreas)
        };

        const historicalAttempts = buildHistoricalAttemptsSummary(assessment, attempt.attemptId);

        if (passed) {
            const shouldEmail = shouldNotifyEmployerForBasicTest(employerProfile);
            // Don't send email if video test is also required - wait for video test completion
            const skipEmailForNow = job.requiresVideoProctoredTest;
            await performReadinessReviewAndNotify({
                assessment,
                attempt,
                job,
                jobSeeker: jobSeekerProfile,
                employer: employerProfile,
                technicalSummary,
                historicalAttempts,
                shouldEmailEmployer: shouldEmail && !skipEmailForNow
            });
        } else {
            attempt.readinessReview = undefined;
            attempt.readinessReviewStatus = 'skipped';
            attempt.readinessReviewEmailStatus = 'skipped';
            attempt.readinessReviewError = null;

            // Reset retest payment flag when assessment fails
            // User needs to pay again for the next retest attempt
            assessment.retestAmountPaid = false;
        }

        assessment.status = computeAssessmentStatus(assessment);
        assessment.lastInteractionAt = new Date();

        await assessment.save();

        return res.status(200).json({
            success: true,
            data: {
                attemptId: attempt.attemptId,
                attemptNumber: attempt.attemptNumber,
                score,
                totalMcq,
                correctAnswers: correctCount,
                incorrectAnswers: incorrectCount,
                unanswered: unansweredCount,
                result: attempt.status,
                hasPassed: passed,
                nextAction: passed ? 'proctored-test' : 'retake',
                progress: buildProgressSummary(attempt),
                readinessReview: attempt.readinessReview || null,
                readinessReviewStatus: attempt.readinessReviewStatus,
                readinessReviewEmailStatus: attempt.readinessReviewEmailStatus
            }
        });
    } catch (error) {
        console.error("Submit assessment error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to submit assessment"
        });
    }
};

const applyToJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }

        const job = await Job.findById(jobId)
            .select('employerId status applicationClosingDate requiresBasicTest requiresVideoProctoredTest applicationsCount jobTitle companyName location workMode jobType shortId hiringManagerEmail');

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        const employer = await Employer.findById(job.employerId)
            .select('email fullName companyName companyLogo notificationPreferences');

        if (!employer) {
            return res.status(404).json({
                success: false,
                message: "Employer profile not found for this job"
            });
        }

        const today = new Date();
        const closingDate = job.applicationClosingDate ? new Date(job.applicationClosingDate) : null;
        const isClosed = closingDate && closingDate < today;

        if (job.status !== 'Active' || isClosed) {
            return res.status(400).json({
                success: false,
                message: "This job is not accepting applications right now."
            });
        }

        const jobSeeker = await JobSeeker.findById(req.userId)
            .select('fullName email experienceInYears highestQualification skills resume mobileNumber noticePeriod currentCTC');

        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker profile not found"
            });
        }

        const hasBasicTest = Boolean(req.body?.hasBasicTest);
        const hasVideoTest = Boolean(req.body?.hasVideoTest);
        const basicAssessmentId = hasBasicTest ? req.body?.basicAssessmentId : null;
        const videoAssessmentId = hasVideoTest ? req.body?.videoAssessmentId : null;

        if (job.requiresBasicTest && !hasBasicTest) {
            return res.status(400).json({
                success: false,
                message: "Please complete the basic assessment before applying to this job."
            });
        }

        if (job.requiresVideoProctoredTest && !hasVideoTest) {
            return res.status(400).json({
                success: false,
                message: "Please complete the video-proctored test before applying to this job."
            });
        }

        let basicAssessmentRef = null;
        if (hasBasicTest) {
            if (!basicAssessmentId || !mongoose.Types.ObjectId.isValid(basicAssessmentId)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid basicAssessmentId is required when hasBasicTest is true."
                });
            }

            basicAssessmentRef = await JobAssessment.findOne({
                _id: basicAssessmentId,
                job: jobId,
                jobSeeker: req.userId
            }).select('_id status');

            if (!basicAssessmentRef) {
                return res.status(404).json({
                    success: false,
                    message: "Assessment record not found for this job."
                });
            }

            if (basicAssessmentRef.status !== 'passed') {
                return res.status(400).json({
                    success: false,
                    message: "You must pass the basic assessment before applying."
                });
            }
        }

        let videoAssessmentRef = null;
        if (hasVideoTest) {
            if (!videoAssessmentId || !mongoose.Types.ObjectId.isValid(videoAssessmentId)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid videoAssessmentId is required when hasVideoTest is true."
                });
            }

            videoAssessmentRef = await VideoProctoringAssessment.findOne({
                _id: videoAssessmentId,
                job: jobId,
                jobSeeker: req.userId
            }).select("_id status attempts");

            if (!videoAssessmentRef) {
                return res.status(404).json({
                    success: false,
                    message: "Video assessment record not found for this job."
                });
            }

            const hasVideoPass = videoAssessmentRef.attempts?.some((attempt) => attempt.status === "passed");
            if (!hasVideoPass) {
                return res.status(400).json({
                    success: false,
                    message: "You must pass the video-proctored assessment before applying."
                });
            }
        }

        let jobApplications = await JobApplication.findOne({ job: jobId });
        if (jobApplications && jobApplications.applicants.some(applicant => `${applicant.jobSeeker}` === `${req.userId}`)) {
            return res.status(409).json({
                success: false,
                message: "You have already applied to this job."
            });
        }

        if (!jobApplications) {
            jobApplications = new JobApplication({
                job: jobId,
                employer: job.employerId,
                applicants: []
            });
        }

        const submissionType = hasBasicTest && hasVideoTest
            ? 'basic+video'
            : hasBasicTest
                ? 'basic-test'
                : hasVideoTest
                    ? 'video-test'
                    : 'direct';

        const initialTimeline = buildInitialApplicationTimeline(jobSeeker);

        jobApplications.applicants.push({
            jobSeeker: req.userId,
            submissionType,
            hasBasicTest,
            hasVideoTest,
            basicAssessmentId: basicAssessmentRef?._id || null,
            videoAssessmentId: videoAssessmentRef?._id || null,
            requiresBasicTest: job.requiresBasicTest,
            requiresVideoProctoredTest: job.requiresVideoProctoredTest,
            profileSnapshot: {
                fullName: jobSeeker.fullName,
                email: jobSeeker.email,
                experienceInYears: jobSeeker.experienceInYears ?? null,
                highestQualification: jobSeeker.highestQualification || '',
                currentCTC: jobSeeker.currentCTC ?? null,
                skills: Array.isArray(jobSeeker.skills) ? jobSeeker.skills.slice(0, 15) : [],
                resume: jobSeeker.resume || null
            },
            statusTimeline: initialTimeline,
            employerEngagement: buildDefaultEmployerEngagement(),
            lastStatusUpdatedAt: initialTimeline[initialTimeline.length - 1]?.createdAt || new Date()
        });

        await jobApplications.save();
        const latestApplicant = jobApplications.applicants[jobApplications.applicants.length - 1];

        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            { $inc: { applicationsCount: 1 } },
            { new: true, select: 'applicationsCount', timestamps: false }
        );

        const shouldSendDirectEmail =
            submissionType === 'direct' && shouldNotifyEmployerForDirectApplications(employer);

        if (shouldSendDirectEmail) {
            sendDirectApplicationNotification({
                employer,
                job,
                jobSeeker
            }).catch((error) => {
                console.error("Direct application notification failed:", error);
            });
        }

        const latestApplicantObj = latestApplicant?.toObject ? latestApplicant.toObject({ depopulate: true }) : latestApplicant;
        const applicationSummary = buildApplicationSummaryForResponse({
            job,
            employer,
            applicant: latestApplicantObj
        });

        return res.status(201).json({
            success: true,
            message: hasBasicTest || hasVideoTest
                ? "Application submitted with assessment results."
                : "Application submitted successfully.",
            data: {
                jobId,
                applicationId: latestApplicant?._id,
                applicationsCount: updatedJob?.applicationsCount ?? ((job.applicationsCount || 0) + 1),
                application: applicationSummary
            }
        });
    } catch (error) {
        console.error("Apply to job error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to submit application"
        });
    }
};

function sanitizeText(value) {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value !== 'string') {
        value = `${value}`;
    }

    const cleaned = value.replace(/\s+/g, ' ').trim();
    return cleaned || null;
}

function clampOptionIndex(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
        return 0;
    }
    if (parsed > 3) {
        return 3;
    }
    return parsed;
}

function ensureOptions(options) {
    const cleaned = Array.isArray(options)
        ? options.map(opt => sanitizeText(opt)).filter(Boolean)
        : [];

    while (cleaned.length < 4) {
        cleaned.push(`Option ${cleaned.length + 1}`);
    }

    return cleaned.slice(0, 4);
}

function normalizeBasicQuestions(rawQuestions = []) {
    return rawQuestions.slice(0, 5).map((question, index) => ({
        questionId: `basic_${index + 1}`,
        prompt: sanitizeText(question?.prompt) || `Provide your response for prompt ${index + 1}`,
        category: sanitizeText(question?.category) || sanitizeText(question?.topic),
        expectation: sanitizeText(question?.expectation) || sanitizeText(question?.contextHint) || null,
        context: sanitizeText(question?.context) || sanitizeText(question?.summary) || null
    }));
}

function normalizeMcqQuestions(rawQuestions = [], attemptNumber = 1) {
    return rawQuestions.slice(0, 10).map((question, index) => {
        const difficulty = sanitizeText(question?.difficulty)?.toLowerCase();
        const experienceAlignment = sanitizeText(question?.experienceAlignment)?.toLowerCase();
        const normalizedDifficulty = ['introductory', 'moderate', 'advanced'].includes(difficulty)
            ? difficulty
            : 'moderate';
        const normalizedExperience = ['junior', 'mid', 'senior'].includes(experienceAlignment)
            ? experienceAlignment
            : 'mid';

        return {
            questionId: `mcq_${attemptNumber}_${index + 1}`,
            prompt: sanitizeText(question?.prompt) || `Question ${index + 1}`,
            summary: sanitizeText(question?.summary) || null,
            skillFocus: sanitizeText(question?.skillFocus) || sanitizeText(question?.category) || null,
            difficulty: normalizedDifficulty,
            experienceAlignment: normalizedExperience,
            options: ensureOptions(question?.options),
            correctOption: clampOptionIndex(question?.correctOption),
            rationale: sanitizeText(question?.rationale) || null,
            selectedOption: null,
            isMarked: false,
            answeredAt: null,
            scoreAwarded: 0
        };
    });
}

function buildPreviousMcqPromptContext(attempts = []) {
    const normalizedSet = new Set();
    const promptExamples = [];

    attempts.forEach((attempt) => {
        (attempt.mcqQuestions || []).forEach((question) => {
            const prompt = sanitizeText(question?.prompt);
            const key = normalizePromptKey(prompt);
            if (key && !normalizedSet.has(key)) {
                normalizedSet.add(key);
                promptExamples.push(prompt);
            }
        });
    });

    return {
        normalizedSet,
        promptExamples: promptExamples.slice(-30)
    };
}

async function produceAssessmentQuestionSet({ mode, generatorParams, attemptNumber, previousPromptSet }) {
    const MAX_TRIES = 3;
    for (let tryIndex = 0; tryIndex < MAX_TRIES; tryIndex++) {
        const result = mode === 'full'
            ? await assessmentGenerator.generateFullSet(generatorParams)
            : await assessmentGenerator.generateMcqsOnly(generatorParams);

        const normalizedBasics = mode === 'full'
            ? normalizeBasicQuestions(result.basicQuestions)
            : null;
        const normalizedMcqs = normalizeMcqQuestions(result.mcqQuestions, attemptNumber);


        if (normalizedMcqs.length !== 10) {
            throw new Error('Unable to generate full MCQ set. Please retry.');
        }

        const duplicates = findDuplicatePrompts(normalizedMcqs, previousPromptSet);
        if (duplicates.length) {
            if (tryIndex === MAX_TRIES - 1) {
                throw new Error('Unable to generate fresh MCQs without recurring previous topics. Please retry.');
            }
            continue;
        }

        normalizedMcqs.forEach((question) => {
            const key = normalizePromptKey(question.prompt);
            if (key) {
                previousPromptSet.add(key);
            }
        });

        return {
            normalizedBasics,
            normalizedMcqs,
            generationMeta: result.generationMeta
        };
    }

    throw new Error('Unable to generate MCQs right now. Please try again in a few moments.');
}

function findDuplicatePrompts(questions = [], promptSet = new Set()) {
    if (!promptSet?.size) {
        return [];
    }
    return questions.filter((question) => {
        const key = normalizePromptKey(question?.prompt);
        return key && promptSet.has(key);
    });
}

function normalizePromptKey(text = '') {
    if (!text) return null;
    return text.toString().replace(/\s+/g, ' ').trim().toLowerCase();
}

function deriveExperienceBand(jobExperience, candidateExperience) {
    if (typeof candidateExperience === 'number' && candidateExperience >= 0) {
        if (candidateExperience <= 2) return 'junior';
        if (candidateExperience <= 5) return 'mid';
        return 'senior';
    }

    const experienceString = (jobExperience || '').toString().toLowerCase();
    const matches = (jobExperience || '').toString().match(/\d+(\.\d+)?/g);

    if (matches && matches.length) {
        const numericValues = matches
            .map(Number)
            .filter(value => !Number.isNaN(value));

        if (numericValues.length) {
            const maxValue = Math.max(...numericValues);
            if (maxValue <= 2) return 'junior';
            if (maxValue <= 5) return 'mid';
            return 'senior';
        }
    }

    if (experienceString.includes('fresher') || experienceString.includes('entry') || experienceString.includes('junior')) {
        return 'junior';
    }

    if (experienceString.includes('senior') || experienceString.includes('lead') || experienceString.includes('principal') || experienceString.includes('architect')) {
        return 'senior';
    }

    return 'mid';
}

function pickJobSeekerProfileSnapshot(jobSeeker) {
    if (!jobSeeker) return {};

    return {
        experienceInYears: typeof jobSeeker.experienceInYears === 'number' ? jobSeeker.experienceInYears : null,
        noticePeriod: typeof jobSeeker.noticePeriod === 'number' ? jobSeeker.noticePeriod : null,
        highestQualification: jobSeeker.highestQualification || null,
        skills: Array.isArray(jobSeeker.skills) ? jobSeeker.skills.slice(0, 12) : []
    };
}

function mergeBasicFlow(basicQuestions = [], responses = []) {
    const responseMap = new Map();
    responses.forEach((response) => {
        responseMap.set(response.questionId, response);
    });

    return basicQuestions.map((question, index) => {
        const response = responseMap.get(question.questionId);
        return {
            questionId: question.questionId,
            prompt: question.prompt,
            category: question.category,
            expectation: question.expectation,
            context: question.context,
            order: index,
            answerText: response?.answerText || '',
            answeredAt: response?.answeredAt || null
        };
    });
}

function formatMcqQuestionsForClient(mcqQuestions = []) {
    return mcqQuestions.map((question, index) => ({
        questionId: question.questionId,
        order: index,
        prompt: question.prompt,
        summary: question.summary,
        skillFocus: question.skillFocus,
        difficulty: question.difficulty,
        experienceAlignment: question.experienceAlignment,
        options: question.options,
        selectedOption: typeof question.selectedOption === 'number' ? question.selectedOption : null,
        isMarked: question.isMarked,
        answeredAt: question.answeredAt
    }));
}

function buildProgressSummary(attempt) {
    const mcqTotal = attempt?.mcqQuestions?.length || 0;
    const mcqAnswered = attempt?.mcqQuestions?.filter(q => typeof q.selectedOption === 'number').length || 0;
    const mcqMarked = attempt?.mcqQuestions?.filter(q => q.isMarked)?.length || 0;
    const basicTotal = attempt?.basicResponses?.length || 0;
    const basicAnswered = attempt?.basicResponses?.filter(resp => resp.answerText && resp.answerText.trim().length)?.length || 0;

    return {
        mcq: {
            total: mcqTotal,
            answered: mcqAnswered,
            remaining: Math.max(mcqTotal - mcqAnswered, 0),
            marked: mcqMarked
        },
        basic: {
            total: basicTotal,
            answered: basicAnswered,
            remaining: Math.max(basicTotal - basicAnswered, 0)
        }
    };
}

function formatActiveAttempt(assessment, attempt) {
    return {
        attemptId: attempt.attemptId,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.startedAt,
        jobSnapshotVersion: attempt.jobSnapshotVersion,
        jobDetailsChanged: attempt.jobDetailsChanged,
        progress: buildProgressSummary(attempt),
        basicFlow: mergeBasicFlow(assessment.basicQuestions, attempt.basicResponses),
        mcqQuestions: formatMcqQuestionsForClient(attempt.mcqQuestions)
    };
}

function buildAssessmentResponse({ assessment, job, includeQuestions = false }) {
    const jobUpdatedAt = job?.updatedAt || null;
    const activeAttempt = assessment.attempts.find(attempt => attempt.status === 'in-progress');
    const hasPassed = assessment.attempts.some(attempt => attempt.status === 'passed');
    const versionOutdated = Boolean(
        jobUpdatedAt &&
        assessment.jobVersionForQuestions &&
        jobUpdatedAt > assessment.jobVersionForQuestions
    );
    const requiresRegeneration = Boolean(versionOutdated || assessment.jobVersionRequiresRefresh);

    const attemptsSummary = assessment.attempts
        .map(attempt => ({
            attemptId: attempt.attemptId,
            attemptNumber: attempt.attemptNumber,
            status: attempt.status,
            score: attempt.score,
            startedAt: attempt.startedAt,
            completedAt: attempt.completedAt,
            jobDetailsChanged: attempt.jobDetailsChanged
        }))
        .sort((a, b) => a.attemptNumber - b.attemptNumber);

    const payload = {
        _id: assessment._id.toString(),
        jobId: assessment.job.toString(),
        jobSeekerId: assessment.jobSeeker.toString(),
        status: assessment.status,
        hasPassed,
        jobUpdatedAt,
        requiresRegeneration,
        jobVersionRequiresRefresh: Boolean(assessment.jobVersionRequiresRefresh),
        retestAmountPaid: Boolean(assessment.retestAmountPaid),
        basicQuestions: assessment.basicQuestions.map(question => ({
            questionId: question.questionId,
            prompt: question.prompt,
            category: question.category,
            expectation: question.expectation,
            context: question.context
        })),
        attemptsSummary,
        activeAttemptId: activeAttempt?.attemptId || null
    };

    if (includeQuestions && activeAttempt) {
        payload.activeAttempt = {
            ...formatActiveAttempt(assessment, activeAttempt),
            locked: requiresRegeneration
        };
    }

    return payload;
}

function computeAssessmentStatus(assessment) {
    if (!assessment || !assessment.attempts?.length) {
        return 'not-started';
    }

    if (assessment.attempts.some(attempt => attempt.status === 'in-progress')) {
        return 'in-progress';
    }

    if (assessment.attempts.some(attempt => attempt.status === 'passed')) {
        return 'passed';
    }

    if (assessment.attempts.some(attempt => attempt.status === 'failed')) {
        return 'failed';
    }

    return 'not-started';
}

function syncAssessmentWithJobVersion(assessment, job) {
    if (!assessment || !job?.updatedAt || !assessment.jobVersionForQuestions) {
        return false;
    }

    if (job.updatedAt <= assessment.jobVersionForQuestions) {
        if (assessment.jobVersionRequiresRefresh) {
            assessment.jobVersionRequiresRefresh = false;
            return true;
        }
        return false;
    }

    let mutated = false;
    if (!assessment.jobVersionRequiresRefresh) {
        mutated = true;
    }
    assessment.jobVersionRequiresRefresh = true;

    assessment.attempts.forEach((attempt) => {
        if (attempt.status === 'in-progress') {
            attempt.status = 'invalidated';
            attempt.completedAt = new Date();
            attempt.jobDetailsChanged = true;
            attempt.remarks = 'Attempt invalidated because job details changed.';
            mutated = true;
        }
    });

    return mutated;
}

async function performReadinessReviewAndNotify({ assessment, attempt, job, jobSeeker, employer, technicalSummary, historicalAttempts = [], shouldEmailEmployer = true }) {
    if (!assessment?.basicQuestions?.length) {
        attempt.readinessReviewStatus = 'skipped';
        attempt.readinessReviewEmailStatus = 'skipped';
        return;
    }

    ensureAttemptIntegrity(attempt);
    const readinessFlow = mergeBasicFlow(assessment.basicQuestions, attempt.basicResponses);
    const readinessPairs = readinessFlow.map((item) => ({
        questionId: item.questionId,
        question: item.prompt,
        answer: (item.answerText || '').trim()
    }));

    const hasAnswers = readinessPairs.some(pair => pair.answer.length);
    if (!hasAnswers) {
        attempt.readinessReviewStatus = 'skipped';
        attempt.readinessReviewEmailStatus = 'skipped';
        return;
    }

    try {
        const resumeAssetUrl = buildPublicAssetUrl(jobSeeker?.resume);
        const resumeAbsolutePath = resolveResumeAbsolutePath(jobSeeker?.resume);
        const integritySnapshot = summarizeIntegrity(attempt.integrity);
        const review = await readinessReviewer.generate({
            job: job?.toObject ? job.toObject() : job,
            jobSeeker: jobSeeker?.toObject ? jobSeeker.toObject() : jobSeeker,
            readinessPairs,
            technicalSummary,
            resumeUrl: resumeAssetUrl,
            integrity: integritySnapshot,
            historicalAttempts
        });

        const normalizedReview = {
            summary: review.summary,
            fitVerdict: review.fitVerdict,
            highlights: review.highlights,
            concerns: review.concerns,
            recommendations: review.recommendations,
            historicalInsights: Array.isArray(review.historicalInsights) ? review.historicalInsights : [],
            inconsistencies: (review.inconsistencies || []).map(normalizeReviewInconsistency),
            generatedAt: review.generatedAt
        };
        attempt.readinessReview = normalizedReview;
        attempt.readinessReviewStatus = 'generated';

        if (!shouldEmailEmployer) {
            attempt.readinessReviewEmailStatus = 'pending';
            return normalizedReview;
        }

        const employerEmail = determineEmployerEmail(job, employer);
        if (!employerEmail) {
            attempt.readinessReviewEmailStatus = 'skipped';
            return normalizedReview;
        }

        await sendReadinessSummaryEmail({
            to: employerEmail,
            job,
            employer,
            jobSeeker,
            readinessPairs,
            technicalSummary,
            review,
            resumeUrl: null,
            integrity: integritySnapshot,
            historicalAttempts,
            historicalInsights: normalizedReview.historicalInsights,
            currentAttemptNumber: attempt.attemptNumber,
            resumeAttachmentPath: resumeAbsolutePath
        });
        attempt.readinessReviewEmailStatus = 'sent';
        return normalizedReview;
    } catch (error) {
        console.error("Readiness review generation failed:", error);
        attempt.readinessReviewStatus = 'failed';
        attempt.readinessReviewEmailStatus = 'failed';
        attempt.readinessReviewError = error.message;
    }
}

function determineEmployerEmail(job, employer) {
    if (employer?.email) {
        return employer.email;
    }
    if (job?.hiringManagerEmail) {
        return job.hiringManagerEmail;
    }
    return null;
}

function shouldNotifyEmployerForDirectApplications(employer) {
    return employer?.notificationPreferences?.notifyApplicationsWithoutTest !== false;
}

function shouldNotifyEmployerForBasicTest(employer) {
    return employer?.notificationPreferences?.notifyBasicTestCompletion !== false;
}

/**
 * Send resume upload notification emails
 * - Sends to admin emails (RESUME_UPDATE_ALERT from .env lines 74-75, comma-separated)
 * - Sends confirmation email to job seeker
 */
async function sendResumeUploadNotifications({ jobSeeker, resumePath, isUpdate }) {
    // Get admin emails from .env (lines 74-75)
    const RESUME_UPDATE_ALERT = process.env.RESUME_UPDATE_ALERT;
    if (!RESUME_UPDATE_ALERT) {
        console.log("RESUME_UPDATE_ALERT not configured in .env, skipping resume notification emails");
        return;
    }

    // Parse comma-separated emails
    const adminEmails = RESUME_UPDATE_ALERT.split(',').map(email => email.trim()).filter(email => email.length > 0);
    if (adminEmails.length === 0) {
        console.log("No valid emails found in RESUME_UPDATE_ALERT, skipping resume notification emails");
        return;
    }

    // Build resume attachment path
    const attachments = [];
    if (resumePath) {
        const projectRoot = path.resolve(__dirname, "../../");
        const uploadsRoot = path.resolve(projectRoot, "uploads");
        let absolutePath;
        if (resumePath.startsWith("/uploads/")) {
            absolutePath = path.resolve(projectRoot, `.${resumePath}`);
        } else if (path.isAbsolute(resumePath)) {
            absolutePath = resumePath;
        } else {
            absolutePath = path.resolve(projectRoot, resumePath);
        }
        if (absolutePath.startsWith(uploadsRoot) && fs.existsSync(absolutePath)) {
            attachments.push({
                filename: path.basename(absolutePath),
                path: absolutePath
            });
        }
    }

    const action = isUpdate ? "updated" : "uploaded";
    const uploadedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Send email to admin emails
    const adminSubject = `[Atract] Resume ${action.charAt(0).toUpperCase() + action.slice(1)} - ${jobSeeker?.fullName || "Job Seeker"}`;
    const adminEmailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 720px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 24px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 700;">📄 Resume ${action.charAt(0).toUpperCase() + action.slice(1)}</h2>
                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">A job seeker has ${action} their resume on Atract.in</p>
            </div>
            
            <div style="padding: 24px; background: #ffffff;">
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                    <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #0f172a;">Job Seeker Information</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; width: 40%;">Full Name</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${jobSeeker?.fullName || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Email</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">
                                <a href="mailto:${jobSeeker?.email || ""}" style="color: #2563eb; text-decoration: none;">${jobSeeker?.email || "N/A"}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Mobile Number</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${jobSeeker?.mobileNumber || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Experience</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${jobSeeker?.experienceInYears ? `${jobSeeker.experienceInYears} years` : "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Current Location</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${jobSeeker?.currentLocation || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; font-weight: 600; color: #475569;">${isUpdate ? "Updated" : "Uploaded"} At</td>
                            <td style="padding: 8px 12px; color: #0f172a;">${uploadedAt}</td>
                        </tr>
                    </table>
                </div>

                <div style="background: #eff6ff; padding: 16px; border-radius: 12px; border: 1px solid #bfdbfe; margin-top: 20px;">
                    <p style="margin: 0; color: #1e40af; font-weight: 600;">
                        📎 Resume is attached to this email
                    </p>
                </div>
            </div>

            <div style="background: #f8fafc; padding: 16px 24px; font-size: 12px; color: #475569; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0;">This is an automated notification from Atract.in</p>
            </div>
        </div>
    `;

    // Send to all admin emails
    for (const adminEmail of adminEmails) {
        try {
            await sendMail(adminEmail, adminSubject, adminEmailHtml, attachments.length > 0 ? attachments : undefined);
            console.log(`Resume ${action} notification sent to ${adminEmail}`);
        } catch (error) {
            console.error(`Failed to send resume ${action} notification to ${adminEmail}:`, error);
        }
    }

    // Send confirmation email to job seeker
    if (jobSeeker?.email) {
        try {
            const confirmationSubject = `Resume ${action.charAt(0).toUpperCase() + action.slice(1)} Successfully - Atract.in`;
            const confirmationEmailHtml = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; padding: 24px; text-align: center;">
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700;">✅ Resume ${action.charAt(0).toUpperCase() + action.slice(1)} Successfully!</h2>
                    </div>
                    
                    <div style="padding: 24px; background: #ffffff;">
                        <p style="margin: 0 0 16px 0; color: #0f172a; font-size: 16px; line-height: 1.6;">
                            Hi ${jobSeeker?.fullName || "there"},
                        </p>
                        <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                            Your resume has been ${action} successfully on Atract.in at ${uploadedAt}.
                        </p>
                        <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                            Your profile is now updated and ready for job matching. Employers can now view your resume when you apply to jobs.
                        </p>
                        <div style="background: #f0fdf4; padding: 16px; border-radius: 12px; border: 1px solid #bbf7d0; margin: 20px 0;">
                            <p style="margin: 0; color: #166534; font-weight: 600; font-size: 14px;">
                                💡 Tip: Keep your resume updated to get better job matches!
                            </p>
                        </div>
                    </div>

                    <div style="background: #f8fafc; padding: 16px 24px; font-size: 12px; color: #475569; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0;">Thank you for using Atract.in</p>
                    </div>
                </div>
            `;

            await sendMail(jobSeeker.email, confirmationSubject, confirmationEmailHtml);
            console.log(`Resume ${action} confirmation email sent to ${jobSeeker.email}`);
        } catch (error) {
            console.error(`Failed to send resume ${action} confirmation email to ${jobSeeker.email}:`, error);
        }
    }
}

async function sendDirectApplicationNotification({ employer, job, jobSeeker }) {
    const to = determineEmployerEmail(job, employer);
    if (!to) {
        return;
    }

    const jobUrl = buildJobDetailsUrl(job);
    const resumeUrl = buildResumeShareUrl(jobSeeker) || buildPublicAssetUrl(jobSeeker?.resume);
    const skills = Array.isArray(jobSeeker?.skills) ? jobSeeker.skills.slice(0, 8) : [];
    const submittedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const subject = `[${job?.companyName || employer?.companyName || "Atract"}] New application – ${jobSeeker?.fullName || "Candidate"}`;

    const emailHtml = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:720px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <div style="background:#0f172a;color:#fff;padding:18px 24px;">
                <h2 style="margin:0;font-size:18px;">Direct application received</h2>
                <p style="margin:4px 0 0 0;font-size:13px;opacity:0.85;">${job?.jobTitle || "Role"} • ${job?.companyName || employer?.companyName || ""}</p>
            </div>
            <div style="padding:24px;">
                <p style="margin:0 0 12px 0;color:#0f172a;">${jobSeeker?.fullName || "A candidate"} just applied to <strong>${job?.jobTitle || "your role"}</strong> without any assessments.</p>
                <table style="width:100%;border-collapse:collapse;margin:18px 0;">
                    <tbody>
                        <tr>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;width:40%;font-weight:600;color:#0f172a;">Candidate</td>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#0f172a;">${jobSeeker?.fullName || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#0f172a;">Email</td>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;"><a href="mailto:${jobSeeker?.email || ""}" style="color:#2563eb;">${jobSeeker?.email || "N/A"}</a></td>
                        </tr>
                        <tr>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#0f172a;">Experience</td>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#0f172a;">${formatExperienceDisplay(jobSeeker?.experienceInYears)}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#0f172a;">Qualification</td>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#0f172a;">${jobSeeker?.highestQualification || "Not shared"}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#0f172a;">Notice period</td>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#0f172a;">${formatNoticePeriod(jobSeeker?.noticePeriod)}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#0f172a;">Current CTC</td>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#0f172a;">${jobSeeker?.currentCTC ? `${jobSeeker.currentCTC} LPA` : "Not shared"}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#0f172a;">Submitted</td>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#0f172a;">${submittedAt}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin:18px 0;">
                    <p style="margin:0 0 6px 0;font-weight:600;color:#0f172a;">Top skills</p>
                    ${
                        skills.length
                            ? `<div style="display:flex;flex-wrap:wrap;gap:8px;">${skills.map(skill => `<span style="background:#eef2ff;color:#3730a3;padding:6px 12px;border-radius:999px;font-size:13px;">${skill}</span>`).join("")}</div>`
                            : "<p style='margin:0;color:#475569;'>Skills not provided.</p>"
                    }
                </div>

                <div style="margin:18px 0;">
                    <p style="margin:0 0 6px 0;font-weight:600;color:#0f172a;">Quick links</p>
                    <ul style="padding-left:20px;margin:0;color:#2563eb;">
                        ${jobUrl ? `<li><a href="${jobUrl}" style="color:#2563eb;">View job posting</a></li>` : ""}
                        <li style="color:#0f172a;">Resume: ${jobSeeker?.resume ? "Attached to this email" : "Resume not available"}</li>
                    </ul>
                </div>

                <div style="margin-top:22px;padding:16px;border:1px solid #fee2e2;border-radius:12px;background:#fff1f2;">
                    <strong style="color:#b91c1c;display:block;margin-bottom:6px;">Why you&apos;re seeing this</strong>
                    <p style="margin:0;color:#b91c1c;font-size:14px;">
                        This role does not require assessments. You&apos;re receiving instant notifications for direct applications.
                    </p>
                </div>
            </div>
        </div>
    `;

    // Build resume attachment path
    const attachments = [];
    if (jobSeeker?.resume) {
        const projectRoot = path.resolve(__dirname, "../../");
        const uploadsRoot = path.resolve(projectRoot, "uploads");
        let absolutePath;
        if (jobSeeker.resume.startsWith("/uploads/")) {
            absolutePath = path.resolve(projectRoot, `.${jobSeeker.resume}`);
        } else if (path.isAbsolute(jobSeeker.resume)) {
            absolutePath = jobSeeker.resume;
        } else {
            absolutePath = path.resolve(projectRoot, jobSeeker.resume);
        }
        if (absolutePath.startsWith(uploadsRoot) && fs.existsSync(absolutePath)) {
            attachments.push({
                filename: path.basename(absolutePath),
                path: absolutePath
            });
        }
    }

    await sendMail(to, subject, emailHtml, attachments.length > 0 ? attachments : undefined);
}

function buildJobDetailsUrl(job) {
    if (!job?.shortId) return null;
    const base =
        process.env.FRONTEND_URL ||
        process.env.APP_BASE_URL ||
        process.env.PUBLIC_WEB_URL ||
        process.env.SERVER_URL ||
        "";
    if (!base) return null;
    return `${base.replace(/\/$/, "")}/${job.shortId}`;
}

function formatExperienceDisplay(value) {
    if (typeof value === "number" && value >= 0) {
        return `${value} year${value === 1 ? "" : "s"}`;
    }
    return "Not shared";
}

function formatNoticePeriod(value) {
    if (typeof value === "number" && value >= 0) {
        return `${value} days`;
    }
    return "Not specified";
}

function buildPublicAssetUrl(relativePath = "") {
    if (!relativePath) return null;
    if (/^https?:\/\//i.test(relativePath)) {
        return relativePath;
    }
    const base = resolveBaseUrl([
        process.env.PUBLIC_ASSET_BASE_URL,
        process.env.ASSET_CDN_URL,
        process.env.PUBLIC_API_URL,
        process.env.APP_BASE_URL,
        process.env.PUBLIC_WEB_URL,
        process.env.FRONTEND_URL,
        process.env.SERVER_URL,
        buildDefaultServerOrigin()
    ]);
    if (!base) {
        return null;
    }
    return `${base}/${relativePath.replace(/^\//, "")}`;
}

function buildResumeShareUrl(jobSeeker) {
    if (!jobSeeker?._id || !jobSeeker.resume || !process.env.JWT_SECRET) {
        return null;
    }
    const serviceBase = buildJobSeekerServiceBaseUrl();
    if (!serviceBase) {
        return null;
    }
    try {
        const token = jwt.sign(
            {
                scope: "resume_share",
                jobSeekerId: jobSeeker._id.toString(),
                resumePath: jobSeeker.resume
            },
            process.env.JWT_SECRET,
            { expiresIn: RESUME_SHARE_TOKEN_TTL }
        );
        return `${serviceBase}/resume/share/${token}`;
    } catch (error) {
        console.error("Resume share token error:", error);
        return null;
    }
}

function buildJobSeekerServiceBaseUrl() {
    const candidates = [
        process.env.PUBLIC_JOBSEEKER_URL,
        process.env.JOBSEEKER_SERVICE_URL,
        process.env.NEXT_PUBLIC_JOBSEEKER_URL
    ];

    if (process.env.PUBLIC_API_URL) {
        const normalizedApi = process.env.PUBLIC_API_URL.replace(/\/$/, "");
        candidates.push(
            /\/jobseeker$/i.test(normalizedApi) ? normalizedApi : `${normalizedApi}/jobseeker`
        );
    }

    if (process.env.APP_BASE_URL) {
        const normalizedApp = process.env.APP_BASE_URL.replace(/\/$/, "");
        candidates.push(
            /\/jobseeker$/i.test(normalizedApp) ? normalizedApp : `${normalizedApp}/jobseeker`
        );
    }

    if (process.env.SERVER_URL) {
        const normalizedServer = process.env.SERVER_URL.replace(/\/$/, "");
        if (/\/jobseeker$/i.test(normalizedServer)) {
            candidates.push(normalizedServer);
        } else {
            candidates.push(`${normalizedServer}/jobseeker`);
        }
    }

    const defaultOrigin = buildDefaultServerOrigin();
    if (defaultOrigin) {
        candidates.push(`${defaultOrigin}/jobseeker`);
    }

    return resolveBaseUrl(candidates);
}

function resolveBaseUrl(candidates = []) {
    for (const candidate of candidates) {
        const normalized = normalizeBaseCandidate(candidate);
        if (normalized) {
            return normalized;
        }
    }
    return null;
}

function normalizeBaseCandidate(candidate) {
    if (!candidate || typeof candidate !== "string") {
        return null;
    }
    const trimmed = candidate.trim();
    if (!trimmed) {
        return null;
    }
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const value = hasProtocol ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`;
    try {
        const url = new URL(value);
        const normalizedPath =
            url.pathname && url.pathname !== "/" ? url.pathname.replace(/\/$/, "") : "";
        return `${url.origin}${normalizedPath}`;
    } catch (error) {
        return null;
    }
}

function buildDefaultServerOrigin() {
    const protocol =
        (process.env.SERVER_PROTOCOL || process.env.DEFAULT_PROTOCOL || "http").replace(/:$/, "");

    const rawHost =
        process.env.PUBLIC_HOST ||
        process.env.SERVER_HOST ||
        process.env.HOST ||
        process.env.APP_HOST ||
        "localhost";

    const port =
        process.env.PUBLIC_PORT ||
        process.env.SERVER_PORT ||
        process.env.APP_PORT ||
        process.env.PORT ||
        "";

    const normalizedHost = ["0.0.0.0", "::"].includes(rawHost) ? "localhost" : rawHost;

    const baseString = /^https?:\/\//i.test(normalizedHost)
        ? normalizedHost
        : `${protocol}://${normalizedHost}`;

    try {
        const url = new URL(baseString);
        if (port) {
            url.port = `${port}`.replace(/[^\d]/g, "") || url.port;
        }
        url.pathname = "";
        return url.origin;
    } catch (error) {
        return null;
    }
}

function buildApplicationSortStage(sortKey = "recent") {
    switch ((sortKey || "").toLowerCase()) {
        case "oldest":
            return { "applicants.appliedAt": 1 };
        case "company_az":
            return { "jobData.companyName": 1, "applicants.appliedAt": -1 };
        case "status":
            return { "applicants.status": 1, latestUpdateAt: -1 };
        case "recent":
        default:
            return { latestUpdateAt: -1 };
    }
}

function buildInitialApplicationTimeline(jobSeeker) {
    const now = new Date();
    const actorName = jobSeeker?.fullName ? jobSeeker.fullName.split(" ")[0] : "You";
    return [
        {
            type: "applied",
            label: "Applied",
            description: `${actorName} submitted this application`,
            source: "jobseeker",
            createdAt: now
        },
        {
            type: "sent_to_employer",
            label: "Application sent",
            description: "We shared your profile with the employer",
            source: "system",
            createdAt: now
        }
    ];
}

function buildDefaultEmployerEngagement() {
    return {
        viewedAt: null,
        resumeDownloadedAt: null,
        lastAction: null
    };
}

function resolveCompanyLogoAsset(logo) {
    if (!logo || typeof logo !== "string") {
        return null;
    }
    const trimmed = logo.trim();
    if (!trimmed) {
        return null;
    }
    if (trimmed.startsWith("data:") || trimmed.startsWith("http")) {
        return trimmed;
    }
    return buildPublicAssetUrl(trimmed);
}

function deriveCompanyInitial(name = "") {
    if (!name || typeof name !== "string") {
        return "A";
    }
    const trimmed = name.trim();
    return trimmed ? trimmed[0].toUpperCase() : "A";
}

function countEmployerTimelineUpdates(timeline = []) {
    if (!Array.isArray(timeline) || timeline.length === 0) {
        return 0;
    }
    return timeline.filter((event) => event?.source === "employer").length;
}

function escapeRegex(value = "") {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildApplicationSummaryForResponse({ job, employer, applicant }) {
    if (!job || !applicant) {
        return null;
    }

    const normalizedApplicant = normalizeSubdocument(applicant) || {};
    const timeline = normalizeTimelineEntries(normalizedApplicant.statusTimeline);

    return {
        applicationId: normalizedApplicant._id?.toString(),
        jobId: job?._id?.toString(),
        jobTitle: job?.jobTitle || "",
        companyName: job?.companyName || employer?.companyName || "",
        companyInitial: deriveCompanyInitial(job?.companyName || employer?.companyName),
        companyLogo: resolveCompanyLogoAsset(employer?.companyLogo),
        location: job?.location || "",
        workMode: job?.workMode || "",
        jobType: job?.jobType || "",
        shortId: job?.shortId || null,
        status: normalizedApplicant.status || "pending",
        submissionType: normalizedApplicant.submissionType || "direct",
        appliedAt: normalizedApplicant.appliedAt || new Date(),
        latestUpdateAt: normalizedApplicant.lastStatusUpdatedAt || normalizedApplicant.appliedAt || new Date(),
        requiresBasicTest: Boolean(normalizedApplicant.requiresBasicTest),
        requiresVideoProctoredTest: Boolean(normalizedApplicant.requiresVideoProctoredTest),
        statusTimeline: timeline,
        employerEngagement: normalizedApplicant.employerEngagement || buildDefaultEmployerEngagement(),
        totalUpdates: timeline.length,
        employerUpdates: countEmployerTimelineUpdates(timeline)
    };
}

function normalizeSubdocument(doc) {
    if (!doc) {
        return null;
    }
    if (typeof doc.toObject === "function") {
        return doc.toObject({ depopulate: true });
    }
    if (typeof doc.toJSON === "function") {
        return doc.toJSON();
    }
    return doc;
}

function normalizeTimelineEntries(timeline = []) {
    if (!Array.isArray(timeline)) {
        return [];
    }
    return timeline
        .map((entry) => normalizeSubdocument(entry) || entry)
        .filter(Boolean);
}

async function sendReadinessSummaryEmail({
    to,
    job,
    employer,
    jobSeeker,
    readinessPairs,
    technicalSummary,
    review,
    resumeUrl,
    integrity,
    historicalAttempts = [],
    historicalInsights = [],
    currentAttemptNumber,
    resumeAttachmentPath = null
}) {
    if (!to) {
        return;
    }

    const subject = `[${job?.companyName || "Atract"}] ${jobSeeker?.fullName || "Candidate"} – Assessment Summary for ${job?.jobTitle || "Role"}`;

    const highlightsHtml = (review.highlights || []).length
        ? `<ul>${review.highlights.map(item => `<li>${item}</li>`).join("")}</ul>`
        : "<p>—</p>";

    const concernsHtml = (review.concerns || []).length
        ? `<ul>${review.concerns.map(item => `<li>${item}</li>`).join("")}</ul>`
        : "<p>—</p>";

    const inconsistenciesHtml = (review.inconsistencies || []).length
        ? `<ul>${review.inconsistencies.map(item => `<li><strong>${item.topic}:</strong> ${item.description} (${item.severity})</li>`).join("")}</ul>`
        : "<p>No conflicts detected.</p>";

    const readinessList = readinessPairs
        .map(pair => `<li><strong>${pair.question}</strong><br/><em>${pair.answer || "Not answered"}</em></li>`)
        .join("");

    const readinessHtml = readinessList ? `<ol>${readinessList}</ol>` : "<p>No readiness responses captured.</p>";

    const recommendationsHtml = (review.recommendations || []).length
        ? `<ul>${review.recommendations.map(item => `<li>${item}</li>`).join("")}</ul>`
        : "<p>—</p>";

    const integrityHtml = renderIntegrityHtml(integrity);
    const chartAttempts = buildAttemptSeriesForCharts(historicalAttempts, {
        attemptNumber: currentAttemptNumber,
        status: 'passed',
        score: technicalSummary.score
    });
    const scoreChartHtml = renderScoreDonutChart(technicalSummary);
    const attemptTrendHtml = chartAttempts.length ? renderAttemptTrendChart(chartAttempts) : "";
    const improvementSummaryHtml = renderImprovementSummary(historicalAttempts, technicalSummary, currentAttemptNumber);

    const historicalHtml = renderHistoricalAttemptsHtml(historicalAttempts);

    const historicalInsightsHtml = historicalInsights.length
        ? `<ul>${historicalInsights.map(item => `<li>${item}</li>`).join("")}</ul>`
        : "<p>—</p>";
    const resumeDisplay = resumeAttachmentPath
        ? "Attached to this email (captured at submission time)."
        : "Resume not available";

    const emailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 720px; margin:0 auto; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
            <div style="background:#0f172a; color:#fff; padding:16px 20px;">
                <h2 style="margin:0;font-size:18px;">${job?.jobTitle || "Role"} – Assessment Summary</h2>
                <p style="margin:6px 0 0 0;font-size:13px;">${job?.companyName || employer?.companyName || "Atract Hiring"}</p>
            </div>
            <div style="padding:20px;">
                <p><strong>Candidate:</strong> ${jobSeeker?.fullName || "N/A"} (${jobSeeker?.email || "N/A"})</p>
                <p><strong>Experience:</strong> ${jobSeeker?.experienceInYears ?? "N/A"} years</p>
                <p><strong>Current CTC:</strong> ${jobSeeker?.currentCTC ? `${jobSeeker.currentCTC} LPA` : "Not shared"}</p>
                <p><strong>Notice Period:</strong> ${jobSeeker?.noticePeriod ?? "N/A"} days</p>
                <p><strong>Technical Score:</strong> ${technicalSummary.score}/100 (${technicalSummary.passed ? "Passed" : "Failed"})</p>
                <p><strong>Fit Verdict:</strong> ${review.fitVerdict}</p>
                <p style="margin-top:12px;">${review.summary}</p>

                <div style="margin:16px 0; padding:16px; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc;">
                    <h3 style="margin:0 0 12px 0; font-size:16px; color:#0f172a;">Performance Snapshot</h3>
                    ${scoreChartHtml}
                    ${attemptTrendHtml ? `<div style="margin-top:16px;">${attemptTrendHtml}</div>` : ""}
                    ${improvementSummaryHtml}
                    <table style="width:100%; border-collapse:collapse; margin-top:12px;">
                        <tr>
                            <td style="padding:6px 0; border-bottom:1px dashed #dbeafe; color:#475569;"><strong>Weak Areas</strong></td>
                            <td style="padding:6px 0; border-bottom:1px dashed #dbeafe; color:#0f172a;">${(technicalSummary.weakAreas || []).join(", ") || "None"}</td>
                        </tr>
                        <tr>
                            <td style="padding:6px 0; color:#475569;"><strong>Integrity Snapshot</strong></td>
                            <td style="padding:6px 0; color:#0f172a;">Copy ${integrity.copyEvents || 0} · Tab switches ${integrity.tabBlurEvents || 0} · Focus ${formatDurationMs(integrity.totalFocusedMs || 0)}</td>
                        </tr>
                    </table>
                </div>

                <h3 style="margin-top:20px;">Highlights</h3>
                ${highlightsHtml}

                <h3>Concerns</h3>
                ${concernsHtml}

                <h3>Inconsistencies</h3>
                ${inconsistenciesHtml}

                <h3>Recommended Follow-ups</h3>
                ${recommendationsHtml}

                <h3>Assessment Integrity Signals</h3>
                ${integrityHtml}

                <h3>Readiness Responses</h3>
                ${readinessHtml}

                <h3>Historical Insights</h3>
                ${historicalInsightsHtml}

                ${historicalHtml}

                <h3>Candidate Snapshot</h3>
                <ul>
                    <li>Experience: ${jobSeeker?.experienceInYears ?? "N/A"} years</li>
                    <li>Notice period: ${jobSeeker?.noticePeriod ?? "N/A"} days</li>
                    <li>Highest qualification: ${jobSeeker?.highestQualification || "N/A"}</li>
                    <li>Phone: ${jobSeeker?.mobileNumber || "N/A"}</li>
                    <li>Resume: ${resumeDisplay}</li>
                </ul>
            </div>
            <div style="background:#f8fafc; padding:14px 20px; font-size:12px; color:#475569;">
                This digest was automatically generated to help you review ${jobSeeker?.fullName || "the candidate"} faster.
            </div>
        </div>
    `;

    const attachments = [];
    if (resumeAttachmentPath) {
        attachments.push({
            filename: path.basename(resumeAttachmentPath),
            path: resumeAttachmentPath,
            contentType: detectMimeType(resumeAttachmentPath)
        });
    }

    await sendMail(to, subject, emailHtml, attachments);
}

function renderIntegrityHtml(integrity = {}) {
    const focusMinutes = Math.round((integrity.totalFocusedMs || 0) / 60000);
    const rows = [
        { label: "Copy attempts", value: integrity.copyEvents || 0, display: `${integrity.copyEvents || 0}`, max: 10 },
        { label: "Paste attempts", value: integrity.pasteEvents || 0, display: `${integrity.pasteEvents || 0}`, max: 10 },
        { label: "Tab/window switches", value: integrity.tabBlurEvents || 0, display: `${integrity.tabBlurEvents || 0}`, max: 10 },
        { label: "Times resumed", value: integrity.resumeCount || 0, display: `${integrity.resumeCount || 0}`, max: 6 },
        { label: "Focused minutes", value: focusMinutes, display: formatDurationMs(integrity.totalFocusedMs || 0), max: 120 }
    ];

    return `
        <div>
            ${rows.map(row => {
                const pct = Math.min(100, (row.value / (row.max || 1)) * 100);
                return `
                    <div style="margin-bottom:8px;">
                        <div style="font-weight:600;color:#0f172a;margin-bottom:2px;">
                            ${row.label}: <span style="font-weight:700;">${row.display}</span>
                        </div>
                        <div style="height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;">
                            <div style="height:8px;border-radius:999px;background:linear-gradient(90deg,#2563eb,#7c3aed);width:${pct}%;"></div>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function formatDurationMs(ms = 0) {
    if (!ms || ms <= 0) {
        return "0s";
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (seconds || !parts.length) parts.push(`${seconds}s`);
    return parts.join(" ");
}

function summarizeIntegrity(integrity = {}) {
    return {
        copyEvents: integrity?.copyEvents ? Number(integrity.copyEvents) : 0,
        pasteEvents: integrity?.pasteEvents ? Number(integrity.pasteEvents) : 0,
        tabBlurEvents: integrity?.tabBlurEvents ? Number(integrity.tabBlurEvents) : 0,
        resumeCount: integrity?.resumeCount ? Number(integrity.resumeCount) : 0,
        totalFocusedMs: integrity?.totalFocusedMs ? Number(integrity.totalFocusedMs) : 0,
        totalSessions: integrity?.totalSessions ? Number(integrity.totalSessions) : 0
    };
}

function buildHistoricalAttemptsSummary(assessment, currentAttemptId) {
    if (!assessment?.attempts?.length) {
        return [];
    }

    return assessment.attempts
        .filter(attempt => attempt.attemptId !== currentAttemptId && attempt.status && attempt.status !== 'in-progress')
        .sort((a, b) => a.attemptNumber - b.attemptNumber)
        .map((attempt) => ({
            attemptNumber: attempt.attemptNumber,
            status: attempt.status,
            score: typeof attempt.score === 'number' ? attempt.score : null,
            completedAt: attempt.completedAt || attempt.updatedAt || null,
            integrity: summarizeIntegrity(attempt.integrity || {}),
            readinessSummary: attempt.readinessReview?.summary || null,
            readinessFit: attempt.readinessReview?.fitVerdict || null
        }));
}

function renderScoreDonutChart(technicalSummary = {}) {
    const total = Number(technicalSummary.totalQuestions) || 10;
    const correct = Number(technicalSummary.correctAnswers) || 0;
    const incorrect = Number(technicalSummary.incorrectAnswers) || Math.max(0, total - correct - (technicalSummary.unanswered || 0));
    const unanswered = Number.isFinite(technicalSummary.unanswered) ? Number(technicalSummary.unanswered) : Math.max(0, total - correct - incorrect);
    const correctPct = total ? Math.round((correct / total) * 100) : 0;
    const incorrectPct = total ? Math.round((incorrect / total) * 100) : 0;
    const unansweredPct = Math.max(0, 100 - correctPct - incorrectPct);
    const donutStyle = `background: conic-gradient(#16a34a 0% ${correctPct}%, #dc2626 ${correctPct}% ${correctPct + incorrectPct}%, #94a3b8 ${correctPct + incorrectPct}% 100%);`;

    const donutHtml = `
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:0 auto;">
            <tr>
                <td style="width:120px; height:120px; border-radius:50%; ${donutStyle} text-align:center; vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:0 auto;">
                        <tr>
                            <td style="width:72px; height:72px; border-radius:50%; background:#ffffff; text-align:center;">
                                <div style="font-size:18px; color:#0f172a; font-weight:bold; margin-top:18px; line-height:1;">${technicalSummary.score}</div>
                                <div style="font-size:11px; color:#94a3b8; line-height:1.2;">/100</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;

    return `
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse; width:100%;">
            <tr>
                <td style="padding:0 16px 12px 0; vertical-align:top;">
                    ${donutHtml}
                </td>
                <td style="padding:0; vertical-align:top;">
                    <ul style="list-style:none; margin:0; padding:0; font-size:13px; color:#475569;">
                        <li style="margin-bottom:4px;"><span style="display:inline-block;width:12px;height:12px;background:#16a34a;border-radius:999px;margin-right:8px;"></span>Correct: ${correct} (${correctPct}%)</li>
                        <li style="margin-bottom:4px;"><span style="display:inline-block;width:12px;height:12px;background:#dc2626;border-radius:999px;margin-right:8px;"></span>Incorrect: ${incorrect} (${incorrectPct}%)</li>
                        <li><span style="display:inline-block;width:12px;height:12px;background:#94a3b8;border-radius:999px;margin-right:8px;"></span>Unanswered: ${unanswered} (${unansweredPct}%)</li>
                    </ul>
                </td>
            </tr>
        </table>
    `;
}

function renderAttemptTrendChart(attempts = []) {
    if (!attempts.length) return "";
    const bars = attempts
        .sort((a, b) => a.attemptNumber - b.attemptNumber)
        .map((attempt) => {
            const width = Math.max(4, Math.min(100, Number(attempt.score) || 0));
            const color = attempt.isCurrent ? '#2563eb' : attempt.status === 'passed' ? '#15803d' : '#dc2626';
            const label = attempt.isCurrent ? `Attempt #${attempt.attemptNumber} (current)` : `Attempt #${attempt.attemptNumber}`;
            return `
                <div style="margin-bottom:8px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px; color:#475569;">
                        <span>${label}</span>
                        <strong style="color:${color};">${attempt.score ?? 'N/A'}</strong>
                    </div>
                    <div style="height:8px; border-radius:999px; background:#e2e8f0;">
                        <div style="height:8px; border-radius:999px; background:${color}; width:${width}%;"></div>
                    </div>
                </div>
            `;
        })
        .join("");

    return `
        <div style="padding:12px; border:1px solid #dbeafe; border-radius:12px; background:#ffffff;">
            <p style="margin:0 0 8px 0; font-size:13px; color:#0f172a; font-weight:600;">Attempt trend</p>
            ${bars}
        </div>
    `;
}

function renderImprovementSummary(historicalAttempts = [], technicalSummary = {}, currentAttemptNumber) {
    if (!historicalAttempts.length) {
        return `<p style="margin:12px 0 0 0; font-size:13px; color:#475569;">First recorded attempt for this candidate.</p>`;
    }

    const lastAttempt = historicalAttempts[historicalAttempts.length - 1];
    const lastScore = typeof lastAttempt.score === 'number' ? lastAttempt.score : null;
    const currentScore = typeof technicalSummary.score === 'number' ? technicalSummary.score : null;
    if (lastScore === null || currentScore === null) {
        return '';
    }

    const delta = currentScore - lastScore;
    const direction = delta > 0 ? 'improved' : delta < 0 ? 'dropped' : 'matched';
    const deltaText = delta === 0 ? 'matched the previous score' : `${delta > 0 ? '+' : ''}${delta}`;
    const descriptor = lastAttempt.status === 'passed' ? 'previous pass' : 'previous attempt';

    return `<p style="margin:12px 0 0 0; font-size:13px; color:#475569;">Compared to ${descriptor} (#${lastAttempt.attemptNumber}, ${lastScore}/100), the candidate ${direction} by ${deltaText} points in attempt #${currentAttemptNumber}.</p>`;
}

function buildAttemptSeriesForCharts(historicalAttempts = [], currentAttempt = null) {
    const series = (historicalAttempts || [])
        .map((attempt) => ({
            attemptNumber: attempt.attemptNumber,
            score: typeof attempt.score === 'number' ? attempt.score : null,
            status: attempt.status
        }))
        .filter(item => item.score !== null);

    if (currentAttempt && typeof currentAttempt.score === 'number') {
        series.push({
            attemptNumber: currentAttempt.attemptNumber,
            score: currentAttempt.score,
            status: currentAttempt.status,
            isCurrent: true
        });
    }

    return series.sort((a, b) => a.attemptNumber - b.attemptNumber);
}

function renderHistoricalAttemptsHtml(attempts = []) {
    if (!attempts.length) {
        return "";
    }

    const rows = attempts.map((attempt) => {
        const duration = formatDurationMs(attempt.integrity?.totalFocusedMs || 0);
        const scoreLabel = typeof attempt.score === "number"
            ? `${attempt.score}/100`
            : "N/A";
        const completed = attempt.completedAt ? formatDateTime(attempt.completedAt) : "—";
        const readiness = attempt.readinessSummary || "—";
        return `
            <tr>
                <td style="padding:6px 8px;border:1px solid #e5e7eb;">${attempt.attemptNumber}</td>
                <td style="padding:6px 8px;border:1px solid #e5e7eb;text-transform:capitalize;">${attempt.status}</td>
                <td style="padding:6px 8px;border:1px solid #e5e7eb;">${scoreLabel}</td>
                <td style="padding:6px 8px;border:1px solid #e5e7eb;">${duration}</td>
                <td style="padding:6px 8px;border:1px solid #e5e7eb;">${completed}</td>
                <td style="padding:6px 8px;border:1px solid #e5e7eb;">${readiness}</td>
            </tr>
        `;
    }).join("");

    return `
        <h3>Previous Attempts Overview</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px;">
            <thead>
                <tr style="background:#f1f5f9;">
                    <th style="padding:6px 8px;border:1px solid #e5e7eb;">Attempt</th>
                    <th style="padding:6px 8px;border:1px solid #e5e7eb;">Status</th>
                    <th style="padding:6px 8px;border:1px solid #e5e7eb;">Score</th>
                    <th style="padding:6px 8px;border:1px solid #e5e7eb;">Focused time</th>
                    <th style="padding:6px 8px;border:1px solid #e5e7eb;">Completed</th>
                    <th style="padding:6px 8px;border:1px solid #e5e7eb;">Readiness summary</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function ensureAttemptIntegrity(attempt) {
    if (!attempt.integrity) {
        attempt.integrity = {
            copyEvents: 0,
            pasteEvents: 0,
            tabBlurEvents: 0,
            resumeCount: 0,
            totalFocusedMs: 0,
            totalSessions: 0,
            focusSessions: []
        };
    } else {
        attempt.integrity.copyEvents = attempt.integrity.copyEvents || 0;
        attempt.integrity.pasteEvents = attempt.integrity.pasteEvents || 0;
        attempt.integrity.tabBlurEvents = attempt.integrity.tabBlurEvents || 0;
        attempt.integrity.resumeCount = attempt.integrity.resumeCount || 0;
        attempt.integrity.totalFocusedMs = attempt.integrity.totalFocusedMs || 0;
        attempt.integrity.totalSessions = attempt.integrity.totalSessions || 0;
        if (!Array.isArray(attempt.integrity.focusSessions)) {
            attempt.integrity.focusSessions = [];
        }
    }
    return attempt.integrity;
}

function applyIntegrityEvent(attempt, eventType, eventTime) {
    ensureAttemptIntegrity(attempt);
    switch (eventType) {
        case 'copy':
            attempt.integrity.copyEvents += 1;
            break;
        case 'paste':
            attempt.integrity.pasteEvents += 1;
            break;
        case 'tab-blur':
        case 'window-blur':
            attempt.integrity.tabBlurEvents += 1;
            endFocusSession(attempt, eventTime);
            break;
        case 'focus-start':
            startFocusSession(attempt, eventTime);
            break;
        case 'focus-end':
            endFocusSession(attempt, eventTime);
            break;
        default:
            break;
    }
}

function startFocusSession(attempt, time) {
    const integrity = ensureAttemptIntegrity(attempt);
    const hasActive = integrity.focusSessions.some(session => !session.endedAt);
    if (hasActive) {
        return;
    }
    integrity.focusSessions.push({ startedAt: time, endedAt: null });
    integrity.totalSessions = (integrity.totalSessions || 0) + 1;
    if (integrity.totalSessions > 1) {
        integrity.resumeCount = (integrity.resumeCount || 0) + 1;
    }
}

function endFocusSession(attempt, time) {
    const integrity = ensureAttemptIntegrity(attempt);
    const activeSession = [...integrity.focusSessions].reverse().find(session => !session.endedAt);
    if (!activeSession) {
        return;
    }
    activeSession.endedAt = time;
    const duration = Math.max(0, time.getTime() - new Date(activeSession.startedAt).getTime());
    integrity.totalFocusedMs = (integrity.totalFocusedMs || 0) + duration;
}

function closeActiveFocusSession(attempt, time) {
    endFocusSession(attempt, time);
}

function detectMimeType(filename = "") {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case ".pdf":
            return "application/pdf";
        case ".doc":
            return "application/msword";
        case ".docx":
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        case ".rtf":
            return "application/rtf";
        default:
            return "application/octet-stream";
    }
}

function normalizeReviewInconsistency(entry = {}) {
    const allowedSeverities = ['info', 'warning', 'critical', 'none'];
    const severity = typeof entry.severity === 'string'
        ? entry.severity.toLowerCase()
        : 'info';
    return {
        topic: sanitizeText(entry.topic) || 'General',
        description: sanitizeText(entry.description) || 'No description provided',
        severity: allowedSeverities.includes(severity) ? severity : 'info'
    };
}

function getValueFromPath(source, path) {
    if (!source || !path) return undefined;
    const segments = path.split('.');
    let current = source;
    for (const segment of segments) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[segment];
    }
    return current;
}

function isAssessmentRequirementSatisfied(value, requirement) {
    if (requirement.type === 'file') {
        return Boolean(value);
    }

    if (requirement.type === 'number') {
        if (value === null || value === undefined) {
            return false;
        }
        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) {
            return false;
        }
        if (typeof requirement.min === 'number' && numericValue < requirement.min) {
            return false;
        }
        if (typeof requirement.max === 'number' && numericValue > requirement.max) {
            return false;
        }
        return true;
    }

    const stringValue = value !== undefined && value !== null ? `${value}`.trim() : '';
    if (!stringValue.length) {
        return false;
    }
    if (typeof requirement.minLength === 'number' && stringValue.length < requirement.minLength) {
        return false;
    }
    return true;
}

function buildAssessmentProfileRequirementSnapshot(jobSeeker) {
    const requirements = assessmentProfileRequirements.map((requirement) => {
        const value = getValueFromPath(jobSeeker, requirement.path || requirement.key);
        const isSatisfied = isAssessmentRequirementSatisfied(value, requirement);
        return {
            key: requirement.key,
            label: requirement.label,
            type: requirement.type,
            editable: requirement.editable !== false,
            requiredForAssessment: requirement.requiredForAssessment !== false,
            helperText: requirement.helperText || null,
            section: requirement.section || 'general',
            accept: requirement.accept || null,
            min: requirement.min ?? null,
            max: requirement.max ?? null,
            step: requirement.step ?? null,
            value: requirement.type === 'file' ? null : (value ?? ''),
            hasFileValue: requirement.type === 'file' ? Boolean(value) : undefined,
            isSatisfied
        };
    });

    const missingKeys = requirements
        .filter(item => item.requiredForAssessment && !item.isSatisfied)
        .map(item => item.key);

    return {
        requirements,
        missingKeys,
        allSatisfied: missingKeys.length === 0
    };
}

// Get email alert on login setting
const getEmailAlertSetting = async (req, res) => {
    try {
        const jobSeeker = await JobSeeker.findById(req.userId).select('emailAlertOnLogin email');
        
        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                emailAlertOnLogin: jobSeeker.emailAlertOnLogin || false,
                email: jobSeeker.email
            }
        });
    } catch (error) {
        console.error("Get Email Alert Setting Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get job alert on resume match setting
const getJobMatchAlertSetting = async (req, res) => {
    try {
        const jobSeeker = await JobSeeker.findById(req.userId).select('jobAlertOnResumeMatch email');

        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                jobAlertOnResumeMatch: jobSeeker.jobAlertOnResumeMatch || false,
                email: jobSeeker.email
            }
        });
    } catch (error) {
        console.error("Get Job Match Alert Setting Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Update email alert on login setting
const updateEmailAlertSetting = async (req, res) => {
    try {
        const { emailAlertOnLogin } = req.body;

        if (typeof emailAlertOnLogin !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "emailAlertOnLogin must be a boolean"
            });
        }

        const jobSeeker = await JobSeeker.findByIdAndUpdate(
            req.userId,
            { emailAlertOnLogin },
            { new: true }
        ).select('emailAlertOnLogin email');

        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                emailAlertOnLogin: jobSeeker.emailAlertOnLogin,
                email: jobSeeker.email
            }
        });
    } catch (error) {
        console.error("Update Email Alert Setting Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Update job alert on resume match setting
const updateJobMatchAlertSetting = async (req, res) => {
    try {
        const { jobAlertOnResumeMatch } = req.body;

        if (typeof jobAlertOnResumeMatch !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "jobAlertOnResumeMatch must be a boolean"
            });
        }

        const jobSeeker = await JobSeeker.findByIdAndUpdate(
            req.userId,
            { jobAlertOnResumeMatch },
            { new: true }
        ).select('jobAlertOnResumeMatch email');

        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                jobAlertOnResumeMatch: jobSeeker.jobAlertOnResumeMatch,
                email: jobSeeker.email
            }
        });
    } catch (error) {
        console.error("Update Job Match Alert Setting Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Send OTP for settings verification
const sendSettingsOtp = async (req, res) => {
    try {
        const jobSeeker = await JobSeeker.findById(req.userId).select('email fullName');
        
        if (!jobSeeker || !jobSeeker.email) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found or email not available"
            });
        }

        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000);

        // Save or update OTP with a unique key for settings
        await UserOtp.findOneAndUpdate(
            { userData: `settings_${jobSeeker.email}` },
            { userOtp: otp },
            { new: true, upsert: true }
        );

        // Send email OTP
        const htmlContent = `
            <div style="font-family: Roboto, sans-serif; max-width: 500px; margin: auto; border-radius: 10px; padding: 25px; border: 1px solid #e5e7eb;">
                <h2 style="text-align:center; color:#2563eb; margin-bottom:20px;">Verify Email Alert Setting - Atract</h2>

                <p style="font-size:15px; color:#374151;">Hello ${jobSeeker.fullName || 'User'},</p>
                <p style="font-size:15px; color:#374151;">Use the OTP below to verify and update your email alert on login setting:</p>

                <div style="text-align:center; margin: 25px 0;">
                    <span style="display:inline-block; padding:12px 20px; font-size:28px; font-weight:bold; border-radius:8px; background:#f3f4f6; letter-spacing:10px;">
                        ${otp}
                    </span>
                </div>

                <p style="font-size:15px; color:#374151;">
                    If you did not initiate this request, please ignore this email.
                </p>

                <p style="font-size:14px; color:#6b7280; text-align:center; margin-top:25px;">
                    © ${new Date().getFullYear()} Atract — Smart AI Hiring Platform
                </p>
            </div>
        `;

        await sendMail(jobSeeker.email, "Verify Email Alert Setting - Atract", htmlContent);

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });
    } catch (error) {
        console.error("Send Settings OTP Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Verify OTP for settings
const verifySettingsOtp = async (req, res) => {
    try {
        const { otp, action } = req.body;

        if (!otp || typeof otp !== 'string') {
            return res.status(400).json({
                success: false,
                message: "OTP is required"
            });
        }

        if (!action || !['enable', 'disable'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be 'enable' or 'disable'"
            });
        }

        const jobSeeker = await JobSeeker.findById(req.userId).select('email');
        
        if (!jobSeeker || !jobSeeker.email) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found or email not available"
            });
        }

        // Find OTP record
        const otpRecord = await UserOtp.findOne({ userData: `settings_${jobSeeker.email}` });

        if (!otpRecord) {
            return res.status(200).json({
                success: false,
                message: "OTP not found. Please request a new OTP."
            });
        }

        const otpNumber = parseInt(otp, 10);

        if (otpRecord.userOtp !== otpNumber) {
            return res.status(200).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        // OTP is valid → delete OTP entry and update email alert setting
        await UserOtp.deleteMany({ userData: `settings_${jobSeeker.email}` });
        
        const emailAlertValue = action === 'enable';
        const updatedJobSeeker = await JobSeeker.findByIdAndUpdate(
            req.userId,
            { emailAlertOnLogin: emailAlertValue },
            { new: true }
        ).select('emailAlertOnLogin email');

        return res.status(200).json({
            success: true,
            message: `OTP verified successfully. Email alert on login ${action === 'enable' ? 'enabled' : 'disabled'}.`
        });
    } catch (error) {
        console.error("Verify Settings OTP Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Send OTP for password reset
const sendPasswordResetOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Valid email is required"
            });
        }

        // Check if job seeker exists
        const jobSeeker = await JobSeeker.findOne({ email: email.toLowerCase() });

        if (!jobSeeker) {
            // Don't reveal if email exists or not for security
            return res.status(200).json({
                success: true,
                message: "If an account exists with this email, an OTP has been sent."
            });
        }

        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000);

        // Save or update OTP with a unique key for password reset
        await UserOtp.findOneAndUpdate(
            { userData: `jobseeker_password_reset_${email.toLowerCase()}` },
            { userOtp: otp },
            { new: true, upsert: true }
        );

        // Send email OTP
        const htmlContent = `
            <div style="font-family: Roboto, sans-serif; max-width: 500px; margin: auto; border-radius: 10px; padding: 25px; border: 1px solid #e5e7eb;">
                <h2 style="text-align:center; color:#2563eb; margin-bottom:20px;">Password Reset Request - Atract</h2>

                <p style="font-size:15px; color:#374151;">Hello ${jobSeeker.fullName || 'User'},</p>
                <p style="font-size:15px; color:#374151;">We received a request to reset your password. Use the OTP below to verify your identity:</p>

                <div style="text-align:center; margin: 25px 0;">
                    <span style="display:inline-block; padding:12px 20px; font-size:28px; font-weight:bold; border-radius:8px; background:#f3f4f6; letter-spacing:10px;">
                        ${otp}
                    </span>
                </div>

                <p style="font-size:15px; color:#374151;">
                    This OTP will expire in 10 minutes. If you did not request a password reset, please ignore this email and your password will remain unchanged.
                </p>

                <p style="font-size:14px; color:#6b7280; text-align:center; margin-top:25px;">
                    © ${new Date().getFullYear()} Atract — Smart AI Hiring Platform
                </p>
            </div>
        `;

        await sendMail(jobSeeker.email, "Password Reset Request - Atract", htmlContent);

        return res.status(200).json({
            success: true,
            message: "If an account exists with this email, an OTP has been sent."
        });
    } catch (error) {
        console.error("Send password reset OTP error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Verify OTP for password reset
const verifyPasswordResetOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Valid email is required"
            });
        }

        if (!otp || otp.length !== 4 || !/^\d{4}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: "Valid 4-digit OTP is required"
            });
        }

        // Check OTP
        const otpRecord = await UserOtp.findOne({
            userData: `jobseeker_password_reset_${email.toLowerCase()}`
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new OTP."
            });
        }

        if (otpRecord.userOtp !== parseInt(otp)) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again."
            });
        }

        // Check if OTP is expired (10 minutes)
        // Use updatedAt if available, otherwise use createdAt, or current time as fallback
        const otpTimestamp = otpRecord.updatedAt || otpRecord.createdAt || new Date();
        const otpAge = Date.now() - new Date(otpTimestamp).getTime();
        const tenMinutes = 10 * 60 * 1000;
        if (otpAge > tenMinutes) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP."
            });
        }

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully"
        });
    } catch (error) {
        console.error("Verify password reset OTP error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword, confirmPassword } = req.body;

        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Valid email is required"
            });
        }

        if (!otp || otp.length !== 4 || !/^\d{4}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: "Valid 4-digit OTP is required"
            });
        }

        if (!newPassword || !passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "Password must contain uppercase, lowercase, number, special character & minimum 8 characters"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        // Verify OTP first
        const otpRecord = await UserOtp.findOne({
            userData: `jobseeker_password_reset_${email.toLowerCase()}`
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new OTP."
            });
        }

        if (otpRecord.userOtp !== parseInt(otp)) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again."
            });
        }

        // Check if OTP is expired (10 minutes)
        // Use updatedAt if available, otherwise use createdAt, or current time as fallback
        const otpTimestamp = otpRecord.updatedAt || otpRecord.createdAt || new Date();
        const otpAge = Date.now() - new Date(otpTimestamp).getTime();
        const tenMinutes = 10 * 60 * 1000;
        if (otpAge > tenMinutes) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP."
            });
        }

        // Find job seeker
        const jobSeeker = await JobSeeker.findOne({ email: email.toLowerCase() });

        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        jobSeeker.password = hashedPassword;
        await jobSeeker.save();

        // Delete OTP record
        await UserOtp.deleteOne({ userData: `jobseeker_password_reset_${email.toLowerCase()}` });

        // Send password reset confirmation email
        const htmlContent = `
            <div style="font-family: Roboto, sans-serif; max-width: 500px; margin: auto; border-radius: 10px; padding: 25px; border: 1px solid #e5e7eb;">
                <h2 style="text-align:center; color:#2563eb; margin-bottom:20px;">Password Updated Successfully - Atract</h2>

                <p style="font-size:15px; color:#374151;">Hello ${jobSeeker.fullName || 'User'},</p>
                <p style="font-size:15px; color:#374151;">Your password has been successfully updated.</p>

                <div style="background:#f0f9ff; border-radius:8px; padding:16px; margin:20px 0; border-left:4px solid #2563eb;">
                    <p style="margin:0; font-size:14px; color:#1e40af;">
                        <strong>Security Notice:</strong> If you did not make this change, please contact our support team immediately.
                    </p>
                </div>

                <p style="font-size:15px; color:#374151;">
                    You can now log in with your new password. For security reasons, we recommend using a strong, unique password.
                </p>

                <div style="margin:24px 0; text-align:center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3010'}/signin/jobseeker" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">Login to Your Account</a>
                </div>

                <p style="font-size:14px; color:#6b7280; text-align:center; margin-top:25px;">
                    © ${new Date().getFullYear()} Atract — Smart AI Hiring Platform
                </p>
            </div>
        `;

        await sendMail(jobSeeker.email, "Password Updated Successfully - Atract", htmlContent);

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. Please check your email for confirmation."
        });
    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    generateOtp,
    checkOtp,
    registerJobSeeker,
    loginJobSeeker,
    getProfile,
    getAssessmentProfileRequirements,
    updateProfile,
    viewResume,
    viewSharedResume,
    downloadResume,
    deleteResume,
    toggleSaveJob,
    getSavedJobs,
    getEmailAlertSetting,
    getJobMatchAlertSetting,
    updateEmailAlertSetting,
    updateJobMatchAlertSetting,
    sendSettingsOtp,
    verifySettingsOtp,
    checkJobSaved,
    getJobApplicationsList,
    getJobAssessmentStatus,
    startJobAssessment,
    updateJobAssessmentProgress,
    recordJobAssessmentActivity,
    submitJobAssessment,
    applyToJob,
    createAssessmentRetestPayment,
    verifyAssessmentRetestPayment,
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPassword
};

// Create Razorpay order for assessment retest payment
async function createAssessmentRetestPayment(req, res) {
    try {

        const { jobId } = req.params;
        const jobSeekerId = req.userId;

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }

        const job = await Job.findById(jobId).select('jobTitle companyName status applicationClosingDate');
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // Check if job is still accepting applications
        const today = new Date();
        const closingDate = job.applicationClosingDate ? new Date(job.applicationClosingDate) : null;
        const isClosed = closingDate && closingDate < today;

        if (job.status !== 'Active' || isClosed) {
            return res.status(400).json({
                success: false,
                message: "This job is not accepting applications right now."
            });
        }

        const assessment = await JobAssessment.findOne({ job: jobId, jobSeeker: jobSeekerId });
        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Assessment not found"
            });
        }

        // Check if retest payment is actually needed
        const calculatedNextAttemptNumber = (assessment.latestAttemptNumber || 0) + 1;
        if (calculatedNextAttemptNumber <= 1) {
            return res.status(400).json({
                success: false,
                message: "First attempt is free. No payment required."
            });
        }

        if (calculatedNextAttemptNumber > 3) {
            return res.status(400).json({
                success: false,
                message: "Maximum assessment attempts (3) reached."
            });
        }

        if (assessment.retestAmountPaid) {
            return res.status(400).json({
                success: false,
                message: "Payment already completed for retest."
            });
        }

        const amount = 99; // ₹99 for retest
        const currency = "INR";

        // Create Razorpay order
        const options = {
            amount: amount * 100, // Razorpay expects amount in paisa
            currency: currency,
            receipt: `retest_${jobId.slice(-8)}_${jobSeekerId.slice(-8)}_${Date.now().toString().slice(-6)}`,
            notes: {
                jobId: jobId,
                jobSeekerId: jobSeekerId,
                type: "assessment_retest",
                attemptNumber: calculatedNextAttemptNumber
            }
        };

        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            orderId: order.id,
            amount: amount,
            currency: currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            notes: options.notes,
            nextAttemptNumber: calculatedNextAttemptNumber
        });

    } catch (error) {
        console.error("Assessment retest payment creation error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create payment order"
        });
    }
};

// Verify Razorpay payment for assessment retest
async function verifyAssessmentRetestPayment(req, res) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, jobId } = req.body;
        const jobSeekerId = req.userId;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !jobId) {
            return res.status(400).json({
                success: false,
                message: "Missing required payment verification parameters"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }

        // Verify payment signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed"
            });
        }

        // Get payment details from Razorpay
        const razorpay = getRazorpayInstance();
        const payment = await razorpay.payments.fetch(razorpay_payment_id);

        if (payment.status !== "captured") {
            return res.status(400).json({
                success: false,
                message: "Payment not captured"
            });
        }

        // Find and update assessment
        const assessment = await JobAssessment.findOne({ job: jobId, jobSeeker: jobSeekerId });
        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Assessment not found"
            });
        }

        // Update retest payment flag
        assessment.retestAmountPaid = true;
        assessment.lastInteractionAt = new Date();
        await assessment.save();

        // Create payment record
        const paymentRecord = new Payment({
            jobSeekerId: jobSeekerId,
            planType: 'assessment_retest',
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            amount: payment.amount / 100, // Convert from paisa to rupees
            currency: payment.currency,
            status: 'paid',
            productType: 'payPerAssessment'
        });

        await paymentRecord.save();

        res.status(200).json({
            success: true,
            message: "Payment verified successfully. You can now take your retest.",
            data: {
                assessmentId: assessment._id,
                nextAttemptNumber: (assessment.latestAttemptNumber || 0) + 1
            }
        });

    } catch (error) {
        console.error("Assessment retest payment verification error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Payment verification failed"
        });
    }
};
