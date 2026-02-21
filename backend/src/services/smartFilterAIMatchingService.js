/**
 * AI-Based Smart Filter Matching Service
 * Uses AI to intelligently match candidates against job requirements
 * Analyzes all candidate data from Excel rows (stored as JSON) and scores them
 * 
 * Double-Layer Filtering:
 * 1. First Layer: Python-based filtering (text similarity, keyword matching) - configurable percentage
 * 2. Second Layer: AI-based filtering (Gemini, Together AI, OpenAI) - only on filtered candidates
 * 
 * Note: AI filtering is skipped when working locally (NODE_ENV !== 'production')
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const { evaluateCandidatesWithLLM } = require('./smartFilterHuggingFaceService.js');
const { matchCandidatesWithDocMind } = require('./docMindAIService.js');

const execFileAsync = promisify(execFile);

/**
 * Initialize AI client for a specific provider
 */
function getAIClientForProvider(provider) {
    provider = provider.toLowerCase();
    
    switch (provider) {
        case 'gemini':
            if (!process.env.GEMINI_API_KEY) {
                return null;
            }
            return {
                type: 'gemini',
                client: new GoogleGenerativeAI(process.env.GEMINI_API_KEY),
                model: process.env.SMART_FILTER_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash',
                provider: 'gemini'
            };

        case 'together':
            if (!process.env.TOGETHER_API_KEY) {
                return null;
            }
            return {
                type: 'openai',
                client: new OpenAI({
                    apiKey: process.env.TOGETHER_API_KEY,
                    baseURL: 'https://api.together.xyz/v1'
                }),
                model: process.env.SMART_FILTER_AI_MODEL || process.env.TOGETHER_MODEL || 'meta-llama/Llama-3-70b-chat-hf',
                provider: 'together'
            };

        case 'openai':
            if (!process.env.OPENAI_API_KEY) {
                return null;
            }
            return {
                type: 'openai',
                client: new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY
                }),
                model: process.env.SMART_FILTER_AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
                provider: 'openai'
            };

        default:
            return null;
    }
}

/**
 * Check if AI should be used (skip AI when working locally)
 */
function shouldUseAI() {
    // Skip AI when NODE_ENV is not 'production' (local development)
    // Can also be controlled via environment variable
    const useAI = process.env.SMART_FILTER_USE_AI !== 'false';
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Only use AI in production/server environment
    return useAI && isProduction;
}

/**
 * Check if Hugging Face LLM should be used (free alternative)
 */
function shouldUseHuggingFace() {
    // Use Hugging Face if explicitly enabled or if no paid API keys are available
    const useHF = process.env.SMART_FILTER_USE_HUGGINGFACE === 'true';
    const hasPaidAPIs = process.env.GEMINI_API_KEY || process.env.TOGETHER_API_KEY || process.env.OPENAI_API_KEY;
    
    // Prefer Hugging Face if enabled, or if no paid APIs available
    return useHF || (!hasPaidAPIs && process.env.SMART_FILTER_USE_HUGGINGFACE !== 'false');
}

/**
 * Check if DocMind AI should be used (prioritized for resume matching)
 */
function shouldUseDocMind() {
    // DocMind AI is prioritized for resume-to-job matching
    return process.env.SMART_FILTER_USE_DOCMIND === 'true' || process.env.USE_DOCMIND === 'true';
}

/**
 * Get AI client with fallback mechanism
 * Tries providers in order: Gemini -> Together AI -> OpenAI
 */
