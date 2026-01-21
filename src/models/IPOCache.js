const mongoose = require("mongoose");

const IPOCacheSchema = new mongoose.Schema(
  {
    ipoId: { 
      type: Number, 
      required: true, 
      unique: true,
      index: true 
    },
    
    // Basic IPO Info
    companyName: { type: String, required: true },
    companyLogo: { type: String },
    type: { type: String, enum: ['Mainboard', 'SME'], required: true },
    exchanged: { type: String },
    issueType: { type: String },
    symbol: { type: String },
    
    // Dates
    startDate: { type: String },
    endDate: { type: String },
    allotmentDate: { type: String },
    listingDate: { type: String },
    
    // Pricing
    lotSize: { type: Number },
    minimumPrice: { type: Number },
    maximumPrice: { type: Number },
    totalIssuePrice: { type: String },
    
    // GMP Data
    gmpPrice: { type: Number },
    estimatedListingPrice: { type: String },
    estimatedListingPercentage: { type: String },
    gmpLastUpdate: { type: String },
    
    // Subscription Data
    subscriptionTimes: { type: String },
    
    // Listing Price (from Yahoo Finance)
    listingPrice: { type: Number },
    lastPrice: { type: Number },
    ticker: { type: String },
    
    // Metadata
    lastSynced: { type: Date, default: Date.now },
    dataSource: { type: String, default: 'IPO API' },
    status: { type: String, enum: ['upcoming', 'open', 'closed', 'listed'], index: true },
  },
  { 
    timestamps: true 
  }
);

// Indexes for efficient queries
IPOCacheSchema.index({ type: 1, status: 1 });
IPOCacheSchema.index({ lastSynced: 1 });
IPOCacheSchema.index({ listingDate: 1 });

module.exports = mongoose.model("IPOCache", IPOCacheSchema);
