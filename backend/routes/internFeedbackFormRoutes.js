const express = require('express');
const router = express.Router();
const InternFeedbackFormController = require('../controllers/internFeedbackFormController');
const authenticateToken = require('../middleware/authMiddleware');

// GET /api/intern-feedback-forms/:studentId/:companyId
// Get feedback form for a specific student and company
router.get('/:studentId/:companyId', InternFeedbackFormController.getFeedbackForm);

// POST /api/intern-feedback-forms
// Create a new feedback form
router.post('/', authenticateToken, InternFeedbackFormController.createFeedbackForm);

// PUT /api/intern-feedback-forms/:id
// Update an existing feedback form
router.put('/:id', authenticateToken, InternFeedbackFormController.updateFeedbackForm);

module.exports = router;