function getAIClient() {
    const preferredProvider = (process.env.AI_PROVIDER || process.env.SMART_FILTER_AI_PROVIDER || 'gemini').toLowerCase();
    
    // Define fallback order
    const fallbackOrder = [];
    
    // Add preferred provider first
    if (preferredProvider === 'gemini' || preferredProvider === 'together' || preferredProvider === 'openai') {
        fallbackOrder.push(preferredProvider);
    }
    
    // Add other providers as fallback
    if (preferredProvider !== 'gemini') fallbackOrder.push('gemini');
    if (preferredProvider !== 'together') fallbackOrder.push('together');
    if (preferredProvider !== 'openai') fallbackOrder.push('openai');
    
    // Try each provider in order
    for (const provider of fallbackOrder) {
        const client = getAIClientForProvider(provider);
        if (client) {
            console.log(`Using AI provider: ${provider}`);
            return client;
        }
    }
    
    throw new Error('No AI provider available. Please configure at least one of: GEMINI_API_KEY, TOGETHER_API_KEY, or OPENAI_API_KEY');
}

/**
 * Build job requirements summary for AI analysis
 */
function buildJobRequirements(job) {
    const requirements = [];
    
    if (job.jobName) requirements.push(`Job Title: ${job.jobName}`);
    if (job.jobRequirements) requirements.push(`Requirements: ${job.jobRequirements}`);
    if (job.gender) requirements.push(`Gender: ${job.gender}`);
    if (job.age) requirements.push(`Age: ${job.age}`);
    if (job.workExperience) requirements.push(`Experience: ${job.workExperience}`);
    if (job.keySkills && job.keySkills.length > 0) {
        requirements.push(`Key Skills: ${job.keySkills.join(', ')}`);
    }
    if (job.location) requirements.push(`Location: ${job.location}`);
    if (job.noticePeriod) requirements.push(`Notice Period: ${job.noticePeriod}`);
    if (job.workingHours) requirements.push(`Working Hours: ${job.workingHours}`);
    if (job.shiftStartTime && job.shiftEndTime) {
        requirements.push(`Shift: ${job.shiftStartTime} to ${job.shiftEndTime}`);
    }
    if (job.salary) requirements.push(`Salary: ${job.salary}`);
    
    return requirements.join('\n');
}

/**
 * Build candidate summary from Excel row data (JSON)
 * Reads entire Excel row and maps headings to job requirements
 */
function buildCandidateSummary(candidate) {
    const summary = [];
    
    // Step 1: Include Excel row data - ALL columns from the Excel file
    summary.push(`=== EXCEL ROW DATA (Complete Row Information) ===`);
    
    // Use original data from Excel - this contains ALL columns from the Excel file
    if (candidate.originalData && typeof candidate.originalData === 'object') {
        Object.keys(candidate.originalData).forEach(key => {
            const value = candidate.originalData[key];
            if (value && String(value).trim()) {
                // Include all Excel column data - this is what AI will match against job requirements
                summary.push(`${key}: ${String(value).trim()}`);
            }
        });
    }
    
    // Step 2: Highlight key job requirement fields (mapped from Excel headings)
    summary.push(`\n=== KEY JOB REQUIREMENT FIELDS (Mapped from Excel Headings) ===`);
    
    // These are the fields that match job description requirements
    if (candidate.name) summary.push(`Name: ${candidate.name}`);
    if (candidate.email) summary.push(`Email: ${candidate.email}`);
    if (candidate.mobile) summary.push(`Mobile: ${candidate.mobile}`);
    if (candidate.age) summary.push(`Age: ${candidate.age} (Match with job age requirements)`);
    if (candidate.gender) summary.push(`Gender: ${candidate.gender}`);
    if (candidate.experience) summary.push(`Experience: ${candidate.experience} (Match with job experience requirements)`);
    if (candidate.skills) summary.push(`Skills: ${candidate.skills} (CRITICAL - Match with job skills requirements)`);
    if (candidate.location) summary.push(`Location: ${candidate.location} (Match with job location requirements)`);
    if (candidate.preferredLocation) summary.push(`Preferred Location: ${candidate.preferredLocation}`);
    if (candidate.noticePeriod) summary.push(`Notice Period: ${candidate.noticePeriod}`);
    if (candidate.qualification) summary.push(`Qualification: ${candidate.qualification}`);
    if (candidate.currentRole) summary.push(`Current Role: ${candidate.currentRole}`);
    if (candidate.salary) summary.push(`Salary: ${candidate.salary} (Match with job salary expectations)`);
    
    // Step 3: Include file information if available
    if (candidate.fileName || candidate.sourceFile) {
        summary.push(`\nSource File: ${candidate.fileName || candidate.sourceFile}`);
    }
    
    // Step 4: Include extracted text if available (for PDF/Word/TXT files)
    if (candidate.extractedText) {
        summary.push(`\n=== EXTRACTED TEXT CONTENT ===`);
        summary.push(`${candidate.extractedText.substring(0, 5000)}`); // Include substantial text for AI
    }
    
    summary.push(`\n=== INSTRUCTIONS ===`);
    summary.push(`Match Excel column headings (skills, location, age, salary, experience) with job requirements.`);
    summary.push(`Filter this candidate based on how closely they match the job description.`);
    
    return summary.join('\n');
}

