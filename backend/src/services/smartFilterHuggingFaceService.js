/**
 * Stage 2: Hugging Face LLM-Based Qualitative Evaluation
 * Uses free Hugging Face models for deep semantic resume-to-job matching
 * Evaluates: skill match, role relevance, career progression, freshness
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execFileAsync = promisify(execFile);

/**
 * Extract relevant resume excerpt for explanation
 */
function extractResumeExcerpt(candidate, maxLength = 500) {
    const parts = [];
    
    // Priority order for excerpt
    if (candidate.currentRole) {
        parts.push(`Current Role: ${candidate.currentRole}`);
    }
    if (candidate.experience) {
        parts.push(`Experience: ${candidate.experience}`);
    }
    if (candidate.skills) {
        const skills = candidate.skills.length > 200 
            ? candidate.skills.substring(0, 200) + '...'
            : candidate.skills;
        parts.push(`Skills: ${skills}`);
    }
    if (candidate.extractedText) {
        const text = candidate.extractedText.substring(0, 300);
        parts.push(`Resume: ${text}...`);
    }
    
    const excerpt = parts.join('\n');
    return excerpt.length > maxLength ? excerpt.substring(0, maxLength) + '...' : excerpt;
}

/**
 * Build comprehensive job description for LLM
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
 * Evaluate candidate using Hugging Face LLM (Python script)
 */
async function evaluateCandidateWithLLM(candidate, job) {
    try {
        const pythonScript = path.join(__dirname, '../../python/evaluate_candidate_llm.py');
        
        // Check if script exists
        try {
            await fs.access(pythonScript);
        } catch (error) {
            console.warn('LLM evaluation script not found, using fallback scoring');
            return createFallbackEvaluation(candidate, job);
        }

        const inputData = {
            candidate: {
                name: candidate.name || '',
                currentRole: candidate.currentRole || '',
                experience: candidate.experience || '',
                skills: candidate.skills || '',
                qualification: candidate.qualification || '',
                location: candidate.location || '',
                extractedText: candidate.extractedText || '',
                matchScore: candidate.matchScore || 0,
                vectorSimilarity: candidate.vectorSimilarity || 0,
                freshnessScore: candidate.freshnessScore || 0,
                keyMatchingSkills: candidate.keyMatchingSkills || []
            },
            job: {
                jobName: job.jobName || '',
                jobRequirements: job.jobRequirements || '',
                keySkills: job.keySkills || [],
                workExperience: job.workExperience || '',
                location: job.location || '',
                age: job.age || '',
                gender: job.gender || ''
            }
        };

        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
        
        const result = await execFileAsync(
            pythonCommand,
            [pythonScript],
            {
                input: JSON.stringify(inputData),
                maxBuffer: 10 * 1024 * 1024, // 10MB
                timeout: 60000 // 60 second timeout per candidate
            }
        );

        const output = result.stdout.trim();
        let llmResult;
        
        try {
            llmResult = JSON.parse(output);
        } catch (parseError) {
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                llmResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse LLM output');
            }
        }

        if (!llmResult.success) {
            throw new Error(llmResult.error || 'LLM evaluation failed');
        }

        return {
            matchScore: llmResult.matchScore || candidate.matchScore || 0,
            freshnessScore: llmResult.freshnessScore || candidate.freshnessScore || 0,
            keyMatchingSkills: llmResult.keyMatchingSkills || candidate.keyMatchingSkills || [],
            explanation: llmResult.explanation || 'Evaluation completed',
            resumeExcerpt: extractResumeExcerpt(candidate),
            evaluationDetails: {
                skillMatch: llmResult.skillMatch || 0,
                roleRelevance: llmResult.roleRelevance || 0,
                careerProgression: llmResult.careerProgression || 0,
                overallFit: llmResult.overallFit || 0,
                shouldReject: llmResult.shouldReject || false
            }
        };

    } catch (error) {
        console.error('LLM evaluation error:', error);
        return createFallbackEvaluation(candidate, job);
    }
}

/**
 * Fallback evaluation when LLM is not available
 */
function createFallbackEvaluation(candidate, job) {
    return {
        matchScore: candidate.matchScore || 0,
        freshnessScore: candidate.freshnessScore || 0,
        keyMatchingSkills: candidate.keyMatchingSkills || [],
        explanation: `Candidate scored ${candidate.matchScore || 0} based on vector similarity. Skills match: ${(candidate.keyMatchingSkills || []).length} out of ${(job.keySkills || []).length} required skills.`,
        resumeExcerpt: extractResumeExcerpt(candidate),
        evaluationDetails: {
            skillMatch: candidate.matchDetails?.skillsMatch || 0,
            roleRelevance: candidate.matchScore || 0,
            careerProgression: 50,
            overallFit: candidate.matchScore || 0,
            shouldReject: (candidate.matchScore || 0) < 30
        }
    };
}

/**
 * Evaluate multiple candidates with LLM (batch processing)
 */
async function evaluateCandidatesWithLLM(candidates, job, batchSize = 5) {
    const evaluatedCandidates = [];
    
    console.log(`\n🤖 Stage 2: LLM Evaluation - Processing ${candidates.length} candidates...`);
    
    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        console.log(`   Processing LLM batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidates.length / batchSize)}...`);
        
        // Process batch in parallel
        const batchPromises = batch.map(candidate => 
            evaluateCandidateWithLLM(candidate, job)
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        // Combine results
        batch.forEach((candidate, index) => {
            const evaluation = batchResults[index];
            evaluatedCandidates.push({
                ...candidate,
                matchScore: evaluation.matchScore,
                freshnessScore: evaluation.freshnessScore,
                keyMatchingSkills: evaluation.keyMatchingSkills,
                explanation: evaluation.explanation,
                resumeExcerpt: evaluation.resumeExcerpt,
                evaluationDetails: evaluation.evaluationDetails
            });
        });
        
        // Small delay between batches
        if (i + batchSize < candidates.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Filter out rejected candidates
    const acceptedCandidates = evaluatedCandidates.filter(c => 
        !c.evaluationDetails?.shouldReject
    );
    
    // Re-sort by match score (LLM may have re-ordered)
    acceptedCandidates.sort((a, b) => b.matchScore - a.matchScore);
    
    console.log(`   ✓ LLM evaluation completed:`);
    console.log(`   - Evaluated: ${evaluatedCandidates.length}`);
    console.log(`   - Accepted: ${acceptedCandidates.length}`);
    console.log(`   - Rejected: ${evaluatedCandidates.length - acceptedCandidates.length}`);
    
    return acceptedCandidates;
}

module.exports = {
    evaluateCandidateWithLLM,
    evaluateCandidatesWithLLM,
    extractResumeExcerpt,
    buildJobDescription
};

