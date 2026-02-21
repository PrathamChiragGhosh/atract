const mongoose = require('mongoose');

const jobSeekerInstantAlertPaymentSchema = new mongoose.Schema({
    jobSeekerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobSeeker',
        required: true
    },
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    paymentIntentId: {
        type: String,
        default: null
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'inr',
        uppercase: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    provider: {
        type: String,
        default: 'stripe'
    },
    receiptUrl: {
        type: String,
        default: null
    }
}, { timestamps: true });

jobSeekerInstantAlertPaymentSchema.index({ jobSeekerId: 1, createdAt: -1 });

module.exports = mongoose.model('JobSeekerInstantAlertPayment', jobSeekerInstantAlertPaymentSchema);

