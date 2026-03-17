/**
 * AI Routes
 * API endpoints for AI-powered features using Groq
 * 
 * Routes:
 * - POST /api/ai/generate-jd - Generate job description
 * - POST /api/ai/screen-candidate - Screen candidate against job
 * - POST /api/ai/chat - Chat with AI assistant
 */

const express = require('express');
const router = express.Router();
const {
    generateJobDescription,
    screenCandidate,
    generateChatResponse
} = require('../services/ai/aiService.js');
const verifyToken = require('../middleware/authMiddleware.js');

/**
 * POST /api/ai/generate-jd
 * Generate job description using Groq AI
 * @access Private (Employer)
 */
router.post('/generate-jd', verifyToken, async (req, res) => {
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
            applicationOpeningDate,
            applicationClosingDate,
            responsibilities,
            requirements,
            perksAndBenefits,
            skills = []
        } = req.body;

        // Validate required fields
        if (!jobTitle || !companyName) {
            return res.status(400).json({
                success: false,
                message: 'Job title and company name are required'
            });
        }

        const jobData = {
            jobTitle: jobTitle.trim(),
            companyName: companyName.trim(),
            jobType: jobType || '',
            department: department || '',
            employmentType: employmentType || '',
            experience: experience || '',
            workMode: workMode || '',
            location: location || '',
            highestQualification: highestQualification || '',
            minSalary: minSalary || null,
            maxSalary: maxSalary || null,
            applicationOpeningDate: applicationOpeningDate || '',
            applicationClosingDate: applicationClosingDate || '',
            responsibilities: responsibilities || '',
            requirements: requirements || '',
            perksAndBenefits: perksAndBenefits || '',
            skills: Array.isArray(skills) ? skills : []
        };

        const result = await generateJobDescription(jobData);

        return res.status(200).json({
            success: true,
            message: 'Job description generated successfully',
            data: result
        });

    } catch (error) {
        console.error('Generate JD Error:', error);

        if (error.message.includes('API key')) {
            return res.status(500).json({
                success: false,
                message: 'AI service configuration error. Please check API key settings.'
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate job description. Please try again.'
        });
    }
});

/**
 * POST /api/ai/screen-candidate
 * Screen candidate against job description
 * @access Private (Employer)
 */
router.post('/screen-candidate', verifyToken, async (req, res) => {
    try {
        const {
            resumeText,
            jobDescription,
            jobTitle
        } = req.body;

        // Validate required fields
        if (!resumeText) {
            return res.status(400).json({
                success: false,
                message: 'Resume text is required'
            });
        }

        if (!jobDescription) {
            return res.status(400).json({
                success: false,
                message: 'Job description is required'
            });
        }

        if (!jobTitle) {
            return res.status(400).json({
                success: false,
                message: 'Job title is required'
            });
        }

        const result = await screenCandidate({
            resumeText,
            jobDescription,
            jobTitle
        });

        return res.status(200).json({
            success: true,
            message: 'Candidate screening completed',
            data: result
        });

    } catch (error) {
        console.error('Screen Candidate Error:', error);

        if (error.message.includes('API key')) {
            return res.status(500).json({
                success: false,
                message: 'AI service configuration error. Please check API key settings.'
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to screen candidate. Please try again.'
        });
    }
});

/**
 * POST /api/ai/chat
 * Chat with AI assistant
 * @access Public (or Private based on requirement)
 */
router.post('/chat', async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const response = await generateChatResponse(message, conversationHistory || []);

        return res.status(200).json({
            success: true,
            message: 'Chat response generated',
            data: {
                response: response
            }
        });

    } catch (error) {
        console.error('Chat Error:', error);

        if (error.message.includes('API key')) {
            return res.status(500).json({
                success: false,
                message: 'AI service configuration error. Please check API key settings.'
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate chat response. Please try again.'
        });
    }
});

/**
 * GET /api/ai/health
 * Health check for AI service
 * @access Public
 */
router.get('/health', (req, res) => {
    const { GROQ_API_KEY, GROQ_MODEL } = require('../services/ai/aiService.js');
    
    res.status(200).json({
        success: true,
        message: 'AI service is running',
        data: {
            provider: 'Groq',
            model: GROQ_MODEL,
            apiKeyConfigured: !!GROQ_API_KEY
        }
    });
});

module.exports = router;
