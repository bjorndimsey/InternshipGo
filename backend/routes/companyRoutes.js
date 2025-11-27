const express = require('express');
const router = express.Router();
const CompanyController = require('../controllers/companyController');

// GET /api/companies - Get all companies
router.get('/', CompanyController.getAllCompanies);

// GET /api/companies/:id - Get company by ID
router.get('/:id', CompanyController.getCompanyById);

// PUT /api/companies/:id/moa - Update company MOA information
router.put('/:id/moa', CompanyController.updateCompanyMOA);

// PUT /api/companies/:id/partnership - Update company partnership status
router.put('/:id/partnership', CompanyController.updatePartnershipStatus);

// GET /api/companies/student/:studentId - Get companies for a student (only approved applications)
router.get('/student/:studentId', CompanyController.getStudentCompanies);

// GET /api/companies/profile-by-user/:userId - Get company profile by user_id
router.get('/profile-by-user/:userId', CompanyController.getCompanyProfileByUserId);

// PUT /api/companies/:id/status - Update company account status (enable/disable)
router.put('/:id/status', CompanyController.updateCompanyStatus);

// PUT /api/companies/:id/remove-partnership - Remove partnership/MOA (without deleting company)
router.put('/:id/remove-partnership', CompanyController.removePartnership);

// DELETE /api/companies/:id - Delete company
router.delete('/:id', CompanyController.deleteCompany);

module.exports = router;
