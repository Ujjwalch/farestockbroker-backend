const cron = require("node-cron");
const WorldIPO = require("../models/WorldIPO");
const { scrapeRenaissanceIpoCalendar } = require("../services/worldIpoScraper");

function startWorldIpoCron() {
  // Runs every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    try {
      console.log("[WorldIPO] Cron refresh started...");

      const scraped = await scrapeRenaissanceIpoCalendar();

      let upserts = 0;

      for (const item of scraped) {
        await WorldIPO.updateOne(
          { company: item.company, symbol: item.symbol, ipoDate: item.ipoDate },
          { $set: item },
          { upsert: true }
        );
        upserts++;
      }

      console.log(
        `[WorldIPO] Cron refresh done. scraped=${scraped.length}, upserts=${upserts}`
      );
    } catch (e) {
      console.error("[WorldIPO] Cron refresh failed:", e.message);
    }
  });

  console.log("[WorldIPO] Cron job scheduled (every 6 hours)");
}

module.exports = { startWorldIpoCron };
