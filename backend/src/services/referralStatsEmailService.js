const sendMail = require('../utils/sendMail');
const JobSeekerReferralStats = require('../models/jobSeekerReferralStats');
const JobSeeker = require('../models/jobSeeker');

/**
 * Get today's date range in IST timezone (start and end of day in UTC)
 */
function getTodayISTDateRange() {
    const now = new Date();
    
    // Get current date in IST as a formatted string (YYYY-MM-DD)
    const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // Returns YYYY-MM-DD
    
    // Parse the date components
    const [year, month, day] = istDateStr.split('-').map(Number);
    
    // Create Date objects representing start and end of day in IST
    // We need to create these in IST, then convert to UTC for MongoDB queries
    // IST = UTC+5:30, so IST 00:00:00 = UTC 18:30:00 (previous day)
    // We'll use a library-friendly approach: create the date string with timezone
    
    // Method: Create ISO string with IST timezone offset
    const startIST = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+05:30`;
    const endIST = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999+05:30`;
    
    // Convert to Date objects (JavaScript automatically converts to UTC)
    const startUTC = new Date(startIST);
    const endUTC = new Date(endIST);
    
    return { start: startUTC, end: endUTC };
}

/**
 * Format date for display
 */
function formatDateForDisplay(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Send referral stats email to recipients
 */
async function sendReferralStatsEmail() {
    try {
        // Get recipient emails from env
        const recipientEmails = process.env.REFERRAL_STATS_EMAIL_RECIPIENTS 
            ? process.env.REFERRAL_STATS_EMAIL_RECIPIENTS.split(',').map(email => email.trim()).filter(email => email.length > 0)
            : [];

        if (recipientEmails.length === 0) {
            console.log('No referral stats email recipients configured. Skipping email.');
            return { success: false, message: 'No recipients configured' };
        }

        // Get all referral stats with populated user data
        const allStats = await JobSeekerReferralStats.find({})
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 });

        // Calculate aggregated statistics
        const totalReferrals = allStats.length;
        const existingUsers = allStats.filter(s => s.alreadyHadAccount === true).length;
        const newUsers = allStats.filter(s => s.alreadyHadAccount === false).length;
        const withResume = allStats.filter(s => s.isResumeSaved === true).length;
        const withOtherDetails = allStats.filter(s => s.isOtherDetailsFilled === true).length;
        const completedProfiles = allStats.filter(s => s.isResumeSaved === true && s.isOtherDetailsFilled === true).length;
        const completionRate = totalReferrals > 0 ? ((completedProfiles / totalReferrals) * 100).toFixed(2) : '0.00';

        // Group by redirectTo
        const redirectGroups = {};
        allStats.forEach(stat => {
            const redirect = stat.redirectTo || 'Unknown';
            if (!redirectGroups[redirect]) {
                redirectGroups[redirect] = {
                    redirectTo: redirect,
                    count: 0,
                    existingUsers: 0,
                    newUsers: 0,
                    withResume: 0,
                    withOtherDetails: 0,
                    completedProfiles: 0,
                };
            }
            redirectGroups[redirect].count++;
            if (stat.alreadyHadAccount) redirectGroups[redirect].existingUsers++;
            else redirectGroups[redirect].newUsers++;
            if (stat.isResumeSaved) redirectGroups[redirect].withResume++;
            if (stat.isOtherDetailsFilled) redirectGroups[redirect].withOtherDetails++;
            if (stat.isResumeSaved && stat.isOtherDetailsFilled) redirectGroups[redirect].completedProfiles++;
        });

        const byRedirect = Object.values(redirectGroups);

        // Get today's date range in IST
        const { start: todayStart, end: todayEnd } = getTodayISTDateRange();
        
        // Filter individual stats for today only (IST timezone)
        const todayStats = allStats.filter(stat => {
            const createdAt = new Date(stat.createdAt);
            return createdAt >= todayStart && createdAt <= todayEnd;
        }).map(stat => ({
            userName: stat.userId?.fullName || 'Unknown',
            userEmail: stat.userId?.email || 'Unknown',
            redirectTo: stat.redirectTo || 'Unknown',
            alreadyHadAccount: stat.alreadyHadAccount,
            isResumeSaved: stat.isResumeSaved,
            isOtherDetailsFilled: stat.isOtherDetailsFilled,
            createdAt: stat.createdAt,
        }));

        // Format today's date for display
        const todayDateDisplay = new Date().toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Build HTML email
        const html = buildEmailHTML({
            summary: {
                totalReferrals,
                existingUsers,
                newUsers,
                withResume,
                withOtherDetails,
                completedProfiles,
                completionRate,
            },
            byRedirect,
            todayStats,
            todayDateDisplay,
        });

        const subject = `Referral Statistics Report - ${todayDateDisplay}`;

        // Send email to all recipients
        const results = [];
        for (const email of recipientEmails) {
            try {
                const result = await sendMail(email, subject, html);
                if (result && result.success) {
                    results.push({ email, success: true });
                    console.log(`Referral stats email sent successfully to ${email}`);
                } else {
                    results.push({ email, success: false, error: result?.error || 'Unknown error' });
                    console.error(`Failed to send referral stats email to ${email}:`, result?.error || 'Unknown error');
                }
            } catch (error) {
                results.push({ email, success: false, error: error.message });
                console.error(`Error sending referral stats email to ${email}:`, error);
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        return {
            success: failureCount === 0,
            message: `Sent to ${successCount} recipient(s), ${failureCount} failed`,
            results,
        };
    } catch (error) {
        console.error('Error in sendReferralStatsEmail:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Build HTML email content
 */
function buildEmailHTML({ summary, byRedirect, todayStats, todayDateDisplay }) {
    // Build summary cards HTML - 2 cards per row, last card full width
    const summaryCardsHTML = `
        <div style="margin-bottom: 25px;">
            <!-- Row 1: 2 cards -->
            <div style="display: table; width: 100%; table-layout: fixed; margin-bottom: 12px;">
                <div style="display: table-cell; width: 50%; padding-right: 6px; vertical-align: top;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
                        <div style="font-size: 36px; font-weight: bold; margin-bottom: 5px;">${summary.totalReferrals}</div>
                        <div style="font-size: 14px; opacity: 0.95;">Total Referrals</div>
                    </div>
                </div>
                <div style="display: table-cell; width: 50%; padding-left: 6px; vertical-align: top;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #667eea;">
                        <div style="font-size: 36px; font-weight: bold; color: #667eea; margin-bottom: 5px;">${summary.newUsers}</div>
                        <div style="font-size: 14px; color: #666;">New Users</div>
                    </div>
                </div>
            </div>
            <!-- Row 2: 2 cards -->
            <div style="display: table; width: 100%; table-layout: fixed; margin-bottom: 12px;">
                <div style="display: table-cell; width: 50%; padding-right: 6px; vertical-align: top;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #667eea;">
                        <div style="font-size: 36px; font-weight: bold; color: #667eea; margin-bottom: 5px;">${summary.existingUsers}</div>
                        <div style="font-size: 14px; color: #666;">Existing Users</div>
                    </div>
                </div>
                <div style="display: table-cell; width: 50%; padding-left: 6px; vertical-align: top;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #667eea;">
                        <div style="font-size: 36px; font-weight: bold; color: #667eea; margin-bottom: 5px;">${summary.withResume}</div>
                        <div style="font-size: 14px; color: #666;">With Resume</div>
                    </div>
                </div>
            </div>
            <!-- Row 3: 2 cards -->
            <div style="display: table; width: 100%; table-layout: fixed; margin-bottom: 12px;">
                <div style="display: table-cell; width: 50%; padding-right: 6px; vertical-align: top;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #667eea;">
                        <div style="font-size: 36px; font-weight: bold; color: #667eea; margin-bottom: 5px;">${summary.withOtherDetails}</div>
                        <div style="font-size: 14px; color: #666;">With Details</div>
                    </div>
                </div>
                <div style="display: table-cell; width: 50%; padding-left: 6px; vertical-align: top;">
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
                        <div style="font-size: 36px; font-weight: bold; margin-bottom: 5px;">${summary.completedProfiles}</div>
                        <div style="font-size: 14px; opacity: 0.95;">Completed Profiles</div>
                    </div>
                </div>
            </div>
            <!-- Row 4: 1 card full width -->
            <div style="width: 100%;">
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
                    <div style="font-size: 36px; font-weight: bold; margin-bottom: 5px;">${summary.completionRate}%</div>
                    <div style="font-size: 14px; opacity: 0.95;">Completion Rate</div>
                </div>
            </div>
        </div>
    `;

    // Build by redirect cards HTML - one card per redirect URL, with internal stat cards 2 per row
    let byRedirectHTML = '';
    if (byRedirect.length > 0) {
        const redirectCards = byRedirect.map(group => {
            // Create array of stat items
            const statItems = [
                { value: group.count, label: 'Total', color: '#667eea', bg: '#f0f0f0' },
                { value: group.newUsers, label: 'New', color: '#f57c00', bg: '#fff3e0' },
                { value: group.existingUsers, label: 'Existing', color: '#1976d2', bg: '#e3f2fd' },
                { value: group.withResume, label: 'Resume', color: '#388e3c', bg: '#e8f5e9' },
                { value: group.withOtherDetails, label: 'Details', color: '#7b1fa2', bg: '#f3e5f5' },
                { value: group.completedProfiles, label: 'Completed', color: '#00796b', bg: '#e0f2f1' },
            ];

            // Group stats into rows of 2, with last one full width if odd
            const statRows = [];
            for (let i = 0; i < statItems.length; i += 2) {
                const row = statItems.slice(i, i + 2);
                statRows.push(row);
            }

            const statCardsHTML = statRows.map((row, rowIndex) => {
                if (row.length === 2) {
                    // Two cards in a row
                    return `
                        <div style="display: table; width: 100%; table-layout: fixed; margin-bottom: 8px;">
                            <div style="display: table-cell; width: 50%; padding-right: 6px; vertical-align: top;">
                                <div style="padding: 12px; background: ${row[0].bg}; border-radius: 8px; text-align: center;">
                                    <div style="font-weight: 700; color: ${row[0].color}; font-size: 22px; margin-bottom: 4px;">${row[0].value}</div>
                                    <div style="color: #666; font-size: 13px;">${row[0].label}</div>
                                </div>
                            </div>
                            <div style="display: table-cell; width: 50%; padding-left: 6px; vertical-align: top;">
                                <div style="padding: 12px; background: ${row[1].bg}; border-radius: 8px; text-align: center;">
                                    <div style="font-weight: 700; color: ${row[1].color}; font-size: 22px; margin-bottom: 4px;">${row[1].value}</div>
                                    <div style="color: #666; font-size: 13px;">${row[1].label}</div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    // Single card full width (last one)
                    return `
                        <div style="width: 100%;">
                            <div style="padding: 12px; background: ${row[0].bg}; border-radius: 8px; text-align: center;">
                                <div style="font-weight: 700; color: ${row[0].color}; font-size: 22px; margin-bottom: 4px;">${row[0].value}</div>
                                <div style="color: #666; font-size: 13px;">${row[0].label}</div>
                            </div>
                        </div>
                    `;
                }
            }).join('');

            return `
                <div style="background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 18px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="font-weight: 600; color: #333; font-size: 16px; margin-bottom: 15px; word-break: break-word; line-height: 1.4;">${group.redirectTo}</div>
                    ${statCardsHTML}
                </div>
            `;
        }).join('');

        byRedirectHTML = `
            <div style="margin-top: 25px;">
                <h2 style="color: #333; font-size: 20px; margin-bottom: 15px; font-weight: 600;">Statistics by Redirect URL</h2>
                ${redirectCards}
            </div>
        `;
    }

    // Build today's individual stats cards HTML
    let individualStatsHTML = '';
    if (todayStats.length > 0) {
        const individualCards = todayStats.map(stat => `
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                    <div style="flex: 1; min-width: 150px;">
                        <div style="font-weight: 600; color: #333; font-size: 16px; margin-bottom: 5px;">${stat.userName}</div>
                        <div style="color: #666; font-size: 13px; word-break: break-word;">${stat.userEmail}</div>
                    </div>
                    <div style="font-size: 12px; color: #999;">${formatDateForDisplay(stat.createdAt)}</div>
                </div>
                <div style="font-size: 14px; color: #666; margin-bottom: 10px; word-break: break-word; line-height: 1.5;">
                    <strong>Redirect:</strong> ${stat.redirectTo}
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    <span style="display: inline-block; padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: 600; 
                        ${stat.alreadyHadAccount ? 'background: #e3f2fd; color: #1976d2;' : 'background: #fff3e0; color: #f57c00;'}">
                        ${stat.alreadyHadAccount ? 'Existing User' : 'New User'}
                    </span>
                    <span style="display: inline-block; padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: 600; 
                        ${stat.isResumeSaved ? 'background: #e8f5e9; color: #388e3c;' : 'background: #ffebee; color: #c62828;'}">
                        Resume: ${stat.isResumeSaved ? 'Yes' : 'No'}
                    </span>
                    <span style="display: inline-block; padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: 600; 
                        ${stat.isOtherDetailsFilled ? 'background: #e8f5e9; color: #388e3c;' : 'background: #ffebee; color: #c62828;'}">
                        Details: ${stat.isOtherDetailsFilled ? 'Yes' : 'No'}
                    </span>
                </div>
            </div>
        `).join('');

        individualStatsHTML = `
            <div style="margin-top: 25px;">
                <h2 style="color: #333; font-size: 20px; margin-bottom: 15px; font-weight: 600;">Individual Referral Records (${todayDateDisplay})</h2>
                ${individualCards}
            </div>
        `;
    } else {
        individualStatsHTML = `
            <div style="margin-top: 25px; padding: 25px; background: #f8f9fa; border-radius: 10px; text-align: center;">
                <p style="color: #666; font-size: 15px; margin: 0;">No referral records found for ${todayDateDisplay}</p>
            </div>
        `;
    }

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Referral Statistics Report</title>
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 100%; margin: 0; padding: 0; background: #f5f5f5;">
            <div style="max-width: 800px; margin: 0 auto; background: white; padding: 25px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0; margin: -25px -25px 25px -25px;">
                    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 600;">📊 Referral Statistics Report</h1>
                    <p style="color: white; margin: 10px 0 0 0; opacity: 0.95; font-size: 15px;">${todayDateDisplay}</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 25px; border-radius: 0 0 10px 10px;">
                    ${summaryCardsHTML}
                    ${byRedirectHTML}
                    ${individualStatsHTML}
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center;">
                        <p style="color: #999; font-size: 13px; margin: 0;">
                            Automated report by Atract platform
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
}

module.exports = {
    sendReferralStatsEmail,
};

