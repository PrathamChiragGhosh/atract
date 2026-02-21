const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    companyName: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Please provide a valid email address'
        }
    },

    mobileNumber: {
        type: String,
        trim: true,
        sparse: true,
        unique: true
    },

    address: {
        type: String,
        trim: true
    },

    city: {
        type: String,
        trim: true
    },

    state: {
        type: String,
        trim: true
    },

    pincode: {
        type: String,
        trim: true
    },

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

    notes: {
        type: String,
        trim: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }

}, { timestamps: true });

// Indexes
clientSchema.index({ email: 1 });
clientSchema.index({ mobileNumber: 1 }, { sparse: true, unique: true });
clientSchema.index({ status: 1 });
clientSchema.index({ createdAt: -1 });

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;

