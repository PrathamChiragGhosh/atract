const JobSeekerReferralStats = require('../models/jobSeekerReferralStats.js');
const JobSeeker = require('../models/jobSeeker.js');

/**
 * Get all referral stats
 * Returns aggregated statistics and individual records
 */
const getReferralStats = async (req, res) => {
  try {
    // Get all referral stats with populated user data
    const stats = await JobSeekerReferralStats.find({})
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });

    // Calculate aggregated statistics
    const totalReferrals = stats.length;
    const existingUsers = stats.filter(s => s.alreadyHadAccount === true).length;
    const newUsers = stats.filter(s => s.alreadyHadAccount === false).length;
    const withResume = stats.filter(s => s.isResumeSaved === true).length;
    const withOtherDetails = stats.filter(s => s.isOtherDetailsFilled === true).length;
    const completedProfiles = stats.filter(s => s.isResumeSaved === true && s.isOtherDetailsFilled === true).length;

    // Group by redirectTo
    const redirectGroups = {};
    stats.forEach(stat => {
      const redirect = stat.redirectTo || 'Unknown';
      if (!redirectGroups[redirect]) {
        redirectGroups[redirect] = {
          redirectTo: redirect,
          count: 0,
          existingUsers: 0,
          newUsers: 0,
          withResume: 0,
          withOtherDetails: 0,
          completedProfiles: 0,
        };
      }
      redirectGroups[redirect].count++;
      if (stat.alreadyHadAccount) redirectGroups[redirect].existingUsers++;
      else redirectGroups[redirect].newUsers++;
      if (stat.isResumeSaved) redirectGroups[redirect].withResume++;
      if (stat.isOtherDetailsFilled) redirectGroups[redirect].withOtherDetails++;
      if (stat.isResumeSaved && stat.isOtherDetailsFilled) redirectGroups[redirect].completedProfiles++;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalReferrals,
          existingUsers,
          newUsers,
          withResume,
          withOtherDetails,
          completedProfiles,
          completionRate: totalReferrals > 0 ? ((completedProfiles / totalReferrals) * 100).toFixed(2) : 0,
        },
        byRedirect: Object.values(redirectGroups),
        individualStats: stats.map(stat => ({
          _id: stat._id,
          userId: stat.userId?._id,
          userName: stat.userId?.fullName || 'Unknown',
          userEmail: stat.userId?.email || 'Unknown',
          redirectTo: stat.redirectTo,
          alreadyHadAccount: stat.alreadyHadAccount,
          isResumeSaved: stat.isResumeSaved,
          isOtherDetailsFilled: stat.isOtherDetailsFilled,
          createdAt: stat.createdAt,
          updatedAt: stat.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral stats',
    });
  }
};

/**
 * Get allowed emails for referral stats access
 */
const getReferralStatsAccess = async (req, res) => {
  try {
    const allowedEmails = process.env.REFERRAL_STATS_EMAILS 
      ? process.env.REFERRAL_STATS_EMAILS.split(',').map(email => email.trim()).filter(email => email.length > 0)
      : [];

    res.status(200).json({
      success: true,
      allowedEmails,
    });
  } catch (error) {
    console.error('Error fetching referral stats access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch access information',
    });
  }
};

module.exports = {
  getReferralStats,
  getReferralStatsAccess,
};

