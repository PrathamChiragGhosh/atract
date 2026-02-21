const AutoPublishSetting = require('../models/AutoPublishSetting.js');
const { refreshAutoPublishCron, runAutoPublishJobManually } = require('../services/cronService.js');

const DEFAULT_TIME = '09:00';

/**
 * Get blog publisher settings
 * Returns default values if no settings exist in database
 * Always returns valid JSON - never throws
 */
const getBlogPublisherSettings = async (req, res) => {
  try {
    let settings = await AutoPublishSetting.findOne();

    // Get allowed emails from env file (comma-separated)
    const allowedEmails = process.env.BLOG_PUBLISHER_EMAILS 
      ? process.env.BLOG_PUBLISHER_EMAILS.split(',').map(email => email.trim()).filter(email => email.length > 0)
      : [];

    // If no settings exist, return default JSON (don't create in DB yet)
    if (!settings) {
      return res.status(200).json({
        enabled: false,
        time: DEFAULT_TIME,
        keywords: [],
        allowedEmails: allowedEmails,
      });
    }

    // Return existing settings with allowed emails
    res.status(200).json({
      enabled: settings.enabled || false,
      time: settings.time || DEFAULT_TIME,
      keywords: settings.extraKeywords || [],
      allowedEmails: allowedEmails,
    });
  } catch (error) {
    // Fallback: always return valid JSON even on error
    console.error('Error fetching blog publisher settings:', error.message);
    const allowedEmails = process.env.BLOG_PUBLISHER_EMAILS 
      ? process.env.BLOG_PUBLISHER_EMAILS.split(',').map(email => email.trim()).filter(email => email.length > 0)
      : [];
    res.status(200).json({
      enabled: false,
      time: DEFAULT_TIME,
      keywords: [],
      allowedEmails: allowedEmails,
    });
  }
};

/**
 * Save blog publisher settings
 * Creates or updates the single settings document
 * Always returns valid JSON - never throws
 */
const saveBlogPublisherSettings = async (req, res) => {
  try {
    const { enabled, time, keywords } = req.body;

    // Validate and sanitize inputs
    const safeEnabled = typeof enabled === 'boolean' ? enabled : false;
    const safeTime = typeof time === 'string' && /^\d{2}:\d{2}$/.test(time) 
      ? time 
      : DEFAULT_TIME;
    const safeKeywords = Array.isArray(keywords)
      ? keywords.map((k) => k && k.toString().trim()).filter((k) => k.length > 0)
      : [];

    // Find or create settings document
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
    try {
      await refreshAutoPublishCron();
      
      // If enabled and scheduled time has passed today, run immediately
      if (safeEnabled && safeTime) {
        // Get current time in IST (UTC+5:30)
        const now = new Date();
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const istTime = new Date(utcTime + (5.5 * 3600000)); // IST is UTC+5:30
        
        const [hours, minutes] = safeTime.split(':');
        const scheduledHour = parseInt(hours, 10);
        const scheduledMinute = parseInt(minutes, 10);
        const currentHour = istTime.getHours();
        const currentMinute = istTime.getMinutes();
        
        // Check if scheduled time has passed today (IST timezone)
        const timeHasPassed = currentHour > scheduledHour || 
          (currentHour === scheduledHour && currentMinute >= scheduledMinute);
        
        if (timeHasPassed) {
          console.log(`Scheduled time ${safeTime} IST has passed (current: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} IST). Triggering auto-publish immediately...`);
          // Run in background - don't wait for it
          runAutoPublishJobManually().catch(err => {
            console.error('Error running immediate auto-publish:', err.message);
          });
        }
      }
    } catch (cronError) {
      console.error('Error refreshing auto-publish cron:', cronError.message);
      // Continue even if cron refresh fails
    }

    // Return success response
    res.status(200).json({
      success: true,
      enabled: settings.enabled,
      time: settings.time,
      keywords: settings.extraKeywords,
    });
  } catch (error) {
    // Fallback: return error as JSON, never HTML
    console.error('Error saving blog publisher settings:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to save settings',
      enabled: false,
      time: DEFAULT_TIME,
      keywords: [],
    });
  }
};

/**
 * Manually trigger auto-publish job (for testing)
 */
const triggerAutoPublish = async (req, res) => {
  try {
    const result = await runAutoPublishJobManually();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Auto-publish job completed. Generated ${result.generated || 0} blog(s).`,
        generated: result.generated || 0,
        errors: result.errors || [],
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Auto-publish job failed',
        retryScheduled: result.retryScheduled || false,
      });
    }
  } catch (error) {
    console.error('Error triggering auto-publish:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to trigger auto-publish job',
    });
  }
};

module.exports = {
  getBlogPublisherSettings,
  saveBlogPublisherSettings,
  triggerAutoPublish,
};

