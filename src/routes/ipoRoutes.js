const express = require('express');
const router = express.Router();
const ipoController = require('../controllers/ipoController');

// Refresh IPO data (scrape and store) - MUST be before /:id route
router.post('/refresh', ipoController.refreshIPOs);

// Get all IPOs
router.get('/', ipoController.getAllIPOs);

// Get IPO details by ID - MUST be last
router.get('/:id', ipoController.getIPODetails);

module.exports = router;
