const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employer',
      default: undefined,
    },

    jobSeekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobSeeker',
      default: undefined,
    },

    planType: {
      type: String,
      required: true,
      enum: ['basic', 'premium', 'organization', 'assessment_retest'],
    },

    // Razorpay fields
    orderId: {
      type: String,
      default: undefined,
    },

    paymentId: {
      type: String,
      default: undefined,
    },

    razorpaySignature: {
      type: String,
      default: undefined,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },

    productType: {
      type: String,
      enum: ['resume_analyzer', 'resume_builder', 'payPerAssessment'],
      default: 'resume_analyzer',
    },
  },
  { timestamps: true }
);

/* ---------------- VALIDATION ---------------- */
paymentSchema.pre('validate', function (next) {
  if (!this.employerId && !this.jobSeekerId) {
    return next(new Error('Either employerId or jobSeekerId must be provided'));
  }

  if (!this.orderId) {
    return next(new Error('orderId (Razorpay) must be provided'));
  }

  next();
});

/* ---------------- INDEXES ---------------- */

// Razorpay order
paymentSchema.index(
  { orderId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      orderId: { $type: 'string' },
    },
  }
);

// Razorpay payment
paymentSchema.index(
  { paymentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      paymentId: { $type: 'string' },
    },
  }
);

paymentSchema.index({ employerId: 1 });
paymentSchema.index({ jobSeekerId: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
