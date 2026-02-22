const mongoose = require("mongoose");

const ListingPriceSchema = new mongoose.Schema(
  {
    ipoId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    companyName: { type: String, required: true },
    symbol: { type: String, required: true },
    ticker: { type: String, required: true }, // e.g., AMAGI.NS or GRERENEW.BO
    
    // Price data
    listingPrice: { type: Number, required: true },
    lastPrice: { type: Number, default: null },
    
    // Metadata
    listingDate: { type: String, required: true }, // YYYY-MM-DD
    isSME: { type: Boolean, default: false },
    exchange: { type: String, enum: ['NSE', 'BSE'], required: true },
    
    // Tracking
    lastFetched: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    fetchCount: { type: Number, default: 1 },
    
    // Status
    isVerified: { type: Boolean, default: false },
    dataSource: { type: String, default: 'Yahoo Finance' },
  },
  { 
    timestamps: true 
  }
);

// Index for efficient queries
ListingPriceSchema.index({ lastUpdated: 1 });
ListingPriceSchema.index({ isSME: 1 });

module.exports = mongoose.model("ListingPrice", ListingPriceSchema);
