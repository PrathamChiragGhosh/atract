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

// index for email lookup
// removed duplicate email index (field is already unique)

const JobSeeker = mongoose.model('JobSeeker', jobSeekerSchema);

module.exports = JobSeeker;
