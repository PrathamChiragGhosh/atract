const express = require('express');
const {
  getBlogPublisherSettings,
  saveBlogPublisherSettings,
  triggerAutoPublish,
} = require('../controllers/blogPublisherController.js');
const verifyToken = require('../middleware/authMiddleware.js');
const checkBlogPublisherAccess = require('../middleware/blogPublisherAuthMiddleware.js');

const router = express.Router();

// GET /api/blog-publisher/settings
router.get('/settings', verifyToken, checkBlogPublisherAccess, getBlogPublisherSettings);

// POST /api/blog-publisher/settings
router.post('/settings', verifyToken, checkBlogPublisherAccess, saveBlogPublisherSettings);

// POST /api/blog-publisher/trigger - Manually trigger auto-publish job (for testing)
router.post('/trigger', verifyToken, checkBlogPublisherAccess, triggerAutoPublish);

module.exports = router;

