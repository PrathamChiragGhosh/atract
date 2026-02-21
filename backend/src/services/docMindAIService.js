/**
 * DocMind AI Service for Resume-to-Job Matching
 * Uses DocMind AI to analyze resumes and match them with job descriptions
 * Provides deep semantic analysis and explainable matching results
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const FormData = require('form-data');

/**
 * Get DocMind AI configuration
 */
function getDocMindConfig() {
    const baseURL = process.env.DOCMIND_API_URL || process.env.DOCMIND_BASE_URL || 'http://localhost:8000';
    const apiKey = process.env.DOCMIND_API_KEY || '';
    const enabled = process.env.SMART_FILTER_USE_DOCMIND === 'true' || process.env.USE_DOCMIND === 'true';
    
    return {
        enabled,
        baseURL,
        apiKey,
        timeout: parseInt(process.env.DOCMIND_TIMEOUT || '60000') // 60 seconds default
    };
}

/**
 * Check if DocMind AI is available
 */
async function checkDocMindAvailability() {
    const config = getDocMindConfig();
    
    if (!config.enabled) {
        return false;
    }
    
    try {
        // Try to ping DocMind API
        const response = await axios.get(`${config.baseURL}/health`, {
            timeout: 5000,
            headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}
        });
        return response.status === 200;
    } catch (error) {
        console.warn('DocMind AI not available:', error.message);
        return false;
    }
}

/**
 * Extract text and structure from resume using DocMind AI
 */
async function analyzeResumeWithDocMind(resumeText, resumeFilePath = null) {
    const config = getDocMindConfig();
    
    if (!config.enabled) {
        throw new Error('DocMind AI is not enabled');
    }
    
    try {
        const endpoint = `${config.baseURL}/api/analyze`;
        
        const payload = {
            text: resumeText,
            document_type: 'resume'
        };
        
        // If file path is provided, try to upload file (optional - DocMind can work with text)
        // For now, we'll use text-based analysis which is more reliable
        // File upload can be added later if DocMind API supports it
        
        // Text-based analysis
        const response = await axios.post(endpoint, payload, {
            headers: {
                'Content-Type': 'application/json',
                ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
            },
            timeout: config.timeout
        });
        
        return response.data;
        
    } catch (error) {
        console.error('DocMind AI analysis error:', error.message);
        throw new Error(`DocMind AI analysis failed: ${error.message}`);
    }
}

/**
 * Match resume with job description using DocMind AI
 */
async function matchResumeWithJobDocMind(resumeText, jobDescription, resumeFilePath = null) {
    const config = getDocMindConfig();
    
    if (!config.enabled) {
        throw new Error('DocMind AI is not enabled');
    }
    
    try {
        const endpoint = `${config.baseURL}/api/match`;
        
        const payload = {
            resume_text: resumeText,
            job_description: jobDescription,
            return_explanation: true,
            return_entities: true
        };
        
        // If file path is provided, include it
        if (resumeFilePath) {
            payload.resume_file_path = resumeFilePath;
        }
        
        const response = await axios.post(endpoint, payload, {
            headers: {
                'Content-Type': 'application/json',
                ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
            },
            timeout: config.timeout
        });
        
        return response.data;
        
    } catch (error) {
        console.error('DocMind AI matching error:', error.message);
        throw new Error(`DocMind AI matching failed: ${error.message}`);
    }
}

/**
 * Score candidate using DocMind AI
 * Returns match score and detailed analysis
 */
async function scoreCandidateWithDocMind(candidate, job) {
    try {
        const config = getDocMindConfig();
        
        if (!config.enabled) {
            return null; // Return null to indicate DocMind is not available
        }
        
        // Build resume text from candidate data
        const resumeText = buildResumeText(candidate);
        
        // Build job description
        const jobDescription = buildJobDescription(job);
        
        // Try to get file path if available
        const resumeFilePath = candidate.sourceFile || candidate.fileName || null;
        
        // Match using DocMind AI
        const matchResult = await matchResumeWithJobDocMind(resumeText, jobDescription, resumeFilePath);
        
        // Extract match score and details
        const matchScore = matchResult.match_score || matchResult.score || 0;
        const explanation = matchResult.explanation || matchResult.reasoning || '';
        const matchedEntities = matchResult.matched_entities || matchResult.entities || {};
        const keyMatchingSkills = matchResult.matched_skills || matchResult.skills || [];
        
        return {
            matchScore: Math.min(100, Math.max(0, Math.round(matchScore * 100))), // Normalize to 0-100
            explanation: explanation,
            keyMatchingSkills: keyMatchingSkills,
            matchedEntities: matchedEntities,
            matchDetails: {
                skillsMatch: matchedEntities.skills_match || 0,
                experienceMatch: matchedEntities.experience_match || false,
                educationMatch: matchedEntities.education_match || false,
                locationMatch: matchedEntities.location_match || false,
                overallFit: explanation
            }
        };
        
    } catch (error) {
        console.error('DocMind AI scoring error:', error);
        return null; // Return null to fallback to other methods
    }
}

