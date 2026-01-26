const News = require('../models/News');
const { validationResult } = require('express-validator');

// @desc    Get all news (public) with pagination and filters
// @route   GET /api/news
// @access  Public
exports.getAllNews = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const filter = { isActive: true };

        if (req.query.category) {
            filter.category = req.query.category;
        }

        if (req.query.search) {
            filter.$text = { $search: req.query.search };
        }

        // Date filtering (Month/Year)
        if (req.query.month && req.query.year) {
            const startDate = new Date(parseInt(req.query.year), parseInt(req.query.month) - 1, 1);
            const endDate = new Date(parseInt(req.query.year), parseInt(req.query.month), 0, 23, 59, 59);
            filter.date = { $gte: startDate, $lte: endDate };
        }

        const news = await News.find(filter)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const total = await News.countDocuments(filter);

        res.json({
            news,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ message: 'Server error fetching news' });
    }
};

// @desc    Get news by slug
// @route   GET /api/news/:slug
// @access  Public
exports.getNewsBySlug = async (req, res) => {
    try {
        const news = await News.findOne({ slug: req.params.slug, isActive: true });

        if (!news) {
            return res.status(404).json({ message: 'News article not found' });
        }

        // Fetch related news (same category, excluding current)
        const relatedNews = await News.find({
            category: news.category,
            isActive: true,
            _id: { $ne: news._id }
        })
            .sort({ date: -1 })
            .limit(3)
            .select('title slug date imageUrl summary');

        res.json({ news, relatedNews });
    } catch (error) {
        console.error('Error fetching news by slug:', error);
        res.status(500).json({ message: 'Server error fetching news details' });
    }
};

// @desc    Get news grouped by Date (for archives)
// @route   GET /api/news/archives
// @access  Public
exports.getNewsArchives = async (req, res) => {
    try {
        const archives = await News.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        month: { $month: "$date" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } }
        ]);

        res.json({ archives });
    } catch (error) {
        console.error('Error fetching archives:', error);
        res.status(500).json({ message: 'Server error fetching archives' });
    }
};

// @desc    Get all news (admin)
// @route   GET /api/news/admin/all
// @access  Private/Admin
exports.getAdminNews = async (req, res) => {
    try {
        const news = await News.find({}).sort({ date: -1 });
        res.json({ news });
    } catch (error) {
        console.error('Error fetching admin news:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create news
// @route   POST /api/news
// @access  Private/Admin
exports.createNews = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { title, slug, content, summary, category, imageUrl, date, isActive } = req.body;

        // Check if slug exists
        const existingNews = await News.findOne({ slug });
        if (existingNews) {
            return res.status(400).json({ message: 'News with this slug already exists' });
        }

        // Handle image upload
        let finalImageUrl = imageUrl;
        if (req.file) {
            // If image file was uploaded, use its path
            finalImageUrl = `/uploads/news/${req.file.filename}`;
        }

        const news = new News({
            title,
            slug,
            content,
            summary,
            category,
            imageUrl: finalImageUrl,
            date: date || Date.now(),
            isActive: isActive !== undefined ? isActive : true
        });

        await news.save();
        res.status(201).json({ message: 'News created successfully', news });
    } catch (error) {
        console.error('Error creating news:', error);
        res.status(500).json({ message: 'Server error creating news' });
    }
};

// @desc    Update news
// @route   PUT /api/news/:id
// @access  Private/Admin
exports.updateNews = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { title, slug, content, summary, category, imageUrl, date, isActive } = req.body;

        const news = await News.findById(req.params.id);

        if (!news) {
            return res.status(404).json({ message: 'News not found' });
        }

        // Check if slug is being changed and if it conflicts
        if (slug && slug !== news.slug) {
            const existingNews = await News.findOne({ slug });
            if (existingNews) {
                return res.status(400).json({ message: 'Slug already in use' });
            }
            news.slug = slug;
        }

        if (title) news.title = title;
        if (content) news.content = content;
        if (summary) news.summary = summary;
        if (category) news.category = category;

        // Handle image upload
        if (req.file) {
            // If new image file was uploaded, use its path
            news.imageUrl = `/uploads/news/${req.file.filename}`;
        } else if (imageUrl) {
            // If imageUrl provided (and no file), update it
            news.imageUrl = imageUrl;
        }

        if (date) news.date = date;
        if (isActive !== undefined) news.isActive = isActive;

        await news.save();
        res.json({ message: 'News updated successfully', news });
    } catch (error) {
        console.error('Error updating news:', error);
        res.status(500).json({ message: 'Server error updating news' });
    }
};

// @desc    Delete news
// @route   DELETE /api/news/:id
// @access  Private/Admin
exports.deleteNews = async (req, res) => {
    try {
        const news = await News.findById(req.params.id);

        if (!news) {
            return res.status(404).json({ message: 'News not found' });
        }

        await News.deleteOne({ _id: news._id });
        res.json({ message: 'News deleted successfully' });
    } catch (error) {
        console.error('Error deleting news:', error);
        res.status(500).json({ message: 'Server error deleting news' });
    }
};