/**
 * Score a single candidate using AI
 */
async function scoreCandidateWithAI(candidate, job, aiConfig) {
    try {
        const jobRequirements = buildJobRequirements(job);
        const candidateData = buildCandidateSummary(candidate);

        const prompt = `You are an expert recruiter analyzing candidate-job matches. Your task is to filter and select candidates that match the job description as closely as possible.

JOB DESCRIPTION & REQUIREMENTS:
${jobRequirements}

CANDIDATE PROFILE (from Excel row data):
${candidateData}

IMPORTANT: This candidate data comes from an Excel file row. Match the Excel column headings with job requirements:
- Skills column → Match with job skills requirements
- Location column → Match with job location requirements  
- Age column → Match with job age requirements
- Salary column → Match with job salary expectations
- Experience column → Match with job experience requirements

ANALYSIS PRIORITY (in order of importance):
1. SKILLS MATCH (CRITICAL) - Does the candidate have the required skills from job description? 
   - Check if candidate's skills column matches job skills requirements
   - Score 0-100 based on skill relevance and match percentage
   - If skills don't match, candidate should be filtered out (low score)

2. EXPERIENCE MATCH - Does candidate's experience column align with job experience requirements?
   - Compare experience years/description from Excel with job requirements
   - Must be relevant to the job role

3. LOCATION MATCH - Does candidate's location column match job location requirements?
   - Check if candidate is available/willing to work in required location
   - Consider preferred location if available

4. AGE MATCH - Does candidate's age column meet job age requirements?
   - Compare age from Excel with job age requirements

5. SALARY MATCH - Does candidate's salary column align with job salary expectations?
   - Check if salary expectations are reasonable

6. GENDER MATCH - Does candidate meet gender requirement (if specified)?

7. NOTICE PERIOD MATCH - Can candidate join within acceptable notice period?

8. OVERALL JOB DESCRIPTION FIT - How well does entire candidate profile fit the job description?

FILTERING INSTRUCTIONS:
- Read the ENTIRE Excel row data (all columns) to understand the candidate
- Match Excel column headings (skills, location, age, salary, experience) with job requirements
- Be STRICT in filtering - Only select candidates that CLOSELY MATCH the job description
- High scores (80-100): Excellent match, candidate closely matches all job requirements
- Medium scores (50-79): Partial match, some requirements met
- Low scores (0-49): Poor match, candidate should be filtered out
- Skills match is MOST IMPORTANT - if skills don't match, score must be low (<50)

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "matchScore": <number 0-100>,
  "matchDetails": {
    "skillsMatch": <number 0-100>,
    "experienceMatch": <boolean>,
    "ageMatch": <boolean>,
    "locationMatch": <boolean>,
    "genderMatch": <boolean>,
    "noticePeriodMatch": <boolean>,
    "overallFit": "<brief explanation in 1-2 sentences about how closely candidate matches job description based on Excel row data>"
  }
}

Remember: Filter candidates based on Excel column data matching job requirements. Be strict - only select those that closely match.`;

        let response;
        let lastError = null;
        
        try {
            if (aiConfig.type === 'gemini') {
                const model = aiConfig.client.getGenerativeModel({ model: aiConfig.model });
                const result = await model.generateContent(prompt);
                response = await result.response.text();
            } else {
                // OpenAI/Together AI
                const completion = await aiConfig.client.chat.completions.create({
                    model: aiConfig.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert recruiter. Always respond with valid JSON only, no markdown formatting.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                });
                response = completion.choices[0].message.content;
            }
        } catch (error) {
            lastError = error;
            console.warn(`AI provider ${aiConfig.provider} failed, attempting fallback...`, error.message);
            
            // Try fallback providers
            const fallbackProviders = [];
            if (aiConfig.provider !== 'gemini') fallbackProviders.push('gemini');
            if (aiConfig.provider !== 'together') fallbackProviders.push('together');
            if (aiConfig.provider !== 'openai') fallbackProviders.push('openai');
            
            for (const fallbackProvider of fallbackProviders) {
                try {
                    const fallbackConfig = getAIClientForProvider(fallbackProvider);
                    if (!fallbackConfig) continue;
                    
                    console.log(`Trying fallback provider: ${fallbackProvider}`);
                    
                    if (fallbackConfig.type === 'gemini') {
                        const model = fallbackConfig.client.getGenerativeModel({ model: fallbackConfig.model });
                        const result = await model.generateContent(prompt);
                        response = await result.response.text();
                        console.log(`Successfully used fallback provider: ${fallbackProvider}`);
                        break;
                    } else {
                        const completion = await fallbackConfig.client.chat.completions.create({
                            model: fallbackConfig.model,
                            messages: [
                                {
                                    role: 'system',
                                    content: 'You are an expert recruiter. Always respond with valid JSON only, no markdown formatting.'
                                },
                                {
                                    role: 'user',
                                    content: prompt
                                }
                            ],
                            temperature: 0.3,
                            max_tokens: 500
                        });
                        response = completion.choices[0].message.content;
                        console.log(`Successfully used fallback provider: ${fallbackProvider}`);
                        break;
                    }
                } catch (fallbackError) {
                    console.warn(`Fallback provider ${fallbackProvider} also failed:`, fallbackError.message);
                    lastError = fallbackError;
                    continue;
                }
            }
            
            // If all providers failed, throw the last error
            if (!response) {
                throw lastError || new Error('All AI providers failed');
            }
        }

        // Parse JSON response
        let scoringResult;
        try {
            // Remove markdown code blocks if present
            const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})/);
            if (jsonMatch) {
                scoringResult = JSON.parse(jsonMatch[1]);
            } else {
                // Try direct parse
                const braceMatch = response.match(/\{[\s\S]*\}/);
                if (braceMatch) {
                    scoringResult = JSON.parse(braceMatch[0]);
                } else {
                    scoringResult = JSON.parse(response);
                }
            }
        } catch (parseError) {
            console.error('AI response parsing error:', parseError);
            console.error('AI Response:', response);
            // Fallback to default scoring
            return {
                matchScore: 50,
                matchDetails: {
                    skillsMatch: 0,
                    experienceMatch: false,
                    ageMatch: false,
                    locationMatch: false,
                    genderMatch: false,
                    noticePeriodMatch: false,
                    overallFit: 'Unable to analyze - using default score'
                }
            };
        }

        // Validate and normalize score
        const matchScore = Math.max(0, Math.min(100, parseInt(scoringResult.matchScore) || 50));
        
        return {
            matchScore: matchScore,
            matchDetails: {
                skillsMatch: scoringResult.matchDetails?.skillsMatch || 0,
                experienceMatch: scoringResult.matchDetails?.experienceMatch || false,
                ageMatch: scoringResult.matchDetails?.ageMatch || false,
                locationMatch: scoringResult.matchDetails?.locationMatch || false,
                genderMatch: scoringResult.matchDetails?.genderMatch || false,
                noticePeriodMatch: scoringResult.matchDetails?.noticePeriodMatch || false,
                overallFit: scoringResult.matchDetails?.overallFit || 'Analysis completed',
                // Keep compatibility with existing format
                skills: scoringResult.matchDetails?.skillsMatch || 0,
                experience: scoringResult.matchDetails?.experienceMatch || false,
                age: scoringResult.matchDetails?.ageMatch || false,
                location: scoringResult.matchDetails?.locationMatch || false,
                gender: scoringResult.matchDetails?.genderMatch || false,
                noticePeriod: scoringResult.matchDetails?.noticePeriodMatch || false
            }
        };

    } catch (error) {
        console.error('AI scoring error for candidate:', error);
        // Return default score on error
        return {
            matchScore: 0,
            matchDetails: {
                skillsMatch: 0,
                experienceMatch: false,
                ageMatch: false,
                locationMatch: false,
                genderMatch: false,
                noticePeriodMatch: false,
                overallFit: `Error: ${error.message}`
            }
        };
    }
}

