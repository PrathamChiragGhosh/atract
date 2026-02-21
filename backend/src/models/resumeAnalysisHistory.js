const mongoose = require('mongoose');

const resumeAnalysisHistorySchema = new mongoose.Schema({
    analysisId: {
        type: String,
        required: true,
        unique: true
    },
    employerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Employer'
    },
    jobDescription: {
        type: String,
        default: null
    },
    topN: {
        type: Number,
        default: null
    },
    totalResumes: {
        type: Number,
        required: true
    },
    analysesData: {
        type: mongoose.Schema.Types.Mixed, // JSONB equivalent
        required: true
    },
    topResumesData: {
        type: mongoose.Schema.Types.Mixed, // JSONB equivalent
        default: null
    },
    analyzeRemaining: {
        type: Number,
        default: null
    }
}, { 
    timestamps: true // This creates createdAt and updatedAt automatically
});

// Indexes for faster queries
resumeAnalysisHistorySchema.index({ employerId: 1, createdAt: -1 });
resumeAnalysisHistorySchema.index({ analysisId: 1 });

const ResumeAnalysisHistory = mongoose.model('ResumeAnalysisHistory', resumeAnalysisHistorySchema);

module.exports = ResumeAnalysisHistory;

