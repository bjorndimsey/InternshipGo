const express = require('express');
const router = express.Router();
const CertificateController = require('../controllers/certificateController');
const authenticateToken = require('../middleware/authMiddleware');

// GET /api/certificates/company/:companyId/completed-interns
// Get list of interns who have completed their internship
router.get('/company/:companyId/completed-interns', CertificateController.getCompletedInterns);

// POST /api/certificates/generate
// Get data needed for certificate generation (company info, intern data, template)
router.post('/generate', CertificateController.generateCertificates);

// POST /api/certificates/save
// Save generated certificate URLs to database
router.post('/save', authenticateToken, CertificateController.saveCertificates);

// GET /api/certificates/company/:companyId
// Get all certificates for a company
router.get('/company/:companyId', CertificateController.getCompanyCertificates);

// GET /api/certificates/:certificateId/download
// Download certificate image
router.get('/:certificateId/download', CertificateController.downloadCertificate);

// GET /api/certificates/templates/:companyId
// Get all custom certificate templates for a company
router.get('/templates/:companyId', CertificateController.getCustomTemplates);

// POST /api/certificates/templates
// Create a new custom certificate template
router.post('/templates', authenticateToken, CertificateController.createCustomTemplate);

// DELETE /api/certificates/templates/:templateId
// Delete a custom certificate template
router.delete('/templates/:templateId', authenticateToken, CertificateController.deleteCustomTemplate);

module.exports = router;

