const mongoose = require('mongoose');

const jobSeekerSchema = new mongoose.Schema({
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

    dateOfBirth: {
        type: Date
    },

    address: {
        type: String,
        trim: true
    },

    currentLocation: {
        type: String,
        trim: true,
        default: ""
    },

    highestQualification: {
        type: String,
        trim: true
    },

    passoutYear: {
        type: Number,
        min: 1950,
        max: new Date().getFullYear() + 10
    },

    experienceInYears: {
        type: Number,
        min: 0,
        max: 50
    },

    noticePeriod: {
        type: Number,
        min: 0,
        max: 365
    },

    currentCTC: {
        type: Number,
        min: 0
    },

    expectedCTC: {
        type: Number,
        min: 0
    },

    linkedinUrl: {
        type: String,
        trim: true
    },

    githubUrl: {
        type: String,
        trim: true
    },

    skills: {
        type: [String],
        default: []
    },

    languages: {
        type: [{
            language: {
                type: String,
                required: true,
                trim: true
            },
            proficiency: {
                type: String,
                enum: ["Basic", "Conversational", "Fluent", "Native"],
                required: true
            },
            read: {
                type: Boolean,
                default: false
            },
            write: {
                type: Boolean,
                default: false
            },
            speak: {
                type: Boolean,
                default: false
            }
        }],
        default: []
    },

    profilePicture: {
        type: String, // Base64 or URL
        default: null
    },

    resume: {
        type: String, // File path/URL
        default: null
    },

    savedJobIds: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Job',
        default: []
    },

    emailAlertOnLogin: {
        type: Boolean,
        default: false
    },

    jobAlertOnResumeMatch: {
        type: Boolean,
        default: false
    },

    // resume analysis state now lives in JobSeekerResumeAnalysis collection

}, { timestamps: true });

// ==================== INDEXES ====================

// Index for email lookup (already unique)
jobSeekerSchema.index({ email: 1 }, { unique: true });

// Index for job alerts - location + skills search
jobSeekerSchema.index({ currentLocation: 1, skills: 1 });

// Index for candidate filtering - experience + qualification
jobSeekerSchema.index({ experienceInYears: 1, highestQualification: 1 });

// Index for CTC-based searches
jobSeekerSchema.index({ currentCTC: 1, expectedCTC: 1 });

// Index for skills array search (for text search)
jobSeekerSchema.index({ skills: 1 });

// Index for date-based queries
jobSeekerSchema.index({ createdAt: -1 });
jobSeekerSchema.index({ updatedAt: -1 });

// Compound index for job matching
jobSeekerSchema.index({ 
    currentLocation: 1, 
    experienceInYears: 1, 
    highestQualification: 1 
});

const JobSeeker = mongoose.model('JobSeeker', jobSeekerSchema);

module.exports = JobSeeker;
