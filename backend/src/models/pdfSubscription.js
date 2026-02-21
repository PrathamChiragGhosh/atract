const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PdfUser',
    required: true,
    index: true,
  },
  planType: {
    type: String,
    enum: ['daily', 'monthly', 'yearly'],
    required: true,
  },
  // Total compressions allowed in this subscription
  totalCompressionsAllowed: {
    type: Number,
    required: true,
  },
  // Compressions used in this subscription
  compressionsUsed: {
    type: Number,
    default: 0,
  },
  // Payment amount (in INR)
  amount: {
    type: Number,
    required: true,
  },
  // Payment status
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  // Payment transaction ID (dummy for now)
  transactionId: {
    type: String,
    default: null,
  },
  // Subscription start date
  startDate: {
    type: Date,
    default: Date.now,
  },
  // Subscription end date
  endDate: {
    type: Date,
  },
  // Subscription status
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pre-subscribed', 'completed'],
    default: 'active',
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
subscriptionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if subscription is active and has remaining compressions
subscriptionSchema.methods.canCompress = function () {
  const now = new Date();

  // Check if subscription is active
  if (this.status !== 'active' || this.paymentStatus !== 'completed') {
    return false;
  }

  // Check if subscription has expired
  if (now > this.endDate) {
    return false;
  }

  // Check if compressions are remaining
  return this.compressionsUsed < this.totalCompressionsAllowed;
};

// Method to get remaining compressions
subscriptionSchema.methods.getRemainingCompressions = function () {
  return Math.max(0, this.totalCompressionsAllowed - this.compressionsUsed);
};

// Method to increment compression count
subscriptionSchema.methods.incrementCompression = function () {
  if (this.compressionsUsed < this.totalCompressionsAllowed) {
    this.compressionsUsed += 1;
  }
};

module.exports = mongoose.model('PdfSubscription', subscriptionSchema);

