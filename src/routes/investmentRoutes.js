const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const investmentController = require('../controllers/investmentController');
const { authenticateAdmin } = require('../middlewares/auth');

// Public routes
router.get('/', investmentController.getAllInvestments);
router.get('/:slug', investmentController.getInvestmentBySlug);

// Admin routes
router.get('/admin/all', authenticateAdmin, investmentController.getAdminInvestments);

router.post(
    '/',
    [
        authenticateAdmin,
        [
            check('title', 'Title is required').not().isEmpty(),
            check('slug', 'Slug is required').not().isEmpty(),
            check('issuer', 'Issuer is required').not().isEmpty(),
            check('type', 'Type is required').not().isEmpty(),
            check('category', 'Category is required').not().isEmpty(),
            check('status', 'Status is required').not().isEmpty(),
            check('minInvestment', 'Minimum Investment must be a number').isNumeric(),
            check('description', 'Description is required').not().isEmpty()
        ]
    ],
    investmentController.createInvestment
);

router.put(
    '/:id',
    [
        authenticateAdmin,
        [
            check('title', 'Title is required').optional().not().isEmpty(),
            check('slug', 'Slug is required').optional().not().isEmpty()
        ]
    ],
    investmentController.updateInvestment
);

router.delete('/:id', authenticateAdmin, investmentController.deleteInvestment);

module.exports = router;
