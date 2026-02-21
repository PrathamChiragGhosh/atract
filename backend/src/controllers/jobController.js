const jwt = require('jsonwebtoken');
const Job = require('../models/job.js');
const Employer = require('../models/employer.js');
const JobSeeker = require('../models/jobSeeker.js');
const JobApplication = require('../models/jobApplication.js');
const JobViewEmail = require('../models/jobViewEmail.js');
const { runJobAnalysis } = require("../services/jobAnalysisRunner");
const mongoose = require('mongoose');
const { generateJobPostingSchema } = require('../utils/jobSchemaGenerator.js');

const JWT_SECRET = process.env.JWT_SECRET || 'A123B456cdef1234567';

const extractUserIdFromAuthHeader = (req) => {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded?.userId || null;
    } catch (error) {
        return null;
    }
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Generate unique shortId (7 characters: uppercase, lowercase, numbers)
const generateShortId = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let shortId;
    let isUnique = false;
    
    while (!isUnique) {
        shortId = '';
        for (let i = 0; i < 7; i++) {
            shortId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Check if shortId already exists
        const existingJob = await Job.findOne({ shortId });
        if (!existingJob) {
            isUnique = true;
        }
    }
    
    return shortId;
};

const parseSkillsInput = (skillsInput) => {
    if (!skillsInput) return [];

    let skillsArray = [];

    if (Array.isArray(skillsInput)) {
        skillsArray = skillsInput;
    } else if (typeof skillsInput === 'string') {
        try {
            const parsed = JSON.parse(skillsInput);
            if (Array.isArray(parsed)) {
                skillsArray = parsed;
            } else {
                skillsArray = skillsInput.split(',');
            }
        } catch (error) {
            skillsArray = skillsInput.split(',');
        }
    }

    const cleaned = skillsArray
        .map(skill => typeof skill === 'string' ? skill.trim() : '')
        .filter(skill => skill.length > 0);

    // Remove duplicates (case-insensitive)
    const uniqueSkills = [];
    const seen = new Set();
    cleaned.forEach(skill => {
        const lower = skill.toLowerCase();
        if (!seen.has(lower)) {
            seen.add(lower);
            uniqueSkills.push(skill);
        }
    });

    return uniqueSkills.slice(0, 30);
};

const parseBooleanField = (value, defaultValue = false) => {
    if (value === undefined || value === null) {
        return defaultValue;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) {
            return true;
        }
        if (['false', '0', 'no', 'off'].includes(normalized)) {
            return false;
        }
    }

    return Boolean(value);
};

