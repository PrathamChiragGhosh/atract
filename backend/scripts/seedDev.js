// DEV SEED — creates local employer test account
// ONLY RUNS IN DEVELOPMENT ENVIRONMENT

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employer = require('../src/models/employer.js');

// Safety guard: Only run in development
if (process.env.NODE_ENV === 'production') {
    console.error('❌ ERROR: This seed script cannot be run in production!');
    console.error('   This script is only for development/testing purposes.');
    process.exit(1);
}

const DEV_EMPLOYER_EMAIL = 'core.tarun@gmail.com';
const DEV_EMPLOYER_PASSWORD = 'Dev@1234';

async function seedDevEmployer() {
    try {
        console.log('🌱 Starting dev seed process...');

        // Connect to database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database');

        // Check if employer already exists
        const existingEmployer = await Employer.findOne({
            email: DEV_EMPLOYER_EMAIL.toLowerCase()
        });

        if (existingEmployer) {
            console.log(`ℹ️  Employer account already exists: ${DEV_EMPLOYER_EMAIL}`);
            console.log(`   ID: ${existingEmployer._id}`);
            console.log(`   Company: ${existingEmployer.companyName}`);

            // Update password to meet frontend validation requirements
            console.log('🔒 Updating password to meet validation requirements...');
            const hashedPassword = await bcrypt.hash(DEV_EMPLOYER_PASSWORD, 10);
            existingEmployer.password = hashedPassword;
            await existingEmployer.save();

            console.log(`✅ Password updated for existing account: ${DEV_EMPLOYER_EMAIL}`);
            console.log(`   Role: ${existingEmployer.role || 'employer'}`);
            console.log('');
            console.log('🔑 You can now log in with:');
            console.log(`   Email: ${DEV_EMPLOYER_EMAIL}`);
            console.log(`   Password: ${DEV_EMPLOYER_PASSWORD} (8+ chars, meets validation requirements)`);
            return;
        }

        // Hash password (same method as login)
        console.log('🔒 Hashing password...');
        const hashedPassword = await bcrypt.hash(DEV_EMPLOYER_PASSWORD, 10);

        // Create employer account
        console.log('👤 Creating dev employer account...');
        const newEmployer = await Employer.create({
            fullName: 'Dev Test Employer',
            email: DEV_EMPLOYER_EMAIL.toLowerCase(),
            password: hashedPassword,
            companyName: 'Atract Dev Company',
            companyDescription: 'Development testing company for Atract platform',
            industryType: 'Technology',
            companySize: '11-50',
            yearEstablished: 2024,
            mobileNumber: '+91-9999999999',
            address: 'Bangalore, Karnataka, India',
            companyAddress: 'Bangalore, Karnataka, India',
            notificationPreferences: {
                notifyApplicationsWithoutTest: true,
                notifyBasicTestCompletion: true
            },
            emailAlertOnLogin: false
        });

        console.log('✅ Dev employer account created successfully!');
        console.log(`   Email: ${DEV_EMPLOYER_EMAIL}`);
        console.log(`   Password: ${DEV_EMPLOYER_PASSWORD} (8+ chars, meets validation requirements)`);
        console.log(`   ID: ${newEmployer._id}`);
        console.log(`   Company: ${newEmployer.companyName}`);
        console.log(`   Role: employer`);
        console.log('');
        console.log('🔑 You can now log in with:');
        console.log(`   Email: ${DEV_EMPLOYER_EMAIL}`);
        console.log(`   Password: ${DEV_EMPLOYER_PASSWORD}`);

    } catch (error) {
        console.error('❌ Error during dev seed process:', error.message);
        process.exit(1);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run the seed function
seedDevEmployer().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});