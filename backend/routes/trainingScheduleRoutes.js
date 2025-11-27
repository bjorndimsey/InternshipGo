const express = require('express');
const router = express.Router();
const TrainingScheduleController = require('../controllers/trainingScheduleController');
const authenticateToken = require('../middleware/authMiddleware');

// GET /api/training-schedules/:studentId
// Get all training schedule entries for a student
router.get('/:studentId', TrainingScheduleController.getTrainingSchedules);

// POST /api/training-schedules
// Create a new training schedule entry
router.post('/', authenticateToken, TrainingScheduleController.createTrainingSchedule);

// PUT /api/training-schedules/:id
// Update an existing training schedule entry
router.put('/:id', authenticateToken, TrainingScheduleController.updateTrainingSchedule);

// DELETE /api/training-schedules/:id
// Delete a training schedule entry
router.delete('/:id', authenticateToken, TrainingScheduleController.deleteTrainingSchedule);

module.exports = router;

