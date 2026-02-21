const mongoose = require('mongoose');

const voiceAgentSessionSchema = new mongoose.Schema({
    employerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employer',
        required: true
    },
    
    jobDescription: {
        type: String,
        required: true,
        trim: true
    },
    
    status: {
        type: String,
        enum: ['pending', 'analyzing', 'connecting', 'in_progress', 'completed', 'paused', 'cancelled'],
        default: 'pending'
    },
    
    totalCandidates: {
        type: Number,
        default: 0
    },
    
    processedCandidates: {
        type: Number,
        default: 0
    },
    
    currentCandidateIndex: {
        type: Number,
        default: 0
    },
    
    resumes: [{
        resumeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AnalyzedResume'
        },
        candidateName: String,
        phoneNumber: String,
        status: {
            type: String,
            enum: ['pending', 'analyzing', 'ready', 'connecting', 'in_call', 'completed', 'failed'],
            default: 'pending'
        },
        connectionStatus: {
            type: String,
            enum: ['not_connected', 'waiting_for_candidate', 'connected', 'in_conversation', 'ended'],
            default: 'not_connected'
        },
        analyzedAt: Date,
        connectedAt: Date,
        conversationStartedAt: Date,
        conversationEndedAt: Date
    }],
    
    startedAt: Date,
    completedAt: Date,
    
    socketRoomId: {
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true
});

// Indexes
voiceAgentSessionSchema.index({ employerId: 1, createdAt: -1 });
voiceAgentSessionSchema.index({ status: 1 });

const VoiceAgentSession = mongoose.model('VoiceAgentSession', voiceAgentSessionSchema);

module.exports = VoiceAgentSession;

