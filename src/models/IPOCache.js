const mongoose = require("mongoose");

const IPOCacheSchema = new mongoose.Schema(
  {
    ipoId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    
    // Basic IPO Info
    companyName: { type: String, required: true },
    companyLogo: { type: String },
    companyShortName: { type: String },
    type: { type: String, enum: ['Mainboard', 'SME'], required: true },
    exchanged: { type: String },
    issueType: { type: String },
    symbol: { type: String },
    sector: { type: String },
    
    // Dates
    startDate: { type: String },
    endDate: { type: String },
    allotmentDate: { type: String },
    listingDate: { type: String },
    
    // Pricing
    lotSize: { type: Number },
    minimumPrice: { type: Number },
    maximumPrice: { type: Number },
    issuePrice: { type: Number },
    totalIssuePrice: { type: String },
    faceValue: { type: Number },
    minBidQuantity: { type: Number },
    cutOffPrice: { type: Number },
    
    // Company Details
    aboutCompany: { type: mongoose.Schema.Types.Mixed },
    pros: [{ type: String }],
    cons: [{ type: String }],
    
    // Links and Documents
    documentUrl: { type: String },
    rtaLink: { type: String },
    
    // Timing
    dailyStartTime: { type: String },
    dailyEndTime: { type: String },
    lastBidPlaceTime: { type: String },
    
    // Status Flags
    isAllotmentAnnounced: { type: Boolean },
    preApplyOpen: { type: Boolean },
    
    // Additional Data
    subscriptionRates: { type: mongoose.Schema.Types.Mixed },
    listing: { type: mongoose.Schema.Types.Mixed },
    registrar: { type: String },
    
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
