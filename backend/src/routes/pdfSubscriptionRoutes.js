const express = require('express');
const subscriptionController = require('../controllers/pdfSubscriptionController');

const router = express.Router();

// Routes
router.post('/create', subscriptionController.createSubscription);
router.get('/stats', subscriptionController.getUserStats);
router.get('/plans', subscriptionController.getPlans);

module.exports = router;

