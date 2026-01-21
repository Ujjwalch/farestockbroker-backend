const axios = require('axios');
const IPOCache = require('../models/IPOCache');
const ListingPrice = require('../models/ListingPrice');

const IPO_API_KEY = process.env.IPO_API_KEY;
const IPO_API_SECRET = process.env.IPO_API_SECRET;

/**
 * Sync all IPO data from external API to database
 */
async function syncAllIPOData() {
  try {
    console.log('\n🔄 Starting IPO data sync...');
    
    // Check if API credentials are configured
    if (!IPO_API_KEY || !IPO_API_SECRET) {
      console.error('❌ IPO API credentials not configured');
      console.error('   Please set IPO_API_KEY and IPO_API_SECRET environment variables');
      return { success: false, error: 'API credentials not configured' };
    }
    
    const startTime = Date.now();
    
    // Fetch data from external API
    const [mainboardData, smeData, gmpData] = await Promise.all([
      fetchMainboardIPOs(),
      fetchSMEIPOs(),
      fetchGMPList()
    ]);
    
    console.log(`📊 Fetched: ${mainboardData.length} Mainboard, ${smeData.length} SME, ${gmpData.length} GMP entries`);
    
    // Combine all IPOs
    const allIPOs = [
      ...mainboardData.map(ipo => ({ ...ipo, type: 'Mainboard' })),
      ...smeData.map(ipo => ({ ...ipo, type: 'SME' }))
    ];
    
    // Create GMP map
    const gmpMap = new Map();
    gmpData.forEach(item => {
      gmpMap.set(item.ipoId, item);
    });
    
    // Sync each IPO
    let updated = 0;
    let created = 0;
    
    for (const ipo of allIPOs) {
      try {
        const gmpInfo = gmpMap.get(ipo.ipoId);
        const status = getIPOStatus(ipo.startDate, ipo.endDate, ipo.listingDate);
        
        // Get listing price if listed
        let listingPriceData = null;
        if (status === 'listed') {
          listingPriceData = await ListingPrice.findOne({ ipoId: ipo.ipoId });
        }
        
        const ipoData = {
          ipoId: ipo.ipoId,
          companyName: ipo.companyName,
          companyLogo: ipo.companyLogo,
          type: ipo.type,
          exchanged: ipo.exchanged,
          issueType: ipo.issueType,
          symbol: ipo.symbol,
          startDate: ipo.startDate,
          endDate: ipo.endDate,
          allotmentDate: ipo.allotmentDate,
          listingDate: ipo.listingDate,
          lotSize: ipo.lotSize,
          minimumPrice: ipo.minimumPrice,
          maximumPrice: ipo.maximumPrice,
          totalIssuePrice: ipo.totalIssuePrice,
          status,
          lastSynced: new Date(),
          
          // GMP data
          gmpPrice: gmpInfo?.gmpPrice || null,
          estimatedListingPrice: gmpInfo?.estimatedListingPrice || null,
          estimatedListingPercentage: gmpInfo?.estimatedListingPercentage || null,
          gmpLastUpdate: gmpInfo?.lastUpdate || null,
          
          // Listing price data
          listingPrice: listingPriceData?.listingPrice || null,
          lastPrice: listingPriceData?.lastPrice || null,
          ticker: listingPriceData?.ticker || null,
        };
        
        const result = await IPOCache.findOneAndUpdate(
          { ipoId: ipo.ipoId },
          ipoData,
          { upsert: true, new: true }
        );
        
        if (result.isNew) created++;
        else updated++;
        
      } catch (err) {
        console.error(`Error syncing IPO ${ipo.ipoId}:`, err.message);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Sync complete: ${created} created, ${updated} updated in ${duration}s\n`);
    
    return { success: true, created, updated, total: allIPOs.length };
    
  } catch (error) {
    console.error('❌ IPO sync failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch mainboard IPOs from external API
 */
async function fetchMainboardIPOs() {
  try {
    console.log('   Fetching Mainboard IPOs...');
    const response = await axios.get('https://api.ipoapi.in/api/ipo/mainboard', {
      headers: {
        ApiKey: IPO_API_KEY,
        ApiSecret: IPO_API_SECRET
      },
      timeout: 30000
    });
    console.log(`   ✅ Mainboard: ${response.data.data?.length || 0} IPOs`);
    return response.data.data || [];
  } catch (error) {
    console.error(`   ❌ Mainboard fetch failed: ${error.message}`);
    if (error.response) {
      console.error(`      Status: ${error.response.status}`);
      console.error(`      URL: ${error.config?.url}`);
    }
    throw error;
  }
}

/**
 * Fetch SME IPOs from external API
 */
async function fetchSMEIPOs() {
  try {
    console.log('   Fetching SME IPOs...');
    const response = await axios.get('https://api.ipoapi.in/api/ipo/sme', {
      headers: {
        ApiKey: IPO_API_KEY,
        ApiSecret: IPO_API_SECRET
      },
      timeout: 30000
    });
    console.log(`   ✅ SME: ${response.data.data?.length || 0} IPOs`);
    return response.data.data || [];
  } catch (error) {
    console.error(`   ❌ SME fetch failed: ${error.message}`);
    if (error.response) {
      console.error(`      Status: ${error.response.status}`);
      console.error(`      URL: ${error.config?.url}`);
    }
    throw error;
  }
}

/**
 * Fetch GMP list from external API
 */
async function fetchGMPList() {
  try {
    console.log('   Fetching GMP List...');
    const response = await axios.get('https://api.ipoapi.in/api/gmp/list', {
      params: { page: 1, limit: 1000 },
      headers: {
        ApiKey: IPO_API_KEY,
        ApiSecret: IPO_API_SECRET
      },
      timeout: 30000
    });
    console.log(`   ✅ GMP: ${response.data.data?.length || 0} entries`);
    return response.data.data || [];
  } catch (error) {
    console.error(`   ❌ GMP fetch failed: ${error.message}`);
    if (error.response) {
      console.error(`      Status: ${error.response.status}`);
      console.error(`      URL: ${error.config?.url}`);
    }
    throw error;
  }
}

/**
 * Determine IPO status
 */
function getIPOStatus(startDate, endDate, listingDate) {
  if (!startDate || !endDate) return 'upcoming';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const listing = listingDate ? new Date(listingDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (listing && today >= listing) return 'listed';
  if (today >= start && today <= end) return 'open';
  if (today < start) return 'upcoming';
  return 'closed';
}

/**
 * Sync subscription data for specific IPOs
 */
async function syncSubscriptionData(ipoIds) {
  console.log(`\n📊 Syncing subscription data for ${ipoIds.length} IPOs...`);
  
  for (const ipoId of ipoIds) {
    try {
      const response = await axios.get(`https://api.ipoapi.in/api/ipo/${ipoId}/subscription`, {
        headers: {
          ApiKey: IPO_API_KEY,
          ApiSecret: IPO_API_SECRET
        }
      });
      
      if (response.data.data && Array.isArray(response.data.data)) {
        const totalSub = response.data.data.find(item => item.subscriptionCategory === 0);
        if (totalSub) {
          await IPOCache.findOneAndUpdate(
            { ipoId },
            { subscriptionTimes: totalSub.subscriptionTimes }
          );
        }
      }
    } catch (err) {
      console.error(`Failed to sync subscription for IPO ${ipoId}:`, err.message);
    }
  }
  
  console.log('✅ Subscription data synced\n');
}

module.exports = {
  syncAllIPOData,
  syncSubscriptionData,
  getIPOStatus
};
