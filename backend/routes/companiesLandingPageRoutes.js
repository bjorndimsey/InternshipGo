const express = require('express');
const companiesLandingPageController = require('../controllers/companiesLandingPageController');
const router = express.Router();

router.get('/companies', companiesLandingPageController.getCompaniesLandingPage);

module.exports = router;
