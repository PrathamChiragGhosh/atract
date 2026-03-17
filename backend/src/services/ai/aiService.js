/**
 * Central AI Service Layer using Groq API
 * Replaces TogetherAI/OpenAI calls with Groq for faster inference
 * 
 * Usage:
 *   const { generateAIResponse } = require('./services/ai/aiService.js');
 *   const result = await generateAIResponse(prompt, options);
 */

const Groq = require('groq');

// Get Groq configuration from environment
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama3-70b-8192';

// Default timeout for API calls (in ms)
const DEFAULT_TIMEOUT = 60000; // 60 seconds

// Initialize Groq client only if API key exists
let groqClient = null;

function getGroqClient() {
    if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY is not configured. Please add GROQ_API_KEY to your .env file.');
    }
    
    if (!groqClient) {
        groqClient = new Groq({
            apiKey: GROQ_API_KEY,
        });
    }
    
    return groqClient;
}

/**
 * Generate AI response using Groq API
 * @param {string} prompt - The prompt to send to the AI
 * @param {Object} options - Optional configuration
 * @param {string} options.model - Model to use (default: GROQ_MODEL)
 * @param {number} options.temperature - Temperature for generation (default: 0.7)
 * @param {number} options.max_tokens - Max tokens to generate (default: 4096)
 * @param {number} options.timeout - Timeout in ms (default: 60000)
 * @returns {Promise<string>} AI response text
 */
async function generateAIResponse(prompt, options = {}) {
    const {
        model = GROQ_MODEL,
        temperature = 0.7,
        max_tokens = 4096,
        timeout = DEFAULT_TIMEOUT
    } = options;

    // Check if API key is configured
    if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY is not configured. Please add GROQ_API_KEY to your .env file.');
    }

    const client = getGroqClient();

    try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Groq API timeout')), timeout);
        });

        // Create API call promise
        const apiPromise = client.chat.completions.create({
            model: model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: temperature,
            max_tokens: max_tokens,
        });

        // Race between API call and timeout
        const result = await Promise.race([apiPromise, timeoutPromise]);

        if (!result.choices || result.choices.length === 0) {
            throw new Error('No response from Groq API');
        }

        return result.choices[0].message.content;

    } catch (error) {
        console.error('Groq API Error:', error.message);
        
        if (error.message.includes('timeout')) {
            throw new Error('AI request timed out. Please try again.');
        }
        
        if (error.message.includes('API key')) {
            throw new Error('AI service configuration error. Please check API key settings.');
        }
        
        throw new Error(`Failed to generate AI response: ${error.message}`);
    }
}

/**
 * Generate AI response with system prompt
 * @param {string} systemPrompt - System prompt to set context
 * @param {string} userPrompt - User prompt
 * @param {Object} options - Optional configuration
 * @returns {Promise<string>} AI response text
 */
async function generateAIResponseWithSystem(systemPrompt, userPrompt, options = {}) {
    const {
        model = GROQ_MODEL,
        temperature = 0.7,
        max_tokens = 4096,
        timeout = DEFAULT_TIMEOUT
    } = options;

    if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY is not configured. Please add GROQ_API_KEY to your .env file.');
    }

    const client = getGroqClient();

    try {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Groq API timeout')), timeout);
        });

        const apiPromise = client.chat.completions.create({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            temperature: temperature,
            max_tokens: max_tokens,
        });

        const result = await Promise.race([apiPromise, timeoutPromise]);

        if (!result.choices || result.choices.length === 0) {
            throw new Error('No response from Groq API');
        }

        return result.choices[0].message.content;

    } catch (error) {
        console.error('Groq API Error:', error.message);
        throw new Error(`Failed to generate AI response: ${error.message}`);
    }
}

// ============================================
// Specialized AI Functions
// ============================================

/**
 * Generate Job Description
 * @param {Object} jobData - Job information
 * @returns {Promise<Object>} Generated JD content
 */
