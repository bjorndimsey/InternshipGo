const express = require('express');
const router = express.Router();
const studentSubmissionController = require('../controllers/studentSubmissionController');

// Student submission routes
router.post('/submit', studentSubmissionController.submitRequirement);
router.get('/student/:studentId', studentSubmissionController.getStudentSubmissions);
router.get('/coordinator/:coordinatorId', studentSubmissionController.getCoordinatorSubmissions);
router.get('/coordinator/:coordinatorId/stats', studentSubmissionController.getSubmissionStats);
router.get('/:submissionId', studentSubmissionController.getSubmissionDetails);
router.put('/:submissionId/status', studentSubmissionController.updateSubmissionStatus);

module.exports = router;
