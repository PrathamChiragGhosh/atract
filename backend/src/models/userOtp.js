const mongoose = require('mongoose');

const userOtpSchema = new mongoose.Schema({
    userData: {
        type: String,
        required: true,
        trim: true,
    },
    userOtp: {
        type: Number,
        required: true,
        trim: true,
    }
}, {
    timestamps: true // This adds createdAt and updatedAt fields
});

userOtpSchema.index({ userData: 1 });

const UserOtp = mongoose.model('UserOtp', userOtpSchema);

module.exports = UserOtp;
