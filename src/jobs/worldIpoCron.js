const cron = require("node-cron");
const WorldIPO = require("../models/WorldIPO");
const { scrapeRenaissanceIpoCalendar } = require("../services/worldIpoScraper");

function startWorldIpoCron() {
  // Runs every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    try {
      console.log("[WorldIPO] Cron refresh started...");

      const worldIPOs = await scrapeRenaissanceIpoCalendar().catch(err => {
        console.error('[World IPO Cron] Error:', err.message);
        return [];
      });

      let upserts = 0;

      for (const item of worldIPOs) {
        await WorldIPO.updateOne(
          { company: item.company, source: item.source },
          { $set: item },
          { upsert: true }
        );
        upserts++;
      }

      console.log(
        `[WorldIPO] Cron refresh done. scraped=${worldIPOs.length}, upserts=${upserts}`
      );
    } catch (e) {
      console.error("[WorldIPO] Cron refresh failed:", e.message);
    }
  });

  console.log("[WorldIPO] Cron job scheduled (every 6 hours)");
}

module.exports = { startWorldIpoCron };
