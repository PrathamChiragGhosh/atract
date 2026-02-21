const mongoose = require('mongoose');

const jobAlertSendLogSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        index: true
    },
    jobSeekerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobSeeker',
        required: true,
        index: true
    },
    sentAt: { type: Date, default: Date.now }
}, { timestamps: true });

jobAlertSendLogSchema.index({ jobId: 1, jobSeekerId: 1, sentAt: -1 });

module.exports = mongoose.model('JobAlertSendLog', jobAlertSendLogSchema);

