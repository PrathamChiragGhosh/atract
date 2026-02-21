const UserOtp = require("../models/userOtp.js");
const sendMail = require("../utils/sendMail.js");
const Employer = require("../models/employer.js");
const JobApplication = require("../models/jobApplication.js");
const Job = require("../models/job.js");
const JobSeeker = require("../models/jobSeeker.js");
const JobAssessment = require("../models/jobAssessment.js");
const VideoProctoringAssessment = require("../models/videoProctoringAssessment.js");
const SmartPostJob = require("../models/smartPostJob.js");
const smartPostService = require("../services/smartPostService.js");
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

// Email Regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password regex: upper, lower, number, special, 8+ chars
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

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

        // Check if Employer already exists
        const employer = await Employer.findOne({
            email: loginValue.toLowerCase()
        });

        if (employer) {
            return res.status(200).json({
                success: false,
                alreadyExists: true,
                message: "Account already exists with this email. Use a different email to continue."
            });
        }

        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000);

        // Save or update OTP (use a different key to separate from job seeker OTPs)
        await UserOtp.findOneAndUpdate(
            { userData: `employer_${loginValue}` },
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

        // Find OTP record (using employer prefix)
        const otpRecord = await UserOtp.findOne({ userData: `employer_${loginValue}` });

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
        await UserOtp.deleteMany({ userData: `employer_${loginValue}` });

        // Check if Employer already exists
        const employer = await Employer.findOne({
            email: loginValue.toLowerCase()
        });

        if (employer) {
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



const registerEmployer = async (req, res) => {
    try {
        const { fullName, email, password, companyName } = req.body;

        if (!fullName || !email || !password || !companyName) {
            return res.status(400).json({
                success: false,
                message: "Full name, email, password and company name are required",
            });
        }

        if (fullName.length < 3 || fullName.length > 40) {
            return res.status(400).json({
                success: false,
                message: "Full name must be between 3 and 40 characters",
            });
        }

        if (companyName.length < 2 || companyName.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Company name must be between 2 and 100 characters",
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
        const existingUser = await Employer.findOne({ email: email.toLowerCase() });

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
        const newUser = await Employer.create({
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,
            companyName,
        });

        const token = jwt.sign({ userId: newUser._id, userName: newUser.fullName }, process.env.JWT_SECRET);


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



const loginEmployer = async (req, res) => {
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

        const user = await Employer.findOne({ email: email.toLowerCase() });

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

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// GST Number validation regex (Indian GST format: 15 characters)
// Format: 2 digits (state code) + 10 alphanumeric (PAN) + 1 digit (entity number) + 1 letter Z + 1 digit (check digit)
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Get employer profile
const getProfile = async (req, res) => {
    try {
        const employer = await Employer.findById(req.userId).select('-password');

        // console.log("yes");

        if (!employer) {
            return res.status(404).json({
                success: false,
                message: "Employer not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: employer
        });

    } catch (error) {
        console.error("Get Profile Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Update employer profile
const updateProfile = async (req, res) => {
    try {
        // Ensure req.body exists (for FormData/multipart requests)
        if (!req.body) {
            return res.status(400).json({
                success: false,
                message: "Request body is missing"
            });
        }

        const {
            fullName,
            mobileNumber,
            gender,
            address,
            gstNumber,
            companyName,
            companyAddress,
            companyWebsite,
            companyDescription,
            industryType,
            companySize,
            yearEstablished,
            profilePicture,
            companyLogo
        } = req.body || {};

        // Get current employer
        const currentEmployer = await Employer.findById(req.userId);
        if (!currentEmployer) {
            return res.status(404).json({
                success: false,
                message: "Employer not found"
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
            if (mobileNumber && mobileNumber.length > 0) {
                // Basic mobile validation (10 digits)
                const mobileRegex = /^[0-9]{10}$/;
                if (!mobileRegex.test(mobileNumber.replace(/\D/g, ''))) {
                    return res.status(400).json({
                        success: false,
                        message: "Mobile number must be 10 digits"
                    });
                }
                updateData.mobileNumber = mobileNumber.replace(/\D/g, '');
            } else {
                updateData.mobileNumber = "";
            }
        }

        if (gender !== undefined) {
            if (gender && !["male", "female", "other"].includes(gender)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid gender value"
                });
            }
            updateData.gender = gender || null;
        }

        if (address !== undefined) {
            updateData.address = address ? address.trim() : "";
        }

        if (gstNumber !== undefined) {
            if (gstNumber && gstNumber.length > 0) {
                const cleanGst = gstNumber.trim().toUpperCase().replace(/\s/g, '');
                if (!gstRegex.test(cleanGst)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid GST number format. GST number must be 15 characters in format: 22AAAAA0000A1Z5"
                    });
                }
                updateData.gstNumber = cleanGst;
            } else {
                updateData.gstNumber = "";
            }
        }

        if (companyName !== undefined) {
            if (companyName.length < 2 || companyName.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Company name must be between 2 and 100 characters"
                });
            }
            updateData.companyName = companyName.trim();
        }

        if (companyAddress !== undefined) {
            updateData.companyAddress = companyAddress ? companyAddress.trim() : "";
        }

        if (companyWebsite !== undefined) {
            if (companyWebsite && companyWebsite.length > 0) {
                // Basic URL validation
                const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
                if (!urlRegex.test(companyWebsite)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid website URL format"
                    });
                }
                updateData.companyWebsite = companyWebsite.trim();
            } else {
                updateData.companyWebsite = "";
            }
        }

        if (companyDescription !== undefined) {
            if (companyDescription && companyDescription.length > 2000) {
                return res.status(400).json({
                    success: false,
                    message: "Company description must be less than 2000 characters"
                });
            }
            updateData.companyDescription = companyDescription ? companyDescription.trim() : "";
        }

        if (industryType !== undefined) {
            updateData.industryType = industryType ? industryType.trim() : "";
        }

        if (companySize !== undefined) {
            if (companySize && !["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"].includes(companySize)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid company size value"
                });
            }
            updateData.companySize = companySize || null;
        }

        if (yearEstablished !== undefined) {
            if (yearEstablished) {
                const year = parseInt(yearEstablished);
                if (isNaN(year) || year < 1800 || year > new Date().getFullYear()) {
                    return res.status(400).json({
                        success: false,
                        message: `Year established must be between 1800 and ${new Date().getFullYear()}`
                    });
                }
                updateData.yearEstablished = year;
            } else {
                updateData.yearEstablished = null;
            }
        }

        // Handle profile picture - check if it's a file upload or base64 string
        if (req.files && req.files.profilePicture && req.files.profilePicture[0]) {
            // Convert file buffer to base64
            const file = req.files.profilePicture[0];
            const base64 = file.buffer.toString('base64');
            const dataUri = `data:${file.mimetype};base64,${base64}`;
            updateData.profilePicture = dataUri;
        } else if (profilePicture !== undefined) {
            // Use base64 string from body, or set to null if empty string (for removal)
            if (profilePicture === "" || profilePicture === null) {
                updateData.profilePicture = null;
            } else {
                updateData.profilePicture = profilePicture;
            }
        }

        // Handle company logo - check if it's a file upload or base64 string
        if (req.files && req.files.companyLogo && req.files.companyLogo[0]) {
            // Convert file buffer to base64
            const file = req.files.companyLogo[0];
            const base64 = file.buffer.toString('base64');
            const dataUri = `data:${file.mimetype};base64,${base64}`;
            updateData.companyLogo = dataUri;
        } else if (companyLogo !== undefined) {
            // Use base64 string from body, or set to null if empty string (for removal)
            if (companyLogo === "" || companyLogo === null) {
                updateData.companyLogo = null;
            } else {
                updateData.companyLogo = companyLogo;
            }
        }

        // Update the employer
        const updatedEmployer = await Employer.findByIdAndUpdate(
            req.userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedEmployer) {
            return res.status(404).json({
                success: false,
                message: "Employer not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedEmployer
        });

    } catch (error) {
        console.error("Update Profile Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getNotificationSettings = async (req, res) => {
    try {
        const employer = await Employer.findById(req.userId).select('notificationPreferences email');
        if (!employer) {
            return res.status(404).json({
                success: false,
                message: "Employer not found"
            });
        }

        const notifyApplicationsWithoutTest =
            employer.notificationPreferences?.notifyApplicationsWithoutTest !== false;
        const notifyBasicTestCompletion =
            employer.notificationPreferences?.notifyBasicTestCompletion !== false;

        return res.status(200).json({
            success: true,
            data: {
                notifyApplicationsWithoutTest,
                notifyBasicTestCompletion
            }
        });
    } catch (error) {
        console.error("Get notification settings error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load notification settings"
        });
    }
};

const updateNotificationSettings = async (req, res) => {
    try {
        const { notifyApplicationsWithoutTest, notifyBasicTestCompletion } = req.body || {};

        if (notifyApplicationsWithoutTest !== undefined && typeof notifyApplicationsWithoutTest !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "notifyApplicationsWithoutTest must be boolean"
            });
        }

        if (notifyBasicTestCompletion !== undefined && typeof notifyBasicTestCompletion !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "notifyBasicTestCompletion must be boolean"
            });
        }

        const updateFields = {};

        if (typeof notifyApplicationsWithoutTest === "boolean") {
            updateFields["notificationPreferences.notifyApplicationsWithoutTest"] = notifyApplicationsWithoutTest;
        }

        if (typeof notifyBasicTestCompletion === "boolean") {
            updateFields["notificationPreferences.notifyBasicTestCompletion"] = notifyBasicTestCompletion;
        }

        if (!Object.keys(updateFields).length) {
            return res.status(400).json({
                success: false,
                message: "No valid notification preference provided."
            });
        }

        const employer = await Employer.findByIdAndUpdate(
            req.userId,
            { $set: updateFields },
            { new: true, select: "notificationPreferences" }
        );

        if (!employer) {
            return res.status(404).json({
                success: false,
                message: "Employer not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification preferences updated",
            data: {
                notifyApplicationsWithoutTest: employer.notificationPreferences?.notifyApplicationsWithoutTest !== false,
                notifyBasicTestCompletion: employer.notificationPreferences?.notifyBasicTestCompletion !== false
            }
        });
    } catch (error) {
        console.error("Update notification settings error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update notification settings"
        });
    }
};


