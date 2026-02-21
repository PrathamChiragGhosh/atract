const mongoose = require('mongoose');

const userResumeAnalyzePlanSchema = new mongoose.Schema({
    employerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employer',
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
    analyzeRemaining: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    // Track counts per plan source (e.g., { premium: 10, organization: 50 })
    planCounts: {
        type: Map,
        of: Number,
        default: {}
    },
    // Store the currently active/selected plan for UI features
    activePlanType: {
        type: String,
        enum: ['basic', 'premium', 'organization'],
        default: null
    }
}, { timestamps: true });

const UserResumeAnalyzePlan = mongoose.model('UserResumeAnalyzePlan', userResumeAnalyzePlanSchema);

module.exports = UserResumeAnalyzePlan;

