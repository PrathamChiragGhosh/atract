const mongoose = require("mongoose");

const pdfUserSchema = new mongoose.Schema({
  // Email address - primary identifier for users
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address',
    },
  },
  // Daily compression count (resets daily)
  dailyCompressionCount: {
    type: Number,
    default: 0,
  },
  // Last compression date (to reset daily count)
  lastCompressionDate: {
    type: Date,
    default: Date.now,
  },
  // Total compressions used in current subscription
  totalCompressionsUsed: {
    type: Number,
    default: 0,
  },
  // Active subscription ID
  activeSubscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PdfSubscription',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
pdfUserSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if user can compress (free tier: 1 per day)
pdfUserSchema.methods.canCompress = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastDate = new Date(this.lastCompressionDate);
  lastDate.setHours(0, 0, 0, 0);
  
  // If last compression was not today, reset count
  if (lastDate.getTime() !== today.getTime()) {
    this.dailyCompressionCount = 0;
    this.lastCompressionDate = new Date();
  }
  
  // Free tier: 1 compression per day
  if (!this.activeSubscriptionId) {
    return this.dailyCompressionCount < 1;
  }
  
  // For subscribed users, check subscription limits
  return true; // Will be checked in subscription model
};

// Method to increment compression count
pdfUserSchema.methods.incrementCompression = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastDate = new Date(this.lastCompressionDate);
  lastDate.setHours(0, 0, 0, 0);
  
  // If last compression was not today, reset count
  if (lastDate.getTime() !== today.getTime()) {
    this.dailyCompressionCount = 0;
    this.lastCompressionDate = new Date();
  }
  
  this.dailyCompressionCount += 1;
  this.totalCompressionsUsed += 1;
};

module.exports = mongoose.model('PdfUser', pdfUserSchema);

