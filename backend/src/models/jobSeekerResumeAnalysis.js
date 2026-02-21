const mongoose = require('mongoose');

const jobSeekerResumeAnalysisSchema = new mongoose.Schema({
    jobSeekerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobSeeker',
        required: true
    },
    resumePath: { type: String, required: true },
    status: {
        type: String,
        enum: ["idle", "processing", "retry_scheduled", "completed", "failed", "disabled"],
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
    rawText: { type: String, default: null },
    atsScore: { type: Number, default: null },
    atsInsights: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    mobileNumber: { type: String, default: null },
    gender: { type: String, enum: ["male", "female", "other"], default: null },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, default: null },
    currentLocation: { type: String, default: null },
    highestQualification: { type: String, default: null },
    passoutYear: { type: Number, default: null },
    languages: { type: [{
        language: { type: String, required: true },
        proficiency: { type: String, enum: ["Basic", "Conversational", "Fluent", "Native"], required: true },
        read: { type: Boolean, default: false },
        write: { type: Boolean, default: false },
        speak: { type: Boolean, default: false }
    }], default: [] },
    linkedinUrl: { type: String, default: null },
    githubUrl: { type: String, default: null },
    experienceYears: { type: Number, default: null },
    jobTitles: { type: [String], default: [] },
    education: { type: String, default: null },
    certifications: { type: [String], default: [] },
    projects: { type: [String], default: [] },
    preferredLocation: { type: String, default: null },
    summary: { type: String, default: null },
    aboutMe: { type: String, default: null },
    weaknesses: { type: [String], default: [] },
    fileUrl: { type: String, default: null },
    embedding: { type: [Number], default: [] },
}, { timestamps: true });

jobSeekerResumeAnalysisSchema.index({ jobSeekerId: 1, createdAt: -1 });
jobSeekerResumeAnalysisSchema.index({ jobSeekerId: 1, resumePath: 1 });

module.exports = mongoose.model('JobSeekerResumeAnalysis', jobSeekerResumeAnalysisSchema);

