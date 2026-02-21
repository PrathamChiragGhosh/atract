const express = require("express");
const jobController = require("../controllers/jobController.js");
const { generateJobDescription, getPendingSocialShareCount, generateSocialShareForJobs, generateSocialShareForSingleJob } = require("../controllers/aiController.js");
const verifyToken = require("../middleware/authMiddleware.js");
const { uploadCandidateFiles } = require("../middleware/uploadCandidateFiles.js");

const router = express.Router();

// Public routes (no auth required)
router.get("/public", jobController.getPublicJobs);
router.get("/public/:shortId", jobController.getJobByShortId);
router.post("/public/:shortId/view", jobController.incrementJobView);
router.post("/public/:shortId/view-email", jobController.logJobViewEmail);
router.get("/similar/:shortId", jobController.getSimilarJobs);
router.post("/genie/search", jobController.searchJobsForGenie);

// All routes require authentication
router.post("/", verifyToken, jobController.postJob);
router.post("/generate-jd", verifyToken, generateJobDescription);
router.get("/pending-social-share-count", verifyToken, getPendingSocialShareCount);
router.post("/generate-social-share", verifyToken, generateSocialShareForJobs);
router.post("/:jobId/generate-social-share", verifyToken, generateSocialShareForSingleJob);
router.get("/", verifyToken, jobController.getEmployerJobs);
router.get("/:jobId", verifyToken, jobController.getJobById);
router.get("/:jobId/viewers", verifyToken, jobController.getJobViewers);
router.put("/:jobId", verifyToken, jobController.updateJob);
router.delete("/:jobId", verifyToken, jobController.deleteJob);
router.post("/:jobId/upload-candidates", verifyToken, uploadCandidateFiles, jobController.uploadCandidatesForJob);
router.get("/:jobId/download-candidates/:matchId", verifyToken, jobController.downloadFilteredCandidates);

module.exports = router;

