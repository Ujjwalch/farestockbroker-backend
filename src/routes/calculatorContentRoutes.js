const express = require('express');
const router = express.Router();
const calculatorContentController = require('../controllers/calculatorContentController');
const { verifyToken } = require('../middlewares/auth');

// Public routes
router.get('/', calculatorContentController.getAllCalculatorContents);
router.get('/:calculatorId', calculatorContentController.getCalculatorContentById);

// Admin routes (protected)
router.post('/', verifyToken, calculatorContentController.createCalculatorContent);
router.put('/:calculatorId', verifyToken, calculatorContentController.updateCalculatorContent);
router.delete('/:calculatorId', verifyToken, calculatorContentController.deleteCalculatorContent);

// Seed route (for initial setup - can be protected or removed in production)
router.post('/seed/default', calculatorContentController.seedCalculatorContents);

module.exports = router;