// Post a new job
// Note: Company logo is optional and not required for job posting
const postJob = async (req, res) => {
    try {
        const {
            jobTitle,
            companyName,
            jobType,
            department,
            employmentType,
            experience,
            workMode,
            location,
            highestQualification,
            minSalary,
            maxSalary,
            numberOfOpenings,
            applicationOpeningDate,
            applicationClosingDate,
            hiringManagerEmail,
            jobDescription,
            responsibilities,
            requirements,
            perksAndBenefits,
            status,
            skills,
            requiresBasicTest,
            requiresVideoProctoredTest
        } = req.body;

        // Validation - Required fields
        // Note: companyLogo is NOT required - it's stored in the Employer model and is optional
        if (!jobTitle || !companyName || !jobType || !workMode || !location || 
            !applicationOpeningDate || !applicationClosingDate || !hiringManagerEmail || !jobDescription) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields"
            });
        }

        // Validate dates
        const openingDate = new Date(applicationOpeningDate);
        const closingDate = new Date(applicationClosingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(openingDate.getTime()) || isNaN(closingDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format"
            });
        }

        if (openingDate < today) {
            return res.status(400).json({
                success: false,
                message: "Application opening date cannot be in the past"
            });
        }

        if (closingDate <= openingDate) {
            return res.status(400).json({
                success: false,
                message: "Application closing date must be after opening date"
            });
        }

        // Validate salary
        if (minSalary && maxSalary && minSalary > maxSalary) {
            return res.status(400).json({
                success: false,
                message: "Minimum salary cannot be greater than maximum salary"
            });
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(hiringManagerEmail)) {
            return res.status(400).json({
                success: false,
                message: "Invalid hiring manager email"
            });
        }

        // Generate unique shortId
        const shortId = await generateShortId();

        // Create job
        const parsedSkills = parseSkillsInput(skills);
        const basicTestRequired = parseBooleanField(requiresBasicTest, true);
        const videoTestRequired = parseBooleanField(requiresVideoProctoredTest, false);

        const newJob = await Job.create({
            employerId: req.userId,
            jobTitle: jobTitle.trim(),
            companyName: companyName.trim(),
            jobType,
            department: department?.trim() || '',
            employmentType: employmentType || 'Permanent',
            experience: experience?.trim() || '',
            workMode,
            location: location.trim(),
            highestQualification: highestQualification?.trim() || '',
            minSalary: minSalary || null,
            maxSalary: maxSalary || null,
            numberOfOpenings: numberOfOpenings || null,
            applicationOpeningDate: openingDate,
            applicationClosingDate: closingDate,
            hiringManagerEmail: hiringManagerEmail.toLowerCase().trim(),
            jobDescription: jobDescription.trim(),
            responsibilities: responsibilities?.trim() || '',
            requirements: requirements?.trim() || '',
            perksAndBenefits: perksAndBenefits?.trim() || '',
            status: status || 'Draft',
            requiresBasicTest: basicTestRequired,
            requiresVideoProctoredTest: videoTestRequired,
            shortId: shortId,
            skills: parsedSkills
        });

        // Kick off background job analysis (non-blocking)
        setImmediate(() => runJobAnalysis(newJob._id).catch(() => {}));

        return res.status(201).json({
            success: true,
            message: "Job posted successfully",
            data: newJob
        });

    } catch (error) {
        console.error("Post Job Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Get all jobs by employer
const getEmployerJobs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            status = "",
            jobType = "",
            workMode = "",
            sortBy = "createdAt",
            sortOrder = "desc"
        } = req.query;

        // Build query
        const query = { employerId: req.userId };

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

        // Get jobs with pagination
        const jobs = await Job.find(query)
            .sort(sortObj)
            .skip(skip)
            .limit(limitNum);

        // Get total count for pagination (with filters applied)
        const totalJobs = await Job.countDocuments(query);
        const totalPages = Math.ceil(totalJobs / limitNum);

        // Get counts for all employer jobs (without filters) - used for dashboard stats
        const baseQuery = { employerId: req.userId };
        const [totalJobsAll, activeJobsCount] = await Promise.all([
            Job.countDocuments(baseQuery),
            Job.countDocuments({ ...baseQuery, status: 'Active' })
        ]);

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
            },
            counts: {
                totalJobs: totalJobsAll,
                activeJobs: activeJobsCount
            }
        });
    } catch (error) {
        console.error("Get Employer Jobs Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Get single job by ID
const getJobById = async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const job = await Job.findOne({
            _id: jobId,
            employerId: req.userId
        });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: job
        });
    } catch (error) {
        console.error("Get Job Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Update job
const updateJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const updateData = req.body;

        // Validate dates if provided
        if (updateData.applicationOpeningDate || updateData.applicationClosingDate) {
            const openingDate = updateData.applicationOpeningDate ? new Date(updateData.applicationOpeningDate) : null;
            const closingDate = updateData.applicationClosingDate ? new Date(updateData.applicationClosingDate) : null;

            if (openingDate && isNaN(openingDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid opening date format"
                });
            }

            if (closingDate && isNaN(closingDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid closing date format"
                });
            }

            if (openingDate && closingDate && closingDate <= openingDate) {
                return res.status(400).json({
                    success: false,
                    message: "Application closing date must be after opening date"
                });
            }
        }

        // Validate salary if provided
        if ((updateData.minSalary !== undefined && updateData.maxSalary !== undefined) &&
            updateData.minSalary > updateData.maxSalary) {
            return res.status(400).json({
                success: false,
                message: "Minimum salary cannot be greater than maximum salary"
            });
        }

        // Validate email if provided
        if (updateData.hiringManagerEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updateData.hiringManagerEmail)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid hiring manager email"
                });
            }
            updateData.hiringManagerEmail = updateData.hiringManagerEmail.toLowerCase().trim();
        }

        // Trim string fields
        const stringFields = ['jobTitle', 'companyName', 'department', 'experience', 'location', 
                              'highestQualification', 'jobDescription', 'responsibilities', 
                              'requirements', 'perksAndBenefits'];
        stringFields.forEach(field => {
            if (updateData[field] !== undefined) {
                updateData[field] = updateData[field].trim();
            }
        });

        if (updateData.skills !== undefined) {
            updateData.skills = parseSkillsInput(updateData.skills);
        }

        if (updateData.requiresBasicTest !== undefined) {
            updateData.requiresBasicTest = parseBooleanField(updateData.requiresBasicTest, true);
        }

        if (updateData.requiresVideoProctoredTest !== undefined) {
            updateData.requiresVideoProctoredTest = parseBooleanField(updateData.requiresVideoProctoredTest, false);
        }

        // Generate shortId if job doesn't have one
        const existingJob = await Job.findById(jobId);
        if (existingJob && !existingJob.shortId) {
            updateData.shortId = await generateShortId();
        }

        const updatedJob = await Job.findOneAndUpdate(
            { _id: jobId, employerId: req.userId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedJob) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Job updated successfully",
            data: updatedJob
        });

    } catch (error) {
        console.error("Update Job Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Get job by shortId (public endpoint - no auth required)
const getJobByShortId = async (req, res) => {
    try {
        const { shortId } = req.params;
        
        if (!shortId || shortId.length !== 7) {
            return res.status(400).json({
                success: false,
                message: "Invalid job link"
            });
        }
        
        const job = await Job.findOne({ shortId }).populate('employerId', 'companyWebsite');
        
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job no longer exists"
            });
        }
        
        const jobResponse = job.toObject();
        jobResponse.hasApplied = false;

        const requesterId = extractUserIdFromAuthHeader(req);
        if (requesterId) {
            const hasApplication = await JobApplication.exists({
                job: job._id,
                'applicants.jobSeeker': requesterId
            });
            jobResponse.hasApplied = Boolean(hasApplication);
        }

        // Generate Google Jobs schema
        const employer = job.employerId ? job.employerId.toObject() : null;
        const googleSchema = generateJobPostingSchema(job, employer);
        
        return res.status(200).json({
            success: true,
            data: jobResponse,
            googleSchema: googleSchema
        });
    } catch (error) {
        console.error("Get Job By ShortId Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Increment view count for a job (public endpoint - no auth required)
const incrementJobView = async (req, res) => {
    try {
        const { shortId } = req.params;
        
        if (!shortId || shortId.length !== 7) {
            return res.status(400).json({
                success: false,
                message: "Invalid job link"
            });
        }
        
        const job = await Job.findOne({ shortId }).select("_id views");
        
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job no longer exists"
            });
        }
        
        const updated = await Job.findOneAndUpdate(
            { _id: job._id },
            { $inc: { views: 1 } },
            { new: true, timestamps: false, select: "_id views" }
        );
        
        return res.status(200).json({
            success: true,
            views: updated?.views ?? job.views + 1
        });
    } catch (error) {
        console.error("Increment Job View Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Get job viewers (employer-only)
const getJobViewers = async (req, res) => {
    try {
        const { jobId } = req.params;
        const search = (req.query?.q || "").trim().toLowerCase();
        const source = (req.query?.source || "").trim().toLowerCase(); // login | prompt | empty

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }

        const job = await Job.findById(jobId).select("employerId");
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        if (`${job.employerId}` !== `${req.userId}`) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to view this job"
            });
        }

        const record = await JobViewEmail.findOne({ job: jobId }).lean();
        const views = record?.views || [];

        let filtered = views;

        if (search) {
            filtered = filtered.filter((v) => v.email?.toLowerCase().includes(search));
        }

        if (source === "login") {
            filtered = filtered.filter((v) => v.isLogin === true);
        } else if (source === "prompt") {
            filtered = filtered.filter((v) => v.isLogin === false);
        }

        // Sort by viewedAt desc
        filtered.sort((a, b) => new Date(b.viewedAt || 0) - new Date(a.viewedAt || 0));

        return res.status(200).json({
            success: true,
            data: filtered,
            total: filtered.length
        });
    } catch (error) {
        console.error("Get Job Viewers Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Log job view email (dedup per job/email)
const logJobViewEmail = async (req, res) => {
    try {
        const { shortId } = req.params;

        if (!shortId || shortId.length !== 7) {
            return res.status(400).json({
                success: false,
                message: "Invalid job link"
            });
        }

        const job = await Job.findOne({ shortId }).select('_id');

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job no longer exists"
            });
        }

        let email = null;
        let isLogin = false;

        const requesterId = extractUserIdFromAuthHeader(req);
        if (requesterId) {
            const js = await JobSeeker.findById(requesterId).select('email');
            email = js?.email || null;
            isLogin = Boolean(email);
        }

        if (!email) {
            email = (req.body?.email || '').trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "A valid email is required"
                });
            }
            isLogin = false;
        }

        const now = new Date();

        const updated = await JobViewEmail.findOneAndUpdate(
            { job: job._id, "views.email": email },
            { $set: { "views.$.viewedAt": now, "views.$.isLogin": isLogin } },
            { new: true }
        );

        if (!updated) {
            await JobViewEmail.findOneAndUpdate(
                { job: job._id },
                {
                    $setOnInsert: { job: job._id },
                    $addToSet: { views: { email, viewedAt: now, isLogin } }
                },
                { upsert: true, new: true }
            );
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Log Job View Email Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Delete job
const deleteJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        const deletedJob = await Job.findOneAndDelete({
            _id: jobId,
            employerId: req.userId
        });

        if (!deletedJob) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Job deleted successfully"
        });

    } catch (error) {
        console.error("Delete Job Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Get public jobs list with filters and pagination (no auth required)
const getPublicJobs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20
        } = req.query;

        // Handle salary ranges - can have multiple minSalary/maxSalary pairs
        const minSalaries = Array.isArray(req.query.minSalary) ? req.query.minSalary : (req.query.minSalary ? [req.query.minSalary] : []);
        const maxSalaries = Array.isArray(req.query.maxSalary) ? req.query.maxSalary : (req.query.maxSalary ? [req.query.maxSalary] : []);

        // Handle array filters (multi-select)
        const jobType = Array.isArray(req.query.jobType) ? req.query.jobType : (req.query.jobType ? [req.query.jobType] : []);
        const employmentType = Array.isArray(req.query.employmentType) ? req.query.employmentType : (req.query.employmentType ? [req.query.employmentType] : []);
        const workMode = Array.isArray(req.query.workMode) ? req.query.workMode : (req.query.workMode ? [req.query.workMode] : []);
        const freshness = Array.isArray(req.query.freshness) ? req.query.freshness : (req.query.freshness ? [req.query.freshness] : []);
        const openingDateFreshness = Array.isArray(req.query.openingDateFreshness) ? req.query.openingDateFreshness : (req.query.openingDateFreshness ? [req.query.openingDateFreshness] : []);

        // Build query - only active jobs
        const query = { status: 'Active' };

        // Date filters (use local day bounds to avoid timezone off-by-one)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const today = todayStart;

        // Only show jobs where closing date hasn't passed
        query.applicationClosingDate = { $gte: todayStart };

        // Only show jobs where closing date hasn't passed
        query.applicationClosingDate = { $gte: today };

        // Build $and array for complex filters
        const andConditions = [];

        // Freshness filter (based on createdAt) - handle array
        if (freshness.length > 0) {
            const freshnessConditions = [];
            freshness.forEach(f => {
                if (f === "today") {
                    freshnessConditions.push({ createdAt: { $gte: today } });
                } else if (f === "week") {
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    freshnessConditions.push({ createdAt: { $gte: weekAgo } });
                } else if (f === "month") {
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    freshnessConditions.push({ createdAt: { $gte: monthAgo } });
                }
            });
            if (freshnessConditions.length > 0) {
                andConditions.push({ $or: freshnessConditions });
            }
        }

        // Opening date freshness filter - handle array
        if (openingDateFreshness.length > 0) {
            const openingDateConditions = [];
            openingDateFreshness.forEach(f => {
                if (f === "today") {
                    openingDateConditions.push({ applicationOpeningDate: { $gte: today, $lte: new Date() } });
                } else if (f === "week") {
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    openingDateConditions.push({ applicationOpeningDate: { $gte: weekAgo, $lte: new Date() } });
                } else if (f === "month") {
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    openingDateConditions.push({ applicationOpeningDate: { $gte: monthAgo, $lte: new Date() } });
                }
            });
            if (openingDateConditions.length > 0) {
                andConditions.push({ $or: openingDateConditions });
            }
        } else {
            // Default: only show jobs where opening date is today or earlier (local day end)
            query.applicationOpeningDate = { $lte: todayEnd };
        }

        // Handle array filters (multi-select)
        const department = Array.isArray(req.query.department) ? req.query.department : (req.query.department ? [req.query.department] : []);
        const location = Array.isArray(req.query.location) ? req.query.location : (req.query.location ? [req.query.location] : []);
        const highestQualification = Array.isArray(req.query.highestQualification) ? req.query.highestQualification : (req.query.highestQualification ? [req.query.highestQualification] : []);
        const experience = Array.isArray(req.query.experience) ? req.query.experience : (req.query.experience ? [req.query.experience] : []);
        const numberOfOpenings = Array.isArray(req.query.numberOfOpenings) ? req.query.numberOfOpenings : (req.query.numberOfOpenings ? [req.query.numberOfOpenings] : []);

        // Text filters - now arrays
        if (department.length > 0) {
            const deptConditions = department.map(d => ({ department: { $regex: d, $options: "i" } }));
            andConditions.push({ $or: deptConditions });
        }
        if (jobType.length > 0) query.jobType = { $in: jobType };
        if (employmentType.length > 0) query.employmentType = { $in: employmentType };
        if (workMode.length > 0) query.workMode = { $in: workMode };
        if (location.length > 0) {
            const locConditions = location.map(l => ({ location: { $regex: l, $options: "i" } }));
            andConditions.push({ $or: locConditions });
        }
        if (highestQualification.length > 0) {
            const qualConditions = highestQualification.map(q => ({ highestQualification: { $regex: q, $options: "i" } }));
            andConditions.push({ $or: qualConditions });
        }
        if (experience.length > 0) {
            // Handle experience ranges - matching post job screen options
            const experienceConditions = experience.map(exp => {
                if (exp === "Fresher") {
                    return { experience: { $regex: /fresher/i } };
                } else if (exp.includes("+")) {
                    // Handle "10+ years"
                    return { experience: { $regex: new RegExp(exp.replace("+", ".*\\+"), "i") } };
                } else if (exp.includes("-")) {
                    // Handle ranges like "0-1 years", "1-2 years", "2-3 years", "3-5 years", "5-7 years", "7-10 years"
                    // Escape special characters and match the exact range
                    return { experience: { $regex: new RegExp(exp.replace(/-/g, ".*-.*"), "i") } };
                } else {
                    return { experience: { $regex: new RegExp(exp, "i") } };
                }
            });
            if (experienceConditions.length > 0) {
                andConditions.push({ $or: experienceConditions });
            }
        }

        // Number of openings filter - handle ranges
        if (numberOfOpenings.length > 0) {
            const openingsConditions = numberOfOpenings.map(openings => {
                if (openings === "1-10") {
                    return { numberOfOpenings: { $gte: 1, $lte: 10 } };
                } else if (openings === "11-50") {
                    return { numberOfOpenings: { $gte: 11, $lte: 50 } };
                } else if (openings === "51-100") {
                    return { numberOfOpenings: { $gte: 51, $lte: 100 } };
                } else if (openings === "101-200") {
                    return { numberOfOpenings: { $gte: 101, $lte: 200 } };
                } else if (openings === "201-300") {
                    return { numberOfOpenings: { $gte: 201, $lte: 300 } };
                } else if (openings === "300+") {
                    return { numberOfOpenings: { $gte: 300 } };
                }
                return null;
            }).filter(cond => cond !== null);
            
            if (openingsConditions.length > 0) {
                andConditions.push({ $or: openingsConditions });
            }
        }

        // Salary filters - handle multiple salary ranges
        if (minSalaries.length > 0 && maxSalaries.length > 0) {
            const salaryConditions = [];
            // Pair up min and max salaries
            for (let i = 0; i < Math.min(minSalaries.length, maxSalaries.length); i++) {
                const minSal = parseInt(minSalaries[i]) || 0;
                const maxSal = parseInt(maxSalaries[i]) || Number.MAX_SAFE_INTEGER;
                
                salaryConditions.push({
                    $or: [
                        // Job's min salary is within filter range
                        { minSalary: { $gte: minSal, $lte: maxSal } },
                        // Job's max salary is within filter range
                        { maxSalary: { $gte: minSal, $lte: maxSal } },
                        // Job's range completely contains filter range
                        { $and: [
                            { minSalary: { $lte: minSal } },
                            { maxSalary: { $gte: maxSal } }
                        ]}
                    ]
                });
            }
            if (salaryConditions.length > 0) {
                andConditions.push({ $or: salaryConditions });
            }
        }

        // Combine all conditions
        if (andConditions.length > 0) {
            query.$and = andConditions;
        }

        // Debug: Log the query to see what filters are being applied
        // console.log("Public Jobs Query:", JSON.stringify(query, null, 2));

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        // Get jobs with employer data, sorted by created date and opening date (recent first)
        const jobs = await Job.find(query)
            .populate('employerId', 'companyName companyLogo')
            .sort({ createdAt: -1, applicationOpeningDate: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Get total count
        const totalJobs = await Job.countDocuments(query);
        const totalPages = Math.ceil(totalJobs / limitNum);

        // Debug: Log results
        // console.log(`Found ${totalJobs} total jobs, returning ${jobs.length} jobs`);

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
        console.error("Get Public Jobs Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

const calculateExperienceScore = (jobExperience = '', seekerExperience) => {
    if (typeof seekerExperience !== 'number') return 0;
    if (!jobExperience) return 0;

    const normalizedExperience = jobExperience.toLowerCase();
    if (normalizedExperience.includes('fresher')) {
        return seekerExperience <= 1 ? 2 : 0;
    }

    const numericMatches = jobExperience.match(/\d+/g);
    if (!numericMatches || numericMatches.length === 0) return 0;

    const numericValues = numericMatches.map(num => Number(num)).sort((a, b) => a - b);
    const minExp = numericValues[0];
    const maxExp = numericValues[numericValues.length - 1];

    if (seekerExperience >= minExp && seekerExperience <= maxExp) {
        return 2;
    }

    if (Math.abs(seekerExperience - minExp) <= 1 || Math.abs(seekerExperience - maxExp) <= 1) {
        return 1;
    }

    return 0;
};

// Fetch similar jobs based on a job's details (public endpoint)
const getSimilarJobs = async (req, res) => {
    try {
        const { shortId } = req.params;

        if (!shortId || shortId.length !== 7) {
            return res.status(400).json({
                success: false,
                message: "Invalid job link"
            });
        }

        // Get the current job details
        const currentJob = await Job.findOne({ shortId }).lean();

        if (!currentJob) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const baseQuery = {
            status: 'Active',
            applicationClosingDate: { $gte: today },
            shortId: { $ne: shortId } // Exclude current job
        };

        const orConditions = [];
        const jobSkills = Array.isArray(currentJob.skills) ? currentJob.skills.filter(Boolean) : [];
        const jobExperience = currentJob.experience?.trim() || '';
        const jobQualification = currentJob.highestQualification?.trim() || '';
        const jobLocation = currentJob.location?.trim() || '';
        const jobDepartment = currentJob.department?.trim() || '';

        // Match on skills
        if (jobSkills.length > 0) {
            const skillRegexes = jobSkills.map(skill => new RegExp(escapeRegex(skill), 'i'));
            orConditions.push({ skills: { $in: skillRegexes } });
        }

        // Match on experience
        if (jobExperience) {
            orConditions.push({ experience: { $regex: new RegExp(escapeRegex(jobExperience), 'i') } });
        }

        // Match on qualification
        if (jobQualification) {
            orConditions.push({ highestQualification: { $regex: new RegExp(escapeRegex(jobQualification), 'i') } });
        }

        // Match on location
        if (jobLocation) {
            const primaryLocation = jobLocation.split(',')[0].trim();
            if (primaryLocation) {
                orConditions.push({ location: { $regex: new RegExp(escapeRegex(primaryLocation), 'i') } });
            }
        }

        // Match on department
        if (jobDepartment) {
            orConditions.push({ department: { $regex: new RegExp(escapeRegex(jobDepartment), 'i') } });
        }

        // If no specific conditions, just get recent active jobs
        if (orConditions.length > 0) {
            baseQuery.$or = orConditions;
        }

        const jobs = await Job.find(baseQuery)
            .populate('employerId', 'companyLogo companyName')
            .sort({ createdAt: -1 })
            .limit(35)
            .lean();

        if (!jobs.length) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        // Score jobs based on similarity
        const jobSkillsLower = jobSkills.map(skill => skill.toLowerCase());
        const qualificationLower = jobQualification ? jobQualification.toLowerCase() : '';
        const locationLower = jobLocation ? jobLocation.split(',')[0].trim().toLowerCase() : '';
        const departmentLower = jobDepartment ? jobDepartment.toLowerCase() : '';

        const scoredJobs = jobs.map(job => {
            let score = 0;

            // Skills matching (highest priority)
            if (jobSkillsLower.length && Array.isArray(job.skills)) {
                const overlap = job.skills.filter(skill => 
                    jobSkillsLower.includes((skill || '').toLowerCase())
                ).length;
                score += Math.min(overlap, 5) * 4; // Up to 20 points for skills
            }

            // Experience matching
            if (jobExperience && job.experience) {
                if (job.experience.toLowerCase().includes(jobExperience.toLowerCase()) ||
                    jobExperience.toLowerCase().includes(job.experience.toLowerCase())) {
                    score += 3;
                }
            }

            // Qualification matching
            if (qualificationLower && job.highestQualification) {
                const jobQualLower = job.highestQualification.toLowerCase();
                if (jobQualLower.includes(qualificationLower) || qualificationLower.includes(jobQualLower)) {
                    score += 2;
                }
            }

            // Location matching
            if (locationLower && job.location) {
                const jobLocLower = job.location.toLowerCase();
                if (jobLocLower.includes(locationLower) || locationLower.includes(jobLocLower)) {
                    score += 2;
                }
            }

            // Department matching
            if (departmentLower && job.department) {
                const jobDeptLower = job.department.toLowerCase();
                if (jobDeptLower.includes(departmentLower) || departmentLower.includes(jobDeptLower)) {
                    score += 2;
                }
            }

            return {
                job,
                score
            };
        });

        const topJobs = scoredJobs
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return new Date(b.job.createdAt) - new Date(a.job.createdAt);
            })
            .slice(0, 3)
            .map(item => item.job);

        return res.status(200).json({
            success: true,
            data: topJobs
        });

    } catch (error) {
        console.error("Similar Jobs Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to fetch similar jobs"
        });
    }
};

// Search jobs for genie AI agent based on user preferences (public route)
const searchJobsForGenie = async (req, res) => {
    try {
        const { currentRole, yearsOfExperience, preferredLocation } = req.body;

        // Build query - only active jobs
        const query = { status: 'Active' };

        // Date filters - only show jobs where closing date hasn't passed
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query.applicationClosingDate = { $gte: today };
        query.applicationOpeningDate = { $lte: new Date() };

        // Build search conditions - use more flexible matching
        const andConditions = [];

        // Location filter - more flexible matching (matches "Bangalore" in "Bangalore, India")
        if (preferredLocation && preferredLocation.trim()) {
            const locationQuery = preferredLocation.trim();
            // Match if location contains the query (case insensitive)
            andConditions.push({
                location: { $regex: locationQuery, $options: "i" }
            });
        }

        // Current role filter (search in jobTitle) - more flexible
        if (currentRole && currentRole.trim()) {
            const roleQuery = currentRole.trim().toLowerCase();
            // Extract key terms from role (e.g., "software developer" -> ["software", "developer"])
            const roleTerms = roleQuery.split(/\s+/).filter(term => term.length > 2);
            
            // Create OR conditions for each term - job must match at least one term
            const rolePatterns = [];
            
            // Try matching individual terms
            roleTerms.forEach(term => {
                rolePatterns.push({
                    jobTitle: { $regex: term, $options: "i" }
                });
            });
            
            // Also try matching the full role
            rolePatterns.push({
                jobTitle: { $regex: roleQuery, $options: "i" }
            });
            
            // Use OR so job matches if it has any of the terms
            if (rolePatterns.length > 0) {
                andConditions.push({ $or: rolePatterns });
            }
        }

        // Experience filter
        if (yearsOfExperience !== undefined && yearsOfExperience !== null) {
            const expYears = parseInt(yearsOfExperience);
            if (!isNaN(expYears)) {
                // Match experience requirements that are close to user's experience
                const experienceConditions = [];
                
                // Match exact years
                experienceConditions.push({
                    experience: { $regex: new RegExp(expYears.toString(), "i") }
                });

                // Match ranges that include this experience
                if (expYears === 0) {
                    experienceConditions.push({
                        experience: { $regex: /fresher/i }
                    });
                } else if (expYears <= 2) {
                    experienceConditions.push({
                        experience: { $regex: /0-1|1-2|0-2|fresher/i }
                    });
                } else if (expYears <= 5) {
                    experienceConditions.push({
                        experience: { $regex: new RegExp(`(${expYears - 1}-${expYears}|${expYears}-${expYears + 1}|2-3|3-5)`, "i") }
                    });
                } else if (expYears <= 10) {
                    experienceConditions.push({
                        experience: { $regex: new RegExp(`(${expYears - 2}-${expYears}|${expYears}-${expYears + 2}|5-7|7-10)`, "i") }
                    });
                } else {
                    experienceConditions.push({
                        experience: { $regex: new RegExp(`(${expYears - 2}-${expYears}|${expYears}\\+|10\\+)`, "i") }
                    });
                }

                if (experienceConditions.length > 0) {
                    andConditions.push({ $or: experienceConditions });
                }
            }
        }

        // Combine all conditions
        if (andConditions.length > 0) {
            query.$and = andConditions;
        }

        // Get jobs with employer data, sorted by created date (recent first)
        const jobs = await Job.find(query)
            .populate('employerId', 'companyName companyLogo')
            .sort({ createdAt: -1, applicationOpeningDate: -1 })
            .limit(20)
            .lean();

        return res.status(200).json({
            success: true,
            data: jobs,
            count: jobs.length
        });
    } catch (error) {
        console.error("Genie Job Search Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Upload candidate files and match with job
const uploadCandidatesForJob = async (req, res) => {
    const fs = require('fs').promises;
    const path = require('path');
    const {
        extractCandidateContent,
        matchCandidateWithJob,
        filterCandidates,
        sendCandidateEmails
    } = require('../services/candidateMatchingService');
    const aiDocumentService = require('../services/aiDocumentService');
    const CandidateMatch = require('../models/candidateMatch');

    try {
        const { jobId } = req.params;
        const { filterType, filterValue } = req.body;
        const employerId = req.userId;

        console.log('Upload candidates request:', {
            jobId,
            filterType,
            filterValue,
            filesCount: req.files ? req.files.length : 0,
            body: req.body,
            fileFieldNames: req.files ? req.files.map(f => f.fieldname) : [],
            fileNames: req.files ? req.files.map(f => f.originalname) : []
        });

        if (!req.files || req.files.length === 0) {
            console.error('No files found in request. req.files:', req.files);
            return res.status(400).json({
                success: false,
                message: 'No candidate files uploaded',
                debug: {
                    hasFiles: !!req.files,
                    filesLength: req.files ? req.files.length : 0
                }
            });
        }

        // Normalize filterType
        let normalizedFilterType = filterType;
        if (filterType === 'topPercentage' || filterType === 'Top Percentage') {
            normalizedFilterType = 'percentage';
        } else if (filterType === 'topNumber' || filterType === 'Top Number') {
            normalizedFilterType = 'topNumber';
        }
        
        // Parse filterValue
        let parsedFilterValue = filterValue;
        if (typeof filterValue === 'string') {
            // Remove % sign if present
            parsedFilterValue = parseFloat(filterValue.replace('%', '').trim());
        } else {
            parsedFilterValue = parseFloat(filterValue);
        }
        
        if (!normalizedFilterType || isNaN(parsedFilterValue) || parsedFilterValue <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Filter type and value are required',
                received: { filterType, filterValue },
                normalized: { filterType: normalizedFilterType, filterValue: parsedFilterValue }
            });
        }
        
        // Use normalized values
        const finalFilterType = normalizedFilterType;
        const finalFilterValue = parsedFilterValue;

        // Verify job belongs to employer
        const job = await Job.findOne({ _id: jobId, employerId });
        if (!job) {
            // Clean up uploaded files
            for (const file of req.files) {
                try {
                    await fs.unlink(file.path);
                } catch (err) {
                    console.error('Error deleting file:', err);
                }
            }
            return res.status(404).json({
                success: false,
                message: 'Job not found or access denied'
            });
        }

        // Extract content from all files
        const candidates = [];
        const errors = [];
        let originalExcelStructure = null;
        const fileExt = path.extname(req.files[0]?.originalname || '').toLowerCase();

        // If Excel file, extract structure first
        if ((fileExt === '.xlsx' || fileExt === '.xls') && req.files.length === 1) {
            try {
                const { extractExcelStructure } = require('../services/excelCandidateExtractor');
                const excelResult = await extractExcelStructure(req.files[0].path);
                
                if (excelResult.success) {
                    originalExcelStructure = {
                        headers: excelResult.headers,
                        headerInfo: excelResult.headerInfo,
                        originalFileType: fileExt.substring(1)
                    };

                    console.log(`Processing ${excelResult.candidates.length} candidates from Excel file`);

                    // Process each candidate row from Excel
                    for (let i = 0; i < excelResult.candidates.length; i++) {
                        const excelCandidate = excelResult.candidates[i];
                        try {
                            // Build candidate text from row data
                            const candidateText = Object.values(excelCandidate.rowData)
                                .filter(v => v && String(v).trim())
                                .join(' ');
                            
                            if (!candidateText || candidateText.trim().length === 0) {
                                console.warn(`Skipping empty row ${i + 1}`);
                                continue;
                            }

                            // Match with job using extracted text
                            const matchResult = await matchCandidateWithJob(candidateText, job);

                            candidates.push({
                                fileName: req.files[0].originalname,
                                extractedContent: candidateText,
                                originalExcelRow: excelCandidate.originalRow,
                                originalExcelRowIndex: excelCandidate.rowIndex,
                                originalExcelRowData: excelCandidate.rowData,
                                ...matchResult
                            });
                        } catch (error) {
                            console.error(`Error processing Excel row ${i + 1}:`, error);
                            console.error('Error stack:', error.stack);
                            errors.push({
                                fileName: req.files[0].originalname,
                                rowIndex: i + 1,
                                error: error.message
                            });
                        }
                    }
                } else {
                    console.error('Excel extraction failed:', excelResult.error);
                    errors.push({
                        fileName: req.files[0].originalname,
                        error: excelResult.error || 'Failed to extract Excel structure'
                    });
                }
            } catch (excelError) {
                console.error('Error in Excel processing:', excelError);
                console.error('Excel error stack:', excelError.stack);
                errors.push({
                    fileName: req.files[0].originalname,
                    error: excelError.message || 'Failed to process Excel file'
                });
            }

            // Clean up Excel file
            try {
                await fs.unlink(req.files[0].path);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        } else {
            // Use AI Document Service for better extraction and matching
            try {
                console.log('Using AI Document Service for file processing...');
                const filePaths = req.files.map(f => f.path);
                
                // Convert job to format expected by AI service
                const jobForAI = {
                    jobTitle: job.jobTitle,
                    jobDescription: job.jobDescription || job.requirements || '',
                    requirements: job.requirements || '',
                    keySkills: job.skills || [],
                    workExperience: job.experience || '',
                    location: job.location || ''
                };
                
                // Use AI service for processing
                const aiResult = await aiDocumentService.processAndFilterFiles(
                    filePaths,
                    jobForAI,
                    finalFilterValue
                );
                
                if (aiResult.success && aiResult.candidates) {
                    // Convert AI results to expected format
                    for (const aiCandidate of aiResult.candidates) {
                        candidates.push({
                            fileName: aiCandidate.sourceFile || req.files[0]?.originalname,
                            extractedContent: aiCandidate.extractedText || '',
                            matchScore: aiCandidate.matchScore || 0,
                            semanticSimilarity: aiCandidate.semanticSimilarity || 0,
                            skillMatchScore: aiCandidate.skillMatchScore || 0,
                            experienceMatchScore: aiCandidate.experienceMatchScore || 0,
                            candidateData: {
                                name: aiCandidate.name || '',
                                email: aiCandidate.email || '',
                                mobile: aiCandidate.mobile || '',
                                skills: aiCandidate.skills || '',
                                experience: aiCandidate.experience || '',
                                location: aiCandidate.location || '',
                                qualification: aiCandidate.qualification || '',
                                currentRole: aiCandidate.currentRole || ''
                            },
                            ...aiCandidate
                        });
                    }
                } else {
                    // Fallback to original method if AI service fails
                    console.warn('AI service failed, falling back to original method');
                    for (const file of req.files) {
                        try {
                            const extractionResult = await extractCandidateContent(file.path);
                            
                            if (!extractionResult.success) {
                                errors.push({
                                    fileName: file.originalname,
                                    error: extractionResult.error
                                });
                                continue;
                            }

                            const matchResult = await matchCandidateWithJob(
                                extractionResult.text,
                                job
                            );

                            candidates.push({
                                fileName: file.originalname,
                                extractedContent: extractionResult.text,
                                ...matchResult
                            });
                        } catch (error) {
                            console.error(`Error processing file ${file.originalname}:`, error);
                            errors.push({
                                fileName: file.originalname,
                                error: error.message
                            });
                        }
                    }
                }
                
                // Clean up uploaded files
                for (const file of req.files) {
                    try {
                        await fs.unlink(file.path);
                    } catch (err) {
                        console.error('Error deleting file:', err);
                    }
                }
            } catch (aiError) {
                console.error('AI service error, using fallback:', aiError);
                // Fallback to original processing
                for (const file of req.files) {
                    try {
                        const extractionResult = await extractCandidateContent(file.path);
                        
                        if (!extractionResult.success) {
                            errors.push({
                                fileName: file.originalname,
                                error: extractionResult.error
                            });
                            continue;
                        }

                        const matchResult = await matchCandidateWithJob(
                            extractionResult.text,
                            job
                        );

                        candidates.push({
                            fileName: file.originalname,
                            extractedContent: extractionResult.text,
                            ...matchResult
                        });
                    } catch (error) {
                        console.error(`Error processing file ${file.originalname}:`, error);
                        errors.push({
                            fileName: file.originalname,
                            error: error.message
                        });
                    } finally {
                        try {
                            await fs.unlink(file.path);
                        } catch (err) {
                            console.error('Error deleting file:', err);
                        }
                    }
                }
            }
        }

        if (candidates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid candidates found. Please check your files.',
                errors
            });
        }

        // Filter candidates based on criteria
        // If candidates already have matchScore from AI service, they're already sorted
        // Otherwise, use the filter function
        let selectedCandidates;
        if (candidates.length > 0 && candidates[0].matchScore !== undefined) {
            // Already filtered by AI service, just apply percentage
            const sorted = candidates.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
            if (finalFilterType === 'percentage') {
                const topCount = Math.max(1, Math.ceil((finalFilterValue / 100) * sorted.length));
                selectedCandidates = sorted.slice(0, topCount);
            } else {
                selectedCandidates = sorted.slice(0, Math.min(finalFilterValue, sorted.length));
            }
        } else {
            // Use original filter function
            selectedCandidates = filterCandidates(candidates, finalFilterType, finalFilterValue);
        }

        // Save results to database
        const candidateMatch = await CandidateMatch.create({
            jobId: job._id,
            employerId: employerId,
            totalCandidates: candidates.length,
            selectedCandidates: selectedCandidates.length,
            filterType: finalFilterType,
            filterValue: finalFilterValue,
            candidates: candidates,
            originalExcelStructure: originalExcelStructure,
            status: 'processing'
        });

        // Send emails in batches
        try {
            const emailResult = await sendCandidateEmails(job, selectedCandidates);
            
            // Update candidate match with email batches
            candidateMatch.emailBatches = emailResult.emailBatches;
            candidateMatch.status = 'completed';
            await candidateMatch.save();

            return res.json({
                success: true,
                message: `Successfully processed ${candidates.length} candidate(s). ${selectedCandidates.length} candidate(s) selected and ${emailResult.firstBatchSent ? 'first batch' : 'emails'} sent to hiring manager.`,
                data: {
                    totalCandidates: candidates.length,
                    selectedCandidates: selectedCandidates.length,
                    filterType: finalFilterType,
                    filterValue: finalFilterValue,
                    emailBatches: emailResult.batches,
                    errors: errors.length > 0 ? errors : undefined,
                    matchId: candidateMatch._id
                }
            });
        } catch (emailError) {
            console.error('Error sending emails:', emailError);
            candidateMatch.status = 'failed';
            candidateMatch.error = emailError.message;
            await candidateMatch.save();

            return res.status(500).json({
                success: false,
                message: 'Candidates processed but failed to send emails. Results saved.',
                error: emailError.message,
                data: {
                    totalCandidates: candidates.length,
                    selectedCandidates: selectedCandidates.length,
                    matchId: candidateMatch._id
                }
            });
        }

    } catch (error) {
        console.error('Upload candidates error:', error);
        console.error('Error stack:', error.stack);
        console.error('Request body:', req.body);
        console.error('Request files:', req.files ? req.files.length : 'No files');
        
        // Clean up any remaining files
        if (req.files) {
            for (const file of req.files) {
                try {
                    await fs.unlink(file.path);
                } catch (err) {
                    console.error('Error deleting file:', err);
                }
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to process candidates',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Download filtered candidates
const downloadFilteredCandidates = async (req, res) => {
    const path = require('path');
    const fs = require('fs').promises;

    try {
        const { jobId, matchId } = req.params;
        const { format = 'json' } = req.query; // 'json' or 'csv'
        const employerId = req.userId;

        // Verify job belongs to employer
        const job = await Job.findOne({ _id: jobId, employerId });
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found or access denied'
            });
        }

        // Get candidate match record
        const CandidateMatch = require('../models/candidateMatch');
        const candidateMatch = await CandidateMatch.findOne({
            _id: matchId,
            jobId: job._id,
            employerId: employerId
        });

        if (!candidateMatch) {
            return res.status(404).json({
                success: false,
                message: 'Candidate match record not found'
            });
        }

        // Get filtered candidates (top selected ones)
        const allCandidates = candidateMatch.candidates || [];
        const selectedCandidates = allCandidates
            .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
            .slice(0, candidateMatch.selectedCandidates);

        // If original file was Excel, download as Excel with same structure
        if (candidateMatch.originalExcelStructure && 
            candidateMatch.originalExcelStructure.headers && 
            candidateMatch.originalExcelStructure.headers.length > 0) {
            
            const { generateExcelFile } = require('../services/excelCandidateExtractor');
            const tempDir = path.join(__dirname, '../../uploads/temp');
            
            // Ensure temp directory exists
            try {
                await fs.mkdir(tempDir, { recursive: true });
            } catch (err) {
                // Directory might already exist
            }

            const excelFileName = `filtered_candidates_${job.jobTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.xlsx`;
            const excelFilePath = path.join(tempDir, excelFileName);

            const excelResult = generateExcelFile(
                excelFilePath,
                candidateMatch.originalExcelStructure.headers,
                candidateMatch.originalExcelStructure.headerInfo,
                selectedCandidates
            );

            if (excelResult.success) {
                // Send file and cleanup
                res.download(excelFilePath, excelFileName, async (err) => {
                    // Cleanup temp file after download
                    try {
                        await fs.unlink(excelFilePath);
                    } catch (cleanupErr) {
                        console.error('Error cleaning up temp file:', cleanupErr);
                    }
                    
                    if (err) {
                        console.error('Download error:', err);
                        if (!res.headersSent) {
                            res.status(500).json({
                                success: false,
                                message: 'Failed to download file'
                            });
                        }
                    }
                });
                return;
            } else {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to generate Excel file',
                    error: excelResult.error
                });
            }
        }

        // For non-Excel files, use JSON/CSV format
        if (format === 'csv') {
            // Helper function to escape CSV fields
            const escapeCsvField = (field) => {
                if (!field) return '';
                const str = String(field);
                // Replace double quotes with two double quotes (CSV escaping)
                const escaped = str.replace(/"/g, '""');
                // Wrap in quotes if contains comma, newline, or quote
                if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
                    return `"${escaped}"`;
                }
                return escaped;
            };

            // Generate CSV
            const csvHeader = 'Name,Match Score,Skill Match,Role Relevance,Career Progression,Overall Fit,Experience,Location,Qualification,Current Role,Skills,Explanation\n';
            
            const csvRows = selectedCandidates.map(candidate => {
                const name = escapeCsvField(candidate.candidateData?.name || 'Unknown');
                const matchScore = candidate.matchScore || 0;
                const skillMatch = candidate.skillMatch || 0;
                const roleRelevance = candidate.roleRelevance || 0;
                const careerProgression = candidate.careerProgression || 0;
                const overallFit = candidate.overallFit || 0;
                const experience = escapeCsvField(candidate.candidateData?.experience || 'N/A');
                const location = escapeCsvField(candidate.candidateData?.location || 'N/A');
                const qualification = escapeCsvField(candidate.candidateData?.qualification || 'N/A');
                const currentRole = escapeCsvField(candidate.candidateData?.currentRole || 'N/A');
                const skills = escapeCsvField(candidate.candidateData?.skills || 'N/A');
                const explanation = escapeCsvField(candidate.explanation || '');

                return `${name},${matchScore},${skillMatch},${roleRelevance},${careerProgression},${overallFit},${experience},${location},${qualification},${currentRole},${skills},${explanation}`;
            }).join('\n');

            const csvContent = csvHeader + csvRows;
            const fileName = `filtered_candidates_${job.jobTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send('\ufeff' + csvContent); // Add BOM for Excel UTF-8 support

        } else {
            // Generate JSON
            const jsonData = {
                job: {
                    id: job._id,
                    title: job.jobTitle,
                    company: job.companyName,
                    location: job.location
                },
                filter: {
                    type: candidateMatch.filterType,
                    value: candidateMatch.filterValue,
                    totalCandidates: candidateMatch.totalCandidates,
                    selectedCandidates: candidateMatch.selectedCandidates
                },
                candidates: selectedCandidates.map(candidate => ({
                    fileName: candidate.fileName,
                    candidateData: candidate.candidateData,
                    matchScore: candidate.matchScore,
                    skillMatch: candidate.skillMatch,
                    roleRelevance: candidate.roleRelevance,
                    careerProgression: candidate.careerProgression,
                    overallFit: candidate.overallFit,
                    explanation: candidate.explanation,
                    shouldReject: candidate.shouldReject
                })),
                generatedAt: new Date().toISOString()
            };

            const fileName = `filtered_candidates_${job.jobTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.json(jsonData);
        }

    } catch (error) {
        console.error('Download filtered candidates error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to download filtered candidates',
            error: error.message
        });
    }
};

module.exports = {
    postJob,
    getEmployerJobs,
    getJobById,
    getJobByShortId,
    getPublicJobs,
    incrementJobView,
    getJobViewers,
    logJobViewEmail,
    updateJob,
    deleteJob,
    getSimilarJobs,
    searchJobsForGenie,
    uploadCandidatesForJob,
    downloadFilteredCandidates
};