/**
 * Match all candidates against job using AI
 * Processes candidates in batches to avoid rate limits
 */
/**
 * Filter candidates using DocMind AI (Python-based)
 */
async function filterCandidatesWithDocMindPython(candidates, job) {
    try {
        const pythonScript = path.join(__dirname, '../../python/docmind_filter.py');
        
        // Check if Python script exists
        try {
            await fs.access(pythonScript);
        } catch (error) {
            console.warn('DocMind Python script not found, using Node.js DocMind service');
            return null; // Return null to use Node.js service
        }

        // Prepare input data
        const inputData = {
            candidates: candidates,
            job: job
        };

        // Determine Python command
        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

        console.log(`\n🧠 DocMind AI (Python): Processing ${candidates.length} candidates...`);

        // Execute Python script
        const result = await execFileAsync(
            pythonCommand,
            [pythonScript],
            {
                input: JSON.stringify(inputData),
                maxBuffer: 100 * 1024 * 1024, // 100MB buffer
                timeout: 600000 // 10 minute timeout
            }
        );

        // Parse Python output
        const output = result.stdout.trim();
        let pythonResult;
        
        try {
            pythonResult = JSON.parse(output);
        } catch (parseError) {
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                pythonResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse DocMind Python output');
            }
        }

        if (!pythonResult.success) {
            throw new Error(pythonResult.error || 'DocMind Python filtering failed');
        }

        const filteredCandidates = pythonResult.candidates || [];
        
        console.log(`   ✓ DocMind AI (Python) completed:`);
        console.log(`   - Input candidates: ${pythonResult.totalCandidates || candidates.length}`);
        console.log(`   - Filtered candidates: ${pythonResult.filteredCount || filteredCandidates.length}`);

        return filteredCandidates;

    } catch (error) {
        console.error('DocMind Python filtering error:', error);
        return null; // Return null to fallback to Node.js service
    }
}

