const mongoose = require('mongoose');

const blogViewSchema = new mongoose.Schema({
  blogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    required: true,
    index: true,
  },
  blogSlug: {
    type: String,
    required: true,
    index: true,
  },
  viewerType: {
    type: String,
    enum: ['jobseeker', 'employer', 'anonymous', 'partial'],
    required: true,
    index: true,
  },
  name: {
    type: String,
    trim: true,
    maxlength: 100,
    default: null,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 255,
    default: null,
  },
  jobSeekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobSeeker',
    default: null,
    index: true,
  },
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employer',
    default: null,
    index: true,
  },
  viewedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Index for efficient querying
blogViewSchema.index({ blogId: 1, viewedAt: -1 });
blogViewSchema.index({ blogSlug: 1, viewedAt: -1 });
blogViewSchema.index({ viewerType: 1 });

// Compound index to prevent duplicate views from same user
blogViewSchema.index({ blogId: 1, jobSeekerId: 1 }, { sparse: true });
blogViewSchema.index({ blogId: 1, employerId: 1 }, { sparse: true });

module.exports = mongoose.model('BlogView', blogViewSchema);

