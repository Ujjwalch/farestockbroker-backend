const express = require('express');
const router = express.Router();
const brokerLocationController = require('../controllers/brokerLocationController');
const { verifyToken } = require('../middlewares/auth');

// Public routes
router.get('/cities', brokerLocationController.getCities);
router.get('/states', brokerLocationController.getStates);
router.get('/search', brokerLocationController.searchLocations);
router.get('/broker/:brokerId', brokerLocationController.getLocationsByBroker);
router.get('/', brokerLocationController.getAllLocations);

// Admin routes (protected)
router.post('/', verifyToken, brokerLocationController.createLocation);
router.put('/:id', verifyToken, brokerLocationController.updateLocation);
router.delete('/:id', verifyToken, brokerLocationController.deleteLocation);
router.post('/bulk-import', verifyToken, brokerLocationController.bulkImportLocations);

module.exports = router;