// Get email alert on login setting
const getEmailAlertSetting = async (req, res) => {
    try {
        const employer = await Employer.findById(req.userId).select('emailAlertOnLogin email');
        
        if (!employer) {
            return res.status(404).json({
                success: false,
                message: "Employer not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                emailAlertOnLogin: employer.emailAlertOnLogin || false,
                email: employer.email
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

        const employer = await Employer.findByIdAndUpdate(
            req.userId,
            { emailAlertOnLogin },
            { new: true }
        ).select('emailAlertOnLogin email');

        if (!employer) {
            return res.status(404).json({
                success: false,
                message: "Employer not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                emailAlertOnLogin: employer.emailAlertOnLogin,
                email: employer.email
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

// Send OTP for settings verification
const sendSettingsOtp = async (req, res) => {
    try {
        const employer = await Employer.findById(req.userId).select('email fullName');
        
        if (!employer || !employer.email) {
            return res.status(404).json({
                success: false,
                message: "Employer not found or email not available"
            });
        }

        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000);

        // Save or update OTP with a unique key for settings
        await UserOtp.findOneAndUpdate(
            { userData: `employer_settings_${employer.email}` },
            { userOtp: otp },
            { new: true, upsert: true }
        );

        // Send email OTP
        const htmlContent = `
            <div style="font-family: Roboto, sans-serif; max-width: 500px; margin: auto; border-radius: 10px; padding: 25px; border: 1px solid #e5e7eb;">
                <h2 style="text-align:center; color:#2563eb; margin-bottom:20px;">Verify Email Alert Setting - Atract</h2>

                <p style="font-size:15px; color:#374151;">Hello ${employer.fullName || 'User'},</p>
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

        await sendMail(employer.email, "Verify Email Alert Setting - Atract", htmlContent);

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

        const employer = await Employer.findById(req.userId).select('email');
        
        if (!employer || !employer.email) {
            return res.status(404).json({
                success: false,
                message: "Employer not found or email not available"
            });
        }

        // Find OTP record
        const otpRecord = await UserOtp.findOne({ userData: `employer_settings_${employer.email}` });

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
        await UserOtp.deleteMany({ userData: `employer_settings_${employer.email}` });
        
        const emailAlertValue = action === 'enable';
        const updatedEmployer = await Employer.findByIdAndUpdate(
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

// Helper functions for applications
function escapeRegex(value = "") {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function deriveCandidateInitial(name = "") {
    if (!name || typeof name !== "string") {
        return "U";
    }
    const trimmed = name.trim();
    if (!trimmed) {
        return "U";
    }
    const parts = trimmed.split(" ");
    if (parts.length === 1) {
        return parts[0][0].toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildApplicationSortStage(sortKey = "recent") {
    switch ((sortKey || "").toLowerCase()) {
        case "oldest":
            return { "applicants.appliedAt": 1 };
        case "name_az":
            return { "candidateData.fullName": 1, "applicants.appliedAt": -1 };
        case "status":
            return { "applicants.status": 1, latestUpdateAt: -1 };
        case "recent":
        default:
            return { latestUpdateAt: -1 };
    }
}

const getEmployerApplications = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = "",
            status = "",
            submissionType = "",
            jobId = "",
            sort = "recent"
        } = req.query;

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(50, Math.max(parseInt(limit, 10) || 20, 1));
        const skip = (pageNum - 1) * limitNum;
        const employerId = new mongoose.Types.ObjectId(req.userId);

        const applicantMatch = {};

        if (status?.trim()) {
            applicantMatch["applicants.status"] = status.trim();
        }

        if (submissionType?.trim()) {
            applicantMatch["applicants.submissionType"] = submissionType.trim();
        }

        const jobMatch = {
            "jobData.employerId": employerId
        };

        // Handle jobIds filter (multiple job IDs)
        if (req.query.jobIds) {
            const jobIdsArray = req.query.jobIds.split(',').map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
            if (jobIdsArray.length > 0) {
                jobMatch["jobData._id"] = { $in: jobIdsArray.map(id => new mongoose.Types.ObjectId(id)) };
            }
        } else if (jobId?.trim() && mongoose.Types.ObjectId.isValid(jobId)) {
            // Backward compatibility with single jobId
            jobMatch["jobData._id"] = new mongoose.Types.ObjectId(jobId);
        }

        const trimmedSearch = search?.trim() || "";
        if (trimmedSearch) {
            const safeSearch = escapeRegex(trimmedSearch);
            const regex = new RegExp(safeSearch, "i");
            jobMatch.$or = [
                { "jobData.jobTitle": { $regex: regex } },
                { "jobData.companyName": { $regex: regex } },
                { "jobData.location": { $regex: regex } }
            ];
        }

        const candidateMatch = {};
        if (trimmedSearch) {
            const safeSearch = escapeRegex(trimmedSearch);
            const regex = new RegExp(safeSearch, "i");
            candidateMatch.$or = [
                { "candidateData.fullName": regex },
                { "candidateData.email": regex }
            ];
        }

        const pipeline = [
            { $match: { employer: employerId } },
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
            { $match: jobMatch },
            {
                $lookup: {
                    from: "jobseekers",
                    localField: "applicants.jobSeeker",
                    foreignField: "_id",
                    as: "candidateData"
                }
            },
            { $unwind: { path: "$candidateData", preserveNullAndEmptyArrays: true } }
        ];

        if (Object.keys(candidateMatch).length > 0) {
            pipeline.push({ $match: candidateMatch });
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
                            totalApplications: { $sum: 1 }
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
        const totalStats = facets.totalStats?.[0] || { totalApplications: 0 };
        const statusStats = facets.statusStats || [];

        const totalApplications = totalStats.totalApplications || 0;
        const totalPages = totalApplications === 0 ? 0 : Math.ceil(totalApplications / limitNum);

        const formattedResults = rawResults.map((entry) => {
            const job = entry.jobData || {};
            const candidate = entry.candidateData || {};
            const profileSnapshot = entry.applicants?.profileSnapshot || {};
            const timeline = Array.isArray(entry.applicants?.statusTimeline)
                ? entry.applicants.statusTimeline
                : [];

            // Use current profile data or snapshot
            const candidateName = candidate.fullName || profileSnapshot.fullName || "";
            const candidateEmail = candidate.email || profileSnapshot.email || "";
            const candidateExperience = candidate.experienceInYears !== undefined 
                ? candidate.experienceInYears 
                : profileSnapshot.experienceInYears;
            const candidateQualification = candidate.highestQualification || profileSnapshot.highestQualification || "";
            const candidateSkills = candidate.skills?.length > 0 
                ? candidate.skills 
                : (profileSnapshot.skills || []);
            const candidateResume = candidate.resume || profileSnapshot.resume || null;

            return {
                applicationId: entry.applicants?._id?.toString(),
                jobId: entry.job?.toString(),
                jobTitle: job.jobTitle,
                companyName: job.companyName,
                location: job.location,
                workMode: job.workMode,
                jobType: job.jobType,
                shortId: job.shortId,
                candidateId: entry.applicants?.jobSeeker?.toString(),
                candidateName,
                candidateEmail,
                candidateInitial: deriveCandidateInitial(candidateName),
                candidateExperience,
                candidateQualification,
                candidateSkills,
                candidateResume,
                status: entry.applicants?.status,
                submissionType: entry.applicants?.submissionType,
                hasBasicTest: Boolean(entry.applicants?.hasBasicTest),
                hasVideoTest: Boolean(entry.applicants?.hasVideoTest),
                basicAssessmentId: entry.applicants?.basicAssessmentId?.toString() || null,
                videoAssessmentId: entry.applicants?.videoAssessmentId?.toString() || null,
                appliedAt: entry.applicants?.appliedAt,
                latestUpdateAt: entry.latestUpdateAt || entry.applicants?.appliedAt,
                statusTimeline: timeline,
                employerEngagement: entry.applicants?.employerEngagement || {
                    viewedAt: null,
                    resumeDownloadedAt: null,
                    lastAction: null
                }
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
                statusBreakdown: statusStats.map((statusItem) => ({
                    status: statusItem._id,
                    count: statusItem.count
                }))
            }
        });
    } catch (error) {
        console.error("Get Employer Applications Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

const updateApplicationStatus = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status, sendEmail = true } = req.body;

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID"
            });
        }

        const validStatuses = ['pending', 'reviewed', 'shortlisted', 'rejected'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be one of: pending, reviewed, shortlisted, rejected"
            });
        }

        const employerId = new mongoose.Types.ObjectId(req.userId);

        // Find the application
        const jobApplication = await JobApplication.findOne({
            employer: employerId,
            "applicants._id": applicationId
        }).populate('job', 'jobTitle companyName shortId').populate('applicants.jobSeeker', 'fullName email');

        if (!jobApplication) {
            return res.status(404).json({
                success: false,
                message: "Application not found"
            });
        }

        // Find the specific applicant entry
        const applicantIndex = jobApplication.applicants.findIndex(
            app => app._id.toString() === applicationId
        );

        if (applicantIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Applicant entry not found"
            });
        }

        const applicant = jobApplication.applicants[applicantIndex];
        const oldStatus = applicant.status;

        // Don't update if status is the same
        if (oldStatus === status) {
            return res.status(200).json({
                success: true,
                message: "Status is already set to this value",
                data: {
                    applicationId,
                    status,
                    oldStatus
                }
            });
        }

        // Update status
        applicant.status = status;
        applicant.lastStatusUpdatedAt = new Date();

        // Add timeline event
        const statusLabels = {
            'pending': 'Application Pending',
            'reviewed': 'Application Reviewed',
            'shortlisted': 'Application Shortlisted',
            'rejected': 'Application Rejected'
        };

        applicant.statusTimeline.push({
            type: 'status_update',
            label: statusLabels[status] || status,
            description: `Status changed from ${oldStatus} to ${status}`,
            source: 'employer',
            createdAt: new Date()
        });

        await jobApplication.save();

        // Send email notification if requested
        if (sendEmail && applicant.jobSeeker) {
            try {
                const jobSeeker = await JobSeeker.findById(applicant.jobSeeker._id || applicant.jobSeeker);
                if (jobSeeker && jobSeeker.email) {
                    await sendApplicationStatusUpdateEmail({
                        jobSeeker,
                        job: jobApplication.job,
                        oldStatus,
                        newStatus: status
                    });
                }
            } catch (emailError) {
                console.error("Failed to send status update email:", emailError);
                // Don't fail the request if email fails
            }
        }

        return res.status(200).json({
            success: true,
            message: "Application status updated successfully",
            data: {
                applicationId,
                status,
                oldStatus,
                updatedAt: applicant.lastStatusUpdatedAt
            }
        });

    } catch (error) {
        console.error("Update Application Status Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

async function sendApplicationStatusUpdateEmail({ jobSeeker, job, oldStatus, newStatus }) {
    if (!jobSeeker?.email) return;

    const statusLabels = {
        'pending': 'Pending Review',
        'reviewed': 'Under Review',
        'shortlisted': 'Shortlisted',
        'rejected': 'Not Selected'
    };

    const statusColors = {
        'pending': '#f59e0b',
        'reviewed': '#3b82f6',
        'shortlisted': '#10b981',
        'rejected': '#ef4444'
    };

    const statusMessages = {
        'pending': 'Your application is pending review.',
        'reviewed': 'Your application has been reviewed by the hiring team.',
        'shortlisted': 'Congratulations! You have been shortlisted for this position.',
        'rejected': 'Thank you for your interest. Unfortunately, we have decided to move forward with other candidates.'
    };

    const jobUrl = buildJobDetailsUrl(job);
    const updatedAt = new Date().toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    const subject = `Application Update - ${job?.jobTitle || "Your Application"}`;

    const emailHtml = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:720px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <div style="background:#0f172a;color:#fff;padding:18px 24px;">
                <h2 style="margin:0;font-size:18px;">Application Status Update</h2>
                <p style="margin:4px 0 0 0;font-size:13px;opacity:0.85;">${job?.jobTitle || "Role"} • ${job?.companyName || ""}</p>
            </div>
            <div style="padding:24px;">
                <p style="margin:0 0 12px 0;color:#0f172a;">Hello ${jobSeeker?.fullName || "Candidate"},</p>
                <p style="margin:0 0 18px 0;color:#0f172a;">Your application status has been updated.</p>

                <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:18px 0;border-left:4px solid ${statusColors[newStatus] || '#3b82f6'};">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                        <div style="width:12px;height:12px;border-radius:50%;background:${statusColors[newStatus] || '#3b82f6'};"></div>
                        <h3 style="margin:0;color:#0f172a;font-size:16px;">${statusLabels[newStatus] || newStatus}</h3>
                    </div>
                    <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">${statusMessages[newStatus] || 'Your application status has been updated.'}</p>
                </div>

                <table style="width:100%;border-collapse:collapse;margin:18px 0;">
                    <tbody>
                        <tr>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;width:40%;font-weight:600;color:#0f172a;">Job Title</td>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#0f172a;">${job?.jobTitle || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#0f172a;">Company</td>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#0f172a;">${job?.companyName || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#0f172a;">Previous Status</td>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#0f172a;">${statusLabels[oldStatus] || oldStatus}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#0f172a;">Updated At</td>
                            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#0f172a;">${updatedAt}</td>
                        </tr>
                    </tbody>
                </table>

                ${jobUrl ? `
                <div style="margin:24px 0;text-align:center;">
                    <a href="${jobUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Job Details</a>
                </div>
                ` : ''}

                <p style="margin:24px 0 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
                    If you have any questions, please feel free to reach out to the hiring team.
                </p>

                <p style="margin:16px 0 0 0;color:#6b7280;font-size:14px;text-align:center;">
                    © ${new Date().getFullYear()} Atract — Smart AI Hiring Platform
                </p>
            </div>
        </div>
    `;

    await sendMail(jobSeeker.email, subject, emailHtml);
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

// Helper function to get resume file path
const getResumeFile = async (resumePath) => {
    if (!resumePath) {
        return null;
    }

    // Get the file path
    const filePath = resumePath.startsWith('/uploads/') 
        ? path.join(__dirname, '../..', resumePath)
        : path.join(__dirname, '../../uploads/resumes', resumePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return null;
    }

    return filePath;
};

// View candidate resume from application
const viewApplicationResume = async (req, res) => {
    try {
        const { applicationId } = req.params;

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID"
            });
        }

        const employerId = new mongoose.Types.ObjectId(req.userId);

        // Find the application
        const jobApplication = await JobApplication.findOne({
            employer: employerId,
            "applicants._id": applicationId
        }).populate('job', 'jobTitle companyName shortId').populate('applicants.jobSeeker', 'resume fullName email');

        if (!jobApplication) {
            return res.status(404).json({
                success: false,
                message: "Application not found"
            });
        }

        // Find the specific applicant entry
        const applicantIndex = jobApplication.applicants.findIndex(
            app => app._id.toString() === applicationId
        );

        if (applicantIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Applicant entry not found"
            });
        }

        const applicant = jobApplication.applicants[applicantIndex];
        
        // Get resume path from profileSnapshot or from populated jobSeeker
        let resumePath = applicant.profileSnapshot?.resume;
        if (!resumePath && applicant.jobSeeker) {
            const jobSeeker = await JobSeeker.findById(applicant.jobSeeker._id || applicant.jobSeeker).select('resume');
            resumePath = jobSeeker?.resume;
        }

        if (!resumePath) {
            return res.status(404).json({
                success: false,
                message: "Resume not found for this application"
            });
        }

        // Get file path
        const filePath = await getResumeFile(resumePath);
        if (!filePath) {
            return res.status(404).json({
                success: false,
                message: "Resume file not found"
            });
        }

        // Update employer engagement - mark resume as viewed
        const now = new Date();
        if (!applicant.employerEngagement.viewedAt) {
            applicant.employerEngagement.viewedAt = now;
        }
        applicant.employerEngagement.lastAction = 'resume_viewed';

        // Add timeline event if not already added
        const hasResumeViewedEvent = applicant.statusTimeline.some(
            event => event.type === 'resume_viewed' && event.source === 'employer'
        );

        if (!hasResumeViewedEvent) {
            applicant.statusTimeline.push({
                type: 'resume_viewed',
                label: 'Resume Viewed',
                description: 'Employer viewed your resume',
                source: 'employer',
                createdAt: now
            });
            applicant.lastStatusUpdatedAt = now;
        }

        await jobApplication.save();

        // Determine content type based on file extension
        const filename = path.basename(filePath);
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
        console.error("View Application Resume Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

const getApplicationTestSummary = async (req, res) => {
    try {
        const { applicationId } = req.params;

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID"
            });
        }

        const employerId = new mongoose.Types.ObjectId(req.userId);

        // Find the application
        const jobApplication = await JobApplication.findOne({
            employer: employerId,
            "applicants._id": applicationId
        }).populate('job', 'jobTitle companyName shortId').populate('applicants.jobSeeker', 'fullName email experienceInYears highestQualification skills resume mobileNumber noticePeriod');

        if (!jobApplication) {
            return res.status(404).json({
                success: false,
                message: "Application not found"
            });
        }

        // Find the specific applicant entry
        const applicantIndex = jobApplication.applicants.findIndex(
            app => app._id.toString() === applicationId
        );

        if (applicantIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Applicant entry not found"
            });
        }

        const applicant = jobApplication.applicants[applicantIndex];
        const job = jobApplication.job;
        const jobSeeker = applicant.jobSeeker || {};

        const summary = {
            applicationId: applicant._id.toString(),
            jobId: job._id.toString(),
            jobTitle: job.jobTitle,
            companyName: job.companyName,
            candidateName: jobSeeker.fullName || applicant.profileSnapshot?.fullName || "",
            candidateEmail: jobSeeker.email || applicant.profileSnapshot?.email || "",
            candidateExperience: jobSeeker.experienceInYears ?? applicant.profileSnapshot?.experienceInYears ?? null,
            candidateQualification: jobSeeker.highestQualification || applicant.profileSnapshot?.highestQualification || "",
            candidateSkills: jobSeeker.skills || applicant.profileSnapshot?.skills || [],
            candidateResume: jobSeeker.resume || applicant.profileSnapshot?.resume || null,
            submissionType: applicant.submissionType,
            hasBasicTest: Boolean(applicant.hasBasicTest),
            hasVideoTest: Boolean(applicant.hasVideoTest),
            basicTest: null,
            videoTest: null
        };

        // Fetch basic test data if available
        if (applicant.basicAssessmentId && applicant.hasBasicTest) {
            const basicAssessment = await JobAssessment.findById(applicant.basicAssessmentId)
                .select('attempts basicQuestions jobSeeker job')
                .lean();

            if (basicAssessment) {
                // Get all attempts for this job (not just the one used in application)
                const allAttemptsForJob = await JobAssessment.find({
                    job: job._id,
                    jobSeeker: applicant.jobSeeker
                }).select('attempts basicQuestions').lean();

                const allAttempts = [];
                if (allAttemptsForJob.length > 0) {
                    allAttemptsForJob.forEach(assessment => {
                        if (assessment.attempts && assessment.attempts.length > 0) {
                            assessment.attempts.forEach(attempt => {
                                if (attempt.status && attempt.status !== 'in-progress') {
                                    const readinessFlow = [];
                                    if (assessment.basicQuestions && attempt.basicResponses) {
                                        const responseMap = new Map();
                                        attempt.basicResponses.forEach((response) => {
                                            responseMap.set(response.questionId, response);
                                        });
                                        assessment.basicQuestions.forEach((question) => {
                                            const response = responseMap.get(question.questionId);
                                            readinessFlow.push({
                                                question: question.prompt,
                                                answer: (response?.answerText || '').trim()
                                            });
                                        });
                                    }

                                    allAttempts.push({
                                        attemptNumber: attempt.attemptNumber,
                                        attemptId: attempt.attemptId,
                                        status: attempt.status,
                                        score: typeof attempt.score === 'number' ? attempt.score : null,
                                        totalQuestions: attempt.mcqQuestions?.length || 10,
                                        correctAnswers: Math.floor((attempt.score || 0) / 10),
                                        incorrectAnswers: (attempt.mcqQuestions?.length || 10) - Math.floor((attempt.score || 0) / 10),
                                        unanswered: 0,
                                        weakAreas: attempt.weakAreas || [],
                                        startedAt: attempt.startedAt,
                                        completedAt: attempt.completedAt || attempt.updatedAt,
                                        readinessReview: attempt.readinessReview || null,
                                        readinessPairs: readinessFlow,
                                        integrity: attempt.integrity || {}
                                    });
                                }
                            });
                        }
                    });
                }

                // Sort attempts by attempt number
                allAttempts.sort((a, b) => a.attemptNumber - b.attemptNumber);

                // Get the latest passed attempt (the one used in application)
                const latestPassedAttempt = basicAssessment.attempts
                    .filter(attempt => attempt.status === 'passed')
                    .sort((a, b) => (b.attemptNumber || 0) - (a.attemptNumber || 0))[0];

                if (latestPassedAttempt) {
                    const readinessFlow = [];
                    if (basicAssessment.basicQuestions && latestPassedAttempt.basicResponses) {
                        const responseMap = new Map();
                        latestPassedAttempt.basicResponses.forEach((response) => {
                            responseMap.set(response.questionId, response);
                        });
                        basicAssessment.basicQuestions.forEach((question) => {
                            const response = responseMap.get(question.questionId);
                            readinessFlow.push({
                                question: question.prompt,
                                answer: (response?.answerText || '').trim()
                            });
                        });
                    }

                    const technicalSummary = {
                        score: typeof latestPassedAttempt.score === 'number' ? latestPassedAttempt.score : 0,
                        totalQuestions: latestPassedAttempt.mcqQuestions?.length || 10,
                        correctAnswers: Math.floor((latestPassedAttempt.score || 0) / 10),
                        incorrectAnswers: (latestPassedAttempt.mcqQuestions?.length || 10) - Math.floor((latestPassedAttempt.score || 0) / 10),
                        unanswered: 0,
                        passed: true,
                        weakAreas: latestPassedAttempt.weakAreas || []
                    };

                    summary.basicTest = {
                        assessmentId: basicAssessment._id.toString(),
                        currentAttempt: {
                            attemptNumber: latestPassedAttempt.attemptNumber,
                            attemptId: latestPassedAttempt.attemptId,
                            status: latestPassedAttempt.status,
                            score: latestPassedAttempt.score,
                            technicalSummary,
                            readinessReview: latestPassedAttempt.readinessReview || null,
                            readinessPairs: readinessFlow,
                            integrity: latestPassedAttempt.integrity || {},
                            completedAt: latestPassedAttempt.completedAt || latestPassedAttempt.updatedAt
                        },
                        allAttempts
                    };
                }
            }
        }

        // Fetch video test data if available
        if (applicant.videoAssessmentId && applicant.hasVideoTest) {
            const videoAssessment = await VideoProctoringAssessment.findById(applicant.videoAssessmentId)
                .select('attempts job jobSeeker')
                .lean();

            if (videoAssessment && videoAssessment.attempts && videoAssessment.attempts.length > 0) {
                // Get the latest passed attempt
                const latestPassedAttempt = videoAssessment.attempts
                    .filter(attempt => attempt.status === 'passed')
                    .sort((a, b) => new Date(b.session?.endedAt || b.updatedAt || 0) - new Date(a.session?.endedAt || a.updatedAt || 0))[0];

                if (latestPassedAttempt) {
                    summary.videoTest = {
                        assessmentId: videoAssessment._id.toString(),
                        attempt: {
                            attemptId: latestPassedAttempt.attemptId,
                            attemptNumber: latestPassedAttempt.attemptNumber,
                            status: latestPassedAttempt.status,
                            finalScore: latestPassedAttempt.finalScore,
                            hasPassed: latestPassedAttempt.hasPassed,
                            totalQuestions: latestPassedAttempt.mcqQuestions?.length || 0,
                            correctAnswers: latestPassedAttempt.mcqQuestions?.filter(q => q.selectedOption === q.correctOption).length || 0,
                            incorrectAnswers: latestPassedAttempt.mcqQuestions?.filter(q => q.selectedOption !== undefined && q.selectedOption !== q.correctOption).length || 0,
                            unanswered: latestPassedAttempt.mcqQuestions?.filter(q => q.selectedOption === undefined).length || 0,
                            aiSummary: latestPassedAttempt.aiSummary || null,
                            videoUrl: latestPassedAttempt.media?.recording?.videoUrl || null,
                            startedAt: latestPassedAttempt.session?.startedAt,
                            completedAt: latestPassedAttempt.session?.endedAt || latestPassedAttempt.updatedAt,
                            violations: latestPassedAttempt.violations || []
                        }
                    };
                }
            }
        }

        return res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error("Get application test summary error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
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

        // Check if employer exists
        const employer = await Employer.findOne({ email: email.toLowerCase() });

        if (!employer) {
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
            { userData: `employer_password_reset_${email.toLowerCase()}` },
            { userOtp: otp },
            { new: true, upsert: true }
        );

        // Send email OTP
        const htmlContent = `
            <div style="font-family: Roboto, sans-serif; max-width: 500px; margin: auto; border-radius: 10px; padding: 25px; border: 1px solid #e5e7eb;">
                <h2 style="text-align:center; color:#2563eb; margin-bottom:20px;">Password Reset Request - Atract</h2>

                <p style="font-size:15px; color:#374151;">Hello ${employer.fullName || 'User'},</p>
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

        await sendMail(employer.email, "Password Reset Request - Atract", htmlContent);

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
            userData: `employer_password_reset_${email.toLowerCase()}`
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
            userData: `employer_password_reset_${email.toLowerCase()}`
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

        // Find employer
        const employer = await Employer.findOne({ email: email.toLowerCase() });

        if (!employer) {
            return res.status(404).json({
                success: false,
                message: "Employer not found"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        employer.password = hashedPassword;
        await employer.save();

        // Delete OTP record
        await UserOtp.deleteOne({ userData: `employer_password_reset_${email.toLowerCase()}` });

        // Send password reset confirmation email
        const htmlContent = `
            <div style="font-family: Roboto, sans-serif; max-width: 500px; margin: auto; border-radius: 10px; padding: 25px; border: 1px solid #e5e7eb;">
                <h2 style="text-align:center; color:#2563eb; margin-bottom:20px;">Password Updated Successfully - Atract</h2>

                <p style="font-size:15px; color:#374151;">Hello ${employer.fullName || 'User'},</p>
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
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3010'}/signin/employer" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">Login to Your Account</a>
                </div>

                <p style="font-size:14px; color:#6b7280; text-align:center; margin-top:25px;">
                    © ${new Date().getFullYear()} Atract — Smart AI Hiring Platform
                </p>
            </div>
        `;

        await sendMail(employer.email, "Password Updated Successfully - Atract", htmlContent);

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

// ========== SMART POST FUNCTIONS ==========

/**
 * Process smart post - analyze JD and extract job fields
 * @route POST /employer/smart-post/analyze
 * @access Private (Employer only)
 */
const analyzeSmartPost = async (req, res) => {
    try {
        const { jdText, extraPrompt } = req.body;
        const files = req.files || [];
        const employerId = req.userId;

        // Get employer details for defaults
        const employer = await Employer.findById(employerId);
        if (!employer) {
            return res.status(404).json({
                success: false,
                message: 'Employer not found'
            });
        }

        const employerCompanyName = employer.companyName || '';
        const employerEmail = employer.email || '';

        // Validate input
        if (!jdText && (!files || files.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Either JD text or files must be provided'
            });
        }

        const results = [];

        // Process text input - CREATE DOCUMENT IMMEDIATELY
        if (jdText && jdText.trim()) {
            // Create record immediately with status 'processing'
            const smartPostJob = await SmartPostJob.create({
                employerId,
                sourceType: 'text',
                sourceText: jdText.trim(),
                extraPrompt: extraPrompt?.trim() || '',
                status: 'processing'
            });

            // Return _id immediately
            results.push({
                _id: smartPostJob._id,
                status: 'processing',
                sourceType: 'text',
                sourceText: jdText.trim().substring(0, 200) + (jdText.trim().length > 200 ? '...' : '')
            });

            // Process AI extraction in background (async, don't await)
            (async () => {
                try {
                    const extractedFields = await smartPostService.extractJobFields(
                        jdText.trim(),
                        extraPrompt?.trim() || '',
                        employerCompanyName,
                        employerEmail
                    );

                    // Update record with extracted data
                    Object.assign(smartPostJob, extractedFields);
                    smartPostJob.status = 'completed';
                    await smartPostJob.save();
                } catch (error) {
                    console.error('Error processing text JD:', error);
                    smartPostJob.status = 'failed';
                    smartPostJob.errorMessage = error.message;
                    await smartPostJob.save();
                }
            })();
        }

        // Process files - CREATE DOCUMENTS IMMEDIATELY
        if (files && files.length > 0) {
            for (const file of files) {
                // Create record immediately with status 'processing'
                const smartPostJob = await SmartPostJob.create({
                    employerId,
                    sourceType: 'file',
                    sourceFileName: file.originalname,
                    sourceFilePath: file.path,
                    extraPrompt: extraPrompt?.trim() || '',
                    status: 'processing'
                });

                // Return _id immediately
                results.push({
                    _id: smartPostJob._id,
                    status: 'processing',
                    sourceType: 'file',
                    sourceFileName: file.originalname
                });

                // Process AI extraction in background (async, don't await)
                (async () => {
                    try {
                        // Extract text from file
                        const fileText = await smartPostService.extractTextFromFile(file.path);

                        if (!fileText || fileText.trim().length < 50) {
                            throw new Error('Could not extract meaningful text from file');
                        }

                        // Extract job fields using AI
                        const extractedFields = await smartPostService.extractJobFields(
                            fileText,
                            extraPrompt?.trim() || '',
                            employerCompanyName,
                            employerEmail
                        );

                        // Update record with extracted data
                        Object.assign(smartPostJob, extractedFields);
                        smartPostJob.status = 'completed';
                        await smartPostJob.save();
                    } catch (error) {
                        console.error('Error processing file:', error);
                        smartPostJob.status = 'failed';
                        smartPostJob.errorMessage = error.message;
                        await smartPostJob.save();
                    }
                })();
            }
        }

        // Return immediately with _ids, processing happens in background
        return res.status(200).json({
            success: true,
            message: 'Analysis started',
            data: results
        });

    } catch (error) {
        console.error('Smart Post Analyze Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

/**
 * Get smart post job by ID
 * @route GET /employer/smart-post/:id
 * @access Private (Employer only)
 */
const getSmartPostJob = async (req, res) => {
    try {
        const { id } = req.params;
        const employerId = req.userId;

        const smartPostJob = await SmartPostJob.findOne({
            _id: id,
            employerId
        });

        if (!smartPostJob) {
            return res.status(404).json({
                success: false,
                message: 'Smart post job not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: smartPostJob
        });
    } catch (error) {
        console.error('Get Smart Post Job Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

/**
 * Get all smart post jobs for employer
 * @route GET /employer/smart-post
 * @access Private (Employer only)
 */
const getSmartPostJobs = async (req, res) => {
    try {
        const employerId = req.userId;

        const smartPostJobs = await SmartPostJob.find({ employerId })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: smartPostJobs
        });
    } catch (error) {
        console.error('Get Smart Post Jobs Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

/**
 * Post job from smart post - creates Job record and deletes SmartPostJob
 * @route POST /employer/smart-post/:id/post
 * @access Private (Employer only)
 */
const postJobFromSmartPost = async (req, res) => {
    try {
        const { id } = req.params;
        const employerId = req.userId;
        const updatedJobData = req.body; // Allow job data to be updated before posting

        // Find the smart post job
        const smartPostJob = await SmartPostJob.findOne({
            _id: id,
            employerId,
            status: 'completed'
        });

        if (!smartPostJob) {
            return res.status(404).json({
                success: false,
                message: 'Smart post job not found or not completed'
            });
        }

        // Update smart post job with any changes from the form
        // Exclude fields that are specific to Job schema and not SmartPostJob
        if (updatedJobData && Object.keys(updatedJobData).length > 0) {
            // Create a copy of updatedJobData without Job-specific fields
            const smartPostUpdateData = { ...updatedJobData };
            
            // Remove 'status' field (Job uses 'status', SmartPostJob uses 'jobStatus' for job status)
            // SmartPostJob's 'status' field is for processing status, not job status
            delete smartPostUpdateData.status;
            
            // Map 'status' to 'jobStatus' if it exists in updatedJobData
            if (updatedJobData.status) {
                smartPostUpdateData.jobStatus = updatedJobData.status;
            }
            
            // Update only valid SmartPostJob fields
            Object.assign(smartPostJob, smartPostUpdateData);
            await smartPostJob.save();
        }

        // Validate required fields
        if (!smartPostJob.jobTitle || !smartPostJob.companyName || !smartPostJob.jobType || 
            !smartPostJob.workMode || !smartPostJob.location || !smartPostJob.applicationOpeningDate || 
            !smartPostJob.applicationClosingDate || !smartPostJob.hiringManagerEmail || 
            !smartPostJob.jobDescription) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields. Please verify the job details.'
            });
        }

        // Generate unique shortId
        const generateShortId = async () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let shortId;
            let isUnique = false;
            
            while (!isUnique) {
                shortId = '';
                for (let i = 0; i < 7; i++) {
                    shortId += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                
                const existingJob = await Job.findOne({ shortId });
                if (!existingJob) {
                    isUnique = true;
                }
            }
            
            return shortId;
        };

        const shortId = await generateShortId();

        // Create Job record from SmartPostJob data
        const newJob = await Job.create({
            employerId: smartPostJob.employerId,
            jobTitle: smartPostJob.jobTitle.trim(),
            companyName: smartPostJob.companyName.trim(),
            jobType: smartPostJob.jobType,
            department: smartPostJob.department?.trim() || '',
            employmentType: smartPostJob.employmentType || 'Permanent',
            experience: smartPostJob.experience?.trim() || '',
            workMode: smartPostJob.workMode,
            location: smartPostJob.location.trim(),
            highestQualification: smartPostJob.highestQualification?.trim() || '',
            minSalary: smartPostJob.minSalary || null,
            maxSalary: smartPostJob.maxSalary || null,
            numberOfOpenings: smartPostJob.numberOfOpenings || null,
            applicationOpeningDate: smartPostJob.applicationOpeningDate,
            applicationClosingDate: smartPostJob.applicationClosingDate,
            hiringManagerEmail: smartPostJob.hiringManagerEmail.toLowerCase().trim(),
            jobDescription: smartPostJob.jobDescription.trim(),
            responsibilities: smartPostJob.responsibilities?.trim() || '',
            requirements: smartPostJob.requirements?.trim() || '',
            perksAndBenefits: smartPostJob.perksAndBenefits?.trim() || '',
            status: smartPostJob.jobStatus || 'Draft',
            requiresBasicTest: smartPostJob.requiresBasicTest !== undefined ? smartPostJob.requiresBasicTest : true,
            requiresVideoProctoredTest: smartPostJob.requiresVideoProctoredTest || false,
            shortId: shortId,
            skills: smartPostJob.skills || [],
            views: smartPostJob.views || 0,
            applicationsCount: smartPostJob.applicationsCount || 0,
            socialShareContent: smartPostJob.socialShareContent || null,
            postingMethod: 'smart-post'
        });

        // Delete associated file if exists (before deleting the record)
        if (smartPostJob.sourceFilePath) {
            const fs = require('fs');
            const path = require('path');
            try {
                let filePath;
                
                // Check if path is absolute or relative
                if (path.isAbsolute(smartPostJob.sourceFilePath)) {
                    // Use absolute path directly
                    filePath = smartPostJob.sourceFilePath;
                } else {
                    // Construct path relative to project root
                    // sourceFilePath format: uploads/smart-post/{employerId}/filename
                    filePath = path.join(__dirname, '..', '..', smartPostJob.sourceFilePath);
                }
                
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted smart post file after posting: ${filePath}`);
                } else {
                    console.log(`File not found (may have been deleted already): ${filePath}`);
                }
            } catch (fileError) {
                console.error('Error deleting smart post file after posting:', fileError);
                // Continue even if file deletion fails - don't block the job posting
            }
        }

        // Delete the SmartPostJob record
        await SmartPostJob.deleteOne({ _id: id });

        return res.status(201).json({
            success: true,
            message: 'Job posted successfully',
            data: newJob
        });

    } catch (error) {
        console.error('Post Job From Smart Post Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

/**
 * Delete smart post job
 * @route DELETE /employer/smart-post/:id
 * @access Private (Employer only)
 */
const deleteSmartPostJob = async (req, res) => {
    try {
        const { id } = req.params;
        const employerId = req.userId;

        const smartPostJob = await SmartPostJob.findOneAndDelete({
            _id: id,
            employerId
        });

        if (!smartPostJob) {
            return res.status(404).json({
                success: false,
                message: 'Smart post job not found'
            });
        }

        // Delete associated file if exists
        if (smartPostJob.sourceFilePath) {
            const fs = require('fs');
            const path = require('path');
            try {
                let filePath;
                
                // Check if path is absolute or relative
                if (path.isAbsolute(smartPostJob.sourceFilePath)) {
                    // Use absolute path directly
                    filePath = smartPostJob.sourceFilePath;
                } else {
                    // Construct path relative to project root
                    // sourceFilePath format: uploads/smart-post/{employerId}/filename
                    filePath = path.join(__dirname, '..', '..', smartPostJob.sourceFilePath);
                }
                
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted smart post file: ${filePath}`);
                } else {
                    console.log(`File not found (may have been deleted already): ${filePath}`);
                }
            } catch (fileError) {
                console.error('Error deleting smart post file:', fileError);
                // Continue even if file deletion fails - don't block the deletion of the record
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Smart post job deleted successfully'
        });
    } catch (error) {
        console.error('Delete Smart Post Job Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get job alert system status
const getJobAlertStatus = async (req, res) => {
    try {
        const { getJobAlertSystemStatus } = require('../services/jobAlertTestService');
        const status = await getJobAlertSystemStatus();
        return res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error("Get Job Alert Status Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Test job alert for a specific job seeker
const testJobAlert = async (req, res) => {
    try {
        const { jobSeekerId } = req.params;
        const { testJobAlertForJobSeeker } = require('../services/jobAlertTestService');
        const result = await testJobAlertForJobSeeker(jobSeekerId);
        return res.status(200).json({
            success: result.success,
            data: result
        });
    } catch (error) {
        console.error("Test Job Alert Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Test sending a job alert email
const testSendJobAlert = async (req, res) => {
    try {
        const { jobSeekerId, jobId } = req.body;
        if (!jobSeekerId || !jobId) {
            return res.status(400).json({
                success: false,
                message: "jobSeekerId and jobId are required"
            });
        }
        const { testSendEmailAlert } = require('../services/jobAlertTestService');
        const result = await testSendEmailAlert(jobSeekerId, jobId);
        return res.status(200).json({
            success: result.success,
            data: result
        });
    } catch (error) {
        console.error("Test Send Job Alert Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Manually run job matching (for testing)
const runJobMatching = async (req, res) => {
    try {
        const { runScheduledJobMatching } = require('../services/jobAlertCronService');
        console.log('Manually triggering job matching (via employer endpoint)...');
        await runScheduledJobMatching();
        return res.status(200).json({
            success: true,
            message: "Job matching completed. Check server logs for details."
        });
    } catch (error) {
        console.error("Run Job Matching Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Get cron status
const getCronStatus = async (req, res) => {
    try {
        const { getCronStatus } = require('../services/jobAlertCronService');
        const status = getCronStatus();
        return res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error("Get Cron Status Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Reschedule cron
const rescheduleCron = async (req, res) => {
    try {
        const { scheduleJobMatching } = require('../services/jobAlertCronService');
        scheduleJobMatching();
        return res.status(200).json({
            success: true,
            message: "Cron rescheduled successfully. Check server logs for details."
        });
    } catch (error) {
        console.error("Reschedule Cron Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

module.exports = {
    generateOtp,
    checkOtp,
    registerEmployer,
    loginEmployer,
    getProfile,
    updateProfile,
    getNotificationSettings,
    updateNotificationSettings,
    getEmailAlertSetting,
    updateEmailAlertSetting,
    sendSettingsOtp,
    verifySettingsOtp,
    getEmployerApplications,
    updateApplicationStatus,
    viewApplicationResume,
    getApplicationTestSummary,
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPassword,
    // Smart Post functions
    analyzeSmartPost,
    getSmartPostJob,
    getSmartPostJobs,
    postJobFromSmartPost,
    deleteSmartPostJob,
    // Job Alert Test functions
    getJobAlertStatus,
    testJobAlert,
    testSendJobAlert,
    runJobMatching,
    getCronStatus,
    rescheduleCron
};

