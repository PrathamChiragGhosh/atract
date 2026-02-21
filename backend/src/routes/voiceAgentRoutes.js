const express = require("express");
const voiceAgentController = require("../controllers/voiceAgentController.js");
const { uploadVoiceAgentResumes } = require("../middleware/uploadVoiceAgentResumes.js");
const verifyToken = require("../middleware/authMiddleware.js");

const router = express.Router();

// All routes require authentication
router.post("/session", verifyToken, voiceAgentController.createSession);
router.post("/session/:sessionId/upload", verifyToken, uploadVoiceAgentResumes, voiceAgentController.uploadAndAnalyzeResumes);
router.post("/session/:sessionId/start", verifyToken, voiceAgentController.startSession);
router.get("/sessions", verifyToken, voiceAgentController.getSessions);
router.get("/session/:sessionId", verifyToken, voiceAgentController.getSessionById);
router.get("/conversation/:resumeId", verifyToken, voiceAgentController.getConversation);

module.exports = router;