async function generateJobDescription(jobData) {
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
    } = jobData;

    let prompt = `You are an expert HR professional and technical writer. Generate a comprehensive job description for the following position:

Job Title: ${jobTitle}
Company: ${companyName}
Job Type: ${jobType || 'Not specified'}
Department: ${department || 'Not specified'}
Employment Type: ${employmentType || 'Permanent'}
Experience Required: ${experience || 'Not specified'}
Work Mode: ${workMode || 'Not specified'}
Location: ${location || 'Not specified'}
Minimum Qualification: ${highestQualification || 'Not specified'}
Salary Range: ${minSalary && maxSalary ? `₹${minSalary.toLocaleString()} - ₹${maxSalary.toLocaleString()}` : minSalary ? `Starting from ₹${minSalary.toLocaleString()}` : maxSalary ? `Up to ₹${maxSalary.toLocaleString()}` : 'Not specified'}
Application Opening Date: ${applicationOpeningDate || 'Not specified'}
Application Closing Date: ${applicationClosingDate || 'Not specified'}`;

    if (responsibilities && responsibilities.trim()) {
        prompt += `\n\nAdditional Context - Responsibilities provided: ${responsibilities}`;
    }

    if (requirements && requirements.trim()) {
        prompt += `\n\nAdditional Context - Requirements provided: ${requirements}`;
    }

    if (perksAndBenefits && perksAndBenefits.trim()) {
        prompt += `\n\nAdditional Context - Perks & Benefits provided: ${perksAndBenefits}`;
    }

    if (skills && Array.isArray(skills) && skills.length > 0) {
        prompt += `\n\nKey Skills to emphasize: ${skills.join(', ')}`;
    }

    prompt += `\n\nPlease generate a professional, engaging job description with the following structure:

1. Job Description: A comprehensive overview (3-5 paragraphs) that includes:
   - Company overview and culture
   - Role overview and importance
   - Key highlights and what makes this role exciting
   - Career growth opportunities

2. Key Responsibilities: A detailed list (8-12 points) of primary responsibilities and duties, formatted as bullet points.

3. Requirements: A detailed list (6-10 points) of required and preferred qualifications, including:
   - Educational requirements
   - Technical skills
   - Soft skills
   - Experience requirements

4. Perks & Benefits: A list (5-8 points) of what the company offers.

Output the response as a JSON object with the following structure:
{
  "jobDescription": "...",
  "responsibilities": ["...", "..."],
  "requirements": ["...", "..."],
  "perksAndBenefits": ["...", "..."]
}

Only output valid JSON, no additional text.`;

    try {
        const response = await generateAIResponse(prompt, {
            temperature: 0.7,
            max_tokens: 4096
        });

        // Parse JSON response
        const parsed = JSON.parse(response);
        
        return {
            jobDescription: parsed.jobDescription || '',
            responsibilities: parsed.responsibilities || [],
            requirements: parsed.requirements || [],
            perksAndBenefits: parsed.perksAndBenefits || []
        };

    } catch (error) {
        console.error('Generate JD Error:', error);
        throw new Error(`Failed to generate job description: ${error.message}`);
    }
}

/**
 * Screen candidate against job description
 * @param {Object} params - Candidate and job information
 * @param {string} params.resumeText - Candidate's resume text
 * @param {string} params.jobDescription - Job description
 * @param {string} params.jobTitle - Job title
 * @returns {Promise<Object>} Screening result with match score
 */
async function screenCandidate({ resumeText, jobDescription, jobTitle }) {
    const prompt = `You are an expert HR recruiter. Screen the candidate's resume against the job description and provide a detailed assessment.

Job Title: ${jobTitle}

Job Description:
${jobDescription}

Candidate Resume:
${resumeText}

Please analyze the candidate's fit for this position and provide a JSON response with the following structure:
{
  "matchScore": 85,
  "summary": "Brief summary of candidate's suitability",
  "strengths": ["Key strength 1", "Key strength 2"],
  "weaknesses": ["Potential concern 1", "Potential concern 2"],
  "interviewRecommendations": ["Recommendation 1", "Recommendation 2"]
}

- matchScore: A number from 0-100 indicating how well the candidate matches the job requirements
- summary: 2-3 sentences about the candidate's overall fit
- strengths: Array of 3-5 key strengths relevant to the job
- weaknesses: Array of 2-4 potential concerns or areas needing development
- interviewRecommendations: Array of 3-5 specific interview questions or topics to explore

Only output valid JSON, no additional text.`;

    try {
        const response = await generateAIResponse(prompt, {
            temperature: 0.5,
            max_tokens: 2048
        });

        const parsed = JSON.parse(response);
        
        return {
            matchScore: parsed.matchScore || 0,
            summary: parsed.summary || '',
            strengths: parsed.strengths || [],
            weaknesses: parsed.weaknesses || [],
            interviewRecommendations: parsed.interviewRecommendations || []
        };

    } catch (error) {
        console.error('Screen Candidate Error:', error);
        throw new Error(`Failed to screen candidate: ${error.message}`);
    }
}

/**
 * Generate chat response
 * @param {string} message - User message
 * @param {Array} conversationHistory - Previous messages
 * @returns {Promise<string>} AI response
 */
async function generateChatResponse(message, conversationHistory = []) {
    const systemPrompt = `You are a professional HR assistant for a job portal. Help users with:
- Job search advice
- Resume tips
- Interview preparation
- Career guidance
- Job application processes

Be helpful, professional, and concise in your responses.`;

    // Build messages array
    const messages = [
        {
            role: 'system',
            content: systemPrompt
        }
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
        messages.push(...conversationHistory);
    }

    // Add current message
    messages.push({
        role: 'user',
        content: message
    });

    const client = getGroqClient();

    try {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Groq API timeout')), DEFAULT_TIMEOUT);
        });

        const apiPromise = client.chat.completions.create({
            model: GROQ_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2048,
        });

        const result = await Promise.race([apiPromise, timeoutPromise]);

        if (!result.choices || result.choices.length === 0) {
            throw new Error('No response from Groq API');
        }

        return result.choices[0].message.content;

    } catch (error) {
        console.error('Chat API Error:', error.message);
        throw new Error(`Failed to generate chat response: ${error.message}`);
    }
}

module.exports = {
    generateAIResponse,
    generateAIResponseWithSystem,
    generateJobDescription,
    screenCandidate,
    generateChatResponse,
    getGroqClient,
    GROQ_MODEL,
    GROQ_API_KEY
};
