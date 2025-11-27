const express = require('express');
const router = express.Router();
const SupervisorEvaluationController = require('../controllers/supervisorEvaluationController');
const authenticateToken = require('../middleware/authMiddleware');

// GET /api/supervisor-evaluations/:studentId/:companyId
// Get evaluation form for a specific student and company
router.get('/:studentId/:companyId', SupervisorEvaluationController.getEvaluation);

// POST /api/supervisor-evaluations
// Create a new supervisor evaluation form
router.post('/', authenticateToken, SupervisorEvaluationController.createEvaluation);

// PUT /api/supervisor-evaluations/:id
// Update an existing supervisor evaluation form
router.put('/:id', authenticateToken, SupervisorEvaluationController.updateEvaluation);

module.exports = router;

