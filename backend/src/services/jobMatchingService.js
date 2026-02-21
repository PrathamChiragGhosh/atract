const JobSeeker = require('../models/jobSeeker');
const JobSeekerResumeAnalysis = require('../models/jobSeekerResumeAnalysis');
const Job = require('../models/job');
const JobAnalysis = require('../models/jobAnalysis');
const JobApplication = require('../models/jobApplication');
const JobSeekerJobAlert = require('../models/jobSeekerJobAlert');
const JobSeekerJobMatchAttempt = require('../models/jobSeekerJobMatchAttempt');
const JobSeekerInstantAlertPlan = require('../models/jobSeekerInstantAlertPlan');
const mongoose = require('mongoose');

/**
 * Calculate cosine similarity between two embedding vectors
 */
function cosineSimilarity(vecA, vecB) {
    if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
        return 0;
    }
    if (vecA.length !== vecB.length) {
        return 0;
    }
    if (vecA.length === 0) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        const a = vecA[i] || 0;
        const b = vecB[i] || 0;
        dotProduct += a * b;
        normA += a * a;
        normB += b * b;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
        return 0;
    }

    return dotProduct / denominator;
}

/**
 * Get matching threshold from ENV (default 0.7)
 */
function getMatchingThreshold() {
    return parseFloat(process.env.JOB_MATCHING_THRESHOLD || '0.7');
}

/**
 * Get alert intervals from ENV (e.g., "1,3" means day 1, then day 3)
 */
function getAlertIntervals() {
    const intervalsEnv = process.env.JOB_ALERT_INTERVALS || '1,3';
    return intervalsEnv.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
}

/**
 * Check if job seeker has already applied to a job
 */
async function hasAppliedToJob(jobSeekerId, jobId) {
    try {
        const jobApplication = await JobApplication.findOne({ job: jobId });
        if (!jobApplication) {
            return false;
        }
        return jobApplication.applicants.some(
            applicant => applicant.jobSeeker.toString() === jobSeekerId.toString()
        );
    } catch (error) {
        console.error('Error checking application:', error);
        return false;
    }
}

/**
 * Check if alert was already sent for this job-seeker combination
 */
async function wasAlertSent(jobSeekerId, jobId, intervalDay) {
    try {
        const alert = await JobSeekerJobAlert.findOne({
            jobSeekerId,
            jobId,
            intervalDay
        });
        return !!alert;
    } catch (error) {
        console.error('Error checking alert:', error);
        return false;
    }
}

/**
 * Check if all intervals have been exhausted for this job-seeker combination
 */
async function areAllIntervalsExhausted(jobSeekerId, jobId) {
    try {
        const intervals = getAlertIntervals();
        const sentAlerts = await JobSeekerJobAlert.find({
            jobSeekerId,
            jobId
        }).select('intervalDay');

        const sentDays = new Set(sentAlerts.map(a => a.intervalDay));
        return intervals.every(day => sentDays.has(day));
    } catch (error) {
        console.error('Error checking intervals:', error);
        return false;
    }
}

/**
 * Calculate days since job was posted
 * Returns 1-indexed day (day 1 = first day, day 2 = second day, etc.)
 */
function getDaysSinceJobPosted(jobCreatedAt) {
    const now = new Date();
    const jobDate = new Date(jobCreatedAt);
    
    // Reset time to midnight for accurate day calculation
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const jobMidnight = new Date(jobDate.getFullYear(), jobDate.getMonth(), jobDate.getDate());
    
    const diffMs = nowMidnight - jobMidnight;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Return 1-indexed (day 1 = same day, day 2 = next day)
    return days + 1;
}

/**
 * Determine which interval day we're currently on
 */
function getCurrentIntervalDay(daysSincePosted, intervals) {
    for (let i = intervals.length - 1; i >= 0; i--) {
        if (daysSincePosted >= intervals[i]) {
            return intervals[i];
        }
    }
    return null; // Not yet time for any interval
}

