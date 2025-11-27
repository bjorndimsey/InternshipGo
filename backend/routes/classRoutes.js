const express = require('express');
const router = express.Router();
const ClassController = require('../controllers/classController');

// POST /api/classes - Create a new class
router.post('/', ClassController.createClass);

// GET /api/classes - Get all classes (must come before /:classId routes)
router.get('/', ClassController.getAllClasses);

// GET /api/classes/coordinator/:coordinatorId - Get all classes for a coordinator
router.get('/coordinator/:coordinatorId', ClassController.getCoordinatorClasses);

// GET /api/classes/code/:classCode - Get class by code (for enrollment)
router.get('/code/:classCode', ClassController.getClassByCode);

// POST /api/classes/enroll - Enroll a student in a class
router.post('/enroll', ClassController.enrollStudent);

// GET /api/classes/:classId/students - Get all students enrolled in a class
router.get('/:classId/students', ClassController.getClassStudents);

// GET /api/classes/student/:studentId - Get all classes for a student
router.get('/student/:studentId', ClassController.getStudentClasses);

// GET /api/classes/enrolled-students/all - Get count of all enrolled students
router.get('/enrolled-students/all', ClassController.getAllEnrolledStudents);

// PUT /api/classes/:classId/status - Update class status
router.put('/:classId/status', ClassController.updateClassStatus);

// DELETE /api/classes/:classId - Delete a class
router.delete('/:classId', ClassController.deleteClass);

module.exports = router;

