const express = require('express');
const router = express.Router();
const ipoController = require('../controllers/ipoController');

// Get all IPOs
router.get('/', ipoController.getAllIPOs);

// Get IPO details by ID
router.get('/:id', ipoController.getIPODetails);

// Refresh IPO data (scrape and store)
router.post('/refresh', ipoController.refreshIPOs);

module.exports = router;
