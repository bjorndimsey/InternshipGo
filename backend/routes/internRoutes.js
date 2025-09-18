const express = require('express');
const router = express.Router();
const InternController = require('../controllers/internController');

// POST /api/interns/add - Add student as intern
router.post('/add', InternController.addStudentAsIntern);

// GET /api/interns/coordinator/:coordinatorId - Get interns for a coordinator
router.get('/coordinator/:coordinatorId', InternController.getCoordinatorInterns);

// DELETE /api/interns/:internId - Delete an intern
router.delete('/:internId', InternController.deleteIntern);

module.exports = router;
