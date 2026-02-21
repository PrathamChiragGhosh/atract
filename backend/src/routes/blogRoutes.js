const express = require('express');
const {
  generateBlogs,
  getBlogs,
  getBlogBySlug,
  getSeoBlogs,
} = require('../controllers/blogController.js');
const {
  createComment,
  getComments,
} = require('../controllers/blogCommentController.js');
const {
  trackBlogView,
  getBlogViewCount,
} = require('../controllers/blogViewController.js');

const router = express.Router();

router.post('/generate', generateBlogs);
router.get('/', getBlogs);
router.get('/seo/list', getSeoBlogs);
router.get('/:slug', getBlogBySlug);

// Comment routes
router.post('/:slug/comments', createComment);
router.get('/:slug/comments', getComments);

// View tracking routes
router.post('/:slug/view', trackBlogView);
router.get('/:slug/views', getBlogViewCount);

module.exports = router;

