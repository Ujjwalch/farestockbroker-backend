const express = require('express');
const router = express.Router();
const educationController = require('../controllers/educationController');
const { authenticateAdmin } = require('../middlewares/auth');

// Public routes
router.get('/categories', educationController.getAllCategories);
router.get('/categories/:slug', educationController.getCategoryBySlug);
router.get('/articles/:categorySlug/:subcategorySlug/:sectionSlug/:articleSlug', educationController.getArticleBySlug);
router.get('/articles/:categorySlug/:subcategorySlug/:articleSlug', educationController.getArticleBySlug); // Fallback for old URLs
router.get('/search', educationController.searchArticles);

// Admin routes
router.get('/admin/categories', authenticateAdmin, educationController.adminGetAllCategories);
router.post('/admin/categories', authenticateAdmin, educationController.createCategory);
router.put('/admin/categories/:id', authenticateAdmin, educationController.updateCategory);
router.delete('/admin/categories/:id', authenticateAdmin, educationController.deleteCategory);

router.post('/admin/categories/:categoryId/subcategories', authenticateAdmin, educationController.addSubcategory);
router.put('/admin/categories/:categoryId/subcategories/:subcategoryId', authenticateAdmin, educationController.updateSubcategory);
router.delete('/admin/categories/:categoryId/subcategories/:subcategoryId', authenticateAdmin, educationController.deleteSubcategory);

router.post('/admin/categories/:categoryId/subcategories/:subcategoryId/articles', authenticateAdmin, educationController.addArticle);
router.put('/admin/categories/:categoryId/subcategories/:subcategoryId/articles/:articleId', authenticateAdmin, educationController.updateArticle);
router.delete('/admin/categories/:categoryId/subcategories/:subcategoryId/articles/:articleId', authenticateAdmin, educationController.deleteArticle);

module.exports = router;
