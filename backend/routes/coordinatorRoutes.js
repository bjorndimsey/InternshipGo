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

// GET /api/coordinators/profile/:id - Get coordinator profile by coordinators.id
router.get('/profile/:id', CoordinatorController.getCoordinatorProfile);

// GET /api/coordinators/profile-by-user/:userId - Get coordinator profile by user_id
router.get('/profile-by-user/:userId', CoordinatorController.getCoordinatorProfileByUserId);

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

// Campus Assignment routes
// POST /api/coordinators/:id/campus-assignment - Assign coordinator to campus
router.post('/:id/campus-assignment', CoordinatorController.assignCampus);

// GET /api/coordinators/:id/campus-assignment - Get coordinator campus assignment
router.get('/:id/campus-assignment', CoordinatorController.getCampusAssignment);

// PUT /api/coordinators/:id/campus-assignment - Update coordinator campus assignment
router.put('/:id/campus-assignment', CoordinatorController.updateCampusAssignment);

// DELETE /api/coordinators/:id/campus-assignment - Remove coordinator campus assignment
router.delete('/:id/campus-assignment', CoordinatorController.removeCampusAssignment);

module.exports = router;
