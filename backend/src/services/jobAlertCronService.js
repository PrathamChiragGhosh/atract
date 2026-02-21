const cron = require('node-cron');
const JobSeeker = require('../models/jobSeeker');
const JobSeekerResumeAnalysis = require('../models/jobSeekerResumeAnalysis');
const Job = require('../models/job');
const JobAnalysis = require('../models/jobAnalysis');
const {
    findMatchingJobsForJobSeeker,
    findMatchingJobsForJobSeekerBatch,
    hasAppliedToJob,
    wasAlertSent,
    areAllIntervalsExhausted,
    getDaysSinceJobPosted,
    getCurrentIntervalDay,
    getAlertIntervals,
    recordAlertSent
} = require('./jobMatchingService');
const { sendJobAlertEmail } = require('./jobAlertEmailService');

let currentTask = null;

/**
 * Convert local time (IST - UTC+5:30) to UTC
 * Same as blog cron service
 */
function convertLocalTimeToUTC(localTime) {
    if (!localTime || !/^\d{2}:\d{2}$/.test(localTime)) {
        return localTime;
    }
    
    const [hours, minutes] = localTime.split(':');
    const h = Number(hours);
    const m = Number(minutes);
    
    if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) {
        return localTime;
    }
    
    // IST is UTC+5:30, so subtract 5 hours and 30 minutes
    let utcHours = h - 5;
    let utcMinutes = m - 30;
    
    // Handle minute underflow
    if (utcMinutes < 0) {
        utcMinutes += 60;
        utcHours -= 1;
    }
    
    // Handle hour underflow (previous day)
    if (utcHours < 0) {
        utcHours += 24;
    }
    
    // Format as HH:mm
    return `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
}

/**
 * Build cron expression from time string
 * Same as blog cron service
 */
function buildCronExpression(time) {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        return '30 3 * * *'; // 09:00 IST default = 03:30 UTC
    }
    
    // Convert local time to UTC
    const utcTime = convertLocalTimeToUTC(time);
    const [hours, minutes] = utcTime.split(':');
    const h = Number(hours);
    const m = Number(minutes);
    
    if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) {
        return '30 3 * * *';
    }
    return `${m} ${h} * * *`;
}

/**
 * Process matches for a job seeker (handles alert logic for a batch of matches)
 */
async function processMatchesForJobSeeker(jobSeekerId, matches, intervals) {
    const stats = {
        matches: matches.length,
        emailsSent: 0,
        skipped: 0
    };

    for (const match of matches) {
        try {
            // Check if already applied
            const hasApplied = await hasAppliedToJob(jobSeekerId, match.jobId);
            if (hasApplied) {
                stats.skipped++;
                continue;
            }

            // Check if all intervals exhausted
            const allExhausted = await areAllIntervalsExhausted(jobSeekerId, match.jobId);
            if (allExhausted) {
                stats.skipped++;
                continue;
            }

            // Check which intervals have already been sent
            const JobSeekerJobAlert = require('../models/jobSeekerJobAlert');
            const sentAlerts = await JobSeekerJobAlert.find({
                jobSeekerId,
                jobId: match.jobId
            }).select('intervalDay sentAt').sort({ sentAt: 1 }).lean();
            
            const sentDays = new Set(sentAlerts.map(a => a.intervalDay));

            // Interval 1: Send immediately on first cron run when job matches (if not already sent)
            const firstInterval = intervals[0] || 1;
            const interval1Sent = sentDays.has(firstInterval);
            
            // Find when interval 1 was sent (to calculate days since first alert)
            const interval1Alert = sentAlerts.find(a => a.intervalDay === firstInterval);
            const daysSinceFirstAlert = interval1Alert 
                ? getDaysSinceJobPosted(interval1Alert.sentAt)
                : 0;

            // Interval 3 (or other later intervals): Send X days AFTER interval 1 was sent
            const laterIntervals = intervals.slice(1);

            let shouldSendAlert = false;
            let intervalDayToSend = null;

            // Check if interval 1 should be sent (immediately if not sent yet)
            if (!interval1Sent) {
                shouldSendAlert = true;
                intervalDayToSend = firstInterval;
            } else {
                // Interval 1 already sent, check if any later interval should be sent
                for (const intervalDay of laterIntervals) {
                    if (!sentDays.has(intervalDay)) {
                        if (daysSinceFirstAlert >= intervalDay) {
                            shouldSendAlert = true;
                            intervalDayToSend = intervalDay;
                            break;
                        }
                    }
                }
            }

            if (!shouldSendAlert) {
                stats.skipped++;
                continue;
            }

            // Send the alert
            const emailSent = await sendJobAlertEmail(jobSeekerId, match.jobId, match.matchScore);
            if (emailSent) {
                await recordAlertSent(
                    jobSeekerId,
                    match.jobId,
                    match.matchScore,
                    'scheduled',
                    intervalDayToSend
                );
                stats.emailsSent++;
            } else {
                stats.skipped++;
            }
        } catch (error) {
            console.error(`Error processing match for job ${match.jobId}:`, error);
            stats.skipped++;
        }
    }

    return stats;
}

/**
 * Process a batch of job seekers against a batch of jobs
 * This ensures all job seekers are matched against all jobs, but in batches for memory efficiency
 */
async function processJobSeekersBatchAgainstJobBatch(jobSeekersBatch, jobs, jobAnalysisMap, intervals, concurrency) {
    const results = {
        matches: 0,
        emailsSent: 0,
        skipped: 0
    };

    // Process job seekers with concurrency limit
    for (let i = 0; i < jobSeekersBatch.length; i += concurrency) {
        const concurrentJobSeekers = jobSeekersBatch.slice(i, i + concurrency);
        
        const promises = concurrentJobSeekers.map(async (jobSeeker) => {
            try {
                // Find matches for this job seeker against the current job batch
                const matches = await findMatchingJobsForJobSeekerBatch(
                    jobSeeker._id,
                    jobs,
                    jobAnalysisMap
                );

                if (matches.length === 0) {
                    return { matches: 0, emailsSent: 0, skipped: 0 };
                }

                // Process matches (check intervals, send alerts, etc.)
                const stats = await processMatchesForJobSeeker(
                    jobSeeker._id,
                    matches,
                    intervals
                );

                return stats;
            } catch (error) {
                console.error(`Error processing job seeker ${jobSeeker._id}:`, error);
                return { matches: 0, emailsSent: 0, skipped: 0 };
            }
        });

        const batchResults = await Promise.all(promises);
        
        // Aggregate results
        batchResults.forEach(stats => {
            results.matches += stats.matches;
            results.emailsSent += stats.emailsSent;
            results.skipped += stats.skipped;
        });
    }

    return results;
}

/**
 * Check if job alert system is enabled
 */
function isJobAlertEnabled() {
    const enabled = process.env.JOB_ALERT_ENABLED;
    // Default to true if not set (backward compatibility)
    if (enabled === undefined || enabled === null) {
        return true;
    }
    // Accept 'true', 'True', 'TRUE', '1', 'yes', 'Yes', 'YES'
    const enabledStr = String(enabled).toLowerCase().trim();
    return enabledStr === 'true' || enabledStr === '1' || enabledStr === 'yes';
}

/**
 * Run scheduled job matching for all eligible job seekers
 * Optimized for scalability with batch processing for both jobs and job seekers
 * All job seekers are matched against all active jobs, but processed in batches for memory efficiency
 */
async function runScheduledJobMatching() {
    // Check if job alert system is enabled
    if (!isJobAlertEnabled()) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Job alert system is DISABLED (JOB_ALERT_ENABLED=false). Skipping scheduled job matching.`);
        console.log(`${'='.repeat(60)}\n`);
        return;
    }

    const now = new Date();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting scheduled job matching at ${now.toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);
    const startTime = Date.now();

    try {
        // Get batch sizes and concurrency from env or use defaults
        // Defaults are optimized for medium-scale servers (2 vCPU, 4-8GB RAM)
        // For KVM1 (1 vCPU, 4GB): Use JOB_BATCH_SIZE=500, JOB_SEEKER_BATCH_SIZE=100, CONCURRENCY=2, EMAIL_DELAY=250
        // For KVM2 (2 vCPU, 8GB): Use JOB_BATCH_SIZE=1000, JOB_SEEKER_BATCH_SIZE=200, CONCURRENCY=6, EMAIL_DELAY=150
        const JOB_BATCH_SIZE = parseInt(process.env.JOB_ALERT_JOB_BATCH_SIZE || '1000', 10);
        const JOB_SEEKER_BATCH_SIZE = parseInt(process.env.JOB_ALERT_JOB_SEEKER_BATCH_SIZE || '200', 10);
        const CONCURRENCY = parseInt(process.env.JOB_ALERT_CONCURRENCY || '5', 10);
        const EMAIL_RATE_LIMIT_DELAY = parseInt(process.env.JOB_ALERT_EMAIL_DELAY_MS || '100', 10);

        console.log(`Configuration: Job Batch Size=${JOB_BATCH_SIZE}, Job Seeker Batch Size=${JOB_SEEKER_BATCH_SIZE}, Concurrency=${CONCURRENCY}, Email Delay=${EMAIL_RATE_LIMIT_DELAY}ms`);

        // Get total count of job seekers with alerts enabled (for batching)
        const jobSeekerIds = await JobSeekerResumeAnalysis.distinct('jobSeekerId', {
            status: 'completed',
            embedding: { $exists: true, $ne: [] }
        });

        const totalJobSeekers = await JobSeeker.countDocuments({
            jobAlertOnResumeMatch: true,
            _id: { $in: jobSeekerIds }
        });

        console.log(`Found ${totalJobSeekers} job seekers with alerts enabled and valid resume embeddings`);

        if (totalJobSeekers === 0) {
            console.log('No job seekers with alerts enabled. Exiting.');
            return;
        }

        // Get all active jobs (build query once)
        const jobQuery = {
            status: 'Active',
            $or: [
                { applicationClosingDate: { $exists: false } },
                { applicationClosingDate: null },
                { applicationClosingDate: { $gte: now } }
            ]
        };

        // Count total active jobs
        const totalJobs = await Job.countDocuments(jobQuery);
        console.log(`Found ${totalJobs} active jobs to match against`);

        if (totalJobs === 0) {
            console.log('No active jobs found. Exiting.');
            return;
        }

        const intervals = getAlertIntervals();
        const results = {
            matches: 0,
            emailsSent: 0,
            skipped: 0
        };

        // Process jobs in batches
        let processedJobs = 0;
        let jobBatchNumber = 0;

        // Use cursor-based pagination for efficient job batching
        let skip = 0;
        while (skip < totalJobs) {
            jobBatchNumber++;
            console.log(`\n--- Processing Job Batch ${jobBatchNumber} (Jobs ${skip + 1} to ${Math.min(skip + JOB_BATCH_SIZE, totalJobs)} of ${totalJobs}) ---`);

            // Fetch batch of jobs (include minSalary, maxSalary for pre-checks)
            const jobs = await Job.find(jobQuery)
                .select('_id jobTitle companyName location createdAt shortId minSalary maxSalary')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(JOB_BATCH_SIZE)
                .lean();

            if (jobs.length === 0) {
                break;
            }

            // Get job analyses with embeddings, minExperience, maxExperience for this batch
            const jobIds = jobs.map(j => j._id);
            const jobAnalysisMap = new Map();
            
            // Process job analyses in batches (MongoDB $in limit is 1000)
            const ANALYSIS_BATCH_SIZE = 1000;
            for (let i = 0; i < jobIds.length; i += ANALYSIS_BATCH_SIZE) {
                const batchIds = jobIds.slice(i, i + ANALYSIS_BATCH_SIZE);
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

            console.log(`  Found ${jobAnalysisMap.size} jobs with embeddings in this batch`);

            // Process job seekers in batches for this job batch
            let processedJobSeekers = 0;
            let jobSeekerBatchNumber = 0;
            let jobSeekerSkip = 0;

            while (jobSeekerSkip < totalJobSeekers) {
                jobSeekerBatchNumber++;
                
                // Fetch batch of job seekers (using pagination on the filtered IDs)
                const batchJobSeekerIds = jobSeekerIds.slice(jobSeekerSkip, jobSeekerSkip + JOB_SEEKER_BATCH_SIZE);
                const jobSeekersBatch = await JobSeeker.find({
                    jobAlertOnResumeMatch: true,
                    _id: { $in: batchJobSeekerIds }
                })
                .select('_id email')
                .lean();

                if (jobSeekersBatch.length === 0) {
                    break;
                }

                console.log(`    Processing Job Seeker Batch ${jobSeekerBatchNumber} (${jobSeekersBatch.length} job seekers) against Job Batch ${jobBatchNumber}`);

                // Match this batch of job seekers against this batch of jobs
                const batchResults = await processJobSeekersBatchAgainstJobBatch(
                    jobSeekersBatch,
                    jobs,
                    jobAnalysisMap,
                    intervals,
                    CONCURRENCY
                );

                // Aggregate results
                results.matches += batchResults.matches;
                results.emailsSent += batchResults.emailsSent;
                results.skipped += batchResults.skipped;

                processedJobSeekers += jobSeekersBatch.length;
                jobSeekerSkip += JOB_SEEKER_BATCH_SIZE;
            }

            processedJobs += jobs.length;
            console.log(`  Job batch ${jobBatchNumber} completed: Processed ${processedJobSeekers} job seekers, Matches=${results.matches}, EmailsSent=${results.emailsSent}, Skipped=${results.skipped}`);

            skip += JOB_BATCH_SIZE;
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Scheduled job matching completed in ${duration}s`);
        console.log(`Summary: Matches found: ${results.matches}, Emails sent: ${results.emailsSent}, Skipped: ${results.skipped}`);
        console.log(`Performance: Processed ${totalJobSeekers} job seekers against ${processedJobs} jobs`);
        console.log(`  (${totalJobSeekers} job seekers × ${processedJobs} jobs = ${totalJobSeekers * processedJobs} total match checks)`);
        console.log(`  Processed in ${jobBatchNumber} job batches × job seeker batches`);
        console.log(`${'='.repeat(60)}\n`);
    } catch (error) {
        console.error(`\n${'='.repeat(60)}`);
        console.error('ERROR in scheduled job matching:', error);
        console.error(`${'='.repeat(60)}\n`);
    }
}

/**
 * Schedule the cron job
 * Same pattern as blog cron service
 */
function scheduleJobMatching() {
    const timeString = process.env.JOB_ALERT_MATCHING_TIME || '09:00';
    const cronExpression = buildCronExpression(timeString);
    const utcTime = convertLocalTimeToUTC(timeString);

    if (currentTask) {
        currentTask.stop();
        currentTask = null;
    }

    currentTask = cron.schedule(cronExpression, () => {
        const now = new Date();
        console.log(`\n=== CRON TRIGGERED: Job Matching Started at ${now.toISOString()} ===\n`);
        runScheduledJobMatching().then(() => {
            console.log(`\n=== CRON COMPLETED: Job Matching Finished at ${new Date().toISOString()} ===\n`);
        }).catch((error) => {
            console.error(`\n=== CRON ERROR: Job Matching Failed at ${new Date().toISOString()} ===`);
            console.error(error);
            console.log(`\n`);
        });
    });

    console.log(`Job matching scheduled daily at ${timeString} IST (${utcTime} UTC) (cron: ${cronExpression})`);
}

/**
 * Initialize the cron service
 */
function initJobAlertCron() {
    // Check if job alert system is enabled
    if (!isJobAlertEnabled()) {
        console.log('Job alert system is DISABLED (JOB_ALERT_ENABLED=false). Cron not scheduled.');
        return;
    }

    scheduleJobMatching();
    console.log('Job alert cron service initialized');
}

/**
 * Stop the cron service
 */
function stopJobAlertCron() {
    if (currentTask) {
        currentTask.stop();
        currentTask = null;
        console.log('Job alert cron service stopped');
    }
}

/**
 * Get current cron status
 */
function getCronStatus() {
    const timeString = process.env.JOB_ALERT_MATCHING_TIME || '09:00';
    return {
        isEnabled: isJobAlertEnabled(),
        isScheduled: currentTask !== null,
        isRunning: currentTask ? currentTask.running : false,
        timeString: timeString,
        utcTime: convertLocalTimeToUTC(timeString),
        cronExpression: buildCronExpression(timeString)
    };
}

module.exports = {
    runScheduledJobMatching,
    scheduleJobMatching,
    initJobAlertCron,
    stopJobAlertCron,
    getCronStatus
};

