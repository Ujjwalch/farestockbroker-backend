const express = require('express');
const router = express.Router();
const marketDataService = require('../services/marketDataService');

// Get Major Indices
router.get('/indices', async (req, res) => {
    try {
        const data = await marketDataService.getIndices();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch indices', error: error.message });
    }
});

// Get Top Gainers & Losers
router.get('/movers', async (req, res) => {
    try {
        const data = await marketDataService.getTopMovers();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch movers', error: error.message });
    }
});

module.exports = router;
