const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['pending', 'passed', 'warning', 'failed'],
        default: 'pending'
    },
    message: {
        type: String,
        default: null
    },
    metrics: {
        type: Object,
        default: {}
    },
    lastRunAt: {
        type: Date,
        default: null
    }
}, { _id: false });

const precheckSchema = new mongoose.Schema({
    completed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date,
        default: null
    },
    summary: {
        type: String,
        default: null
    },
    results: {
        camera: { type: requirementSchema, default: () => ({}) },
        microphone: { type: requirementSchema, default: () => ({}) },
        speakers: { type: requirementSchema, default: () => ({}) },
        browser: { type: requirementSchema, default: () => ({}) },
        os: { type: requirementSchema, default: () => ({}) },
        internet: { type: requirementSchema, default: () => ({}) },
        lighting: { type: requirementSchema, default: () => ({}) },
        faceDetection: { type: requirementSchema, default: () => ({}) },
        backgroundNoise: { type: requirementSchema, default: () => ({}) }
    }
}, { _id: false });

const permissionSchema = new mongoose.Schema({
    camera: { type: Boolean, default: false },
    microphone: { type: Boolean, default: false },
    screen: { type: Boolean, default: false },
    grantedAt: { type: Date, default: null },
    reminders: { type: Number, default: 0 }
}, { _id: false });

const consentSchema = new mongoose.Schema({
    recording: { type: Boolean, default: false },
    integrity: { type: Boolean, default: false },
    acceptedAt: { type: Date, default: null }
}, { _id: false });

const mcqQuestionSchema = new mongoose.Schema({
    questionId: { type: String, required: true },
    prompt: { type: String, required: true },
    summary: { type: String, default: null },
    intent: { type: String, default: null },
    focusArea: { type: String, default: null },
    difficulty: {
        type: String,
        enum: ['introductory', 'moderate', 'advanced'],
        default: 'moderate'
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
    correctOption: { type: Number, min: 0, max: 3, required: true },
    rationale: { type: String, default: null },
    recommendedDurationSec: { type: Number, default: 75 },
    weight: { type: Number, default: 1 },
    selectedOption: { type: Number, min: 0, max: 3, default: null },
    isMarked: { type: Boolean, default: false },
    answeredAt: { type: Date, default: null },
    scoreAwarded: { type: Number, default: 0 }
}, { _id: false });

const eventSchema = new mongoose.Schema({
    eventType: { type: String, required: true },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info'
    },
    note: {
        type: String,
        default: null
    },
    recordedAt: {
        type: Date,
        default: Date.now
    },
    payload: {
        type: Object,
        default: {}
    }
}, { _id: false });

const mediaAssetSchema = new mongoose.Schema({
    assetType: {
        type: String,
        enum: ['snapshot', 'audio'],
        required: true
    },
    storedPath: {
        type: String,
        required: true
    },
    publicUrl: {
        type: String,
        default: null
    },
    capturedAt: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: Object,
        default: {}
    },
    sizeBytes: {
        type: Number,
        default: 0
    }
}, { _id: false });

const videoRecordingSchema = new mongoose.Schema({
    storedPath: { type: String, default: null },
    compressedPath: { type: String, default: null },
    videoUrl: { type: String, default: null },
    sizeBytes: { type: Number, default: 0 },
    compressedSizeBytes: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    codec: { type: String, default: null },
    uploadedAt: { type: Date, default: null }
}, { _id: false });

const aiSummarySchema = new mongoose.Schema({
    summary: { type: String, default: null },
    verdict: {
        type: String,
        enum: ['pass', 'review', 'fail'],
        default: 'review'
    },
    riskScore: { type: Number, default: 50 },
    highlights: { type: [String], default: [] },
    concerns: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    violationsSummary: { type: [String], default: [] },
    generatedAt: { type: Date, default: null },
    generationMeta: {
        provider: { type: String, default: null },
        model: { type: String, default: null },
        latencyMs: { type: Number, default: null }
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
        enum: [
            'pending-generation',
            'awaiting-precheck',
            'ready',
            'in-progress',
            'submitted',
            'flagged',
            'failed',
            'passed'
        ],
        default: 'pending-generation'
    },
    configuration: {
        questionCount: { type: Number, default: 15 },
        countdownSeconds: { type: Number, default: 0 }
    },
    generation: {
        status: {
            type: String,
            enum: ['queued', 'running', 'completed', 'failed'],
            default: 'queued'
        },
        queuedAt: { type: Date, default: Date.now },
        startedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        error: { type: String, default: null }
    },
    mcqQuestions: {
        type: [mcqQuestionSchema],
        default: []
    },
    precheck: {
        type: precheckSchema,
        default: () => ({})
    },
    permissions: {
        type: permissionSchema,
        default: () => ({})
    },
    consents: {
        type: consentSchema,
        default: () => ({})
    },
    session: {
        startedAt: { type: Date, default: null },
        endedAt: { type: Date, default: null },
        countdownStartedAt: { type: Date, default: null },
        countdownEndsAt: { type: Date, default: null },
        fullscreenBreaches: { type: Number, default: 0 },
        tabSwitches: { type: Number, default: 0 },
        copyEvents: { type: Number, default: 0 },
        pasteEvents: { type: Number, default: 0 },
        rightClickEvents: { type: Number, default: 0 },
        devtoolEvents: { type: Number, default: 0 },
        resumeCount: { type: Number, default: 0 },
        backgroundNoiseAlerts: { type: Number, default: 0 },
        suspiciousMovementAlerts: { type: Number, default: 0 },
        randomSnapshotCount: { type: Number, default: 0 },
        randomAudioCount: { type: Number, default: 0 }
    },
    progress: {
        total: { type: Number, default: 0 },
        answered: { type: Number, default: 0 },
        remaining: { type: Number, default: 0 },
        marked: { type: Number, default: 0 }
    },
    events: {
        type: [eventSchema],
        default: []
    },
    violations: {
        type: [eventSchema],
        default: []
    },
    media: {
        snapshots: {
            type: [mediaAssetSchema],
            default: []
        },
        audioSamples: {
            type: [mediaAssetSchema],
            default: []
        },
        recording: {
            type: videoRecordingSchema,
            default: () => ({})
        }
    },
    aiSummary: {
        type: aiSummarySchema,
        default: () => ({})
    },
    finalScore: {
        type: Number,
        default: null
    },
    scoreBreakdown: {
        questionScore: { type: Number, default: 0 },
        violationPenalty: { type: Number, default: 0 }
    },
    hasPassed: {
        type: Boolean,
        default: false
    },
    reportEmailStatus: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'skipped'],
        default: 'pending'
    }
}, { _id: false, timestamps: { createdAt: true, updatedAt: true } });

const videoProctoringAssessmentSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: [
            'not-started',
            'pending-generation',
            'awaiting-precheck',
            'ready',
            'in-progress',
            'submitted',
            'flagged',
            'failed',
            'passed'
        ],
        default: 'not-started'
    },
    latestAttemptNumber: {
        type: Number,
        default: 0
    },
    attempts: {
        type: [attemptSchema],
        default: []
    },
    lastInteractionAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

videoProctoringAssessmentSchema.index({ job: 1, jobSeeker: 1 }, { unique: true });

const VideoProctoringAssessment = mongoose.model('VideoProctoringAssessment', videoProctoringAssessmentSchema);

module.exports = VideoProctoringAssessment;


