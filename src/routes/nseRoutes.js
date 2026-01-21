const express = require('express');
const router = express.Router();
const nseController = require('../controllers/nseController');

// Get listing price for a single company
// GET /api/nse/listing-price?companyName=Bajaj Housing Finance Limited
// OR
// GET /api/nse/listing-price?symbol=BAJAJHFL
router.get('/listing-price', nseController.getListingPrice);

// Batch fetch listing prices
// POST /api/nse/batch-listing-prices
// Body: { ipos: [{ ipoId: 108, companyName: "Bajaj Housing Finance Limited" }] }
router.post('/batch-listing-prices', nseController.getBatchListingPrices);

module.exports = router;
