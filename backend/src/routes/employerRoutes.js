const express = require("express");
const multer = require("multer");
const employerController = require("../controllers/employerController.js");
const verifyToken = require("../middleware/authMiddleware.js");
const { uploadEmployerFiles } = require("../middleware/uploadEmployerFiles.js");
const uploadSmartPost = require("../middleware/uploadSmartPost.js");

const router = express.Router();

router.post("/generate-otp", employerController.generateOtp);

router.post("/check-otp", employerController.checkOtp);

router.post("/register", employerController.registerEmployer);

router.post("/login", employerController.loginEmployer);

// Password reset routes
router.post("/forgot-password/send-otp", employerController.sendPasswordResetOtp);
router.post("/forgot-password/verify-otp", employerController.verifyPasswordResetOtp);
router.post("/forgot-password/reset", employerController.resetPassword);

// Protected routes
router.get("/profile", verifyToken, employerController.getProfile);

router.put("/profile", verifyToken, (req, res, next) => {
    uploadEmployerFiles(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: "File size too large. Maximum size is 2MB."
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            // Handle file filter errors
            if (err.message) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            return res.status(500).json({
                success: false,
                message: "File upload error"
            });
        }
        next();
    });
}, employerController.updateProfile);

router.get("/settings/notifications", verifyToken, employerController.getNotificationSettings);
router.patch("/settings/notifications", verifyToken, employerController.updateNotificationSettings);

// Email alert on login settings
router.get("/settings/email-alert", verifyToken, employerController.getEmailAlertSetting);
router.patch("/settings/email-alert", verifyToken, employerController.updateEmailAlertSetting);
router.post("/settings/send-otp", verifyToken, employerController.sendSettingsOtp);
router.post("/settings/verify-otp", verifyToken, employerController.verifySettingsOtp);

// Applications routes
router.get("/applications", verifyToken, employerController.getEmployerApplications);
router.patch("/applications/:applicationId/status", verifyToken, employerController.updateApplicationStatus);
router.get("/applications/:applicationId/resume", verifyToken, employerController.viewApplicationResume);
router.get("/applications/:applicationId/test-summary", verifyToken, employerController.getApplicationTestSummary);

// Smart Select routes
const smartSelectController = require("../controllers/smartSelectController");
const { uploadSmartSelectFiles } = require("../middleware/uploadSmartSelect");
router.post("/smart-select/checkout", verifyToken, smartSelectController.createCheckoutSession);
// Verify payment - can be called from frontend after payment
router.post("/smart-select/verify-payment", smartSelectController.verifyCheckoutSession);
// Razorpay webhook for payment status updates (needs raw body for signature verification)
router.post("/smart-select/webhook", express.raw({ type: 'application/json' }), smartSelectController.razorpayWebhook);
router.get("/smart-select/plan", verifyToken, smartSelectController.getEmployerPlan);
router.get("/smart-select/plan-config", verifyToken, smartSelectController.getPlanConfiguration);
router.put("/smart-select/active-plan", verifyToken, smartSelectController.updateActivePlan);
router.get("/smart-select/payments", verifyToken, smartSelectController.getPaymentHistory);
router.get("/smart-select/analysis-history", verifyToken, smartSelectController.getAnalysisHistory);
router.get("/smart-select/check-analyzes", verifyToken, smartSelectController.checkAnalyzes);
// Download route should come before analysis/:analysisId to avoid route conflicts
router.get("/smart-select/download-resume/:analysisId/:fileName", verifyToken, smartSelectController.downloadAnalyzedResume);
router.get("/smart-select/analysis/:analysisId", verifyToken, smartSelectController.getAnalysisById);
router.post("/smart-select/analyze-multiple-resumes", verifyToken, uploadSmartSelectFiles, smartSelectController.analyzeMultipleResumes);

// Smart Post routes
router.post("/smart-post/analyze", verifyToken, uploadSmartPost.array("files", 10), employerController.analyzeSmartPost);
router.get("/smart-post", verifyToken, employerController.getSmartPostJobs);
router.get("/smart-post/:id", verifyToken, employerController.getSmartPostJob);
router.post("/smart-post/:id/post", verifyToken, employerController.postJobFromSmartPost);
router.delete("/smart-post/:id", verifyToken, employerController.deleteSmartPostJob);

// Job Alert Test Routes
router.get("/test/job-alert/status", verifyToken, employerController.getJobAlertStatus);
router.get("/test/job-alert/:jobSeekerId", verifyToken, employerController.testJobAlert);
router.post("/test/job-alert/send", verifyToken, employerController.testSendJobAlert);
router.post("/test/job-alert/run-matching", verifyToken, employerController.runJobMatching);
router.get("/test/job-alert/cron-status", verifyToken, employerController.getCronStatus);
router.post("/test/job-alert/reschedule-cron", verifyToken, employerController.rescheduleCron);

module.exports = router;

