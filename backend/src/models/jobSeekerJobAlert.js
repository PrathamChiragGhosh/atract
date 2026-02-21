const mongoose = require('mongoose');

const jobSeekerJobAlertSchema = new mongoose.Schema({
    jobSeekerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobSeeker',
        required: true
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    matchScore: {
        type: Number,
        required: true
    },
    sentAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    alertType: {
        type: String,
        enum: ['instant', 'scheduled'],
        required: true
    },
    intervalDay: {
        type: Number,
        required: true,
        default: 1
    }
}, {
    timestamps: true
});

// Compound index to ensure one alert per job-seeker combination per interval day
jobSeekerJobAlertSchema.index({ jobSeekerId: 1, jobId: 1, intervalDay: 1 }, { unique: true });

// Index for efficient queries
jobSeekerJobAlertSchema.index({ jobSeekerId: 1, jobId: 1 });
jobSeekerJobAlertSchema.index({ jobId: 1 });
jobSeekerJobAlertSchema.index({ sentAt: 1 });

const JobSeekerJobAlert = mongoose.model('JobSeekerJobAlert', jobSeekerJobAlertSchema);

module.exports = JobSeekerJobAlert;

