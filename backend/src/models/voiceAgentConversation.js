const mongoose = require('mongoose');

const conversationMessageSchema = new mongoose.Schema({
    speaker: {
        type: String,
        enum: ['ai', 'candidate'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    audioUrl: {
        type: String // Store audio file path if needed
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const voiceAgentConversationSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VoiceAgentSession',
        required: true
    },
    
    resumeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AnalyzedResume',
        required: true
    },
    
    candidateName: {
        type: String,
        required: true
    },
    
    phoneNumber: {
        type: String,
        required: true
    },
    
    jobDescription: {
        type: String,
        required: true
    },
    
    // Conversation messages
    messages: [conversationMessageSchema],
    
    // Summary of conversation
    summary: {
        type: String
    },
    
    // Candidate responses to key questions
    candidateResponses: {
        type: mongoose.Schema.Types.Mixed
    },
    
    // Overall assessment
    assessment: {
        interested: Boolean,
        available: Boolean,
        salaryExpectation: String,
        noticePeriod: String,
        additionalNotes: String
    },
    
    status: {
        type: String,
        enum: ['initiated', 'in_progress', 'completed', 'failed', 'cancelled'],
        default: 'initiated'
    },
    
    duration: {
        type: Number // Duration in seconds
    },
    
    startedAt: Date,
    endedAt: Date
}, {
    timestamps: true
});

// Indexes
voiceAgentConversationSchema.index({ sessionId: 1, createdAt: -1 });
voiceAgentConversationSchema.index({ resumeId: 1 });
voiceAgentConversationSchema.index({ phoneNumber: 1 });

const VoiceAgentConversation = mongoose.model('VoiceAgentConversation', voiceAgentConversationSchema);

module.exports = VoiceAgentConversation;

