const mongoose = require('mongoose');

const jobSeekerReferralStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobSeeker',
      required: true,
      unique: true, // Only one document per user
    },
    redirectTo: {
      type: String,
      required: true,
    },
    alreadyHadAccount: {
      type: Boolean,
      required: true,
      default: false,
    },
    isResumeSaved: {
      type: Boolean,
      default: false,
    },
    isOtherDetailsFilled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for faster lookups
jobSeekerReferralStatsSchema.index({ userId: 1 });

const JobSeekerReferralStats = mongoose.model('JobSeekerReferralStats', jobSeekerReferralStatsSchema);

module.exports = JobSeekerReferralStats;

