const express = require("express");
const adminController = require("../controllers/adminController.js");
const dashboardController = require("../controllers/dashboardController.js");
const verifyAdminToken = require("../middleware/adminAuthMiddleware.js");

const router = express.Router();

// Public routes
router.post("/signin", adminController.signinAdmin);

// Protected routes
router.get("/profile", verifyAdminToken, adminController.getProfile);

// Dashboard Routes
router.get("/dashboard/stats", verifyAdminToken, dashboardController.getDashboardStats);
router.get("/dashboard/analysis", verifyAdminToken, dashboardController.getAnalysisData);
router.get("/dashboard/module/:module", verifyAdminToken, dashboardController.getModuleStats);

// Job Alert Test Routes
router.get("/test/job-alert/status", verifyAdminToken, adminController.getJobAlertStatus);
router.get("/test/job-alert/:jobSeekerId", verifyAdminToken, adminController.testJobAlert);
router.post("/test/job-alert/send", verifyAdminToken, adminController.testSendJobAlert);
router.post("/test/job-alert/run-matching", verifyAdminToken, adminController.runJobMatching);

module.exports = router;

