const mongoose = require('mongoose');

const jobAnalysisSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ["idle", "processing", "retry_scheduled", "completed", "failed", "embedding_only"],
        default: "idle"
    },
    inProgress: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    lastStartedAt: { type: Date, default: null },
    lastCompletedAt: { type: Date, default: null },
    nextRetryAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    provider: { type: String, default: null },
    model: { type: String, default: null },
    embedModel: { type: String, default: null },

    // Parsed details
    jobText: { type: String, default: null },
    summary: { type: String, default: null },
    keySkills: { type: [String], default: [] },
    role: { type: String, default: null },
    seniority: { type: String, default: null },
    minExperience: { type: Number, default: null },
    maxExperience: { type: Number, default: null },
    locations: { type: [String], default: [] },
    salaryRange: { type: String, default: null },
    responsibilities: { type: [String], default: [] },
    requirements: { type: [String], default: [] },

    embedding: { type: [Number], default: [] },
    embeddingOnly: { type: Boolean, default: false }
}, { timestamps: true });

jobAnalysisSchema.index({ jobId: 1, createdAt: -1 });

module.exports = mongoose.model('JobAnalysis', jobAnalysisSchema);