/**
 * Get a Set of job IDs that have already been matched for a job seeker
 * Used to skip already-matched jobs before cosine similarity calculation
 * 
 * @param {ObjectId} jobSeekerId - Job seeker ID
 * @param {Array<ObjectId>} jobIds - Array of job IDs to check
 * @returns {Promise<Set>} Set of job IDs that were already matched
 */
async function getAlreadyMatchedJobIds(jobSeekerId, jobIds) {
    try {
        if (!jobIds || jobIds.length === 0) {
            return new Set();
        }

        // Batch query to get all already-matched job IDs for this job seeker
        const matchedAttempts = await JobSeekerJobMatchAttempt.find({
            jobSeekerId,
            jobId: { $in: jobIds }
        }).select('jobId').lean();

        return new Set(matchedAttempts.map(attempt => attempt.jobId.toString()));
    } catch (error) {
        console.error('Error getting already matched job IDs:', error);
        return new Set(); // Return empty set on error to avoid blocking
    }
}

/**
 * Record match attempts for a job seeker (bulk operation for efficiency)
 * Uses upsert to handle duplicates gracefully
 * 
 * @param {ObjectId} jobSeekerId - Job seeker ID
 * @param {Array<Object>} matches - Array of {jobId, matchScore} objects
 * @returns {Promise<void>}
 */
async function recordMatchAttempts(jobSeekerId, matches) {
    try {
        if (!matches || matches.length === 0) {
            return;
        }

        // Prepare bulk write operations (using upsert to handle duplicates)
        const bulkOps = matches.map(match => ({
            updateOne: {
                filter: {
                    jobSeekerId,
                    jobId: match.jobId
                },
                update: {
                    $set: {
                        matchScore: match.matchScore,
                        matchedAt: new Date()
                    }
                },
                upsert: true
            }
        }));

        // Execute bulk write
        if (bulkOps.length > 0) {
            await JobSeekerJobMatchAttempt.bulkWrite(bulkOps, { ordered: false });
        }
    } catch (error) {
        // Log error but don't throw - matching should continue even if recording fails
        console.error('Error recording match attempts:', error);
    }
}

/**
 * Reset match attempts for a specific job (when job analysis is updated)
 * This allows re-matching when job embedding changes
 * 
 * @param {ObjectId} jobId - Job ID
 * @returns {Promise<void>}
 */
async function resetMatchAttemptsForJob(jobId) {
    try {
        await JobSeekerJobMatchAttempt.deleteMany({ jobId });
    } catch (error) {
        console.error(`Error resetting match attempts for job ${jobId}:`, error);
    }
}

/**
 * Reset match attempts for a specific job seeker (when resume analysis is updated)
 * This allows re-matching when resume embedding changes
 * 
 * @param {ObjectId} jobSeekerId - Job seeker ID
 * @returns {Promise<void>}
 */
async function resetMatchAttemptsForJobSeeker(jobSeekerId) {
    try {
        await JobSeekerJobMatchAttempt.deleteMany({ jobSeekerId });
    } catch (error) {
        console.error(`Error resetting match attempts for job seeker ${jobSeekerId}:`, error);
    }
}

/**
 * Pre-check if job seeker matches job based on salary and experience before cosine similarity
 * Returns true if pre-checks pass, false if should skip
 * 
 * @param {Object} job - Job document with minSalary, maxSalary
 * @param {Object} jobAnalysis - JobAnalysis document with minExperience, maxExperience
 * @param {Number} jobSeekerExpectedCTC - Job seeker's expected salary (expectedCTC)
 * @param {Number} jobSeekerExperienceYears - Job seeker's experience in years (experienceYears)
 * @returns {Boolean} true if should proceed with matching, false if should skip
 */
