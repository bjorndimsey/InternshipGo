const express = require('express');
const router = express.Router();
const CoordinatorController = require('../controllers/coordinatorController');

// GET /api/coordinators - Get all coordinators
router.get('/', CoordinatorController.getAllCoordinators);

// GET /api/coordinators/test-partnership - Test endpoint
router.get('/test-partnership', CoordinatorController.testPartnershipUpdate);

// POST /api/coordinators/sync-partnerships - Sync all partnership statuses
router.post('/sync-partnerships', CoordinatorController.syncPartnershipStatuses);

// GET /api/coordinators/with-moa - Get coordinators with MOA information
router.get('/with-moa', CoordinatorController.getCoordinatorsWithMOA);

// GET /api/coordinators/:id - Get coordinator by ID
router.get('/:id', CoordinatorController.getCoordinatorById);

// POST /api/coordinators - Create new coordinator
router.post('/', CoordinatorController.createCoordinator);

// PUT /api/coordinators/:id - Update coordinator
router.put('/:id', CoordinatorController.updateCoordinator);

// DELETE /api/coordinators/:id - Delete coordinator
router.delete('/:id', CoordinatorController.deleteCoordinator);

// PUT /api/coordinators/:id/admin - Toggle admin status
router.put('/:id/admin', CoordinatorController.toggleAdminStatus);

// PUT /api/coordinators/:id/partnership - Update coordinator partnership status
router.put('/:id/partnership', CoordinatorController.updateCoordinatorPartnershipStatus);

// GET /api/coordinators/admin-profile/:userId - Get admin coordinator profile
router.get('/admin-profile/:userId', CoordinatorController.getAdminCoordinatorProfile);

module.exports = router;
