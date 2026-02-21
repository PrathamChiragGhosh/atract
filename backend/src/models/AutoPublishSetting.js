const mongoose = require('mongoose');

const autoPublishSettingSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    time: { type: String, default: '09:00' }, // HH:mm
    extraKeywords: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AutoPublishSetting', autoPublishSettingSchema);

