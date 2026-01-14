const express = require('express');
const router = express.Router();
const educationController = require('../controllers/educationController');
const { verifyToken } = require('../middlewares/auth');

// Public routes
router.get('/categories', educationController.getAllCategories);
router.get('/categories/:slug', educationController.getCategoryBySlug);
router.get('/articles/:categorySlug/:subcategorySlug/:articleSlug', educationController.getArticleBySlug);
router.get('/search', educationController.searchArticles);

// Admin routes
router.get('/admin/categories', verifyToken, educationController.adminGetAllCategories);
router.post('/admin/categories', verifyToken, educationController.createCategory);
router.put('/admin/categories/:id', verifyToken, educationController.updateCategory);
router.delete('/admin/categories/:id', verifyToken, educationController.deleteCategory);

router.post('/admin/categories/:categoryId/subcategories', verifyToken, educationController.addSubcategory);
router.put('/admin/categories/:categoryId/subcategories/:subcategoryId', verifyToken, educationController.updateSubcategory);
router.delete('/admin/categories/:categoryId/subcategories/:subcategoryId', verifyToken, educationController.deleteSubcategory);

router.post('/admin/categories/:categoryId/subcategories/:subcategoryId/articles', verifyToken, educationController.addArticle);
router.put('/admin/categories/:categoryId/subcategories/:subcategoryId/articles/:articleId', verifyToken, educationController.updateArticle);
router.delete('/admin/categories/:categoryId/subcategories/:subcategoryId/articles/:articleId', verifyToken, educationController.deleteArticle);

module.exports = router;
