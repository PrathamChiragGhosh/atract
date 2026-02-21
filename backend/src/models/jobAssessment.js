const mongoose = require('mongoose');

const basicQuestionSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true
    },
    prompt: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: null
    },
    expectation: {
        type: String,
        default: null
    },
    context: {
        type: String,
        default: null
    }
}, { _id: false });

const basicResponseSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true
    },
    answerText: {
        type: String,
        default: ''
    },
    answeredAt: {
        type: Date,
        default: null
    }
}, { _id: false });

const mcqQuestionSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true
    },
    prompt: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        default: null
    },
    skillFocus: {
        type: String,
        default: null
    },
    difficulty: {
        type: String,
        enum: ['introductory', 'moderate', 'advanced'],
        default: 'moderate'
    },
    experienceAlignment: {
        type: String,
        default: null
    },
    options: {
        type: [String],
        validate: {
            validator: function (value) {
                return Array.isArray(value) && value.length === 4;
            },
            message: 'Each MCQ must have exactly 4 options'
        }
    },
    correctOption: {
        type: Number,
        min: 0,
        max: 3,
        required: true
    },
    rationale: {
        type: String,
        default: null
    },
    selectedOption: {
        type: Number,
        min: 0,
        max: 3,
        default: null
    },
    isMarked: {
        type: Boolean,
        default: false
    },
    answeredAt: {
        type: Date,
        default: null
    },
    scoreAwarded: {
        type: Number,
        default: 0
    }
}, { _id: false });

const attemptSchema = new mongoose.Schema({
    attemptId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    attemptNumber: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['in-progress', 'submitted', 'passed', 'failed', 'invalidated'],
        default: 'in-progress'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    },
    jobSnapshotVersion: {
        type: Date,
        default: null
    },
    jobDetailsChanged: {
        type: Boolean,
        default: false
    },
    generationMeta: {
        provider: {
            type: String,
            default: 'together-ai'
        },
        model: {
            type: String,
            default: null
        },
        latencyMs: {
            type: Number,
            default: null
        }
    },
    score: {
        type: Number,
        default: 0
    },
    remarks: {
        type: String,
        default: null
    },
    weakAreas: {
        type: [String],
        default: []
    },
    readinessReview: {
        summary: { type: String, default: null },
        fitVerdict: { type: String, default: null },
        highlights: { type: [String], default: [] },
        concerns: { type: [String], default: [] },
        recommendations: { type: [String], default: [] },
        historicalInsights: { type: [String], default: [] },
        inconsistencies: {
            type: [
                {
                    topic: String,
                    description: String,
                    severity: {
                        type: String,
                        enum: ['info', 'warning', 'critical', 'none'],
                        default: 'info'
                    }
                }
            ],
            default: []
        },
        generatedAt: { type: Date, default: null }
    },
    readinessReviewStatus: {
        type: String,
        enum: ['pending', 'generated', 'failed', 'skipped'],
        default: 'pending'
    },
    readinessReviewEmailStatus: {
        type: String,
        enum: ['pending', 'sent', 'skipped', 'failed'],
        default: 'pending'
    },
    readinessReviewError: {
        type: String,
        default: null
    },
    integrity: {
        copyEvents: { type: Number, default: 0 },
        pasteEvents: { type: Number, default: 0 },
        tabBlurEvents: { type: Number, default: 0 },
        resumeCount: { type: Number, default: 0 },
        totalFocusedMs: { type: Number, default: 0 },
        totalSessions: { type: Number, default: 0 },
        focusSessions: {
            type: [
                {
                    startedAt: { type: Date, required: true },
                    endedAt: { type: Date, default: null }
                }
            ],
            default: []
        }
    },
    mcqQuestions: {
        type: [mcqQuestionSchema],
        default: []
    },
    basicResponses: {
        type: [basicResponseSchema],
        default: []
    }
}, { _id: false });

const jobAssessmentSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    jobSeeker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobSeeker',
        required: true
    },
    basicQuestions: {
        type: [basicQuestionSchema],
        default: []
    },
    status: {
        type: String,
        enum: ['not-started', 'in-progress', 'passed', 'failed'],
        default: 'not-started'
    },
    jobVersionForQuestions: {
        type: Date,
        default: null
    },
    jobVersionRequiresRefresh: {
        type: Boolean,
        default: false
    },
    latestAttemptNumber: {
        type: Number,
        default: 0
    },
    attempts: {
        type: [attemptSchema],
        default: []
    },
    retestAmountPaid: {
        type: Boolean,
        default: false
    },
    lastInteractionAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

jobAssessmentSchema.index({ job: 1, jobSeeker: 1 }, { unique: true });

const JobAssessment = mongoose.model('JobAssessment', jobAssessmentSchema);

module.exports = JobAssessment;