/**
 * First-layer filtering using Python script
 * Filters candidates using text similarity and keyword matching
 */
async function filterCandidatesWithPython(candidates, job, percentage) {
    try {
        const pythonScript = path.join(__dirname, '../../python/filter_candidates.py');
        
        // Check if Python script exists
        try {
            await fs.access(pythonScript);
        } catch (error) {
            console.warn('Python filter script not found, skipping first-layer filtering');
            return candidates;
        }

        // Prepare input data
        const inputData = {
            candidates: candidates,
            job: job,
            percentage: percentage || 50.0 // Default 50% for first layer
        };

        // Determine Python command (python3 or python)
        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

        console.log(`\n🐍 First-Layer Filtering: Using Python to filter ${candidates.length} candidates...`);
        console.log(`   Filter Percentage: ${percentage}%`);
        console.log(`   Python Script: ${pythonScript}`);

        // Execute Python script
        const result = await execFileAsync(
            pythonCommand,
            [pythonScript],
            {
                input: JSON.stringify(inputData),
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large candidate lists
                timeout: 300000 // 5 minute timeout
            }
        );

        // Parse Python output
        const output = result.stdout.trim();
        let pythonResult;
        
        try {
            pythonResult = JSON.parse(output);
        } catch (parseError) {
            // Try to extract JSON from output (in case of stderr messages)
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                pythonResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse Python script output');
            }
        }

        if (!pythonResult.success) {
            throw new Error(pythonResult.error || 'Python filtering failed');
        }

        const filteredCandidates = pythonResult.candidates || [];
        
        console.log(`   ✓ Python filtering completed:`);
        console.log(`   - Input candidates: ${pythonResult.totalCandidates || candidates.length}`);
        console.log(`   - Filtered candidates: ${pythonResult.filteredCount || filteredCandidates.length}`);
        console.log(`   - Filter percentage: ${pythonResult.percentage}%`);

        return filteredCandidates;

    } catch (error) {
        console.error('Python filtering error:', error);
        console.warn('Falling back to original candidates list');
        // Return original candidates if Python filtering fails
        return candidates;
    }
}

