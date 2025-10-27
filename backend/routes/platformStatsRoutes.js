const express = require('express');
const router = express.Router();
const platformStatsController = require('../controllers/platformStatsController');

// Get platform statistics
router.get('/stats', platformStatsController.getPlatformStats);

module.exports = router;
