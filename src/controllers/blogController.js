const Blog = require('../models/Blog');
const BlogCategory = require('../models/BlogCategory');
const { generateSlug, sanitizeSlug, validateSlug } = require('../utils/slugUtils');

// ===========================
// PUBLIC API FUNCTIONS
// ===========================

/**
 * Get all published blogs with pagination, filtering, and sorting
 * Query params: page, limit, category, tag, search, sort, featured
 */
const getAllBlogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            tag,
            search,
            sort = '-publishDate',
            featured
        } = req.query;

        const query = { status: 'published', isDeleted: false };

        // Filter by category
        if (category) {
            query.categories = category.toLowerCase();
        }

        // Filter by tag
        if (tag) {
            query.tags = tag.toLowerCase();
        }

        // Filter by featured
        if (featured === 'true') {
            query.isFeatured = true;
        }

        // Search in title, excerpt, content
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const blogs = await Blog.find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .select('-content') // Exclude full content for listing
            .lean();

        const total = await Blog.countDocuments(query);

        res.json({
            success: true,
            data: blogs,
            pagination: {
                current: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blogs',
            error: error.message
        });
    }
};

/**
 * Get single blog by slug (public view)
 */
const getBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const blog = await Blog.findOne({
            slug,
            status: 'published',
            isDeleted: false
        });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        // Increment view count
        blog.views += 1;
        await blog.save();

        res.json({
            success: true,
            data: blog
        });
    } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blog',
            error: error.message
        });
    }
};

/**
 * Get featured blogs
 */
const getFeaturedBlogs = async (req, res) => {
    try {
        const { limit = 6 } = req.query;

        const blogs = await Blog.find({
            status: 'published',
            isFeatured: true,
            isDeleted: false
        })
            .sort('-publishDate')
            .limit(parseInt(limit))
            .select('-content')
            .lean();

        res.json({
            success: true,
            data: blogs
        });
    } catch (error) {
        console.error('Error fetching featured blogs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch featured blogs',
            error: error.message
        });
    }
};

/**
 * Get blogs by category
 */
const getBlogsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const query = {
            status: 'published',
            isDeleted: false,
            categories: category.toLowerCase()
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const blogs = await Blog.find(query)
            .sort('-publishDate')
            .skip(skip)
            .limit(parseInt(limit))
            .select('-content')
            .lean();

        const total = await Blog.countDocuments(query);

        res.json({
            success: true,
            data: blogs,
            pagination: {
                current: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching blogs by category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blogs by category',
            error: error.message
        });
    }
};

/**
 * Search blogs
 */
const searchBlogs = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;

        if (!q) {
            return res.json({
                success: true,
                data: []
            });
        }

        const blogs = await Blog.find({
            status: 'published',
            isDeleted: false,
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { excerpt: { $regex: q, $options: 'i' } },
                { tags: { $regex: q, $options: 'i' } }
            ]
        })
            .sort('-publishDate')
            .limit(parseInt(limit))
            .select('title slug excerpt categories tags publishDate readTime')
            .lean();

        res.json({
            success: true,
            data: blogs
        });
    } catch (error) {
        console.error('Error searching blogs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search blogs',
            error: error.message
        });
    }
};

// ===========================
// ADMIN API FUNCTIONS
// ===========================

/**
 * Admin: Get all blogs (including drafts)
 */
const adminGetAllBlogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            category,
            search
        } = req.query;

        const query = { isDeleted: false };

        if (status) {
            query.status = status;
        }

        if (category) {
            query.categories = category.toLowerCase();
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const blogs = await Blog.find(query)
            .sort('-updatedAt')
            .skip(skip)
            .limit(parseInt(limit))
            .select('-content') // Exclude full content for listing
            .lean();

        const total = await Blog.countDocuments(query);

        res.json({
            success: true,
            data: blogs,
            pagination: {
                current: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching blogs (admin):', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blogs',
            error: error.message
        });
    }
};

/**
 * Admin: Get single blog by ID (for editing)
 */
const adminGetBlogById = async (req, res) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findOne({ _id: id, isDeleted: false });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        res.json({
            success: true,
            data: blog
        });
    } catch (error) {
        console.error('Error fetching blog (admin):', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blog',
            error: error.message
        });
    }
};

/**
 * Admin: Create new blog
 */
const createBlog = async (req, res) => {
    try {
        const {
            title,
            slug,
            excerpt,
            content,
            author,
            featuredImage,
            categories,
            tags,
            status,
            isFeatured,
            scheduledDate,
            metaTitle,
            metaDescription,
            metaKeywords
        } = req.body;

        // Validate required fields
        if (!title || !excerpt || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title, excerpt, and content are required'
            });
        }

        // Generate or validate slug
        let finalSlug = slug ? sanitizeSlug(slug) : generateSlug(title);

        // Check if slug already exists
        const existingBlog = await Blog.findOne({ slug: finalSlug, isDeleted: false });
        if (existingBlog) {
            // Add timestamp to make it unique
            finalSlug = `${finalSlug}-${Date.now()}`;
        }

        const blogData = {
            title,
            slug: finalSlug,
            excerpt,
            content,
            author: author || 'FareStock Broker Team',
            featuredImage: featuredImage || '',
            categories: categories || [],
            tags: tags || [],
            status: status || 'draft',
            isFeatured: isFeatured || false,
            metaTitle: metaTitle || title,
            metaDescription: metaDescription || excerpt,
            metaKeywords: metaKeywords || []
        };

        // Set scheduled date if provided
        if (status === 'scheduled' && scheduledDate) {
            blogData.scheduledDate = new Date(scheduledDate);
        }

        const blog = new Blog(blogData);
        await blog.save();

        res.status(201).json({
            success: true,
            message: 'Blog post created successfully',
            data: blog
        });
    } catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create blog',
            error: error.message
        });
    }
};

