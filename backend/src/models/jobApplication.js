const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    label: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    source: {
        type: String,
        enum: ['system', 'jobseeker', 'employer'],
        default: 'system'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    meta: {
        type: Object,
        default: {}
    }
}, { _id: false });

const applicantSnapshotSchema = new mongoose.Schema({
    fullName: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    experienceInYears: {
        type: Number,
        default: null
    },
    highestQualification: {
        type: String,
        default: ''
    },
    skills: {
        type: [String],
        default: []
    },
    resume: {
        type: String,
        default: null
    }
}, { _id: false });

const applicantEntrySchema = new mongoose.Schema({
    jobSeeker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobSeeker',
        required: true
    },
    submissionType: {
        type: String,
        enum: ['direct', 'basic-test', 'video-test', 'basic+video'],
        default: 'direct'
    },
    hasBasicTest: {
        type: Boolean,
        default: false
    },
    hasVideoTest: {
        type: Boolean,
        default: false
    },
    basicAssessmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobAssessment',
        default: null
    },
    videoAssessmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VideoProctoringAssessment',
        default: null
    },
    requiresBasicTest: {
        type: Boolean,
        default: false
    },
    requiresVideoProctoredTest: {
        type: Boolean,
        default: false
    },
    profileSnapshot: {
        type: applicantSnapshotSchema,
        default: () => ({})
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'shortlisted', 'rejected'],
        default: 'pending'
    },
    appliedAt: {
        type: Date,
        default: Date.now
    },
    statusTimeline: {
        type: [timelineEventSchema],
        default: () => []
    },
    employerEngagement: {
        viewedAt: {
            type: Date,
            default: null
        },
        resumeDownloadedAt: {
            type: Date,
            default: null
        },
        lastAction: {
            type: String,
            default: null
        }
    },
    lastStatusUpdatedAt: {
        type: Date,
        default: Date.now
    },
    meta: {
        type: Object,
        default: {}
    }
}, { _id: true });

const jobApplicationSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employer',
        required: true
    },
    applicants: {
        type: [applicantEntrySchema],
        default: []
    }
}, { timestamps: true });

jobApplicationSchema.index({ job: 1 }, { unique: true });
jobApplicationSchema.index({ employer: 1 });
jobApplicationSchema.index({ 'applicants.jobSeeker': 1 });

// Additional Performance Indexes
// Index for applicant status queries
jobApplicationSchema.index({ 'applicants.status': 1 });

// Compound index for employer + applicant status
jobApplicationSchema.index({ employer: 1, 'applicants.status': 1 });

// Index for job + applicant status
jobApplicationSchema.index({ job: 1, 'applicants.status': 1 });

// Index for applicant timeline queries
jobApplicationSchema.index({ 'applicants.appliedAt': -1 });

// Index for last status update queries
jobApplicationSchema.index({ 'applicants.lastStatusUpdatedAt': -1 });

// Index for employer engagement tracking
jobApplicationSchema.index({ 'applicants.employerEngagement.viewedAt': 1 });

const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);

module.exports = JobApplication;


