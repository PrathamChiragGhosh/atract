const mongoose = require('mongoose');

const jobSeekerJobMatchAttemptSchema = new mongoose.Schema({
    jobSeekerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobSeeker',
        required: true,
        index: true
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        index: true
    },
    matchScore: {
        type: Number,
        required: true
    },
    matchedAt: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound unique index to ensure one match attempt per job-seeker combination
jobSeekerJobMatchAttemptSchema.index({ jobSeekerId: 1, jobId: 1 }, { unique: true });

// Index for efficient batch queries
jobSeekerJobMatchAttemptSchema.index({ jobSeekerId: 1, matchedAt: -1 });
jobSeekerJobMatchAttemptSchema.index({ jobId: 1 });

const JobSeekerJobMatchAttempt = mongoose.model('JobSeekerJobMatchAttempt', jobSeekerJobMatchAttemptSchema);

module.exports = JobSeekerJobMatchAttempt;

