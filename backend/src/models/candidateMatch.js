const mongoose = require('mongoose');

const candidateMatchSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    employerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employer',
        required: true
    },
    totalCandidates: {
        type: Number,
        required: true
    },
    selectedCandidates: {
        type: Number,
        required: true
    },
    filterType: {
        type: String,
        enum: ['percentage', 'number'],
        required: true
    },
    filterValue: {
        type: Number,
        required: true
    },
    candidates: [{
        fileName: String,
        extractedContent: String,
        candidateData: {
            name: String,
            skills: String,
            experience: String,
            location: String,
            qualification: String,
            currentRole: String
        },
        matchScore: Number,
        skillMatch: Number,
        roleRelevance: Number,
        careerProgression: Number,
        overallFit: Number,
        explanation: String,
        shouldReject: Boolean,
        // Store original Excel row data if file was Excel
        originalExcelRow: mongoose.Schema.Types.Mixed,
        originalExcelRowIndex: Number
    }],
    // Store original Excel file structure if uploaded file was Excel
    originalExcelStructure: {
        headers: [String], // Column names
        headerInfo: mongoose.Schema.Types.Mixed, // Header rows like Folder Name, User Id, Download Date
        originalFileType: String // 'xlsx', 'xls', 'pdf', 'doc', etc.
    },
    emailBatches: [{
        batchNumber: Number,
        totalBatches: Number,
        candidates: [{
            candidateData: mongoose.Schema.Types.Mixed,
            matchScore: Number,
            skillMatch: Number,
            roleRelevance: Number,
            careerProgression: Number,
            overallFit: Number,
            explanation: String
        }],
        sendAfter: Date,
        sent: Boolean,
        sentAt: Date
    }],
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'processing'
    },
    error: String
}, {
    timestamps: true
});

module.exports = mongoose.model('CandidateMatch', candidateMatchSchema);

