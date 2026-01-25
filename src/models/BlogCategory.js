const mongoose = require('mongoose');

const blogCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    icon: {
        type: String,
        default: ''
    },
    color: {
        type: String,
        default: '#3B82F6' // Default blue color
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
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

// Auto-update timestamp on save
blogCategorySchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Auto-update timestamp on update
blogCategorySchema.pre('findOneAndUpdate', function (next) {
    this.set({ updatedAt: Date.now() });
    next();
});

// Virtual field for post count (will be populated when queried)
blogCategorySchema.virtual('postCount', {
    ref: 'Blog',
    localField: 'slug',
    foreignField: 'categories',
    count: true
});

const BlogCategory = mongoose.model('BlogCategory', blogCategorySchema);

module.exports = BlogCategory;
