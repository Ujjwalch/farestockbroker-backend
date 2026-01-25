const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const newsController = require('../controllers/newsController');
const { authenticateAdmin } = require('../middlewares/auth');

// Public routes
router.get('/', newsController.getAllNews);
router.get('/archives', newsController.getNewsArchives);
router.get('/:slug', newsController.getNewsBySlug);

// Admin routes
router.get('/admin/all', authenticateAdmin, newsController.getAdminNews);

router.post(
    '/',
    [
        authenticateAdmin,
        [
            check('title', 'Title is required').not().isEmpty(),
            check('slug', 'Slug is required').not().isEmpty(),
            check('content', 'Content is required').not().isEmpty(),
            check('summary', 'Summary is required').not().isEmpty(),
            check('category', 'Category is required').not().isEmpty()
        ]
    ],
    newsController.createNews
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
    newsController.updateNews
);

router.delete('/:id', authenticateAdmin, newsController.deleteNews);

module.exports = router;
