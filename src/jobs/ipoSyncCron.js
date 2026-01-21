const cron = require('node-cron');
const { syncAllIPOData } = require('../services/ipoSyncService');

/**
 * Start IPO sync cron job
 * Runs every 15 minutes to keep data fresh
 */
function startIPOSyncCron() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('\n⏰ IPO Sync Cron Job Started');
    try {
      await syncAllIPOData();
    } catch (error) {
      console.error('❌ IPO Sync Cron Job Failed:', error.message);
    }
  });
  
  console.log('✅ IPO Sync Cron Job Scheduled (every 15 minutes)');
  
  // Run initial sync on startup
  console.log('🚀 Running initial IPO sync...');
  syncAllIPOData().catch(err => {
    console.error('❌ Initial IPO sync failed:', err.message);
  });
}

module.exports = { startIPOSyncCron };
