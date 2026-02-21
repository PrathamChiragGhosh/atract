const BlogComment = require('../models/BlogComment.js');
const Blog = require('../models/Blog.js');

// @desc    Create a comment
// @route   POST /api/blogs/:slug/comments
// @access  Public
const createComment = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { name, email, emailConfirmed, comment, commentorType, jobSeekerId, employerId } = req.body;

    // Validate blog exists
    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Validate required fields
    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment is required',
      });
    }

    // Validate commentorType
    const validCommentorTypes = ['jobseeker', 'employer', 'anonymous', 'partial'];
    if (!commentorType || !validCommentorTypes.includes(commentorType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid commentor type',
      });
    }

    // Validate email format if provided
    let emailValue = null;
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
      }
      emailValue = email.trim().toLowerCase();
    }

    // Create comment
    const newComment = await BlogComment.create({
      blogId: blog._id,
      blogSlug: slug,
      name: name && name.trim() ? name.trim() : 'Anonymous',
      email: emailValue,
      emailConfirmed: emailValue ? (emailConfirmed === true) : false,
      commentorType,
      jobSeekerId: jobSeekerId || null,
      employerId: employerId || null,
      comment: comment.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: {
        _id: newComment._id,
        name: newComment.name,
        comment: newComment.comment,
        createdAt: newComment.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comments for a blog (infinite scroll)
// @route   GET /api/blogs/:slug/comments
// @access  Public
const getComments = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const lastCommentId = req.query.lastId;

    // Validate blog exists
    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Build query for infinite scroll
    let query = {
      blogSlug: slug,
      isApproved: true,
    };

    // If lastId is provided, fetch comments after that ID
    if (lastCommentId) {
      try {
        const lastComment = await BlogComment.findById(lastCommentId);
        if (lastComment) {
          query.createdAt = { $lt: lastComment.createdAt };
        }
      } catch (error) {
        // Invalid lastId, ignore it
      }
    }

    // Fetch comments
    const comments = await BlogComment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1) // Fetch one extra to check if there are more
      .select('name comment createdAt')
      .lean();

    // Check if there are more comments
    const hasMore = comments.length > limit;
    if (hasMore) {
      comments.pop(); // Remove the extra comment
    }

    // Get total count (optional, for display purposes)
    const totalCount = await BlogComment.countDocuments({
      blogSlug: slug,
      isApproved: true,
    });

    res.status(200).json({
      success: true,
      comments,
      hasMore,
      totalCount,
      lastId: comments.length > 0 ? comments[comments.length - 1]._id.toString() : null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComment,
  getComments,
};

