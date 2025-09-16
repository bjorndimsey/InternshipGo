const express = require('express');
const router = express.Router();
const EventController = require('../controllers/eventController');

// GET /api/events/coordinator/:coordinatorId - Get all events for a coordinator
router.get('/coordinator/:coordinatorId', EventController.getEvents);

// GET /api/events/student/:studentId - Get events for a student (based on coordinator assignment and application approval)
router.get('/student/:studentId', EventController.getStudentEvents);

// POST /api/events - Create a new event
router.post('/', EventController.createEvent);

// PUT /api/events/:eventId - Update an event
router.put('/:eventId', EventController.updateEvent);

// DELETE /api/events/:eventId - Delete an event
router.delete('/:eventId', EventController.deleteEvent);

// GET /api/events/date-range - Get events by date range
router.get('/date-range', EventController.getEventsByDateRange);

module.exports = router;
