const express = require('express');
const { bookConsultation } = require('../controllers/promptConsultationController.js');

const router = express.Router();

// Prompt engineering consultation booking
router.post('/book', bookConsultation);

module.exports = router;
