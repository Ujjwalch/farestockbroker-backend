const WorldIPO = require("../models/WorldIPO");
const { scrapeRenaissanceIpoCalendar } = require("../services/worldIpoScraper");
const { scrapeAllIndianIPOs } = require("../services/indiaIpoScraper");

/**
 * GET /api/ipo
 * Returns DB stored IPOs
 */
exports.getAllIPOs = async (req, res) => {
  try {
    const { upcoming = "true", limit = "100" } = req.query;

    let query = {};
    if (upcoming === "true") {
      query = { ipoDate: { $ne: null } };
    }

    const data = await WorldIPO.find(query)
      .sort({ ipoDate: 1, company: 1 })
      .limit(Number(limit));

    return res.json({ success: true, count: data.length, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/ipo/:id
 * Get IPO details by ID
 */
exports.getIPODetails = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await WorldIPO.findById(id);

    if (!data) {
      return res.status(404).json({ success: false, message: "IPO not found" });
    }

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/ipo/refresh
 * Scrapes fresh IPOs and stores in DB
 */
exports.refreshIPOs = async (req, res) => {
  try {
    // Scrape from both sources
    const [worldIPOs, indiaIPOs] = await Promise.all([
      scrapeRenaissanceIpoCalendar().catch(err => {
        console.error('[World IPO] Error:', err.message);
        return [];
      }),
      scrapeAllIndianIPOs().catch(err => {
        console.error('[India IPO] Error:', err.message);
        return [];
      })
    ]);

    const scraped = [...worldIPOs, ...indiaIPOs];

    let inserted = 0;
    let updated = 0;

    for (const item of scraped) {
      const filter = {
        company: item.company,
        source: item.source,
      };

      const updateDoc = { $set: item };

      const existing = await WorldIPO.findOne(filter);
      if (!existing) {
        await WorldIPO.create(item);
        inserted++;
      } else {
        await WorldIPO.updateOne({ _id: existing._id }, updateDoc);
        updated++;
      }
    }

    return res.json({
      success: true,
      scraped: scraped.length,
      inserted,
      updated,
    });
  } catch (err) {
    console.error('[IPO] Refresh error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
