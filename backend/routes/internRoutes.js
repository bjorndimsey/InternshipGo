const express = require('express');
const router = express.Router();
const InternController = require('../controllers/internController');

// POST /api/interns/add - Add student as intern
router.post('/add', InternController.addStudentAsIntern);

// GET /api/interns/coordinator/:coordinatorId - Get interns for a coordinator
router.get('/coordinator/:coordinatorId', InternController.getCoordinatorInterns);

module.exports = router;
