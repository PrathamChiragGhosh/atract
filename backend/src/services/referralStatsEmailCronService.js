const cron = require('node-cron');
const { sendReferralStatsEmail } = require('./referralStatsEmailService');

let currentTasks = [];

/**
 * Convert local time (IST - UTC+5:30) to UTC
 * Same as job alert cron service
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
 * Same as job alert cron service
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
 * Schedule referral stats email cron jobs
 * Creates one cron job for each time in the comma-separated list
 */
function scheduleReferralStatsEmails() {
    // Stop all existing tasks
    currentTasks.forEach(task => {
        if (task && task.stop) {
            task.stop();
        }
    });
    currentTasks = [];

    // Get times from env (comma-separated)
    const timesString = process.env.REFERRAL_STATS_EMAIL_TIMES || '';
    const times = timesString
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0 && /^\d{2}:\d{2}$/.test(t));

    if (times.length === 0) {
        console.log('No valid referral stats email times configured. Cron jobs not scheduled.');
        return;
    }

    // Create a cron job for each time
    times.forEach((time, index) => {
        const cronExpression = buildCronExpression(time);
        const utcTime = convertLocalTimeToUTC(time);

        const task = cron.schedule(cronExpression, () => {
            const now = new Date();
            console.log(`\n=== CRON TRIGGERED: Referral Stats Email Started at ${now.toISOString()} (Scheduled: ${time} IST / ${utcTime} UTC) ===\n`);
            sendReferralStatsEmail().then((result) => {
                if (result.success) {
                    console.log(`\n=== CRON COMPLETED: Referral Stats Email Sent Successfully at ${new Date().toISOString()} ===`);
                    console.log(`Result: ${result.message}\n`);
                } else {
                    console.error(`\n=== CRON COMPLETED WITH ERRORS: Referral Stats Email at ${new Date().toISOString()} ===`);
                    console.error(`Error: ${result.message || result.error || 'Unknown error'}\n`);
                }
            }).catch((error) => {
                console.error(`\n=== CRON ERROR: Referral Stats Email Failed at ${new Date().toISOString()} ===`);
                console.error(error);
                console.log(`\n`);
            });
        });

        currentTasks.push(task);
        console.log(`Referral stats email scheduled at ${time} IST (${utcTime} UTC) (cron: ${cronExpression})`);
    });

    console.log(`Total ${currentTasks.length} referral stats email cron job(s) scheduled.`);
}

/**
 * Initialize referral stats email cron service
 * Should be called on server startup
 */
function initReferralStatsEmailCron() {
    console.log('\n=== Initializing Referral Stats Email Cron Service ===');
    scheduleReferralStatsEmails();
    console.log('=== Referral Stats Email Cron Service Initialized ===\n');
}

/**
 * Refresh/reload cron schedule (useful if env variables change)
 */
function refreshReferralStatsEmailCron() {
    console.log('\n=== Refreshing Referral Stats Email Cron Schedule ===');
    scheduleReferralStatsEmails();
    console.log('=== Referral Stats Email Cron Schedule Refreshed ===\n');
}

module.exports = {
    initReferralStatsEmailCron,
    refreshReferralStatsEmailCron,
    scheduleReferralStatsEmails,
    sendReferralStatsEmail, // Export for manual testing
};

