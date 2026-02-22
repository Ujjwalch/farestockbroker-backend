const cron = require('node-cron');
const { scrapeAllInvestments } = require('../services/investmentScraperService');

/**
 * Start Investment scraper cron job
 * Runs every 6 hours to keep investment data fresh
 * Currently scrapes: NCDs only
 * Note: Bonds and AIFs require manual entry as they're not publicly offered like NCDs
 */
function startInvestmentScraperCron() {
  // Run every 6 hours (at 00:00, 06:00, 12:00, 18:00)
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n⏰ Investment Scraper Cron Job Started');
    try {
      const result = await scrapeAllInvestments();
      if (result.success) {
        console.log(`✅ Investment scraping completed:`);
        console.log(`   📊 Total: ${result.total} items`);
        console.log(`   ➕ Inserted: ${result.inserted}`);
        console.log(`   🔄 Updated: ${result.updated}`);
        if (result.breakdown) {
          console.log(`   📋 Breakdown: ${result.breakdown.ncds} NCDs, ${result.breakdown.bonds} Bonds`);
        }
      } else {
        console.log('⚠️ Investment scraping completed with warnings');
      }
    } catch (error) {
      console.error('❌ Investment Scraper Cron Job Failed:', error.message);
    }
  });
  
  console.log('✅ Investment Scraper Cron Job Scheduled (every 6 hours)');
  console.log('   📦 Will scrape: NCDs, Corporate Bonds, Government Bonds');
  
  // Run initial scrape on startup
  console.log('🚀 Running initial investment data scrape...');
  scrapeAllInvestments().catch(err => {
    console.error('❌ Initial investment scrape failed:', err.message);
  });
}

module.exports = { startInvestmentScraperCron };
