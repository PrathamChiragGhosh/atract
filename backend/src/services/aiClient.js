const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateMockBlog } = require('../utils/mockBlogGenerator.js');

// Get Gemini API key and model from environment (optional)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.BLOG_GEMINI_MODEL || 'gemini-1.5-flash';

// Initialize Gemini client only if API key exists
let genAI = null;
if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (error) {
    console.log('Gemini client initialization skipped:', error.message);
  }
}

/**
 * Generate blog content using Gemini AI
 * Falls back to mock generator if AI fails for any reason
 * 
 * @param {string} topic - The blog topic
 * @returns {Promise<{title: string, slug: string, topic: string, content: string, status: string}>}
 */
const generateBlogWithAI = async (topic) => {
  // If no API key, immediately fall back to mock
  if (!GEMINI_API_KEY || !genAI) {
    console.log('Gemini API key not configured, using mock generator');
    return generateMockBlog(topic);
  }

  try {
    // Get the generative model from environment variable
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    // Construct SEO-friendly prompt for recruitment platform
    const selectedTopic = topic && topic.trim().length > 0 
      ? topic.trim() 
      : 'Career Development';

    const prompt = `You are writing a professional blog post for a recruitment and job portal platform like Atract.

Topic: ${selectedTopic}

Requirements:
- Target audience: Job seekers and employers
- Tone: Professional, helpful, clear, and engaging
- Length: 700-900 words
- Format: Clean HTML with <h2> for main sections and <h3> for subsections, <p> for paragraphs
- Content: SEO-friendly, valuable insights, practical advice
- Structure: Introduction, key concepts, best practices, real-world applications, future outlook, conclusion

Generate a comprehensive blog post that helps job seekers understand ${selectedTopic} or helps employers leverage ${selectedTopic} in their hiring and talent management strategies.

Output ONLY the HTML content, starting with an <h2> heading. Do not include a title in the HTML - just the content body.`;

    // Generate content with timeout
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout')), 30000)
      )
    ]);

    const response = await result.response;
    let aiContent = response.text();

    // Clean and validate the content
    aiContent = aiContent.trim();
    
    // Remove markdown code blocks if present
    aiContent = aiContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    
    // Ensure we have valid HTML
    if (!aiContent || aiContent.length < 100) {
      throw new Error('AI generated content too short');
    }

    // Generate SEO-friendly title
    const title = `${selectedTopic}: Essential Guide for Job Seekers and Employers`;
    
    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Ensure content has proper HTML structure
    if (!aiContent.includes('<h2>') && !aiContent.includes('<h3>')) {
      // Wrap in paragraph if no headings
      aiContent = `<h2>Introduction to ${selectedTopic}</h2>\n<p>${aiContent}</p>`;
    }

    console.log(`Successfully generated blog with Gemini AI for topic: ${selectedTopic}`);

    return {
      title,
      slug,
      topic: selectedTopic,
      content: aiContent,
      status: 'published',
    };

  } catch (error) {
    // Log error internally but don't throw
    console.log(`Gemini AI generation failed for topic "${topic}":`, error.message);
    console.log('Falling back to mock generator');
    
    // Always fall back to mock - never fail
    return generateMockBlog(topic);
  }
};

module.exports = {
  generateBlogWithAI,
};
