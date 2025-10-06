const express = require('express');
const router = express.Router();
const CoordinatorNotificationController = require('../controllers/coordinatorNotificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Get coordinator notifications
router.get('/coordinator/:coordinatorId', authMiddleware, CoordinatorNotificationController.getCoordinatorNotifications);

// Mark notification as read
router.post('/coordinator/:notificationId/read', authMiddleware, CoordinatorNotificationController.markNotificationAsRead);

// Mark all notifications as read
router.post('/coordinator/mark-all-read', authMiddleware, CoordinatorNotificationController.markAllNotificationsAsRead);

module.exports = router;
