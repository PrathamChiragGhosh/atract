/**
 * AI Provider Abstraction Layer
 * Supports multiple AI providers: Gemini, OpenAI, Together AI
 * To switch providers, just change the AI_PROVIDER env variable and add the corresponding API key
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

class AIProvider {
    constructor() {
        this.provider = null;
        this.client = null;
        this.initialized = false;
    }

    ensureInitialized() {
        if (this.initialized && this.client) {
            return;
        }

        this.provider = process.env.AI_PROVIDER || 'gemini'; // 'gemini', 'openai', 'together'
        this.initializeProvider();
        this.initialized = true;
    }

    initializeProvider() {
        switch (this.provider.toLowerCase()) {
            case 'gemini':
                if (!process.env.GEMINI_API_KEY) {
                    throw new Error('GEMINI_API_KEY is required for Gemini provider');
                }
                this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                break;

            case 'openai':
                if (!process.env.OPENAI_API_KEY) {
                    throw new Error('OPENAI_API_KEY is required for OpenAI provider');
                }
                this.client = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY
                });
                break;

            case 'together':
                if (!process.env.TOGETHER_API_KEY) {
                    throw new Error('TOGETHER_API_KEY is required for Together AI provider');
                }
                this.client = new OpenAI({
                    apiKey: process.env.TOGETHER_API_KEY,
                    baseURL: 'https://api.together.xyz/v1'
                });
                break;

            default:
                throw new Error(`Unsupported AI provider: ${this.provider}`);
        }
    }

    /**
     * Generate job description content using the configured AI provider
     * @param {Object} jobData - Job information to generate JD from
     * @returns {Promise<Object>} Generated job description, responsibilities, requirements, and perks
     */
    async generateJobDescription(jobData) {
        // Lazy initialization - only initialize when first used
        this.ensureInitialized();

        const prompt = this.buildPrompt(jobData);

        try {
            switch (this.provider.toLowerCase()) {
                case 'gemini':
                    return await this.generateWithGemini(prompt);
                case 'openai':
                case 'together':
                    return await this.generateWithOpenAI(prompt);
                default:
                    throw new Error(`Unsupported provider: ${this.provider}`);
            }
        } catch (error) {
            console.error('AI Generation Error:', error);
            throw new Error(`Failed to generate job description: ${error.message}`);
        }
    }

    buildPrompt(jobData) {
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

4. Perks & Benefits: A comprehensive list (6-10 points) of benefits, perks, and advantages, including:
   - Compensation and incentives
   - Work-life balance benefits
   - Professional development opportunities
   - Health and wellness benefits
   - Company culture highlights

5. Recommended Skills: A curated list (8-12 items) of the most relevant skills and tools for this role. Return them as a JSON array of strings with no duplicates.

Please format the response as a JSON object with the following keys:
{
  "jobDescription": "...",
  "responsibilities": "...",
  "requirements": "...",
  "perksAndBenefits": "...",
  "skills": ["Skill 1", "Skill 2", "..."]
}

Each field should be a well-formatted string with proper line breaks and bullet points where applicable.`;

        return prompt;
    }

    async generateWithGemini(prompt) {
        try {
            // Use current Gemini model - can be configured via GEMINI_MODEL env variable
            // Options: 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'
            const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
            const model = this.client.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in AI response');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return this.formatResponse(parsed);
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw error;
        }
    }

    async generateWithOpenAI(prompt) {
        try {
            const completion = await this.client.chat.completions.create({
                model: this.provider === 'together'
                    ? process.env.TOGETHER_MODEL || 'openai/gpt-oss-20b'
                    : process.env.OPENAI_MODEL || 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert HR professional and technical writer. Always respond with valid JSON only, no additional text.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No content received from AI');
            }

            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in AI response');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return this.formatResponse(parsed);
        } catch (error) {
            console.error('OpenAI/Together API Error:', error);
            throw error;
        }
    }

    formatResponse(data) {
        const formattedSkills = Array.isArray(data.skills)
            ? data.skills
                .map(skill => typeof skill === 'string' ? skill.trim() : '')
                .filter(skill => skill.length > 0)
                .slice(0, 20)
            : [];

        return {
            jobDescription: data.jobDescription || '',
            responsibilities: data.responsibilities || '',
            requirements: data.requirements || '',
            perksAndBenefits: data.perksAndBenefits || '',
            skills: formattedSkills
        };
    }

    /**
     * Generate social share content for a job
     * Always uses Together AI regardless of the general AI_PROVIDER setting
     * @param {Object} jobData - Job information including jobDescription, shortId, etc.
     * @returns {Promise<String>} Generated social share content
     */
    async generateSocialShare(jobData) {
        // Always use Together AI for social share generation
        if (!process.env.TOGETHER_API_KEY) {
            throw new Error('TOGETHER_API_KEY is required for social share generation');
        }

        // Initialize Together AI client specifically for social share
        const togetherClient = new OpenAI({
            apiKey: process.env.TOGETHER_API_KEY,
            baseURL: 'https://api.together.xyz/v1'
        });

        const prompt = this.buildSocialSharePrompt(jobData);

        try {
            const response = await this.generateSocialShareWithTogetherAI(togetherClient, prompt);
            return this.formatSocialShareResponse(response, jobData.shortId);
        } catch (error) {
            console.error('Social Share Generation Error:', error);
            throw new Error(`Failed to generate social share: ${error.message}`);
        }
    }

    buildSocialSharePrompt(jobData) {
        const {
            jobTitle,
            companyName,
            jobDescription,
            location,
            workMode,
            jobType,
            skills = []
        } = jobData;

        // Extract a short summary from job description (first 300 chars)
        const jobSummary = jobDescription ? jobDescription.substring(0, 300).replace(/\n/g, ' ').trim() : '';

        let prompt = `You are a social media content creator specializing in job postings. Generate a concise, engaging social media post for the following job:

Job Title: ${jobTitle}
Company: ${companyName}
Location: ${location || 'Not specified'}
Work Mode: ${workMode || 'Not specified'}
Job Type: ${jobType || 'Not specified'}`;

        if (jobSummary) {
            prompt += `\n\nJob Summary: ${jobSummary}`;
        }

        if (skills && Array.isArray(skills) && skills.length > 0) {
            prompt += `\n\nKey Skills: ${skills.slice(0, 10).join(', ')}`;
        }

        prompt += `\n\nGenerate a social media post with EXACTLY 5 sections separated by blank lines:

Section 1: Start with the job title "${jobTitle}" at the very top (just the job title, nothing else)

Section 2: Then add "Apply Here: [SHORT_LINK_PLACEHOLDER]" (keep this exact format, we'll replace the placeholder)

Section 3: Write a brief, engaging description (2-3 sentences, max 200 words) about the role that highlights:
   - What the company is looking for
   - Key responsibilities or focus areas
   - What makes this role interesting

Section 4: Add 5-8 relevant hashtags related to:
   - Job title/role
   - Location
   - Industry
   - Skills required
   - Job type
   Format hashtags as #HashtagName (e.g., #SoftwareEngineer #BangaloreJobs)

Section 5: End with a disclaimer section that includes:
   - A note about AI-generated evaluations
   - Consent acknowledgment points

IMPORTANT FORMATTING RULES:
- Each section must be separated by exactly ONE blank line
- Do NOT add any extra sections or content
- Do NOT add section numbers or headers
- The format should be:
  ${jobTitle}

  Apply Here: [SHORT_LINK_PLACEHOLDER]

  [Description text here]

  [Hashtags here]

  Disclaimer:
  [Disclaimer text here]

Return ONLY the text content in this exact format. Do not include any JSON formatting, section numbers, or additional explanations.`;

        return prompt;
    }

    async generateSocialShareWithTogetherAI(togetherClient, prompt) {
        try {
            const completion = await togetherClient.chat.completions.create({
                model: process.env.TOGETHER_MODEL || 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a social media content creator. Return only the social media post text, no JSON, no additional formatting.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No content received from Together AI');
            }
            return content;
        } catch (error) {
            console.error('Together AI Social Share API Error:', error);
            throw error;
        }
    }

    formatSocialShareResponse(aiResponse, shortId) {
        const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://atract.in';
        const jobLink = `${baseUrl}/${shortId}`;

        // Replace placeholder with actual link
        let formatted = aiResponse.replace(/\[SHORT_LINK_PLACEHOLDER\]/g, jobLink);

        // Normalize line breaks (ensure consistent \n)
        formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Ensure exactly 5 sections with proper line gaps (Job Title, Apply Here, Description, Hashtags, Disclaimer)
        const sections = formatted.split(/\n\s*\n/).filter(s => s.trim().length > 0);
        
        // If we have more than 5 sections, merge extras into appropriate sections
        let finalSections = [];
        if (sections.length >= 5) {
            // Take first 5 sections
            finalSections = sections.slice(0, 5);
        } else {
            // If less than 5, ensure we have all required sections
            finalSections = sections;
            
            // Ensure disclaimer is present
            const hasDisclaimer = finalSections.some(s => 
                s.toLowerCase().includes('disclaimer') || 
                s.toLowerCase().includes('ai-generated') ||
                s.toLowerCase().includes('evaluation')
            );
            
            if (!hasDisclaimer && finalSections.length < 5) {
                finalSections.push(`Disclaimer:\n\nThis application process includes AI-generated evaluations. Our systems are built for accuracy and fairness, but automated assessments may occasionally produce unintended outputs. By applying, you acknowledge and consent to AI-assisted screening as part of the evaluation process.\n\nBy proceeding with this application, I acknowledge and agree that:\n\n• The evaluation and screening process may involve AI-generated questions and assessments.\n• While designed for fairness and accuracy, AI outputs may occasionally vary or contain unintended responses.\n• Final hiring decisions are made by human reviewers; AI assessments only assist in the process.`);
            }
        }

        // Join sections with exactly one blank line between each
        formatted = finalSections.join('\n\n');

        return formatted.trim();
    }
}

// Export singleton instance
module.exports = new AIProvider();

