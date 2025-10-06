const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get notifications for a student
router.get('/student/:userId', NotificationController.getStudentNotifications);

// Debug endpoint to check student data
router.get('/debug/student/:userId', NotificationController.debugStudentData);

// Mark notification as read
router.post('/:notificationId/read', NotificationController.markNotificationAsRead);

// Mark all notifications as read
router.post('/mark-all-read', NotificationController.markAllNotificationsAsRead);

module.exports = router;
