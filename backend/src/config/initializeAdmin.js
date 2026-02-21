const Admin = require('../models/admin.js');
const bcrypt = require('bcryptjs');

/**
 * Initialize admin user on server startup
 * Checks if admin user exists, if not creates one from environment variables
 */
const initializeAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminName = process.env.ADMIN_NAME || 'Admin User';

        if (!adminEmail || !adminPassword) {
            console.warn('⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not found in environment variables');
            console.warn('⚠️  Admin user will not be created. Please set these variables to enable admin access.');
            return;
        }

        // Check if admin user already exists
        const existingAdmin = await Admin.findOne({ email: adminEmail.toLowerCase() });

        // Hash password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        if (existingAdmin) {
            // Update password and ensure admin is active
            existingAdmin.password = hashedPassword;
            existingAdmin.fullName = adminName;
            existingAdmin.isActive = true;
            await existingAdmin.save();
            console.log('✅ Admin user updated successfully:', adminEmail);
            console.log('   Role:', existingAdmin.role);
            console.log('   ID:', existingAdmin._id);
            return;
        }

        // Create admin user
        const newAdmin = await Admin.create({
            fullName: adminName,
            email: adminEmail.toLowerCase(),
            password: hashedPassword,
            role: 'admin',
            isActive: true
        });

        console.log('✅ Admin user created successfully:', adminEmail);
        console.log('   Role:', newAdmin.role);
        console.log('   ID:', newAdmin._id);

    } catch (error) {
        console.error('❌ Error initializing admin user:', error.message);
        // Don't exit process, just log the error
    }
};

module.exports = initializeAdmin;

