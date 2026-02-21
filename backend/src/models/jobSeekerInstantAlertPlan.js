const mongoose = require('mongoose');

const jobSeekerInstantAlertPlanSchema = new mongoose.Schema({
    jobSeekerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobSeeker',
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    paymentDate: { type: Date, required: true },
    sessionId: { type: String, required: true },
    status: {
        type: String,
        enum: ['active', 'pending', 'expired', 'cancelled'],
        default: 'active'
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'inr', uppercase: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobSeekerInstantAlertPayment' }
}, { timestamps: true });

jobSeekerInstantAlertPlanSchema.index({ jobSeekerId: 1, createdAt: -1 });

module.exports = mongoose.model('JobSeekerInstantAlertPlan', jobSeekerInstantAlertPlanSchema);

