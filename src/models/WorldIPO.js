const mongoose = require("mongoose");

const WorldIPOSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    symbol: { type: String, default: null },
    exchange: { type: String, default: null },
    
    // Dates
    openDate: { type: String, default: null }, // YYYY-MM-DD
    closeDate: { type: String, default: null },
    listingDate: { type: String, default: null },
    ipoDate: { type: String, default: null }, // For backward compatibility
    
    // Pricing
    issuePrice: { type: String, default: null },
    priceRange: { type: String, default: null },
    lotSize: { type: String, default: null },
    
    // Size
    issueSize: { type: String, default: null },
    shares: { type: String, default: null },
    estVolume: { type: String, default: null },
    
    // Status & GMP
    status: { type: String, default: null },
    gmp: { type: String, default: null },

    // Source
    source: { type: String, default: "RenaissanceCapital" },
    sourceUrl: { type: String, default: null },
  },
  { timestamps: true }
);

// Prevent duplicates - company + source combination
WorldIPOSchema.index({ company: 1, source: 1 }, { unique: true });

module.exports = mongoose.model("WorldIPO", WorldIPOSchema);
