const IPOCache = require('../models/IPOCache');
const { syncAllIPOData } = require('../services/ipoSyncService');

/**
 * Get all IPOs (Mainboard + SME) with all data in one call
 */
exports.getAllIPOs = async (req, res) => {
  try {
    const { type, status } = req.query;
    
    // Build query
    const query = {};
    if (type) query.type = type; // 'Mainboard' or 'SME'
    if (status) query.status = status; // 'upcoming', 'open', 'closed', 'listed'
    
    // Fetch from database
    const ipos = await IPOCache.find(query)
      .sort({ listingDate: -1, startDate: -1 })
      .lean();
    
    // Check if data is stale (> 30 minutes)
    const latestSync = ipos.length > 0 ? ipos[0].lastSynced : null;
    const isStale = !latestSync || (Date.now() - new Date(latestSync).getTime() > 30 * 60 * 1000);
    
    if (isStale) {
      console.log('⚠️  IPO data is stale, triggering background sync...');
      // Trigger sync in background (don't wait)
      syncAllIPOData().catch(err => console.error('Background sync failed:', err));
    }
    
    return res.json({
      success: true,
      data: ipos,
      meta: {
        total: ipos.length,
        lastSynced: latestSync,
        isStale
      }
    });
    
  } catch (error) {
    console.error('Error fetching IPOs:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get Mainboard IPOs only
 */
exports.getMainboardIPOs = async (req, res) => {
  try {
    const ipos = await IPOCache.find({ type: 'Mainboard' })
      .sort({ listingDate: -1, startDate: -1 })
      .lean();
    
    return res.json({
      success: true,
      data: ipos
    });
  } catch (error) {
    console.error('Error fetching Mainboard IPOs:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get SME IPOs only
 */
exports.getSMEIPOs = async (req, res) => {
  try {
    const ipos = await IPOCache.find({ type: 'SME' })
      .sort({ listingDate: -1, startDate: -1 })
      .lean();
    
    return res.json({
      success: true,
      data: ipos
    });
  } catch (error) {
    console.error('Error fetching SME IPOs:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get single IPO by ID
 */
exports.getIPOById = async (req, res) => {
  try {
    const { ipoId } = req.params;
    
    const ipo = await IPOCache.findOne({ ipoId: parseInt(ipoId) }).lean();
    
    if (!ipo) {
      return res.status(404).json({
        success: false,
        message: 'IPO not found'
      });
    }
    
    return res.json({
      success: true,
      data: ipo
    });
  } catch (error) {
    console.error('Error fetching IPO:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Force sync IPO data (admin only)
 */
exports.forceSyncIPOs = async (req, res) => {
  try {
    console.log('🔄 Manual sync triggered...');
    const result = await syncAllIPOData();
    
    return res.json({
      success: true,
      message: 'IPO data synced successfully',
      data: result
    });
  } catch (error) {
    console.error('Error syncing IPOs:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get sync status
 */
exports.getSyncStatus = async (req, res) => {
  try {
    const totalIPOs = await IPOCache.countDocuments();
    const latestIPO = await IPOCache.findOne().sort({ lastSynced: -1 }).lean();
    
    const lastSynced = latestIPO?.lastSynced;
    const timeSinceSync = lastSynced ? Date.now() - new Date(lastSynced).getTime() : null;
    const minutesSinceSync = timeSinceSync ? Math.floor(timeSinceSync / 1000 / 60) : null;
    
    return res.json({
      success: true,
      data: {
        totalIPOs,
        lastSynced,
        minutesSinceSync,
        isStale: minutesSinceSync > 30,
        byType: {
          mainboard: await IPOCache.countDocuments({ type: 'Mainboard' }),
          sme: await IPOCache.countDocuments({ type: 'SME' })
        },
        byStatus: {
          upcoming: await IPOCache.countDocuments({ status: 'upcoming' }),
          open: await IPOCache.countDocuments({ status: 'open' }),
          closed: await IPOCache.countDocuments({ status: 'closed' }),
          listed: await IPOCache.countDocuments({ status: 'listed' })
        }
      }
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
