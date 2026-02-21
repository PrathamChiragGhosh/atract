const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const jwt = require('jsonwebtoken');

class UserController {
  /**
   * Generate or get user ID
   * This endpoint is called when user first visits the site
   */
  async getUserId(req, res) {
    try {
      // If user already has an ID in the request, return it
      const existingUserId = req.headers['x-user-id'] || req.query.userId;
      
      if (existingUserId && existingUserId !== 'undefined' && existingUserId !== 'null') {
        return res.json({
          success: true,
          userId: existingUserId,
        });
      }
      
      // Generate new unique user ID
      const userId = uuidv4();
      
      res.json({
        success: true,
        userId,
        message: 'New user ID generated',
      });
    } catch (error) {
      console.error('Get user ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate user ID',
        error: error.message,
      });
    }
  }

  /**
   * Handle Google OAuth callback
   * Exchange authorization code for access token and get user info
   */
  async googleOAuthCallback(req, res) {
    try {
      const { code, redirectUri } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Authorization code is required',
        });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error('❌ Google OAuth credentials not configured');
        console.error('   GOOGLE_CLIENT_ID:', clientId ? 'Set' : 'NOT SET');
        console.error('   GOOGLE_CLIENT_SECRET:', clientSecret ? 'Set' : 'NOT SET');
        console.error('   All env vars:', Object.keys(process.env).filter(k => k.includes('GOOGLE')));
        return res.status(500).json({
          success: false,
          message: 'Google OAuth is not configured on the server. Please check backend/.env file.',
        });
      }

      // Exchange authorization code for access token
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/compress-pdf/callback`,
        grant_type: 'authorization_code',
      });

      const { access_token, id_token } = tokenResponse.data;

      if (!access_token) {
        return res.status(400).json({
          success: false,
          message: 'Failed to obtain access token',
        });
      }

      // Get user info from Google
      const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const { email, name, picture, verified_email } = userInfoResponse.data;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Failed to get user email from Google',
        });
      }

      // Check if email is verified
      if (!verified_email) {
        return res.status(400).json({
          success: false,
          message: 'Email is not verified by Google',
        });
      }

      // For PDF module, we'll create a simple token without storing in DB
      // You can enhance this later to store user in database if needed
      const pdfToken = jwt.sign(
        { 
          email: email.toLowerCase(), 
          name: name || email.split('@')[0],
          type: 'pdf_user',
          googleVerified: true 
        },
        process.env.JWT_SECRET || 'A123B456cdef1234567',
        { expiresIn: '30d' }
      );

      return res.json({
        success: true,
        token: pdfToken,
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        picture: picture,
        message: 'Google login successful',
      });
    } catch (error) {
      console.error('Google OAuth callback error:', error.response?.data || error.message);
      
      // Handle specific Google OAuth errors
      if (error.response?.status === 400) {
        return res.status(400).json({
          success: false,
          message: error.response?.data?.error_description || 'Invalid authorization code',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to complete Google login',
        error: error.message,
      });
    }
  }
}

module.exports = new UserController();