function preCheckJobSeekerMatch(job, jobAnalysis, jobSeekerExpectedCTC, jobSeekerExperienceYears) {
    const SALARY_TOLERANCE = 1.5; // Tolerance multiplier for salary check

    // Salary Pre-Check
    if (jobSeekerExpectedCTC != null && typeof jobSeekerExpectedCTC === 'number' && jobSeekerExpectedCTC > 0) {
        // Prefer Job.minSalary/maxSalary (numeric, more reliable)
        if (job.minSalary != null || job.maxSalary != null) {
            if (job.maxSalary != null) {
                // If maxSalary exists, check if expectedCTC exceeds tolerance
                const maxAllowedSalary = job.maxSalary * SALARY_TOLERANCE;
                if (jobSeekerExpectedCTC > maxAllowedSalary) {
                    return false; // Skip - job seeker expects too much
                }
            } else if (job.minSalary != null) {
                // If only minSalary exists, check if expectedCTC >= minSalary
                if (jobSeekerExpectedCTC < job.minSalary) {
                    return false; // Skip - job seeker expects less than job minimum
                }
            }
        }
        // Note: If job doesn't have salary info, we proceed (can't filter)
    }

    // Experience Pre-Check
    if (jobSeekerExperienceYears != null && typeof jobSeekerExperienceYears === 'number') {
        const minExp = jobAnalysis?.minExperience;
        const maxExp = jobAnalysis?.maxExperience;

        if (minExp != null && typeof minExp === 'number') {
            // If minExperience exists, job seeker must have at least that much
            if (jobSeekerExperienceYears < minExp) {
                return false; // Skip - job seeker doesn't meet minimum experience
            }
        }

        if (maxExp != null && typeof maxExp === 'number') {
            // If maxExperience exists, skip if job seeker is overqualified (exceeds max)
            if (jobSeekerExperienceYears > maxExp) {
                return false; // Skip - job seeker is overqualified
            }
        }

        // If only minExperience exists (no maxExperience), allow any experience above it (already checked above)
    }

    // All pre-checks passed
    return true;
}

/**
 * Find matching jobs for a job seeker against a specific batch of jobs
 * This is used for batch processing where jobs are processed in chunks
 */
async function findMatchingJobsForJobSeekerBatch(jobSeekerId, jobs, jobAnalysisMap) {
    try {
        // Get job seeker with expectedCTC
        const jobSeeker = await JobSeeker.findById(jobSeekerId).select('expectedCTC').lean();
        if (!jobSeeker) {
            return [];
        }

        // Get latest resume analysis with embedding and experienceYears
        const resumeAnalysis = await JobSeekerResumeAnalysis.findOne({
            jobSeekerId,
            status: 'completed',
            embedding: { $exists: true, $ne: [] }
        }).sort({ createdAt: -1 }).lean();

        if (!resumeAnalysis || !Array.isArray(resumeAnalysis.embedding) || resumeAnalysis.embedding.length === 0) {
            return [];
        }

        const resumeEmbedding = resumeAnalysis.embedding;
        const jobSeekerExpectedCTC = jobSeeker.expectedCTC;
        const jobSeekerExperienceYears = resumeAnalysis.experienceYears;
        const threshold = getMatchingThreshold();

        // Get already-matched job IDs to skip re-matching (batch check for efficiency)
        const jobIds = jobs.map(j => j._id);
        const alreadyMatchedJobIds = await getAlreadyMatchedJobIds(jobSeekerId, jobIds);

        // Calculate matches (optimized: only check jobs with embeddings)
        const matches = [];
        const allMatchAttempts = []; // Track all attempts (regardless of threshold) for recording

        for (const job of jobs) {
            const jobIdStr = job._id.toString();
            
            // Skip if already matched
            if (alreadyMatchedJobIds.has(jobIdStr)) {
                continue;
            }

            const jobAnalysisData = jobAnalysisMap.get(jobIdStr);
            if (!jobAnalysisData) {
                continue;
            }

            // jobAnalysisData can be either an array (embedding) or an object {embedding, minExperience, maxExperience}
            const jobEmbedding = Array.isArray(jobAnalysisData) 
                ? jobAnalysisData 
                : (jobAnalysisData.embedding || null);
            
            if (!jobEmbedding || !Array.isArray(jobEmbedding) || jobEmbedding.length === 0) {
                continue;
            }

            // Pre-check: Salary and Experience validation before cosine similarity
            const jobAnalysisObj = Array.isArray(jobAnalysisData) 
                ? {} 
                : {
                    minExperience: jobAnalysisData.minExperience,
                    maxExperience: jobAnalysisData.maxExperience
                };
            
            if (!preCheckJobSeekerMatch(job, jobAnalysisObj, jobSeekerExpectedCTC, jobSeekerExperienceYears)) {
                continue; // Skip this job - pre-checks failed
            }

            // Calculate cosine similarity (expensive operation)
            const score = cosineSimilarity(resumeEmbedding, jobEmbedding);
            
            // Record match attempt (regardless of threshold)
            allMatchAttempts.push({
                jobId: job._id,
                matchScore: score
            });

            // Only add to matches if it passes threshold
            if (score >= threshold) {
                matches.push({
                    jobId: job._id,
                    jobTitle: job.jobTitle,
                    companyName: job.companyName,
                    location: job.location,
                    shortId: job.shortId,
                    matchScore: score,
                    createdAt: job.createdAt
                });
            }
        }

        // Record all match attempts (bulk operation for efficiency)
        if (allMatchAttempts.length > 0) {
            await recordMatchAttempts(jobSeekerId, allMatchAttempts);
        }

        // Sort by match score descending
        matches.sort((a, b) => b.matchScore - a.matchScore);

        return matches;
    } catch (error) {
        console.error('Error finding matching jobs for batch:', error);
        return [];
    }
}

