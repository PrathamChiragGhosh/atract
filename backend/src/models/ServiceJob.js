const mongoose = require('mongoose');

const serviceJobSchema = new mongoose.Schema({
    jobName: {
        type: String,
        required: true,
        trim: true
    },

    jobRequirements: {
        type: String,
        required: true,
        trim: true
    },

    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },

    location: {
        type: String,
        trim: true
    },

    salary: {
        type: String,
        trim: true
    },

    gender: {
        type: String,
        required: true,
        enum: ['male', 'female', 'both male - female', 'others']
    },

    shiftTimings: {
        type: String,
        trim: true
    },

    workingHours: {
        type: Number,
        min: 0.5,
        max: 24
    },

    shiftStartTime: {
        type: String,
        trim: true
    },

    shiftEndTime: {
        type: String,
        trim: true
    },

    numberOfPositions: {
        type: Number,
        default: 1,
        min: 1
    },

    status: {
        type: String,
        enum: ['open', 'filled', 'closed'],
        default: 'open'
    },

    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },

    age: {
        type: String,
        trim: true
    },

    keySkills: {
        type: [String],
        default: []
    },

    workExperience: {
        type: String,
        trim: true
    },

    noticePeriod: {
        type: String,
        trim: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }

}, { timestamps: true });

// Indexes
serviceJobSchema.index({ clientId: 1 });
serviceJobSchema.index({ status: 1 });
serviceJobSchema.index({ createdAt: -1 });

const ServiceJob = mongoose.model('ServiceJob', serviceJobSchema);

module.exports = ServiceJob;

