const mongoose = require('mongoose');
const Blog = require('../models/Blog.js');
const { generateBlogWithAI } = require('../services/aiClient.js');

const stripHtml = (html = '') => (typeof html === 'string' ? html : String(html || '')).replace(/<[^>]*>/g, ' ');

const createExcerpt = (html = '', length = 220) => {
  const raw = typeof html === 'string' ? html : String(html || '');
  const text = stripHtml(raw);
  if (text.length <= length) return text.trim();
  return `${text.slice(0, length).trim()}...`;
};

// @desc    Generate blogs
// @route   POST /api/blogs/generate
// @access  Public
const generateBlogs = async (req, res, next) => {
  try {
    const { date, count, topics } = req.body;

    if (!count || count < 1) {
      return res.status(400).json({
        success: false,
        message: 'Count must be a positive number',
      });
    }

    const topicsArray = topics && Array.isArray(topics) 
      ? topics.filter(t => t && t.trim().length > 0)
      : [];

    const generatedBlogs = [];
    const errors = [];

    // Sequential generation - one at a time
    for (let i = 1; i <= count; i++) {
      try {
        // Pick topic for this blog
        const topic = topicsArray.length > 0
          ? topicsArray[(i - 1) % topicsArray.length]
          : null;

        // Generate blog with AI (falls back to mock if AI fails)
        const blogData = await generateBlogWithAI(topic);

        // Ensure unique slug by appending number if needed
        let slug = blogData.slug;
        let slugExists = true;
        let attempt = 0;
        
        while (slugExists && attempt < 10) {
          const existing = await Blog.findOne({ slug });
          if (!existing) {
            slugExists = false;
          } else {
            attempt++;
            slug = `${blogData.slug}-${Date.now()}-${i}`;
          }
        }

        blogData.slug = slug;

        // Create and save blog
        const blog = await Blog.create(blogData);
        generatedBlogs.push(blog);
      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
        });
        // Continue with next blog even if one fails
      }
    }

    res.status(201).json({
      success: true,
      message: `Generated ${generatedBlogs.length} blog(s) successfully`,
      count: generatedBlogs.length,
      blogs: generatedBlogs,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get blogs with excerpt for SEO listing
// @route   GET /api/blogs/seo/list
// @access  Public
const getSeoBlogs = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is not connected. Please try again in a moment.',
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get total count
    const totalCount = await Blog.countDocuments({});

    // Get paginated blogs
    const blogs = await Blog.find({})
      .sort({ createdAt: -1 })
      .select('title topic content createdAt slug status')
      .skip(skip)
      .limit(limit);

    const seoBlogs = blogs.map((blog) => ({
      _id: blog._id,
      title: blog.title,
      topic: blog.topic,
      slug: blog.slug,
      createdAt: blog.createdAt,
      status: blog.status,
      excerpt: createExcerpt(blog.content),
    }));

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      count: seoBlogs.length,
      totalCount,
      page,
      limit,
      totalPages,
      blogs: seoBlogs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = async (req, res, next) => {
  try {
    const blogs = await Blog.find({})
      .sort({ createdAt: -1 })
      .select('-content'); // Exclude full content for list view

    res.status(200).json({
      success: true,
      count: blogs.length,
      blogs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single blog by slug
// @route   GET /api/blogs/:slug
// @access  Public
const getBlogBySlug = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    res.status(200).json({
      success: true,
      blog,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateBlogs,
  getSeoBlogs,
  getBlogs,
  getBlogBySlug,
};
