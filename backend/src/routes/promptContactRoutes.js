const express = require('express');
const { submitPromptContactForm } = require('../controllers/promptContactController.js');

const router = express.Router();

// Prompt engineering contact form submission
router.post('/submit', submitPromptContactForm);

module.exports = router;