/**
 * Find matching jobs for a job seeker (original function - for backward compatibility)
 * This fetches all active jobs and matches them
 */
async function findMatchingJobsForJobSeeker(jobSeekerId, jobId = null) {
    try {
        // Get job seeker with resume analysis
        const jobSeeker = await JobSeeker.findById(jobSeekerId).select('jobAlertOnResumeMatch email expectedCTC').lean();
        if (!jobSeeker || !jobSeeker.jobAlertOnResumeMatch) {
            return [];
        }

        // Get latest resume analysis with embedding and experienceYears
        const resumeAnalysis = await JobSeekerResumeAnalysis.findOne({
            jobSeekerId,
            status: 'completed',
            embedding: { $exists: true, $ne: [] }
        }).sort({ createdAt: -1 }).lean();

        if (!resumeAnalysis || !Array.isArray(resumeAnalysis.embedding) || resumeAnalysis.embedding.length === 0) {
            return [];
        }

        const resumeEmbedding = resumeAnalysis.embedding;
        const jobSeekerExpectedCTC = jobSeeker.expectedCTC;
        const jobSeekerExperienceYears = resumeAnalysis.experienceYears;
        const threshold = getMatchingThreshold();

        // Build query for jobs
        const now = new Date();
        const jobQuery = {
            status: 'Active',
            $or: [
                { applicationClosingDate: { $exists: false } },
                { applicationClosingDate: null },
                { applicationClosingDate: { $gte: now } }
            ]
        };
        if (jobId) {
            if (mongoose.Types.ObjectId.isValid(jobId)) {
                jobQuery._id = jobId;
            } else {
                return [];
            }
        }

        // Fetch all active jobs (no limit - old jobs are already inactive/closed)
        // Use lean() for better performance and include minSalary, maxSalary for pre-checks
        const jobs = await Job.find(jobQuery)
            .select('_id jobTitle companyName location createdAt shortId minSalary maxSalary')
            .lean();

        if (jobs.length === 0) {
            return [];
        }

        // Get job analyses with embeddings, minExperience, maxExperience (batch query for efficiency)
        // Process in batches to avoid MongoDB query size limits (max 1000 items in $in)
        const BATCH_SIZE = 1000;
        const jobIds = jobs.map(j => j._id);
        const jobAnalysisMap = new Map();
        
        for (let i = 0; i < jobIds.length; i += BATCH_SIZE) {
            const batchIds = jobIds.slice(i, i + BATCH_SIZE);
            const jobAnalyses = await JobAnalysis.find({
                jobId: { $in: batchIds },
                status: { $in: ['completed', 'embedding_only'] },
                embedding: { $exists: true, $ne: [] }
            }).select('jobId embedding minExperience maxExperience').lean();
            
            jobAnalyses.forEach(ja => {
                jobAnalysisMap.set(ja.jobId.toString(), {
                    embedding: ja.embedding,
                    minExperience: ja.minExperience,
                    maxExperience: ja.maxExperience
                });
            });
        }

        // Get already-matched job IDs to skip re-matching (batch check for efficiency)
        const alreadyMatchedJobIds = await getAlreadyMatchedJobIds(jobSeekerId, jobIds);

        // Calculate matches (optimized: only check jobs with embeddings)
        const matches = [];
        const allMatchAttempts = []; // Track all attempts (regardless of threshold) for recording

        for (const job of jobs) {
            const jobIdStr = job._id.toString();
            
            // Skip if already matched
            if (alreadyMatchedJobIds.has(jobIdStr)) {
                continue;
            }

            const jobAnalysisData = jobAnalysisMap.get(jobIdStr);
            if (!jobAnalysisData || !jobAnalysisData.embedding || !Array.isArray(jobAnalysisData.embedding) || jobAnalysisData.embedding.length === 0) {
                continue;
            }

            // Pre-check: Salary and Experience validation before cosine similarity
            const jobAnalysisObj = {
                minExperience: jobAnalysisData.minExperience,
                maxExperience: jobAnalysisData.maxExperience
            };
            
            if (!preCheckJobSeekerMatch(job, jobAnalysisObj, jobSeekerExpectedCTC, jobSeekerExperienceYears)) {
                continue; // Skip this job - pre-checks failed
            }

            // Calculate cosine similarity (expensive operation)
            const score = cosineSimilarity(resumeEmbedding, jobAnalysisData.embedding);
            
            // Record match attempt (regardless of threshold)
            allMatchAttempts.push({
                jobId: job._id,
                matchScore: score
            });

            // Only add to matches if it passes threshold
            if (score >= threshold) {
                matches.push({
                    jobId: job._id,
                    jobTitle: job.jobTitle,
                    companyName: job.companyName,
                    location: job.location,
                    shortId: job.shortId,
                    matchScore: score,
                    createdAt: job.createdAt
                });
            }
        }

        // Record all match attempts (bulk operation for efficiency)
        if (allMatchAttempts.length > 0) {
            await recordMatchAttempts(jobSeekerId, allMatchAttempts);
        }

        // Sort by match score descending
        matches.sort((a, b) => b.matchScore - a.matchScore);

        return matches;
    } catch (error) {
        console.error('Error finding matching jobs:', error);
        return [];
    }
}

