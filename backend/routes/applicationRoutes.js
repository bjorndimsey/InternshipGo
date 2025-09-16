const express = require('express');
const ApplicationController = require('../controllers/applicationController');

const router = express.Router();

// Application routes
router.post('/submit', ApplicationController.submitApplication);
router.get('/student/:studentId', ApplicationController.getStudentApplications);
router.get('/company/:companyId', ApplicationController.getCompanyApplications);
router.get('/company/:companyId/approved', ApplicationController.getApprovedApplications);
router.get('/:id', ApplicationController.getApplicationById);
router.put('/:id/status', ApplicationController.updateApplicationStatus);

module.exports = router;
