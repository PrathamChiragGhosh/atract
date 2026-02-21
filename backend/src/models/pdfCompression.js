const mongoose = require("mongoose");

const pdfCompressionSchema = new mongoose.Schema({
  originalFilename: {
    type: String,
    required: true,
  },
  originalPath: {
    type: String,
    required: true,
  },
  originalSize: {
    type: Number,
    required: true,
  },
  compressedFilename: {
    type: String,
  },
  compressedPath: {
    type: String,
  },
  compressedSize: {
    type: Number,
  },
  compressionType: {
    type: String,
    enum: ['fileSize'],
    required: true,
  },
  compressionSettings: {
    targetSize: {
      value: Number,
      unit: {
        type: String,
        enum: ['B', 'KB', 'MB', 'GB'],
      },
    },
  },
  compressionRatio: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  error: {
    type: String,
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
pdfCompressionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PdfCompression', pdfCompressionSchema);

