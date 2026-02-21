const express = require('express');
const {
  getReferralStats,
  getReferralStatsAccess,
} = require('../controllers/referralStatsController.js');
const verifyToken = require('../middleware/authMiddleware.js');
const checkReferralStatsAccess = require('../middleware/referralStatsAuthMiddleware.js');

const router = express.Router();

// GET /api/referral-stats - Get all referral statistics
router.get('/', verifyToken, checkReferralStatsAccess, getReferralStats);

// GET /api/referral-stats/access - Get allowed emails (for frontend access check)
router.get('/access', verifyToken, checkReferralStatsAccess, getReferralStatsAccess);

module.exports = router;

