const Employer = require('../models/employer.js');

/**
 * Middleware to check if employer email is in allowed list for referral stats
 * Must be used after verifyToken middleware
 */
const checkReferralStatsAccess = async (req, res, next) => {
  try {
    // Get allowed emails from env
    const allowedEmails = process.env.REFERRAL_STATS_EMAILS 
      ? process.env.REFERRAL_STATS_EMAILS.split(',').map(email => email.trim().toLowerCase()).filter(email => email.length > 0)
      : [];

    // If no allowed emails configured, deny access
    if (allowedEmails.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Referral stats access is not configured',
      });
    }

    // Get employer from database
    const employer = await Employer.findById(req.userId).select('email');
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found',
      });
    }

    // Check if employer email is in allowed list
    const employerEmail = employer.email?.toLowerCase();
    if (!allowedEmails.includes(employerEmail)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to access referral stats.',
      });
    }

    // Access granted
    next();
  } catch (error) {
    console.error('Error checking referral stats access:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = checkReferralStatsAccess;

