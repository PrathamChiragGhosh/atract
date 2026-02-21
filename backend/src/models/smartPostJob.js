const mongoose = require('mongoose');

const smartPostJobSchema = new mongoose.Schema({
    employerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employer',
        required: true
    },
    
    // ========== SMART POST SPECIFIC FIELDS ==========
    // Source data
    sourceType: {
        type: String,
        enum: ['text', 'file'],
        required: true
    },
    
    sourceText: {
        type: String,
        trim: true
    },
    
    sourceFileName: {
        type: String,
        trim: true
    },
    
    sourceFilePath: {
        type: String,
        trim: true
    },
    
    extraPrompt: {
        type: String,
        trim: true
    },
    
    // Smart Post Status
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed', 'posted'],
        default: 'processing'
    },
    
    errorMessage: {
        type: String,
        trim: true
    },
    
    // Reference to posted job if posted
    postedJobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
    },
    
    // ========== ALL JOB SCHEMA FIELDS ==========
    // Basic Information
    jobTitle: {
        type: String,
        trim: true,
        maxlength: 100
    },
    
    companyName: {
        type: String,
        trim: true,
        maxlength: 100
    },
    
    jobType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Internship', 'Freelance', 'Contract', 'Temporary']
    },
    
    department: {
        type: String,
        trim: true,
        maxlength: 100
    },
    
    employmentType: {
        type: String,
        enum: ['Permanent', 'Contract', 'Temporary'],
        default: 'Permanent'
    },
    
    experience: {
        type: String,
        trim: true
    },
    
    workMode: {
        type: String,
        enum: ['Onsite', 'Hybrid', 'Remote']
    },
    
    location: {
        type: String,
        trim: true,
        maxlength: 200
    },
    
    highestQualification: {
        type: String,
        trim: true,
        maxlength: 100
    },
    
    minSalary: {
        type: Number,
        min: 0
    },
    
    maxSalary: {
        type: Number,
        min: 0
    },
    
    numberOfOpenings: {
        type: Number,
        min: 1,
        default: null
    },
    
    applicationOpeningDate: {
        type: Date
    },
    
    applicationClosingDate: {
        type: Date
    },
    
    hiringManagerEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    
    // Detailed Information
    jobDescription: {
        type: String,
        trim: true
    },
    
    responsibilities: {
        type: String,
        trim: true
    },
    
    requirements: {
        type: String,
        trim: true
    },
    
    perksAndBenefits: {
        type: String,
        trim: true
    },
    
    // Assessment Requirements
    requiresBasicTest: {
        type: Boolean,
        default: true
    },
    
    requiresVideoProctoredTest: {
        type: Boolean,
        default: false
    },
    
    skills: {
        type: [String],
        default: []
    },
    
    // Job Status (from Job schema)
    jobStatus: {
        type: String,
        enum: ['Draft', 'Active', 'Inactive', 'Closed'],
        default: 'Draft'
    },
    
    views: {
        type: Number,
        default: 0
    },
    
    applicationsCount: {
        type: Number,
        default: 0
    },
    
    shortId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        maxlength: 7
    },
    
    // Social Share Content
    socialShareContent: {
        type: String,
        trim: true,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
smartPostJobSchema.index({ employerId: 1 });
smartPostJobSchema.index({ status: 1 });
smartPostJobSchema.index({ jobStatus: 1 });
smartPostJobSchema.index({ applicationClosingDate: 1 });
smartPostJobSchema.index({ createdAt: -1 });

const SmartPostJob = mongoose.model('SmartPostJob', smartPostJobSchema);

module.exports = SmartPostJob;

