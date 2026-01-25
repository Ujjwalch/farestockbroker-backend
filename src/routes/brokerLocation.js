const express = require('express');
const router = express.Router();
const brokerLocationController = require('../controllers/brokerLocationController');
const { authenticateAdmin } = require('../middlewares/auth');

// Public routes
router.get('/cities', brokerLocationController.getCities);
router.get('/states', brokerLocationController.getStates);
router.get('/search', brokerLocationController.searchLocations);
router.get('/broker/:brokerId', brokerLocationController.getLocationsByBroker);
router.get('/', brokerLocationController.getAllLocations);

// Admin routes (protected)
router.post('/', authenticateAdmin, brokerLocationController.createLocation);
router.put('/:id', authenticateAdmin, brokerLocationController.updateLocation);
router.delete('/:id', authenticateAdmin, brokerLocationController.deleteLocation);
router.post('/bulk-import', authenticateAdmin, brokerLocationController.bulkImportLocations);

module.exports = router;
