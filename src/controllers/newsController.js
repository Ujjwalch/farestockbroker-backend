const News = require('../models/News');
const { validationResult } = require('express-validator');

// @desc    Get all news (public) with pagination and filters
// @route   GET /api/news
// @access  Public
exports.getAllNews = async (req, res) => {
    try {
        console.log('API HIT: getAllNews');
        console.log('QUERY PARAMS:', req.query);

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

        // DATE FILTER LOGIC
        // Priority: Specific Date > Month/Year
        if (req.query.date) {
            console.log('--- APPLYING DATE FILTER (UTC) ---');
            console.log('Raw Date:', req.query.date);

            // Expected format: YYYY-MM-DD
            const parts = req.query.date.trim().split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // JS Month is 0-indexed
                const day = parseInt(parts[2]);

                // Create UTC dates to avoid timezone issues
                const startDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
                const endDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

                console.log('Range Start (UTC):', startDate);
                console.log('Range End (UTC):', endDate);

                filter.date = { $gte: startDate, $lte: endDate };
            }
        }
        else if (req.query.month && req.query.year) {
            console.log('--- APPLYING ARCHIVE FILTER (UTC) ---');
            const year = parseInt(req.query.year);
            const month = parseInt(req.query.month) - 1;

            // Use UTC to avoid timezone shifts
            const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
            const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

            console.log('Archive Range Start (UTC):', startDate);
            console.log('Archive Range End (UTC):', endDate);

            filter.date = { $gte: startDate, $lte: endDate };
        }

        console.log('FINAL FILTER:', JSON.stringify(filter));

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

        // Handle image upload - construct full URL like blog does
        let finalImageUrl = imageUrl;
        if (req.file) {
            const protocol = req.protocol;
            const host = req.get('host');
            finalImageUrl = `${protocol}://${host}/uploads/news/${req.file.filename}`;
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

        // Handle image upload - construct full URL like blog does
        if (req.file) {
            const protocol = req.protocol;
            const host = req.get('host');
            news.imageUrl = `${protocol}://${host}/uploads/news/${req.file.filename}`;
        } else if (imageUrl) {
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
