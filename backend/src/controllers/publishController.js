const AutoPublishSetting = require('../models/AutoPublishSetting.js');
const { refreshAutoPublishCron } = require('../services/cronService.js');

const DEFAULT_TIME = '09:00';

const validateTime = (time) => /^\d{2}:\d{2}$/.test(time);

const getPublishSettings = async (req, res, next) => {
  try {
    let settings = await AutoPublishSetting.findOne();
    if (!settings) {
      settings = await AutoPublishSetting.create({
        enabled: false,
        time: DEFAULT_TIME,
        extraKeywords: [],
      });
    }

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

const updatePublishSettings = async (req, res, next) => {
  try {
    const { enabled, time, extraKeywords } = req.body;

    const safeEnabled = typeof enabled === 'boolean' ? enabled : false;
    const safeTime = validateTime(time) ? time : DEFAULT_TIME;
    const safeKeywords = Array.isArray(extraKeywords)
      ? extraKeywords.map((k) => k && k.toString().trim()).filter((k) => k.length > 0)
      : [];

    let settings = await AutoPublishSetting.findOne();
    if (!settings) {
      settings = await AutoPublishSetting.create({
        enabled: safeEnabled,
        time: safeTime,
        extraKeywords: safeKeywords,
      });
    } else {
      settings.enabled = safeEnabled;
      settings.time = safeTime;
      settings.extraKeywords = safeKeywords;
      await settings.save();
    }

    // Refresh cron schedule based on new settings
    await refreshAutoPublishCron();

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublishSettings,
  updatePublishSettings,
};

