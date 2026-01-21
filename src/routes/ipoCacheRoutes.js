const express = require('express');
const router = express.Router();
const ipoCacheController = require('../controllers/ipoCacheController');
const { authenticateAdmin } = require('../middlewares/auth');

// Public routes - fast cached data
router.get('/all', ipoCacheController.getAllIPOs);
router.get('/mainboard', ipoCacheController.getMainboardIPOs);
router.get('/sme', ipoCacheController.getSMEIPOs);
router.get('/:ipoId', ipoCacheController.getIPOById);

// Admin routes - sync management
router.post('/sync', authenticateAdmin, ipoCacheController.forceSyncIPOs);
router.get('/sync/status', ipoCacheController.getSyncStatus);

module.exports = router;
