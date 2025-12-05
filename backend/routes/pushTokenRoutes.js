const express = require('express');
const router = express.Router();
const pushTokenController = require('../controllers/pushTokenController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Register or update push token
router.post('/push-token', pushTokenController.registerPushToken);

// Get user's push tokens
router.get('/push-tokens', pushTokenController.getUserPushTokens);

// Delete push token
router.delete('/push-tokens/:tokenId', pushTokenController.deletePushToken);

module.exports = router;

