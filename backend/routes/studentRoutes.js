const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/studentController');

// GET /api/students - Get all students
router.get('/', StudentController.getAllStudents);

// POST /api/students/search - Search for students by email or student ID
router.post('/search', StudentController.searchStudent);

// PUT /api/students/profile/:id - Update student profile
router.put('/profile/:id', StudentController.updateProfile);

// PUT /api/students/:id/status - Update student account status (enable/disable)
router.put('/:id/status', StudentController.updateStudentStatus);

// DELETE /api/students/:id - Delete student
router.delete('/:id', StudentController.deleteStudent);

module.exports = router;
