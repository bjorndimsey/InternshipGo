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

module.exports = router;
