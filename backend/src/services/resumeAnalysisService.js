const OpenAI = require('openai');
const pdfParse = require('@cyber2024/pdf-parse-fixed');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');

class ResumeAnalysisService {
    constructor() {
        this.client = null;
        this.model = process.env.TOGETHER_MODEL || 'openai/gpt-oss-20b';
    }

    ensureClient() {
        if (this.client) {
            return;
        }

        const apiKey = process.env.TOGETHER_API_KEY;
        if (!apiKey) {
            throw new Error('TOGETHER_API_KEY is required for resume analysis');
        }

        this.client = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://api.together.xyz/v1'
        });
    }

    /**
     * Extract text from resume file
     */
    async extractTextFromFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        
        try {
            if (ext === '.pdf') {
                const dataBuffer = await fs.readFile(filePath);
                const data = await pdfParse(dataBuffer);
                return data.text;
            } else if (ext === '.docx') {
                const result = await mammoth.extractRawText({ path: filePath });
                return result.value;
            } else if (ext === '.txt') {
                return await fs.readFile(filePath, 'utf-8');
            } else {
                throw new Error(`Unsupported file format: ${ext}`);
            }
        } catch (error) {
            console.error('Error extracting text from file:', error);
            throw new Error(`Failed to extract text from resume: ${error.message}`);
        }
    }

    /**
     * Analyze resume using AI and extract candidate information
     */
    async analyzeResume(resumeText, jobDescription = '') {
        this.ensureClient();

        const prompt = `Analyze the following resume and extract key information. Return the response as a valid JSON object with the following structure:

{
  "candidateName": "Full name of the candidate",
  "phoneNumber": "Phone number if available",
  "email": "Email address if available",
  "experience": "Years of experience or experience description",
  "yearsOfExperience": number (numeric value),
  "skills": ["skill1", "skill2", "skill3"],
  "education": [
    {
      "degree": "Degree name",
      "institution": "Institution name",
      "year": "Year of completion"
    }
  ],
  "currentCompany": "Current company name if available",
  "currentRole": "Current job title/role if available",
  "summary": "Brief professional summary"
}

Resume Text:
${resumeText}

${jobDescription ? `\nJob Description (for context):\n${jobDescription}` : ''}

Extract all available information from the resume. If any field is not available, use null or empty string. Return ONLY valid JSON, no additional text.`;

        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at extracting structured information from resumes. Always return valid JSON only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000
            });

            const content = response.choices[0]?.message?.content?.trim();
            if (!content) {
                throw new Error('No response from AI');
            }

            // Clean the response - remove markdown code blocks if present
            let jsonStr = content;
            if (jsonStr.startsWith('```json')) {
                jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            } else if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/```\n?/g, '').trim();
            }

            const extractedData = JSON.parse(jsonStr);
            
            return {
                candidateName: extractedData.candidateName || null,
                phoneNumber: extractedData.phoneNumber || null,
                email: extractedData.email || null,
                experience: extractedData.experience || null,
                yearsOfExperience: extractedData.yearsOfExperience || null,
                skills: Array.isArray(extractedData.skills) ? extractedData.skills : [],
                education: Array.isArray(extractedData.education) ? extractedData.education : [],
                currentCompany: extractedData.currentCompany || null,
                currentRole: extractedData.currentRole || null,
                summary: extractedData.summary || null,
                rawData: extractedData
            };
        } catch (error) {
            console.error('Resume analysis error:', error);
            throw new Error(`Failed to analyze resume: ${error.message}`);
        }
    }

    /**
     * Process resume file: extract text and analyze
     */
    async processResume(filePath, jobDescription = '') {
        try {
            // Extract text from file
            const resumeText = await this.extractTextFromFile(filePath);
            
            if (!resumeText || resumeText.trim().length < 50) {
                throw new Error('Resume text is too short or empty');
            }

            // Analyze with AI
            const analysis = await this.analyzeResume(resumeText, jobDescription);
            
            return {
                resumeText,
                analysis
            };
        } catch (error) {
            console.error('Process resume error:', error);
            throw error;
        }
    }
}

module.exports = new ResumeAnalysisService();

