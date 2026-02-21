const express = require('express');
const { submitContactForm } = require('../controllers/contactController.js');

const router = express.Router();

// Contact form submission
router.post('/submit', submitContactForm);

module.exports = router;

