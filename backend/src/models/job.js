const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    employerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employer',
        required: true
    },
    
    // Basic Information
    jobTitle: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    
    companyName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    
    jobType: {
        type: String,
        required: true,
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
        required: true,
        enum: ['Onsite', 'Hybrid', 'Remote']
    },
    
    location: {
        type: String,
        required: true,
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
        type: Date,
        required: true
    },
    
    applicationClosingDate: {
        type: Date,
        required: true
    },
    
    hiringManagerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    
    // Detailed Information
    jobDescription: {
        type: String,
        required: true,
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
    
    status: {
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
    },
    
    // Posting Method
    postingMethod: {
        type: String,
        enum: ['manual', 'smart-post'],
        default: 'manual'
    }
}, {
    timestamps: true
});

// Indexes
jobSchema.index({ employerId: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ applicationClosingDate: 1 });
jobSchema.index({ createdAt: -1 });
// Compound index for job alert queries (status + applicationClosingDate)
jobSchema.index({ status: 1, applicationClosingDate: 1 });

// Additional Performance Indexes
// Index for job search by location
jobSchema.index({ location: 1, status: 1 });

// Index for skills-based job matching
jobSchema.index({ skills: 1 });

// Index for workMode filtering
jobSchema.index({ workMode: 1, status: 1 });

// Index for jobType filtering
jobSchema.index({ jobType: 1, status: 1 });

// Compound index for salary range queries
jobSchema.index({ minSalary: 1, maxSalary: 1, status: 1 });

// Index for shortId lookups (public job access)
jobSchema.index({ shortId: 1 }, { unique: true, sparse: true });

// Index for department-based queries
jobSchema.index({ department: 1, status: 1 });

// Text index for job title search
jobSchema.index({ jobTitle: 'text', companyName: 'text' });

// Compound index for job matching algorithm
jobSchema.index({ 
    status: 1, 
    applicationClosingDate: 1, 
    location: 1,
    workMode: 1 
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;

