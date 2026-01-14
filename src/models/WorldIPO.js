const mongoose = require("mongoose");

const WorldIPOSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    symbol: { type: String, default: null },
    exchange: { type: String, default: null },
    ipoDate: { type: String, default: null }, // YYYY-MM-DD
    priceRange: { type: String, default: null },
    shares: { type: String, default: null },
    estVolume: { type: String, default: null },

    source: { type: String, default: "RenaissanceCapital" },
    sourceUrl: { type: String, default: null },
  },
  { timestamps: true }
);

// Prevent duplicates
WorldIPOSchema.index({ company: 1, symbol: 1, ipoDate: 1 }, { unique: true });

module.exports = mongoose.model("WorldIPO", WorldIPOSchema);
