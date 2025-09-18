const express = require('express');
const multer = require('multer');
const router = express.Router();
const requirementController = require('../controllers/requirementController');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Requirements management routes (creates/updates/deletes for all students)
router.post('/', requirementController.createRequirement);
router.put('/:requirementId', requirementController.updateRequirement);
router.delete('/:requirementId', requirementController.deleteRequirement);

// Student requirements routes
router.get('/student/:studentId', requirementController.getStudentRequirements);
router.put('/student/:studentId/:requirementId', requirementController.updateStudentRequirement);
router.post('/student/:studentId/:requirementId/upload', upload.single('file'), requirementController.uploadRequirementFile);
router.get('/student/:studentId/:requirementId/download', requirementController.downloadRequirementFile);
router.post('/student/:studentId/:requirementId/remind', requirementController.sendRequirementReminder);

// Reports
router.get('/report', requirementController.getRequirementsReport);

// Test endpoint
router.get('/test', requirementController.testDatabaseState);
router.get('/coordinator/:coordinatorId', requirementController.getCoordinatorRequirements);

module.exports = router;
