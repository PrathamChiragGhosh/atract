const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        required: true,
        enum: ['admin', 'super_admin', 'moderator', 'support'], // Extensible for future roles
        default: 'admin'
    },

    isActive: {
        type: Boolean,
        default: true
    },

    lastLogin: {
        type: Date
    }

}, { timestamps: true });

// removed duplicate email index (field is already unique)
adminSchema.index({ role: 1 });

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;

