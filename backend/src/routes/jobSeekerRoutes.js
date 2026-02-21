const express = require("express");
const multer = require("multer");
const jobSeekerController = require("../controllers/jobSeekerController.js");
const verifyToken = require("../middleware/authMiddleware.js");
const videoProctoringController = require("../controllers/videoProctoringController.js");
const jobSeekerInstantAlertController = require("../controllers/jobSeekerInstantAlertController.js");
const resumeBuilderController = require("../controllers/resumeBuilderController.js");
const { uploadResume } = require("../middleware/uploadMiddleware.js");
const { uploadProctoringAsset, uploadProctoringVideo } = require("../middleware/uploadProctoringMedia.js");

const router = express.Router();

router.post("/generate-otp", jobSeekerController.generateOtp);

router.post("/check-otp", jobSeekerController.checkOtp);

router.post("/register", jobSeekerController.registerJobSeeker);

router.post("/login", jobSeekerController.loginJobSeeker);

// Password reset routes
router.post("/forgot-password/send-otp", jobSeekerController.sendPasswordResetOtp);
router.post("/forgot-password/verify-otp", jobSeekerController.verifyPasswordResetOtp);
router.post("/forgot-password/reset", jobSeekerController.resetPassword);

router.get("/resume/share/:token", jobSeekerController.viewSharedResume);

// Protected routes
router.get("/profile", verifyToken, jobSeekerController.getProfile);
router.get("/profile/assessment-requirements", verifyToken, jobSeekerController.getAssessmentProfileRequirements);
router.put("/profile", verifyToken, (req, res, next) => {
    uploadResume(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: "File size too large. Maximum size is 10MB."
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
}, jobSeekerController.updateProfile);

router.get("/resume/view", verifyToken, jobSeekerController.viewResume);

router.get("/resume/download", verifyToken, jobSeekerController.downloadResume);

router.delete("/resume", verifyToken, jobSeekerController.deleteResume);

// Saved jobs routes
router.post("/save-job", verifyToken, jobSeekerController.toggleSaveJob);
router.get("/saved-jobs", verifyToken, jobSeekerController.getSavedJobs);
router.get("/check-saved/:jobId", verifyToken, jobSeekerController.checkJobSaved);
router.get("/applications", verifyToken, jobSeekerController.getJobApplicationsList);

// Settings routes
router.get("/settings/email-alert", verifyToken, jobSeekerController.getEmailAlertSetting);
router.patch("/settings/email-alert", verifyToken, jobSeekerController.updateEmailAlertSetting);
router.get("/settings/job-alert", verifyToken, jobSeekerController.getJobMatchAlertSetting);
router.patch("/settings/job-alert", verifyToken, jobSeekerController.updateJobMatchAlertSetting);
router.post("/settings/send-otp", verifyToken, jobSeekerController.sendSettingsOtp);
router.post("/settings/verify-otp", verifyToken, jobSeekerController.verifySettingsOtp);

// Instant alert plan checkout
router.post("/instant-alerts/checkout", verifyToken, jobSeekerInstantAlertController.createInstantAlertCheckoutSession);
router.post("/instant-alerts/verify-payment", jobSeekerInstantAlertController.verifyInstantAlertPayment);
router.get("/instant-alerts/plan", verifyToken, jobSeekerInstantAlertController.getInstantAlertPlan);

// Resume Builder routes
router.post("/resume-builder/checkout", verifyToken, resumeBuilderController.createCheckoutSession);
// Verify session doesn't need auth as it's called from payment callback
router.get("/resume-builder/verify-session", resumeBuilderController.verifyCheckoutSession);
router.get("/resume-builder/plan", verifyToken, resumeBuilderController.getJobSeekerPlan);
router.get("/resume-builder/plan-config", verifyToken, resumeBuilderController.getPlanConfiguration);
router.put("/resume-builder/active-plan", verifyToken, resumeBuilderController.updateActivePlan);
router.get("/resume-builder/payments", verifyToken, resumeBuilderController.getPaymentHistory);
router.get("/resume-builder/check-creations", verifyToken, resumeBuilderController.checkCreations);
router.get("/resume-builder/check-downloads", verifyToken, resumeBuilderController.checkDownloads);
router.get("/resume-builder/check-enhancements", verifyToken, resumeBuilderController.checkEnhancements);
router.post("/resume-builder/generate-resume", verifyToken, resumeBuilderController.generateResume);
router.get("/resume-builder/get-resume", verifyToken, resumeBuilderController.getResumeById);
router.get("/resume-builder/get-all-resumes", verifyToken, resumeBuilderController.getAllResumes);
router.post("/resume-builder/update-downloads", verifyToken, resumeBuilderController.updateDownloads);
router.post("/resume-builder/generate-pdf", verifyToken, resumeBuilderController.generatePDFFromHTML);

// Job assessments
router.get("/jobs/:jobId/assessment", verifyToken, jobSeekerController.getJobAssessmentStatus);
router.post("/jobs/:jobId/assessment/start", verifyToken, jobSeekerController.startJobAssessment);
router.post("/jobs/:jobId/assessment/progress", verifyToken, jobSeekerController.updateJobAssessmentProgress);
router.post("/jobs/:jobId/assessment/activity", verifyToken, jobSeekerController.recordJobAssessmentActivity);
router.post("/jobs/:jobId/assessment/submit", verifyToken, jobSeekerController.submitJobAssessment);

// Assessment retest payments
router.post("/jobs/:jobId/assessment/retest-payment", verifyToken, jobSeekerController.createAssessmentRetestPayment);
router.post("/assessment/retest-payment/verify", verifyToken, jobSeekerController.verifyAssessmentRetestPayment);

// Video proctoring module
router.get("/jobs/:jobId/proctoring", verifyToken, videoProctoringController.getVideoProctoringStatus);
router.post("/jobs/:jobId/proctoring/start", verifyToken, videoProctoringController.startVideoProctoringAssessment);
router.post("/jobs/:jobId/proctoring/:attemptId/precheck", verifyToken, videoProctoringController.logProctoringPrecheck);
router.post("/jobs/:jobId/proctoring/:attemptId/permissions", verifyToken, videoProctoringController.acknowledgeMediaPermissions);
router.post("/jobs/:jobId/proctoring/:attemptId/mcq", verifyToken, videoProctoringController.updateProctoringMcqProgress);
router.post("/jobs/:jobId/proctoring/:attemptId/session/start", verifyToken, videoProctoringController.startProctoringSession);
router.post("/jobs/:jobId/proctoring/:attemptId/session/event", verifyToken, videoProctoringController.recordProctoringEvent);
router.post("/jobs/:jobId/proctoring/:attemptId/assets/:assetType", verifyToken, uploadProctoringAsset, videoProctoringController.storeProctoringAsset);
router.post("/jobs/:jobId/proctoring/:attemptId/video", verifyToken, uploadProctoringVideo, videoProctoringController.storeProctoringVideo);
router.post("/jobs/:jobId/proctoring/:attemptId/submit", verifyToken, videoProctoringController.submitVideoProctoringAttempt);
router.post("/jobs/:jobId/apply", verifyToken, jobSeekerController.applyToJob);

module.exports = router;