/**
 * Check if job seeker has active instant alert plan
 */
async function hasActiveInstantAlertPlan(jobSeekerId) {
    try {
        const plan = await JobSeekerInstantAlertPlan.findOne({
            jobSeekerId,
            status: 'active',
            endDate: { $gte: new Date() }
        }).sort({ createdAt: -1 });
        return !!plan;
    } catch (error) {
        console.error('Error checking instant alert plan:', error);
        return false;
    }
}

/**
 * Record that an alert was sent
 */
async function recordAlertSent(jobSeekerId, jobId, matchScore, alertType, intervalDay) {
    try {
        await JobSeekerJobAlert.create({
            jobSeekerId,
            jobId,
            matchScore,
            alertType,
            intervalDay,
            sentAt: new Date()
        });
    } catch (error) {
        // Ignore duplicate key errors (already sent)
        if (error.code !== 11000) {
            console.error('Error recording alert:', error);
        }
    }
}

module.exports = {
    cosineSimilarity,
    getMatchingThreshold,
    getAlertIntervals,
    hasAppliedToJob,
    wasAlertSent,
    areAllIntervalsExhausted,
    getDaysSinceJobPosted,
    getCurrentIntervalDay,
    findMatchingJobsForJobSeeker,
    findMatchingJobsForJobSeekerBatch,
    hasActiveInstantAlertPlan,
    recordAlertSent,
    resetMatchAttemptsForJob,
    resetMatchAttemptsForJobSeeker
};

