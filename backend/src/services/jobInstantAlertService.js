const {
    findMatchingJobsForJobSeeker,
    hasAppliedToJob,
    wasAlertSent,
    getAlertIntervals,
    recordAlertSent,
    hasActiveInstantAlertPlan
} = require('./jobMatchingService');
const { sendJobAlertEmail } = require('./jobAlertEmailService');

/**
 * Check if instant alert system is enabled
 */
function isInstantAlertEnabled() {
    const enabled = process.env.JOB_ALERT_INSTANT_ENABLED;
    // Default to true if not set (backward compatibility)
    if (enabled === undefined || enabled === null) {
        return true;
    }
    // Accept 'true', 'True', 'TRUE', '1', 'yes', 'Yes', 'YES'
    const enabledStr = String(enabled).toLowerCase().trim();
    return enabledStr === 'true' || enabledStr === '1' || enabledStr === 'yes';
}

/**
 * Trigger instant alerts for a newly posted job
 * Only sends to job seekers with active instant alert plans
 */
async function triggerInstantAlertsForJob(jobId) {
    try {
        // Check if instant alert system is enabled
        if (!isInstantAlertEnabled()) {
            console.log(`Instant alert system is DISABLED (JOB_ALERT_INSTANT_ENABLED=false). Skipping instant alerts for job ${jobId}.`);
            return;
        }

        console.log(`Triggering instant alerts for job ${jobId}`);

        // Get all job seekers with active instant alert plans
        const JobSeeker = require('../models/jobSeeker');
        const JobSeekerInstantAlertPlan = require('../models/jobSeekerInstantAlertPlan');

        const activePlans = await JobSeekerInstantAlertPlan.find({
            status: 'active',
            endDate: { $gte: new Date() }
        }).select('jobSeekerId').populate({
            path: 'jobSeekerId',
            select: 'jobAlertOnResumeMatch email',
            model: 'JobSeeker'
        });

        console.log(`Found ${activePlans.length} active instant alert plans`);

        let totalEmailsSent = 0;
        let totalSkipped = 0;

        for (const plan of activePlans) {
            const jobSeeker = plan.jobSeekerId;
            if (!jobSeeker || !jobSeeker.jobAlertOnResumeMatch) {
                continue;
            }

            try {
                // Check if job seeker has active instant alert plan
                const hasActivePlan = await hasActiveInstantAlertPlan(jobSeeker._id);
                if (!hasActivePlan) {
                    continue;
                }

                // Find matching jobs for this job seeker (only this specific job)
                const matches = await findMatchingJobsForJobSeeker(jobSeeker._id, jobId);

                if (matches.length === 0) {
                    continue;
                }

                const match = matches[0]; // Should only be one match since we filtered by jobId

                // Check if already applied
                const hasApplied = await hasAppliedToJob(jobSeeker._id, jobId);
                if (hasApplied) {
                    totalSkipped++;
                    continue;
                }

                // Check if instant alert already sent (interval day 1)
                const intervals = getAlertIntervals();
                const firstInterval = intervals[0] || 1;
                const alreadySent = await wasAlertSent(jobSeeker._id, jobId, firstInterval);
                if (alreadySent) {
                    totalSkipped++;
                    continue;
                }

                // Send instant alert email
                const emailSent = await sendJobAlertEmail(jobSeeker._id, jobId, match.matchScore);
                if (emailSent) {
                    await recordAlertSent(
                        jobSeeker._id,
                        jobId,
                        match.matchScore,
                        'instant',
                        firstInterval
                    );
                    totalEmailsSent++;
                    console.log(`Instant alert sent to ${jobSeeker.email} for job ${jobId}`);
                }
            } catch (error) {
                console.error(`Error processing instant alert for job seeker ${jobSeeker._id}:`, error);
            }
        }

        console.log(`Instant alerts completed for job ${jobId}. Emails sent: ${totalEmailsSent}, Skipped: ${totalSkipped}`);
    } catch (error) {
        console.error('Error triggering instant alerts:', error);
    }
}

module.exports = {
    triggerInstantAlertsForJob
};

