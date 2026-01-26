const InvestmentOption = require('../models/InvestmentOption');
const { validationResult } = require('express-validator');

// @desc    Get all investment options (public)
// @route   GET /api/investments
// @access  Public
exports.getAllInvestments = async (req, res) => {
    try {
        const { category, type, status, search } = req.query;
        let query = { isActive: true };

        if (category) query.category = category;
        if (type) query.type = type;
        if (status) query.status = status;

        if (search) {
            query.$text = { $search: search };
        }

        const investments = await InvestmentOption.find(query)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: investments.length,
            investments
        });
    } catch (error) {
        console.error('Error fetching investments:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get single investment by slug
// @route   GET /api/investments/:slug
// @access  Public
exports.getInvestmentBySlug = async (req, res) => {
    try {
        const investment = await InvestmentOption.findOne({
            slug: req.params.slug,
            isActive: true
        });

        if (!investment) {
            return res.status(404).json({
                success: false,
                message: 'Investment option not found'
            });
        }

        res.json({
            success: true,
            investment
        });
    } catch (error) {
        console.error('Error fetching investment:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get all investments (admin)
// @route   GET /api/investments/admin/all
// @access  Private/Admin
exports.getAdminInvestments = async (req, res) => {
    try {
        const investments = await InvestmentOption.find({})
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: investments.length,
            investments
        });
    } catch (error) {
        console.error('Error fetching admin investments:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Create new investment option
// @route   POST /api/investments
// @access  Private/Admin
exports.createInvestment = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const {
            title,
            slug,
            issuer,
            type,
            category,
            status,
            minInvestment,
            interestRate,
            maturity,
            rating,
            openDate,
            closeDate,
            description,
            features,
            applyLink,
            isActive
        } = req.body;

        // Check if slug exists
        let investment = await InvestmentOption.findOne({ slug });
        if (investment) {
            return res.status(400).json({
                success: false,
                message: 'Investment with this slug already exists'
            });
        }

        investment = new InvestmentOption({
            title,
            slug,
            issuer,
            type,
            category,
            status,
            minInvestment,
            interestRate,
            maturity,
            rating,
            openDate,
            closeDate,
            description,
            features,
            applyLink,
            isActive
        });

        await investment.save();

        res.status(201).json({
            success: true,
            investment
        });
    } catch (error) {
        console.error('Error creating investment:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Update investment option
// @route   PUT /api/investments/:id
// @access  Private/Admin
exports.updateInvestment = async (req, res) => {
    try {
        let investment = await InvestmentOption.findById(req.params.id);

        if (!investment) {
            return res.status(404).json({
                success: false,
                message: 'Investment option not found'
            });
        }

        // fields to update
        const fieldsToUpdate = [
            'title', 'slug', 'issuer', 'type', 'category', 'status',
            'minInvestment', 'interestRate', 'maturity', 'rating',
            'openDate', 'closeDate', 'description', 'features',
            'applyLink', 'isActive'
        ];

        fieldsToUpdate.forEach(field => {
            if (req.body[field] !== undefined) {
                investment[field] = req.body[field];
            }
        });

        await investment.save();

        res.json({
            success: true,
            investment
        });
    } catch (error) {
        console.error('Error updating investment:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Delete investment option
// @route   DELETE /api/investments/:id
// @access  Private/Admin
exports.deleteInvestment = async (req, res) => {
    try {
        const investment = await InvestmentOption.findById(req.params.id);

        if (!investment) {
            return res.status(404).json({
                success: false,
                message: 'Investment option not found'
            });
        }

        await investment.deleteOne();

        res.json({
            success: true,
            message: 'Investment option removed'
        });
    } catch (error) {
        console.error('Error deleting investment:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
