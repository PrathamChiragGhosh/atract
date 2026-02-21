const Admin = require('../models/admin.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Email Regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password regex: upper, lower, number, special, 8+ chars
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Admin signin
const signinAdmin = async (req, res) => {
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

        const admin = await Admin.findOne({ email: email.toLowerCase() });

        if (!admin) {
            return res.status(200).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account is deactivated. Please contact system administrator.",
            });
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(200).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        // Generate token using ADMIN_JWT_SECRET
        const token = jwt.sign(
            { userId: admin._id, userName: admin.fullName, role: admin.role, userType: 'admin' },
            process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "A123B456cdef1234567",
        );

        return res.status(200).json({
            success: true,
            message: "Sign in successful",
            token,
            data: {
                _id: admin._id,
                fullName: admin.fullName,
                email: admin.email,
                role: admin.role,
                lastLogin: admin.lastLogin
            }
        });

    } catch (err) {
        console.error("ADMIN SIGNIN ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Get admin profile
const getProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.userId).select('-password');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: admin
        });

    } catch (error) {
        console.error("Get Admin Profile Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
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
        console.log('Manually triggering job matching...');
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

module.exports = {
    signinAdmin,
    getProfile,
    getJobAlertStatus,
    testJobAlert,
    testSendJobAlert,
    runJobMatching
};

