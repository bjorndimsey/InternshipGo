const express = require('express');
const router = express.Router();
const workingHoursController = require('../controllers/workingHoursController');
const authenticateToken = require('../middleware/authMiddleware');

// Get working hours for a company
router.get('/:companyId', authenticateToken, workingHoursController.getWorkingHours);

// Set working hours for a company
router.post('/:companyId', authenticateToken, workingHoursController.setWorkingHours);

module.exports = router;
