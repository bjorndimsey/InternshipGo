const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/studentController');

// GET /api/students - Get all students
router.get('/', StudentController.getAllStudents);

// POST /api/students/search - Search for students by email or student ID
router.post('/search', StudentController.searchStudent);

// PUT /api/students/profile/:id - Update student profile
router.put('/profile/:id', StudentController.updateProfile);

module.exports = router;
