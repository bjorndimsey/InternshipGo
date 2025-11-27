const express = require('express');
const HTEController = require('../controllers/hteController');

const router = express.Router();

// HTE Information routes
router.get('/', HTEController.getHTEInformation);
router.post('/save', HTEController.saveHTEInformation);

module.exports = router;