/**
 * Match candidates against job using AI
 * Preserves ALL candidate data while adding match scores
 * Now uses double-layer filtering: Python first, then AI
 */
async function matchCandidatesWithAI(candidates, job, pythonFilterPercentage = null) {
    // Step 1: First-layer filtering using Python (if percentage is specified)
    let filteredCandidates = candidates;
    
    try {
        if (pythonFilterPercentage !== null && pythonFilterPercentage > 0 && pythonFilterPercentage <= 100) {
            filteredCandidates = await filterCandidatesWithPython(candidates, job, pythonFilterPercentage);
        }
    } catch (pythonError) {
        console.error('Python filtering error in matchCandidatesWithAI:', pythonError);
        // Continue with original candidates if Python filtering fails
        filteredCandidates = candidates;
    }

        // Step 2: Check which AI method to use (prioritize DocMind AI)
        const useDocMind = shouldUseDocMind();
        const useHuggingFace = shouldUseHuggingFace();
        const useAI = shouldUseAI();
        
        if (!useAI && !useHuggingFace && !useDocMind) {
            console.log(`\n⚠️  AI filtering skipped (local environment detected)`);
            console.log(`   Using Python-filtered candidates only`);
            return filteredCandidates;
        }

        // Step 3: Second-layer filtering using AI (only on filtered candidates)
        try {
            // Priority 1: DocMind AI (specialized for resume-to-job matching)
            if (useDocMind) {
                console.log(`\n🧠 Stage 2: DocMind AI Evaluation - Processing ${filteredCandidates.length} candidates...`);
                
                // Try Python-based DocMind first (if available)
                let docMindResult = await filterCandidatesWithDocMindPython(filteredCandidates, job);
                
                // Fallback to Node.js DocMind service if Python not available
                if (!docMindResult) {
                    docMindResult = await matchCandidatesWithDocMind(filteredCandidates, job, 5);
                }
                
                if (docMindResult && docMindResult.length > 0) {
                    const topScore = docMindResult[0]?.matchScore || 0;
                    const topCandidates = docMindResult.filter(c => (c.matchScore || 0) >= 70).length;
                    console.log(`   ✓ DocMind AI evaluation completed. Top score: ${topScore}, Candidates with score >= 70: ${topCandidates}`);
                    
                    return docMindResult;
                } else {
                    console.warn('   ⚠ DocMind AI returned no results, falling back to other AI methods...');
                }
            }
            
            // Priority 2: Hugging Face (free) if available
            if (useHuggingFace) {
                console.log(`\n🤖 Stage 2: Hugging Face LLM Evaluation - Processing ${filteredCandidates.length} candidates...`);
                const evaluatedCandidates = await evaluateCandidatesWithLLM(filteredCandidates, job, 5);
                
                const topScore = evaluatedCandidates[0]?.matchScore || 0;
                const topCandidates = evaluatedCandidates.filter(c => c.matchScore >= 70).length;
                console.log(`   ✓ LLM evaluation completed. Top score: ${topScore}, Candidates with score >= 70: ${topCandidates}`);
                
                return evaluatedCandidates;
            }
            
            // Priority 3: Fallback to paid APIs if Hugging Face not available
            if (useAI) {
                console.log(`\n🤖 Stage 2: Paid AI Evaluation - Processing ${filteredCandidates.length} candidates...`);
                
                // Get AI client with fallback support
                const aiConfig = getAIClient();
                const batchSize = 10; // Process 10 candidates at a time
                const scoredCandidates = [];

                console.log(`   Job: ${job.jobName}`);
                console.log(`   Job Requirements: ${job.jobRequirements || 'N/A'}`);
                console.log(`   Using AI provider: ${aiConfig.provider} with model: ${aiConfig.model}`);

                for (let i = 0; i < filteredCandidates.length; i += batchSize) {
                    const batch = filteredCandidates.slice(i, i + batchSize);
                    console.log(`   Processing AI batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(filteredCandidates.length / batchSize)}...`);

                    // Process batch in parallel with delay between batches
                    const batchPromises = batch.map(candidate => 
                        scoreCandidateWithAI(candidate, job, aiConfig)
                    );

                    const batchResults = await Promise.all(batchPromises);

                    // Combine results
                    batch.forEach((candidate, index) => {
                        const scoring = batchResults[index];
                        scoredCandidates.push({
                            ...candidate,
                            matchScore: scoring.matchScore,
                            matchDetails: scoring.matchDetails
                        });
                    });

                    // Small delay between batches to avoid rate limits
                    if (i + batchSize < filteredCandidates.length) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                // Sort by score (descending) - highest match scores first
                // Prioritizes candidates that match job description most closely
                scoredCandidates.sort((a, b) => {
                    // Primary sort: match score (descending)
                    if (b.matchScore !== a.matchScore) {
                        return b.matchScore - a.matchScore;
                    }
                    // Secondary sort: skills match percentage (descending)
                    const aSkills = a.matchDetails?.skillsMatch || a.matchDetails?.skills || 0;
                    const bSkills = b.matchDetails?.skillsMatch || b.matchDetails?.skills || 0;
                    return bSkills - aSkills;
                });

                const topScore = scoredCandidates[0]?.matchScore || 0;
                const topCandidates = scoredCandidates.filter(c => c.matchScore >= 70).length;
                console.log(`   ✓ AI filtering completed. Top score: ${topScore}, Candidates with score >= 70: ${topCandidates}`);

                return scoredCandidates;
            }

    } catch (error) {
        console.error('AI matching error:', error);
        // If AI fails, return Python-filtered candidates (if available)
        console.warn('AI filtering failed, returning Python-filtered candidates');
        return filteredCandidates;
    }
}

/**
 * Apply percentage filter
 */
function applyPercentageFilter(candidates, percentage) {
    if (!percentage || percentage <= 0 || percentage > 100) {
        return candidates;
    }

    const total = candidates.length;
    const topCount = Math.ceil(total * (percentage / 100));
    
    return candidates.slice(0, topCount);
}

/**
 * Apply number filter
 */
function applyNumberFilter(candidates, number) {
    if (!number || number <= 0) {
        return candidates;
    }

    const topCount = Math.min(number, candidates.length);
    return candidates.slice(0, topCount);
}

module.exports = {
    matchCandidatesWithAI,
    applyPercentageFilter,
    applyNumberFilter,
    scoreCandidateWithAI
};

