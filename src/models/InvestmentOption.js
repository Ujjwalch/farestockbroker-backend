const mongoose = require('mongoose');

const investmentOptionSchema = new mongoose.Schema({
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
    issuer: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['NCD', 'corporate_bond', 'govt_bond', 'AIF_cat1', 'AIF_cat2', 'AIF_cat3'],
        default: 'NCD'
    },
    category: {
        type: String,
        required: true,
        enum: ['NCD', 'BOND', 'AIF'],
        default: 'NCD'
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending Review', 'Approved'],
        default: 'Pending Review'
    },
    minInvestment: {
        type: Number,
        required: true
    },
    interestRate: {
        type: String,
        trim: true
    },
    maturity: {
        type: String,
        trim: true
    },
    rating: {
        type: String,
        trim: true
    },
    openDate: {
        type: Date
    },
    closeDate: {
        type: Date
    },
    description: {
        type: String, // Rich text HTML
        required: true
    },
    features: {
        type: [String],
        default: []
    },
    applyLink: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for search and filtering
investmentOptionSchema.index({ title: 'text', issuer: 'text' });
investmentOptionSchema.index({ type: 1 });
investmentOptionSchema.index({ category: 1 });
investmentOptionSchema.index({ status: 1 });
investmentOptionSchema.index({ slug: 1 });

const InvestmentOption = mongoose.model('InvestmentOption', investmentOptionSchema);

module.exports = InvestmentOption;
