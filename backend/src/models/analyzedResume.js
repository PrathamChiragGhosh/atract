const mongoose = require('mongoose');

const analyzedResumeSchema = new mongoose.Schema({
    employerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employer',
        required: true
    },
    
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VoiceAgentSession',
        required: true
    },
    
    originalFileName: {
        type: String,
        required: true
    },
    
    filePath: {
        type: String,
        required: true
    },
    
    // Extracted candidate information
    candidateName: {
        type: String,
        trim: true
    },
    
    phoneNumber: {
        type: String,
        trim: true
    },
    
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    
    experience: {
        type: String,
        trim: true
    },
    
    skills: [{
        type: String,
        trim: true
    }],
    
    education: [{
        degree: String,
        institution: String,
        year: String
    }],
    
    currentCompany: {
        type: String,
        trim: true
    },
    
    currentRole: {
        type: String,
        trim: true
    },
    
    yearsOfExperience: {
        type: Number
    },
    
    // Full extracted data as JSON for flexibility
    extractedData: {
        type: mongoose.Schema.Types.Mixed
    },
    
    analysisStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    
    analysisError: {
        type: String
    },
    
    analyzedAt: Date
}, {
    timestamps: true
});

// Indexes
analyzedResumeSchema.index({ employerId: 1, createdAt: -1 });
analyzedResumeSchema.index({ sessionId: 1 });
analyzedResumeSchema.index({ phoneNumber: 1 });

const AnalyzedResume = mongoose.model('AnalyzedResume', analyzedResumeSchema);

module.exports = AnalyzedResume;

