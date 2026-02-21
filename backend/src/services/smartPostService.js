const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const pdfParse = require('@cyber2024/pdf-parse-fixed');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');

// Helper function to get current date in India timezone (IST)
const getIndiaDate = () => {
    const now = new Date();
    // Convert to India timezone (IST = UTC+5:30)
    const indiaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    return indiaTime;
};

// Helper function to format date as YYYY-MM-DD in India timezone
const formatIndiaDate = (date) => {
    const indiaDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const year = indiaDate.getFullYear();
    const month = String(indiaDate.getMonth() + 1).padStart(2, '0');
    const day = String(indiaDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

class SmartPostService {
    constructor() {
        this.provider = null;
        this.client = null;
        this.initialized = false;
    }

    ensureInitialized() {
        if (this.initialized && this.client) {
            return;
        }

        // Use separate env variable for smart post AI provider
        this.provider = process.env.SMART_POST_AI_PROVIDER || 'together'; // 'gemini', 'openai', 'together'
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
     * Extract text from JD file (PDF, DOC, DOCX)
     */
    async extractTextFromFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        
        try {
            if (ext === '.pdf') {
                const dataBuffer = await fs.readFile(filePath);
                const data = await pdfParse(dataBuffer);
                return data.text.trim();
            } else if (ext === '.docx') {
                const result = await mammoth.extractRawText({ path: filePath });
                return result.value.trim();
            } else if (ext === '.doc') {
                throw new Error('.doc files are not supported. Please use PDF or DOCX format.');
            } else {
                throw new Error(`Unsupported file format: ${ext}`);
            }
        } catch (error) {
            console.error('Error extracting text from file:', error);
            throw new Error(`Failed to extract text from file: ${error.message}`);
        }
    }

    /**
     * Extract job fields from JD text using AI
     */
    async extractJobFields(jdText, extraPrompt, employerCompanyName, employerEmail) {
        try {
            this.ensureInitialized();
            
            const prompt = this.buildExtractionPrompt(jdText, extraPrompt, employerCompanyName, employerEmail);
            
            let response;
            const provider = this.provider.toLowerCase();

            // Retry mechanism for JSON extraction
            let retryCount = 0;
            const maxRetries = 2;

            while (retryCount <= maxRetries) {
                try {
                    if (provider === 'gemini') {
                // Use current Gemini model - can be configured via GEMINI_MODEL env variable
                // Options: 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'
                const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
                const model = this.client.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                response = result.response.text();
            } else {
                // OpenAI or Together AI
                const model = provider === 'together'
                    ? (process.env.TOGETHER_MODEL || 'openai/gpt-oss-20b')
                    : (process.env.OPENAI_MODEL || 'gpt-4');
                
                const completion = await this.client.chat.completions.create({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert HR professional and job market analyst. Your task is to analyze job descriptions and extract structured information as JSON.\n\nIMPORTANT FORMATTING RULES:\n- Return ONLY valid JSON object\n- Start response with opening brace {\n- End response with closing brace }\n- No text before or after the JSON\n- No markdown formatting\n- No explanations\n- No code blocks\n- Just pure JSON\n\nExtract job details and return as JSON with this exact structure.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 4000,
                    top_p: 0.1,
                    presence_penalty: 0,
                    frequency_penalty: 0
                });
                
                response = completion.choices[0]?.message?.content || '';
            }

            // Parse JSON response - handle control characters and markdown code blocks
            let jsonString = response.trim();

            // Log the raw response for debugging
            console.log('AI Response for job field extraction:', jsonString.substring(0, 500) + (jsonString.length > 500 ? '...' : ''));

            // Try to extract JSON from markdown code blocks first
            const codeBlockMatch = jsonString.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (codeBlockMatch) {
                jsonString = codeBlockMatch[1].trim();
            } else {
                // Extract JSON object from response - be more lenient
                const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    // If no JSON found, try to find any content that might be JSON-like
                    const potentialJson = jsonString.match(/"[^"]*"\s*:\s*["\[\{]/) || jsonString.match(/\{.*\}/s);
                    if (potentialJson) {
                        jsonString = potentialJson[0];
                        // Try to complete the JSON if it's incomplete
                        let braceCount = (jsonString.match(/\{/g) || []).length - (jsonString.match(/\}/g) || []).length;
                        if (braceCount > 0) {
                            jsonString += '}'.repeat(braceCount);
                        }
                    } else {
                        throw new Error(`AI did not return valid JSON. Response: ${jsonString.substring(0, 200)}...`);
                    }
                } else {
                    jsonString = jsonMatch[0].trim();
                }
            }
            
            // Remove any BOM or invisible characters at the start
            jsonString = jsonString.replace(/^\uFEFF/, '').trim();
            
            // Ensure it starts with {
            if (!jsonString.startsWith('{')) {
                const firstBrace = jsonString.indexOf('{');
                if (firstBrace !== -1) {
                    jsonString = jsonString.substring(firstBrace);
                }
            }
            
            // Parse JSON with multiple fallback strategies
            let extractedData;
            try {
                // First attempt: parse as-is
                extractedData = JSON.parse(jsonString);
            } catch (parseError) {
                try {
                    // Second attempt: remove invalid control characters (keep \n, \r, \t)
                    let cleaned = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                    extractedData = JSON.parse(cleaned);
                } catch (secondError) {
                    try {
                        // Third attempt: handle literal \n sequences by converting them properly
                        // If JSON has literal backslash-n (not actual newlines), we need to handle it
                        // But only if they're outside of string values
                        let fixed = jsonString
                            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
                            .replace(/([^\\])\\([^"\\/bfnrtu])/g, '$1\\\\$2') // Fix unescaped backslashes
                            .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
                        extractedData = JSON.parse(fixed);
                    } catch (thirdError) {
                        try {
                            // Fourth attempt: extract clean JSON between braces
                            const firstBrace = jsonString.indexOf('{');
                            const lastBrace = jsonString.lastIndexOf('}');
                            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                                let extracted = jsonString.substring(firstBrace, lastBrace + 1);
                                // Remove all control characters
                                extracted = extracted.replace(/[\x00-\x1F\x7F]/g, '');
                                extractedData = JSON.parse(extracted);
                            } else {
                                throw thirdError;
                            }
                        } catch (finalError) {
                            throw new Error(`Failed to parse AI response as JSON: ${parseError.message}. Response preview: ${jsonString.substring(0, 500)}...`);
                        }
                    }
                }
            }
            
            // Validate and set dates (using India timezone)
            const todayIndia = getIndiaDate();
            todayIndia.setHours(0, 0, 0, 0);
            const todayISO = formatIndiaDate(todayIndia);
            
            // Parse opening date
            let openingDate = extractedData.applicationOpeningDate || this.getDefaultOpeningDate();
            
            // Parse the opening date string and compare with today in India timezone
            const openingDateParts = openingDate.split('T')[0].split('-');
            const openingDateObj = new Date(parseInt(openingDateParts[0]), parseInt(openingDateParts[1]) - 1, parseInt(openingDateParts[2]));
            openingDateObj.setHours(0, 0, 0, 0);
            
            // Compare dates (both normalized to start of day)
            const todayDateObj = new Date(todayIndia);
            todayDateObj.setHours(0, 0, 0, 0);
            
            // Ensure opening date is not in the past - use today if it is
            if (openingDateObj < todayDateObj) {
                openingDate = this.getDefaultOpeningDate();
            }
            
            // Parse and validate closing date
            let closingDate = extractedData.applicationClosingDate;
            if (closingDate) {
                const closingDateParts = closingDate.split('T')[0].split('-');
                const closingDateObj = new Date(parseInt(closingDateParts[0]), parseInt(closingDateParts[1]) - 1, parseInt(closingDateParts[2]));
                closingDateObj.setHours(0, 0, 0, 0);
                
                const finalOpeningDateParts = openingDate.split('T')[0].split('-');
                const finalOpeningDateObj = new Date(parseInt(finalOpeningDateParts[0]), parseInt(finalOpeningDateParts[1]) - 1, parseInt(finalOpeningDateParts[2]));
                finalOpeningDateObj.setHours(0, 0, 0, 0);
                
                // If closing date is before or equal to opening date, recalculate
                if (closingDateObj <= finalOpeningDateObj) {
                    closingDate = null; // Will be recalculated below
                }
            }
            
            // If closing date is not provided or invalid, use 1 month after opening date
            if (!closingDate) {
                const openingDateParts = openingDate.split('T')[0].split('-');
                const opening = new Date(parseInt(openingDateParts[0]), parseInt(openingDateParts[1]) - 1, parseInt(openingDateParts[2]));
                const closing = new Date(opening);
                closing.setMonth(closing.getMonth() + 1);
                closing.setHours(23, 59, 59, 999);
                // Format as YYYY-MM-DD in India timezone
                closingDate = formatIndiaDate(closing);
            }

            return {
                jobTitle: extractedData.jobTitle || 'Software Developer',
                companyName: extractedData.companyName || employerCompanyName,
                jobType: extractedData.jobType || 'Full-time',
                department: extractedData.department || '',
                employmentType: extractedData.employmentType || 'Permanent',
                experience: extractedData.experience || '',
                workMode: this.normalizeWorkMode(extractedData.workMode) || 'Remote',
                location: extractedData.location || '',
                highestQualification: extractedData.highestQualification || '',
                minSalary: extractedData.minSalary || null,
                maxSalary: extractedData.maxSalary || null,
                numberOfOpenings: extractedData.numberOfOpenings || null,
                applicationOpeningDate: openingDate,
                applicationClosingDate: closingDate,
                hiringManagerEmail: extractedData.hiringManagerEmail || employerEmail,
                jobDescription: extractedData.jobDescription || jdText.substring(0, 2000),
                responsibilities: extractedData.responsibilities || '',
                requirements: extractedData.requirements || '',
                perksAndBenefits: extractedData.perksAndBenefits || '',
                skills: Array.isArray(extractedData.skills) ? extractedData.skills : [],
                requiresBasicTest: extractedData.requiresBasicTest !== undefined ? extractedData.requiresBasicTest : true,
                requiresVideoProctoredTest: extractedData.requiresVideoProctoredTest || false
            };
                } catch (jsonError) {
                    // JSON parsing failed, try again with different prompt if retries remain
                    retryCount++;
                    if (retryCount <= maxRetries) {
                        console.log(`JSON parsing failed (attempt ${retryCount}), retrying with simplified prompt...`);
                        // Modify prompt for retry - make it even more explicit about JSON
                        prompt += '\n\nIMPORTANT: Return ONLY a valid JSON object. Do not include any text, explanations, or formatting. Just the JSON object starting with { and ending with }.';
                        continue;
                    } else {
                        throw jsonError;
                    }
                }
            }
            // This should never be reached due to the return statement above
            throw new Error('Unexpected error in job field extraction');
        } catch (error) {
            console.error('Error extracting job fields:', error);
            throw new Error(`Failed to extract job fields: ${error.message}`);
        }
    }

    buildExtractionPrompt(jdText, extraPrompt, employerCompanyName, employerEmail) {
        // Get today's date in India timezone
        const todayIndia = getIndiaDate();
        todayIndia.setHours(0, 0, 0, 0);
        const oneMonthLater = new Date(todayIndia);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        
        const todayISO = formatIndiaDate(todayIndia);
        const oneMonthLaterISO = formatIndiaDate(oneMonthLater);

        return `You are an expert HR professional and job market analyst. Your task is to DEEPLY ANALYZE the job description and extract COMPREHENSIVE job posting details. 

IMPORTANT: You must not just extract what's explicitly mentioned - you must ANALYZE, INFER, and GENERATE relevant details based on:
1. Industry standards and best practices
2. Job title and role context
3. Company type and size (if mentioned)
4. Location and market standards
5. Required skills and experience level
6. Job responsibilities and requirements

For example:
- If JD mentions "React developer" → Infer skills: JavaScript, HTML, CSS, Redux, Git, REST APIs, etc.
- If JD mentions "5 years experience" → Infer appropriate salary range, seniority level, responsibilities
- If JD mentions "remote work" → Infer work mode, location flexibility
- If JD mentions "startup" → Infer company culture, benefits, growth opportunities
- If JD mentions "fintech" → Infer relevant industry-specific skills, compliance requirements

Job Description:
${jdText}

${extraPrompt ? `Additional Instructions:\n${extraPrompt}\n` : ''}

Default Company Name: ${employerCompanyName}
Default Hiring Manager Email: ${employerEmail}

CRITICAL DATE RULES (MUST FOLLOW - All dates are in India timezone IST):
1. Today's date in India (IST) is: ${todayISO}
2. applicationOpeningDate MUST be today (${todayISO}) or a future date - NEVER in the past
3. If opening date found in JD is in the past, use today's date (${todayISO}) instead
4. applicationClosingDate MUST be after applicationOpeningDate (at least 1 day later)
5. If closing date is not found or is before/equal to opening date, use exactly 1 month after the opening date
6. If opening date is today (${todayISO}), closing date should be ${oneMonthLaterISO} (1 month later)
7. Always return dates in ISO format: YYYY-MM-DD (based on India timezone)

HIRING MANAGER EMAIL RULES:
1. First, try to find an explicit "hiring manager email" or "contact email" or "application email" in the JD
2. If not found, check if there is ANY email address present anywhere in the JD
3. If any email is found in the JD, use that as the hiringManagerEmail
4. Only use the default email (${employerEmail}) if NO email is found anywhere in the JD

DEEP ANALYSIS REQUIREMENTS:
- Analyze the job title to infer industry, department, and typical responsibilities
- Extract ALL mentioned skills and ADD relevant related skills based on the role
- Generate comprehensive responsibilities even if only briefly mentioned
- Infer appropriate experience level, qualifications, and salary range based on role and location
- Generate relevant perks and benefits based on company type, role level, and industry standards
- Create a detailed, professional job description that expands on what's provided
- Add contextually relevant requirements that are standard for this type of role

Extract and return a JSON object with these exact fields:
{
  "jobTitle": "string (required - use exact title from JD or infer from role description)",
  "companyName": "string (use default if not found)",
  "jobType": "string (one of: Full-time, Part-time, Internship, Freelance, Contract, Temporary - infer from context if not explicit)",
  "department": "string (infer from job title/role if not mentioned - e.g., 'Engineering', 'Sales', 'Marketing', 'Operations')",
  "employmentType": "string (one of: Permanent, Contract, Temporary - infer 'Permanent' for full-time roles)",
  "experience": "string (extract if mentioned, or infer from role level - e.g., '2-5 years', '5-8 years', 'Fresher', 'Senior level')",
  "workMode": "string (one of: Onsite, Hybrid, Remote - infer from location mentions or 'Remote' keywords)",
  "location": "string (extract city, state format - if multiple locations, use primary or 'Multiple locations')",
  "highestQualification": "string (infer from role requirements - e.g., 'Bachelor's Degree', 'Master's Degree', 'Any Graduate')",
  "minSalary": "number or null (infer from experience level, role, and location market rates if not mentioned)",
  "maxSalary": "number or null (infer from experience level, role, and location market rates if not mentioned)",
  "numberOfOpenings": "number or null (extract if mentioned, otherwise null)",
  "applicationOpeningDate": "ISO date string YYYY-MM-DD (MUST be ${todayISO} or later, default: ${todayISO} if not found or past date)",
  "applicationClosingDate": "ISO date string YYYY-MM-DD (MUST be after opening date, default: ${oneMonthLaterISO} if not found or invalid)",
  "hiringManagerEmail": "string (extract any email from JD if found, otherwise use default: ${employerEmail})",
  "jobDescription": "string (COMPREHENSIVE and DETAILED job description - expand on JD content, add context, make it professional and complete)",
  "responsibilities": "string (DETAILED list of key responsibilities - expand on what's mentioned, add standard responsibilities for this role)",
  "requirements": "string (COMPREHENSIVE requirements including qualifications, skills, experience - add standard requirements for this role type)",
  "perksAndBenefits": "string (generate relevant perks based on role level, company type, and industry standards - e.g., health insurance, flexible hours, learning budget, etc.)",
  "skills": ["array of skill strings - extract ALL mentioned skills PLUS add relevant related skills for this role"],
  "requiresBasicTest": true,
  "requiresVideoProctoredTest": false
}

Return ONLY the JSON object, no additional text.`;
    }

    /**
     * Normalize workMode value to valid enum values
     * Maps AI responses like "Onsite (Field Sales)" to "Onsite"
     */
    normalizeWorkMode(workMode) {
        if (!workMode || typeof workMode !== 'string') {
            return null;
        }

        const normalized = workMode.trim();
        const lower = normalized.toLowerCase();

        // Check for exact matches first
        if (['onsite', 'hybrid', 'remote'].includes(lower)) {
            return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
        }

        // Map variations to valid enum values
        if (lower.includes('onsite') || lower.includes('on-site') || lower.includes('on site') || 
            lower.includes('office') || lower.includes('field') || lower.includes('in-person')) {
            return 'Onsite';
        }
        
        if (lower.includes('hybrid') || lower.includes('flexible') || lower.includes('mix')) {
            return 'Hybrid';
        }
        
        if (lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh') || 
            lower.includes('virtual') || lower.includes('distributed')) {
            return 'Remote';
        }

        // Default to Remote if can't determine
        return 'Remote';
    }

    getDefaultOpeningDate() {
        // Get today's date in India timezone
        const date = getIndiaDate();
        date.setHours(0, 0, 0, 0);
        return formatIndiaDate(date);
    }

    getDefaultClosingDate() {
        // Get 1 month after today in India timezone
        const date = getIndiaDate();
        date.setMonth(date.getMonth() + 1);
        date.setHours(23, 59, 59, 999);
        return formatIndiaDate(date);
    }
}

module.exports = new SmartPostService();