/**
 * Admin: Update blog
 */
const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const blog = await Blog.findOne({ _id: id, isDeleted: false });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        // If slug is being updated, validate it
        if (updateData.slug && updateData.slug !== blog.slug) {
            const sanitizedSlug = sanitizeSlug(updateData.slug);
            const existingBlog = await Blog.findOne({
                slug: sanitizedSlug,
                _id: { $ne: id },
                isDeleted: false
            });

            if (existingBlog) {
                return res.status(400).json({
                    success: false,
                    message: 'Slug already exists'
                });
            }

            updateData.slug = sanitizedSlug;
        }

        // Update blog
        Object.assign(blog, updateData);
        await blog.save();

        res.json({
            success: true,
            message: 'Blog post updated successfully',
            data: blog
        });
    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update blog',
            error: error.message
        });
    }
};

/**
 * Admin: Delete blog (soft delete)
 */
const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findOne({ _id: id, isDeleted: false });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        await blog.softDelete();

        res.json({
            success: true,
            message: 'Blog post deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete blog',
            error: error.message
        });
    }
};

/**
 * Admin: Toggle publish status
 */
const togglePublishStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findOne({ _id: id, isDeleted: false });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        // Toggle between published and draft
        blog.status = blog.status === 'published' ? 'draft' : 'published';

        // Set publish date if publishing for the first time
        if (blog.status === 'published' && !blog.publishDate) {
            blog.publishDate = new Date();
        }

        await blog.save();

        res.json({
            success: true,
            message: `Blog post ${blog.status === 'published' ? 'published' : 'unpublished'} successfully`,
            data: blog
        });
    } catch (error) {
        console.error('Error toggling publish status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle publish status',
            error: error.message
        });
    }
};

/**
 * Admin: Toggle featured status
 */
const toggleFeaturedStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findOne({ _id: id, isDeleted: false });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        blog.isFeatured = !blog.isFeatured;
        await blog.save();

        res.json({
            success: true,
            message: `Blog post ${blog.isFeatured ? 'marked as featured' : 'unmarked as featured'}`,
            data: blog
        });
    } catch (error) {
        console.error('Error toggling featured status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle featured status',
            error: error.message
        });
    }
};

// ===========================
// CATEGORY MANAGEMENT
// ===========================

/**
 * Get all categories (public)
 */
const getAllCategories = async (req, res) => {
    try {
        const categories = await BlogCategory.find({ isActive: true })
            .sort('order')
            .lean();

        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
};

/**
 * Admin: Get all categories
 */
const adminGetAllCategories = async (req, res) => {
    try {
        const categories = await BlogCategory.find()
            .sort('order')
            .lean();

        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Error fetching categories (admin):', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
};

/**
 * Admin: Create category
 */
const createCategory = async (req, res) => {
    try {
        const { name, slug, description, icon, color, order } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // Generate or validate slug
        const finalSlug = slug ? sanitizeSlug(slug) : generateSlug(name);

        // Check if slug already exists
        const existingCategory = await BlogCategory.findOne({ slug: finalSlug });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category slug already exists'
            });
        }

        const category = new BlogCategory({
            name,
            slug: finalSlug,
            description: description || '',
            icon: icon || '',
            color: color || '#3B82F6',
            order: order || 0
        });

        await category.save();

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: error.message
        });
    }
};

/**
 * Admin: Update category
 */
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const category = await BlogCategory.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // If slug is being updated, validate it
        if (updateData.slug && updateData.slug !== category.slug) {
            const sanitizedSlug = sanitizeSlug(updateData.slug);
            const existingCategory = await BlogCategory.findOne({
                slug: sanitizedSlug,
                _id: { $ne: id }
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Category slug already exists'
                });
            }

            updateData.slug = sanitizedSlug;
        }

        Object.assign(category, updateData);
        await category.save();

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: category
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category',
            error: error.message
        });
    }
};

/**
 * Admin: Delete category
 */
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await BlogCategory.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if category is being used by any blogs
        const blogsUsingCategory = await Blog.countDocuments({
            categories: category.slug,
            isDeleted: false
        });

        if (blogsUsingCategory > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. ${blogsUsingCategory} blog post(s) are using this category.`
            });
        }

        await BlogCategory.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category',
            error: error.message
        });
    }
};

module.exports = {
    // Public Blog APIs
    getAllBlogs,
    getBlogBySlug,
    getFeaturedBlogs,
    getBlogsByCategory,
    searchBlogs,

    // Admin Blog APIs
    adminGetAllBlogs,
    adminGetBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
    togglePublishStatus,
    toggleFeaturedStatus,

    // Category APIs
    getAllCategories,
    adminGetAllCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
