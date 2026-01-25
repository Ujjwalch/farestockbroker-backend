const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    excerpt: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true,
        trim: true,
        default: 'FareStock Broker Team'
    },
    featuredImage: {
        type: String,
        default: ''
    },
    categories: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    status: {
        type: String,
        enum: ['draft', 'published', 'scheduled'],
        default: 'draft'
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    readTime: {
        type: Number, // in minutes
        default: 5
    },
    publishDate: {
        type: Date,
        default: null
    },
    scheduledDate: {
        type: Date,
        default: null
    },
    // SEO Fields
    metaTitle: {
        type: String,
        trim: true,
        default: ''
    },
    metaDescription: {
        type: String,
        trim: true,
        maxlength: 160,
        default: ''
    },
    metaKeywords: [{
        type: String,
        trim: true
    }],
    // Soft delete
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for performance
blogSchema.index({ slug: 1 });
blogSchema.index({ status: 1, publishDate: -1 });
blogSchema.index({ categories: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ isFeatured: 1, publishDate: -1 });
blogSchema.index({ isDeleted: 1 });

// Auto-calculate read time based on content word count
blogSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    // Calculate read time (average 200 words per minute)
    if (this.content) {
        const wordCount = this.content.split(/\s+/).length;
        this.readTime = Math.ceil(wordCount / 200);
    }

    // Set publish date if status changed to published and publishDate is not set
    if (this.status === 'published' && !this.publishDate) {
        this.publishDate = new Date();
    }

    // Use title as metaTitle if not provided
    if (!this.metaTitle) {
        this.metaTitle = this.title;
    }

    // Use excerpt as metaDescription if not provided
    if (!this.metaDescription && this.excerpt) {
        this.metaDescription = this.excerpt.substring(0, 160);
    }

    next();
});

// Auto-update timestamp on update
blogSchema.pre('findOneAndUpdate', function (next) {
    this.set({ updatedAt: Date.now() });
    next();
});

// Method to increment views
blogSchema.methods.incrementViews = function () {
    this.views += 1;
    return this.save();
};

// Method to soft delete
blogSchema.methods.softDelete = function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
};

// Query helper to exclude deleted posts
blogSchema.query.notDeleted = function () {
    return this.where({ isDeleted: false });
};

// Query helper to get published posts
blogSchema.query.published = function () {
    return this.where({ status: 'published', isDeleted: false });
};

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
