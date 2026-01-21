const express = require('express');
const router = express.Router();
const ipoController = require('../controllers/ipoController');

// Get all IPOs (mainboard + SME, or filtered by type)
router.get('/', ipoController.getAllIPOs);

// Get mainboard IPOs only
router.get('/mainboard', ipoController.getMainboardIPOs);

// Get SME IPOs only
router.get('/sme', ipoController.getSMEIPOs);

// Get IPO details by ID
router.get('/:id', ipoController.getIPODetails);

// Get IPO subscription status
router.get('/:id/subscription', ipoController.getIPOSubscription);

// Get IPO GMP (Grey Market Premium)
router.get('/:id/gmp', ipoController.getIPOGMP);

module.exports = router;
