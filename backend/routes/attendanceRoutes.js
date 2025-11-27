const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authenticateToken = require('../middleware/authMiddleware');

// Get attendance records for a company
router.get('/:companyId/records', authenticateToken, attendanceController.getAttendanceRecords);

// Get today's attendance for a company
router.get('/:companyId/today', authenticateToken, attendanceController.getTodayAttendance);

// Save attendance record (create or update)
router.post('/:companyId/records', authenticateToken, attendanceController.saveAttendanceRecord);

// Get attendance statistics for a company
router.get('/:companyId/stats', authenticateToken, attendanceController.getAttendanceStats);

// Verify attendance record
router.post('/:companyId/verify', authenticateToken, attendanceController.verifyAttendanceRecord);

module.exports = router;
