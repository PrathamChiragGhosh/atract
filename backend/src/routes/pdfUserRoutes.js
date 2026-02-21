const express = require('express');
const userController = require('../controllers/pdfUserController');

const router = express.Router();

// Routes
router.get('/id', userController.getUserId);
router.post('/google-oauth-callback', userController.googleOAuthCallback);

module.exports = router;