/**
 * Build resume text from candidate data
 */
function buildResumeText(candidate) {
    const parts = [];
    
    if (candidate.name) parts.push(`Name: ${candidate.name}`);
    if (candidate.email) parts.push(`Email: ${candidate.email}`);
    if (candidate.mobile) parts.push(`Mobile: ${candidate.mobile}`);
    if (candidate.currentRole) parts.push(`Current Role: ${candidate.currentRole}`);
    if (candidate.experience) parts.push(`Experience: ${candidate.experience}`);
    if (candidate.skills) parts.push(`Skills: ${candidate.skills}`);
    if (candidate.qualification) parts.push(`Qualification: ${candidate.qualification}`);
    if (candidate.location) parts.push(`Location: ${candidate.location}`);
    if (candidate.extractedText) {
        parts.push(`\nResume Content:\n${candidate.extractedText}`);
    }
    
    return parts.join('\n');
}

/**
 * Build job description from job data
 */
function buildJobDescription(job) {
    const parts = [];
    
    if (job.jobName) parts.push(`Job Title: ${job.jobName}`);
    if (job.jobRequirements) parts.push(`Requirements: ${job.jobRequirements}`);
    if (job.keySkills && job.keySkills.length > 0) {
        parts.push(`Required Skills: ${job.keySkills.join(', ')}`);
    }
    if (job.workExperience) parts.push(`Experience Required: ${job.workExperience}`);
    if (job.location) parts.push(`Location: ${job.location}`);
    if (job.age) parts.push(`Age Requirement: ${job.age}`);
    if (job.gender) parts.push(`Gender: ${job.gender}`);
    if (job.salary) parts.push(`Salary: ${job.salary}`);
    
    return parts.join('\n');
}

/**
 * Match multiple candidates with job using DocMind AI
 */
async function matchCandidatesWithDocMind(candidates, job, batchSize = 5) {
    const config = getDocMindConfig();
    
    if (!config.enabled) {
        return null; // Return null to indicate DocMind is not available
    }
    
    // Check if DocMind is available
    const isAvailable = await checkDocMindAvailability();
    if (!isAvailable) {
        console.warn('DocMind AI is not available, skipping...');
        return null;
    }
    
    console.log(`\n🧠 DocMind AI: Matching ${candidates.length} candidates with job...`);
    
    const scoredCandidates = [];
    
    // Process in batches
    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        console.log(`   Processing DocMind batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidates.length / batchSize)}...`);
        
        const batchPromises = batch.map(async (candidate) => {
            try {
                const scoring = await scoreCandidateWithDocMind(candidate, job);
                
                if (scoring) {
                    return {
                        ...candidate,
                        matchScore: scoring.matchScore,
                        matchDetails: scoring.matchDetails,
                        explanation: scoring.explanation,
                        keyMatchingSkills: scoring.keyMatchingSkills,
                        docMindAnalysis: scoring.matchedEntities
                    };
                } else {
                    // Fallback: return candidate without DocMind scoring
                    return candidate;
                }
            } catch (error) {
                console.error(`DocMind scoring error for candidate ${candidate.name || 'unknown'}:`, error.message);
                return candidate; // Return original candidate if scoring fails
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        scoredCandidates.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < candidates.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Sort by match score (descending)
    scoredCandidates.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    
    const topScore = scoredCandidates[0]?.matchScore || 0;
    const topCandidates = scoredCandidates.filter(c => (c.matchScore || 0) >= 70).length;
    
    console.log(`   ✓ DocMind AI matching completed. Top score: ${topScore}, Candidates with score >= 70: ${topCandidates}`);
    
    return scoredCandidates;
}

module.exports = {
    scoreCandidateWithDocMind,
    matchCandidatesWithDocMind,
    checkDocMindAvailability,
    getDocMindConfig,
    analyzeResumeWithDocMind,
    matchResumeWithJobDocMind
};

