const sendMail = require('../utils/sendMail');
const JobSeeker = require('../models/jobSeeker');
const Job = require('../models/job');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Send job alert email to job seeker
 */
async function sendJobAlertEmail(jobSeekerId, jobId, matchScore) {
    try {
        const jobSeeker = await JobSeeker.findById(jobSeekerId).select('email fullName');
        if (!jobSeeker || !jobSeeker.email) {
            console.error('Job seeker not found or no email:', jobSeekerId);
            return false;
        }

        const job = await Job.findById(jobId).select('jobTitle companyName location shortId');
        if (!job) {
            console.error('Job not found:', jobId);
            return false;
        }

        const jobUrl = `${FRONTEND_URL}/${job.shortId}`;
        const matchPercentage = Math.round(matchScore * 100);

        const subject = `New Job Match: ${job.jobTitle} at ${job.companyName}`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Job Match</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">🎯 New Job Match Found!</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        Hi ${jobSeeker.fullName || 'there'},
                    </p>
                    
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        We found a new job that matches your profile with a <strong>${matchPercentage}% match score</strong>!
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                        <h2 style="margin-top: 0; color: #2563eb;">${job.jobTitle}</h2>
                        <p style="margin: 10px 0; color: #666;">
                            <strong>Company:</strong> ${job.companyName}
                        </p>
                        ${job.location ? `
                        <p style="margin: 10px 0; color: #666;">
                            <strong>Location:</strong> ${job.location}
                        </p>
                        ` : ''}
                        <p style="margin: 10px 0; color: #666;">
                            <strong>Match Score:</strong> ${matchPercentage}%
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${jobUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; padding: 15px 30px; text-decoration: none; 
                                  border-radius: 8px; font-weight: bold; font-size: 16px;">
                            View Job Details
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666; margin-top: 30px;">
                        This job was matched based on your resume and profile. Don't miss out on this opportunity!
                    </p>
                    
                    <p style="font-size: 14px; color: #666; margin-top: 20px;">
                        Best regards,<br>
                        The Atract Team
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
                    <p>You're receiving this because you have job alerts enabled.</p>
                    <p>To manage your alert preferences, visit your profile settings.</p>
                </div>
            </body>
            </html>
        `;

        // Rate limiting: Add small delay between emails to avoid overwhelming SMTP server
        const EMAIL_DELAY_MS = parseInt(process.env.JOB_ALERT_EMAIL_DELAY_MS || '100', 10);
        if (EMAIL_DELAY_MS > 0) {
            await new Promise(resolve => setTimeout(resolve, EMAIL_DELAY_MS));
        }

        const result = await sendMail(jobSeeker.email, subject, html);
        if (result && result.success) {
            return true;
        } else {
            console.error(`Failed to send job alert email to ${jobSeeker.email} for job ${job.jobTitle}:`, result?.error || 'Unknown error');
            return false;
        }
    } catch (error) {
        console.error('Error sending job alert email:', error);
        return false;
    }
}

module.exports = {
    sendJobAlertEmail
};

