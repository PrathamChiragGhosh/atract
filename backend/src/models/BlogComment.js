const mongoose = require('mongoose');

const blogCommentSchema = new mongoose.Schema({
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
  name: {
    type: String,
    default: 'Anonymous',
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 255,
    default: null,
  },
  emailConfirmed: {
    type: Boolean,
    default: false,
  },
  commentorType: {
    type: String,
    enum: ['jobseeker', 'employer', 'anonymous', 'partial'],
    required: true,
    index: true,
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
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  isApproved: {
    type: Boolean,
    default: true, // Auto-approve comments for now
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Index for efficient querying
blogCommentSchema.index({ blogId: 1, createdAt: -1 });
blogCommentSchema.index({ blogSlug: 1, createdAt: -1 });
blogCommentSchema.index({ isApproved: 1, createdAt: -1 });
blogCommentSchema.index({ commentorType: 1 });
blogCommentSchema.index({ blogId: 1, jobSeekerId: 1 }, { sparse: true });
blogCommentSchema.index({ blogId: 1, employerId: 1 }, { sparse: true });

module.exports = mongoose.model('BlogComment', blogCommentSchema);

