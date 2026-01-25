const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { authenticateAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// ===========================
// PUBLIC ROUTES
// ===========================

// Get all published blogs (with filters/pagination)
router.get('/', blogController.getAllBlogs);

// Get featured blogs
router.get('/featured', blogController.getFeaturedBlogs);

// Search blogs
router.get('/search', blogController.searchBlogs);

// Get blogs by category
router.get('/category/:category', blogController.getBlogsByCategory);

// Get single blog by slug (must be last to avoid conflicts)
router.get('/:slug', blogController.getBlogBySlug);

// ===========================
// ADMIN BLOG ROUTES
// ===========================

// Get all blogs (including drafts)
router.get('/admin/all', authenticateAdmin, blogController.adminGetAllBlogs);

// Get single blog by ID (for editing)
router.get('/admin/blog/:id', authenticateAdmin, blogController.adminGetBlogById);

// Create new blog
router.post('/admin', authenticateAdmin, upload.single('featuredImage'), blogController.createBlog);

// Update blog
router.put('/admin/:id', authenticateAdmin, upload.single('featuredImage'), blogController.updateBlog);

// Delete blog
router.delete('/admin/:id', authenticateAdmin, blogController.deleteBlog);

// Toggle publish status
router.patch('/admin/:id/publish', authenticateAdmin, blogController.togglePublishStatus);

// Toggle featured status
router.patch('/admin/:id/feature', authenticateAdmin, blogController.toggleFeaturedStatus);

// ===========================
// CATEGORY ROUTES
// ===========================

// Public: Get all categories
router.get('/categories/all', blogController.getAllCategories);

// Admin: Get all categories
router.get('/categories/admin/all', authenticateAdmin, blogController.adminGetAllCategories);

// Admin: Create category
router.post('/categories/admin', authenticateAdmin, blogController.createCategory);

// Admin: Update category
router.put('/categories/admin/:id', authenticateAdmin, blogController.updateCategory);

// Admin: Delete category
router.delete('/categories/admin/:id', authenticateAdmin, blogController.deleteCategory);

module.exports = router;
