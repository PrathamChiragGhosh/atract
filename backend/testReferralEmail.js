// Quick test script to send referral stats email immediately
// Run with: node testReferralEmail.js

require('dotenv').config();
const connectDB = require('./src/config/db.js');
const { sendReferralStatsEmail } = require('./src/services/referralStatsEmailService');

console.log('Testing referral stats email...');
console.log('Recipients:', process.env.REFERRAL_STATS_EMAIL_RECIPIENTS);
console.log('Times:', process.env.REFERRAL_STATS_EMAIL_TIMES);
console.log('');

// Connect to database first
connectDB()
    .then(() => {
        console.log('Database connected. Sending email...\n');
        return sendReferralStatsEmail();
    })
    .then((result) => {
        if (result.success) {
            console.log('\n✅ Email sent successfully!');
            console.log('Result:', result.message);
            if (result.results) {
                console.log('Details:', result.results);
            }
        } else {
            console.error('\n❌ Email sending failed!');
            console.error('Error:', result.message || result.error);
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });

