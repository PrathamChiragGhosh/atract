const mongoose = require('mongoose');

const jobSeekerResumePlanSchema = new mongoose.Schema({
    jobSeekerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobSeeker',
        required: true,
        unique: true
    },
    planType: {
        type: String,
        required: true,
        enum: ['basic', 'premium', 'organization'],
        default: 'basic'
    },
    paymentIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    }],
    // Store generated resumes as JSON array
    resumes: {
        type: [{
            id: {
                type: String,
                required: true
            },
            title: {
                type: String,
                required: true
            },
            text: {
                type: String,
                required: true
            },
            atsScore: {
                type: Number,
                default: 0
            },
            created_at: {
                type: Date,
                default: Date.now
            },
            type: {
                type: String,
                enum: ['Create', 'Enhance', 'Enhance-JD'],
                default: 'Create'
            }
        }],
        default: []
    },
    // Track counts per plan source (e.g., { premium: 5, organization: 25 })
    planCounts: {
        type: Map,
        of: {
            creations: Number,
            enhancements: Number,
            downloads: Number
        },
        default: {}
    },
    // Store the currently active/selected plan for UI features
    activePlanType: {
        type: String,
        enum: ['basic', 'premium', 'organization'],
        default: null
    }
}, { timestamps: true });

// Indexes
jobSeekerResumePlanSchema.index({ jobSeekerId: 1 });
jobSeekerResumePlanSchema.index({ createdAt: -1 });

const JobSeekerResumePlan = mongoose.model('JobSeekerResumePlan', jobSeekerResumePlanSchema);

module.exports = JobSeekerResumePlan;

