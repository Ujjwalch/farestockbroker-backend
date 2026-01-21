const express = require('express');
const router = express.Router();
const ipoController = require('../controllers/ipoController');

// Get all IPOs (mainboard + SME, or filtered by type)
router.get('/', ipoController.getAllIPOs);

// Get mainboard IPOs only
router.get('/mainboard', ipoController.getMainboardIPOs);

// Get SME IPOs only
router.get('/sme', ipoController.getSMEIPOs);

// Get Basis of Allotment list (must be before /:id)
router.get('/basis-of-allotment', ipoController.getBasisOfAllotment);

// Get GMP List (all IPOs with GMP) (must be before /:id)
router.get('/gmp-list', ipoController.getGMPList);

// Get IPO details by ID
router.get('/:id', ipoController.getIPODetails);

// Get IPO subscription status
router.get('/:id/subscription', ipoController.getIPOSubscription);

// Get IPO GMP (Grey Market Premium)
router.get('/:id/gmp', ipoController.getIPOGMP);

// Get IPO Reservation details
router.get('/:id/reservation', ipoController.getIPOReservation);

module.exports = router;
