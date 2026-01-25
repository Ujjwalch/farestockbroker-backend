const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    content: {
        type: String,
        required: true // Rich text HTML
    },
    summary: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Market', 'IPO', 'Broker', 'Policy', 'Economics', 'Global', 'General'],
        default: 'General'
    },
    imageUrl: {
        type: String,
        trim: true
    },
    author: {
        type: String,
        trim: true,
        default: 'FareStock Team'
    },
    date: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for search and filtering
newsSchema.index({ title: 'text', summary: 'text' });
newsSchema.index({ date: -1 });
newsSchema.index({ slug: 1 });
newsSchema.index({ category: 1 });
newsSchema.index({ isActive: 1 });

const News = mongoose.model('News', newsSchema);

module.exports = News;
