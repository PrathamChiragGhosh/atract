const mongoose = require('mongoose');

const employerSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    mobileNumber: {
        type: String,
        trim: true
    },

    gender: {
        type: String,
        enum: ["male", "female", "other"],
    },

    address: {
        type: String,
        trim: true
    },

    gstNumber: {
        type: String,
        trim: true,
        uppercase: true
    },

    // Company Details
    companyName: {
        type: String,
        required: true,
        trim: true
    },

    companyAddress: {
        type: String,
        trim: true
    },

    companyWebsite: {
        type: String,
        trim: true
    },

    companyDescription: {
        type: String,
        trim: true
    },

    industryType: {
        type: String,
        trim: true
    },

    companySize: {
        type: String,
        enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
    },

    yearEstablished: {
        type: Number,
        min: 1800,
        max: new Date().getFullYear()
    },

    companyLogo: {
        type: String, // Base64 or URL
        default: null
    },

    profilePicture: {
        type: String, // Base64 or URL
        default: null
    },

    notificationPreferences: {
        notifyApplicationsWithoutTest: {
            type: Boolean,
            default: true
        },
        notifyBasicTestCompletion: {
            type: Boolean,
            default: true
        }
    },

    emailAlertOnLogin: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

// ==================== INDEXES ====================

// Index for email lookup (already unique)
employerSchema.index({ email: 1 }, { unique: true });

// Index for company name search
employerSchema.index({ companyName: 1 });

// Index for industry type queries
employerSchema.index({ industryType: 1 });

// Index for company size queries
employerSchema.index({ companySize: 1 });

// Index for date-based queries
employerSchema.index({ createdAt: -1 });

// Compound index for company search
employerSchema.index({ companyName: 1, industryType: 1 });

const Employer = mongoose.model('Employer', employerSchema);

module.exports = Employer;

