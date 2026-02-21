const express = require('express');
const { getPublishSettings, updatePublishSettings } = require('../controllers/publishController.js');

const router = express.Router();

router.get('/', getPublishSettings);
router.post('/', updatePublishSettings);

module.exports = router;

