const express = require('express');
const router = express.Router();
const CompanyNotificationController = require('../controllers/companyNotificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Get company notifications
router.get('/company/:companyId', authMiddleware, CompanyNotificationController.getCompanyNotifications);

// Mark notification as read
router.post('/company/:notificationId/read', authMiddleware, CompanyNotificationController.markNotificationAsRead);

// Mark all notifications as read
router.post('/company/mark-all-read', authMiddleware, CompanyNotificationController.markAllNotificationsAsRead);

module.exports = router;
