/**
 * Manual test service for job alerts
 * Can be called to test the matching and email sending
 */
const {
    findMatchingJobsForJobSeeker,
    hasAppliedToJob,
    getMatchingThreshold,
    getAlertIntervals
} = require('./jobMatchingService');
const { sendJobAlertEmail } = require('./jobAlertEmailService');
const JobSeeker = require('../models/jobSeeker');
const JobSeekerResumeAnalysis = require('../models/jobSeekerResumeAnalysis');
const Job = require('../models/job');
const JobAnalysis = require('../models/jobAnalysis');

/**
 * Test job alert system for a specific job seeker
 */
async function testJobAlertForJobSeeker(jobSeekerId) {
    try {
        console.log(`\n=== Testing Job Alert for Job Seeker ${jobSeekerId} ===\n`);

        const jobSeeker = await JobSeeker.findById(jobSeekerId).select('email fullName jobAlertOnResumeMatch');
        if (!jobSeeker) {
            console.error('Job seeker not found');
            return { success: false, error: 'Job seeker not found' };
        }

        console.log(`Job Seeker: ${jobSeeker.email} (${jobSeeker.fullName})`);
        console.log(`Alerts Enabled: ${jobSeeker.jobAlertOnResumeMatch}`);

        if (!jobSeeker.jobAlertOnResumeMatch) {
            console.log('⚠️  Job alerts are not enabled for this job seeker');
            return { success: false, error: 'Job alerts not enabled' };
        }

        const resumeAnalysis = await JobSeekerResumeAnalysis.findOne({
            jobSeekerId,
            status: 'completed',
            embedding: { $exists: true, $ne: [] }
        }).sort({ createdAt: -1 });

        if (!resumeAnalysis) {
            console.log('⚠️  No resume analysis with embedding found');
            return { success: false, error: 'No resume embedding found' };
        }

        console.log(`✓ Resume embedding found (length: ${resumeAnalysis.embedding.length})`);

        const threshold = getMatchingThreshold();
        console.log(`Matching Threshold: ${threshold}`);

        const matches = await findMatchingJobsForJobSeeker(jobSeekerId);
        console.log(`\nFound ${matches.length} matching jobs:\n`);

        for (const match of matches) {
            console.log(`- ${match.jobTitle} at ${match.companyName}`);
            console.log(`  Match Score: ${(match.matchScore * 100).toFixed(1)}%`);
            console.log(`  Job ID: ${match.jobId}`);
            
            const hasApplied = await hasAppliedToJob(jobSeekerId, match.jobId);
            console.log(`  Already Applied: ${hasApplied ? 'Yes' : 'No'}`);
        }

        return {
            success: true,
            jobSeeker: {
                email: jobSeeker.email,
                fullName: jobSeeker.fullName,
                alertsEnabled: jobSeeker.jobAlertOnResumeMatch
            },
            resumeEmbedding: {
                exists: true,
                length: resumeAnalysis.embedding.length
            },
            matches: matches.map(m => ({
                jobId: m.jobId.toString(),
                jobTitle: m.jobTitle,
                companyName: m.companyName,
                matchScore: m.matchScore,
                matchPercentage: Math.round(m.matchScore * 100)
            })),
            threshold
        };
    } catch (error) {
        console.error('Error testing job alert:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Test sending an email alert manually
 */
async function testSendEmailAlert(jobSeekerId, jobId) {
    try {
        console.log(`\n=== Testing Email Alert ===\n`);
        console.log(`Job Seeker ID: ${jobSeekerId}`);
        console.log(`Job ID: ${jobId}`);

        const jobSeeker = await JobSeeker.findById(jobSeekerId).select('email fullName');
        if (!jobSeeker) {
            return { success: false, error: 'Job seeker not found' };
        }

        const job = await Job.findById(jobId).select('jobTitle companyName');
        if (!job) {
            return { success: false, error: 'Job not found' };
        }

        // Calculate match score
        const resumeAnalysis = await JobSeekerResumeAnalysis.findOne({
            jobSeekerId,
            status: 'completed',
            embedding: { $exists: true, $ne: [] }
        }).sort({ createdAt: -1 });

        const jobAnalysis = await JobAnalysis.findOne({
            jobId,
            status: { $in: ['completed', 'embedding_only'] },
            embedding: { $exists: true, $ne: [] }
        });

        if (!resumeAnalysis || !jobAnalysis) {
            return { success: false, error: 'Missing embeddings' };
        }

        const { cosineSimilarity } = require('./jobMatchingService');
        const matchScore = cosineSimilarity(resumeAnalysis.embedding, jobAnalysis.embedding);

        console.log(`Match Score: ${(matchScore * 100).toFixed(1)}%`);
        console.log(`Sending email to: ${jobSeeker.email}`);

        const emailSent = await sendJobAlertEmail(jobSeekerId, jobId, matchScore);
        
        if (emailSent) {
            console.log('✓ Email sent successfully');
            return { success: true, emailSent: true };
        } else {
            console.log('✗ Email sending failed');
            return { success: false, emailSent: false };
        }
    } catch (error) {
        console.error('Error testing email alert:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get system status
 */
async function getJobAlertSystemStatus() {
    try {
        const jobSeekersWithAlerts = await JobSeeker.countDocuments({ jobAlertOnResumeMatch: true });
        const jobSeekersWithEmbeddings = await JobSeekerResumeAnalysis.countDocuments({
            status: 'completed',
            embedding: { $exists: true, $ne: [] }
        });
        const jobsWithEmbeddings = await JobAnalysis.countDocuments({
            status: { $in: ['completed', 'embedding_only'] },
            embedding: { $exists: true, $ne: [] }
        });
        const activeJobs = await Job.countDocuments({ status: 'Active' });

        // Calculate UTC time for display
        const timeString = process.env.JOB_ALERT_MATCHING_TIME || '09:00';
        const [hours, minutes] = timeString.split(':').map(s => parseInt(s.trim(), 10));
        let utcHours = hours - 5;
        let utcMinutes = minutes - 30;
        if (utcMinutes < 0) {
            utcMinutes += 60;
            utcHours -= 1;
        }
        if (utcHours < 0) {
            utcHours += 24;
        }
        const utcTime = `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;

        // Get cron expression
        const cron = require('node-cron');
        const convertTimeToCron = (timeStr) => {
            const [h, m] = timeStr.split(':').map(s => parseInt(s.trim(), 10));
            let utcH = h - 5;
            let utcM = m - 30;
            if (utcM < 0) {
                utcM += 60;
                utcH -= 1;
            }
            if (utcH < 0) {
                utcH += 24;
            }
            return `${utcM} ${utcH} * * *`;
        };
        const cronExpression = convertTimeToCron(timeString);

        return {
            jobSeekersWithAlerts,
            jobSeekersWithEmbeddings,
            jobsWithEmbeddings,
            activeJobs,
            threshold: getMatchingThreshold(),
            intervals: getAlertIntervals(),
            matchingTime: {
                ist: timeString,
                utc: utcTime,
                cronExpression: cronExpression,
                isValid: cron.validate(cronExpression)
            }
        };
    } catch (error) {
        console.error('Error getting system status:', error);
        return { error: error.message };
    }
}

module.exports = {
    testJobAlertForJobSeeker,
    testSendEmailAlert,
    getJobAlertSystemStatus
};

