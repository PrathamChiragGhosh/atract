const VoiceAgentSession = require('../models/voiceAgentSession.js');
const AnalyzedResume = require('../models/analyzedResume.js');
const VoiceAgentConversation = require('../models/voiceAgentConversation.js');
const resumeAnalysisService = require('../services/resumeAnalysisService.js');
const { getIO } = require('../socket/socketServer.js');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new voice agent session
 */
const createSession = async (req, res) => {
    try {
        const { jobDescription } = req.body;

        if (!jobDescription || !jobDescription.trim()) {
            return res.status(400).json({
                success: false,
                message: "Job description is required"
            });
        }

        const session = await VoiceAgentSession.create({
            employerId: req.userId,
            jobDescription: jobDescription.trim(),
            status: 'pending',
            socketRoomId: `voice-agent-${req.userId}-${uuidv4()}`
        });

        return res.status(201).json({
            success: true,
            message: "Voice agent session created successfully",
            data: session
        });
    } catch (error) {
        console.error("Create Voice Agent Session Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

/**
 * Upload resumes and analyze them
 */
const uploadAndAnalyzeResumes = async (req, res) => {
    try {
        const { sessionId, jobDescription } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Session ID is required"
            });
        }

        // Verify session belongs to employer
        const session = await VoiceAgentSession.findOne({
            _id: sessionId,
            employerId: req.userId
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No resume files uploaded"
            });
        }

        // Update session status
        session.status = 'analyzing';
        await session.save();

        const analyzedResumes = [];
        const errors = [];

        // Process each resume
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            try {
                // Analyze resume
                const { analysis } = await resumeAnalysisService.processResume(
                    file.path,
                    jobDescription || session.jobDescription
                );

                // Save analyzed resume
                const analyzedResume = await AnalyzedResume.create({
                    employerId: req.userId,
                    sessionId: session._id,
                    originalFileName: file.originalname,
                    filePath: file.path,
                    candidateName: analysis.candidateName,
                    phoneNumber: analysis.phoneNumber,
                    email: analysis.email,
                    experience: analysis.experience,
                    skills: analysis.skills,
                    education: analysis.education,
                    currentCompany: analysis.currentCompany,
                    currentRole: analysis.currentRole,
                    yearsOfExperience: analysis.yearsOfExperience,
                    extractedData: analysis.rawData,
                    analysisStatus: 'completed',
                    analyzedAt: new Date()
                });

                // Add to session resumes array
                session.resumes.push({
                    resumeId: analyzedResume._id,
                    candidateName: analysis.candidateName || 'Unknown',
                    phoneNumber: analysis.phoneNumber || null,
                    status: 'ready',
                    analyzedAt: new Date()
                });

                analyzedResumes.push(analyzedResume);
            } catch (error) {
                console.error(`Error analyzing resume ${file.originalname}:`, error);
                errors.push({
                    fileName: file.originalname,
                    error: error.message
                });
            }
        }

        // Update session
        session.totalCandidates = session.resumes.length;
        await session.save();

        return res.status(200).json({
            success: true,
            message: `Analyzed ${analyzedResumes.length} resume(s)`,
            data: {
                session,
                analyzedResumes,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (error) {
        console.error("Upload and Analyze Resumes Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

/**
 * Start voice agent session - begin connecting to candidates
 */
const startSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await VoiceAgentSession.findOne({
            _id: sessionId,
            employerId: req.userId
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        if (session.resumes.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No resumes analyzed. Please upload and analyze resumes first."
            });
        }

        // Update session status
        session.status = 'connecting';
        session.startedAt = new Date();
        session.currentCandidateIndex = 0;
        await session.save();

        // Emit socket event to notify employer and start connecting to first candidate
        try {
            const io = getIO();
            io.to(`employer:${req.userId}`).emit('session:started', {
                sessionId: session._id,
                message: 'Voice agent session started'
            });

            // Start connecting to first candidate if available
            if (session.resumes.length > 0) {
                const firstResume = session.resumes[0];
                if (firstResume.resumeId) {
                    firstResume.status = 'connecting';
                    firstResume.connectionStatus = 'waiting_for_candidate';
                    await session.save();

                    // Notify that candidate can connect
                    io.emit('candidate:ready_to_connect', {
                        sessionId: session._id,
                        resumeId: firstResume.resumeId.toString(),
                        candidateName: firstResume.candidateName
                    });
                }
            }
        } catch (error) {
            console.error('Error emitting socket event:', error);
            // Continue even if socket fails
        }

        return res.status(200).json({
            success: true,
            message: "Voice agent session started",
            data: session
        });
    } catch (error) {
        console.error("Start Session Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

/**
 * Get all sessions for employer
 */
const getSessions = async (req, res) => {
    try {
        const sessions = await VoiceAgentSession.find({
            employerId: req.userId
        })
        .sort({ createdAt: -1 })
        .populate('resumes.resumeId', 'candidateName phoneNumber')
        .lean();

        return res.status(200).json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error("Get Sessions Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

/**
 * Get session by ID
 */
const getSessionById = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await VoiceAgentSession.findOne({
            _id: sessionId,
            employerId: req.userId
        })
        .populate('resumes.resumeId')
        .lean();

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error("Get Session Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

/**
 * Get conversation by resume ID
 */
const getConversation = async (req, res) => {
    try {
        const { resumeId } = req.params;

        const conversation = await VoiceAgentConversation.findOne({
            resumeId: resumeId
        })
        .populate('sessionId', 'jobDescription')
        .lean();

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        // Verify employer owns the session
        const session = await VoiceAgentSession.findById(conversation.sessionId._id);
        if (session.employerId.toString() !== req.userId) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        return res.status(200).json({
            success: true,
            data: conversation
        });
    } catch (error) {
        console.error("Get Conversation Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

module.exports = {
    createSession,
    uploadAndAnalyzeResumes,
    startSession,
    getSessions,
    getSessionById,
    getConversation
};

