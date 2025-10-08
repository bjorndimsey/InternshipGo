const express = require('express');
const router = express.Router();
const evidenceController = require('../controllers/evidenceController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Submit evidence (daily task)
router.post('/', evidenceController.submitEvidence);

// Get all evidences for a user
router.get('/', evidenceController.getEvidences);

// Get evidences for a specific intern (for coordinators)
router.get('/intern/:internId', evidenceController.getInternEvidences);

// Update evidence status (for coordinators/companies)
router.put('/:evidenceId/review', evidenceController.updateEvidenceStatus);

// Delete evidence (only if not reviewed)
router.delete('/:evidenceId', evidenceController.deleteEvidence);

// Get evidence statistics
router.get('/stats', evidenceController.getEvidenceStats);

module.exports = router;
