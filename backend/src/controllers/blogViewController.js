const BlogView = require('../models/BlogView.js');
const Blog = require('../models/Blog.js');

// @desc    Track blog view
// @route   POST /api/blogs/:slug/view
// @access  Public
const trackBlogView = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { viewerType, name, email, jobSeekerId, employerId } = req.body;

    // Validate blog exists
    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Validate viewerType
    const validViewerTypes = ['jobseeker', 'employer', 'anonymous', 'partial'];
    if (!viewerType || !validViewerTypes.includes(viewerType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid viewer type',
      });
    }

    // Check for duplicate view from same logged-in user
    let existingView = null;
    if (viewerType === 'jobseeker' && jobSeekerId) {
      existingView = await BlogView.findOne({
        blogId: blog._id,
        jobSeekerId: jobSeekerId,
      });
    } else if (viewerType === 'employer' && employerId) {
      existingView = await BlogView.findOne({
        blogId: blog._id,
        employerId: employerId,
      });
    }

    // If view already exists for logged-in user, don't create duplicate
    if (existingView) {
      return res.status(200).json({
        success: true,
        message: 'View already tracked',
        viewCount: await BlogView.countDocuments({ blogId: blog._id }),
      });
    }

    // For partial views, check if there's a recent anonymous view for the same blog
    // If found, update it to partial instead of creating a new one
    if (viewerType === 'partial') {
      const recentAnonymousView = await BlogView.findOne({
        blogId: blog._id,
        viewerType: 'anonymous',
        jobSeekerId: null,
        employerId: null,
        // Check for views created in the last 24 hours
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }).sort({ createdAt: -1 }); // Get the most recent one

      if (recentAnonymousView) {
        // Update the anonymous view to partial with name/email
        recentAnonymousView.viewerType = 'partial';
        recentAnonymousView.name = name && name.trim() ? name.trim() : null;
        recentAnonymousView.email = email && email.trim() ? email.trim().toLowerCase() : null;
        await recentAnonymousView.save();

        const viewCount = await BlogView.countDocuments({ blogId: blog._id });
        return res.status(200).json({
          success: true,
          message: 'View updated from anonymous to partial',
          viewCount,
        });
      }
    }

    // Create new view record
    const newView = await BlogView.create({
      blogId: blog._id,
      blogSlug: slug,
      viewerType,
      name: name && name.trim() ? name.trim() : null,
      email: email && email.trim() ? email.trim().toLowerCase() : null,
      jobSeekerId: jobSeekerId || null,
      employerId: employerId || null,
    });

    // Get total view count
    const viewCount = await BlogView.countDocuments({ blogId: blog._id });

    res.status(201).json({
      success: true,
      message: 'View tracked successfully',
      viewCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get blog view count
// @route   GET /api/blogs/:slug/views
// @access  Public
const getBlogViewCount = async (req, res, next) => {
  try {
    const { slug } = req.params;

    // Validate blog exists
    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    const viewCount = await BlogView.countDocuments({ blogId: blog._id });

    res.status(200).json({
      success: true,
      viewCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  trackBlogView,
  getBlogViewCount,
};

