const axios = require('axios');
const IPOCache = require('../models/IPOCache');
const ListingPrice = require('../models/ListingPrice');

const IPO_API_BASE_URL = process.env.IPO_API_BASE_URL || 'https://iponotify.me';
const IPO_API_KEY_BASE = process.env.IPO_API_KEY_BASE;
const IPO_API_KEY_ENTERPRISE = process.env.IPO_API_KEY_ENTERPRISE;

/**
 * Sync all IPO data from external API to database
 */
async function syncAllIPOData() {
  try {
    console.log('\n🔄 Starting IPO data sync...');
    
    // Check if API credentials are configured
    if (!IPO_API_KEY_BASE) {
      console.error('❌ IPO API credentials not configured');
      console.error('   Please set IPO_API_KEY_BASE environment variable');
      return { success: false, error: 'API credentials not configured' };
    }
    
    const startTime = Date.now();
    
    // Fetch data from external API
    const allIPOs = await fetchAllIPOs();
    const mainboardData = allIPOs.filter(ipo => ipo.type === 'Mainboard');
    const smeData = allIPOs.filter(ipo => ipo.type === 'SME');
    
    console.log(`📊 Fetched: ${mainboardData.length} Mainboard, ${smeData.length} SME`);
    
    // Combine all IPOs (they're already converted)
    const allIPOsForSync = [...mainboardData, ...smeData];
    
    // Sync each IPO
    let updated = 0;
    let created = 0;
    let gmpFetched = 0;
    let gmpAttempted = 0;
    
    for (const ipo of allIPOsForSync) {
      try {
        const status = getIPOStatus(ipo.startDate, ipo.endDate, ipo.listingDate);
        
        // Fetch GMP data from Enterprise API if available
        let gmpData = null;
        if (IPO_API_KEY_ENTERPRISE && (status === 'open' || status === 'upcoming' || status === 'closed')) {
          gmpAttempted++;
          gmpData = await fetchIPOGMPData(ipo.ipoId);
          if (gmpData && gmpData.gmpPrice) {
            gmpFetched++;
            if (gmpFetched % 10 === 0) {
              console.log(`   💰 GMP Progress: ${gmpFetched}/${gmpAttempted} fetched`);
            }
          }
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Get listing price if listed
        let listingPriceData = null;
        if (status === 'listed') {
          listingPriceData = await ListingPrice.findOne({ ipoId: ipo.ipoId });
        }
        
        const ipoData = {
          ipoId: ipo.ipoId,
          companyName: ipo.companyName,
          companyLogo: ipo.companyLogo,
          companyShortName: ipo.companyShortName,
          type: ipo.type,
          exchanged: ipo.exchanged,
          issueType: ipo.issueType,
          symbol: ipo.symbol,
          sector: ipo.sector,
          startDate: ipo.startDate,
          endDate: ipo.endDate,
          allotmentDate: ipo.allotmentDate,
          listingDate: ipo.listingDate,
          lotSize: ipo.lotSize,
          minimumPrice: ipo.minimumPrice,
          maximumPrice: ipo.maximumPrice,
          issuePrice: ipo.issuePrice,
          totalIssuePrice: ipo.totalIssuePrice,
          faceValue: ipo.faceValue,
          minBidQuantity: ipo.minBidQuantity,
          cutOffPrice: ipo.cutOffPrice,
          registrar: ipo.registrar,
          status,
          lastSynced: new Date(),
          
          // Rich details from new API
          aboutCompany: ipo.aboutCompany,
          pros: ipo.pros || [],
          cons: ipo.cons || [],
          documentUrl: ipo.documentUrl,
          rtaLink: ipo.rtaLink,
          dailyStartTime: ipo.dailyStartTime,
          dailyEndTime: ipo.dailyEndTime,
          lastBidPlaceTime: ipo.lastBidPlaceTime,
          isAllotmentAnnounced: ipo.isAllotmentAnnounced,
          preApplyOpen: ipo.preApplyOpen,
          subscriptionRates: ipo.subscriptionRates,
          listing: ipo.listing,
          
          // GMP data - use from Enterprise API if available, otherwise from IPO object
          gmpPrice: gmpData?.gmpPrice || ipo.gmpPrice || null,
          estimatedListingPrice: gmpData?.estimatedListingPrice || ipo.estimatedListingPrice || null,
          estimatedListingPercentage: gmpData?.estimatedListingPercentage || ipo.estimatedListingPercentage || null,
          gmpLastUpdate: gmpData?.gmpLastUpdate || ipo.gmpLastUpdate || null,
          
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
    console.log(`✅ Sync complete: ${created} created, ${updated} updated, ${gmpFetched} with GMP in ${duration}s\n`);
    
    return { success: true, created, updated, gmpFetched, total: allIPOsForSync.length };
    
  } catch (error) {
    console.error('❌ IPO sync failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to make API requests (uses Base API by default)
 */
async function makeAPIRequest(endpoint, useEnterprise = false) {
  const apiKey = useEnterprise ? IPO_API_KEY_ENTERPRISE : IPO_API_KEY_BASE;
  
  try {
    const response = await axios.get(`${IPO_API_BASE_URL}${endpoint}`, {
      headers: {
        'X-API-KEY': apiKey
      },
      timeout: 30000
    });
    return response.data;
  } catch (error) {
    console.error(`   ❌ API request failed (${useEnterprise ? 'Enterprise' : 'Base'} key):`, error.message);
    
    // If base key fails, try enterprise key as fallback
    if (!useEnterprise && IPO_API_KEY_ENTERPRISE) {
      console.log('   🔄 Retrying with Enterprise API key...');
      return makeAPIRequest(endpoint, true);
    }
    
    throw error;
  }
}

/**
 * Convert iponotify.me data to our format
 */
function convertIPOData(ipoData) {
  return {
    ipoId: ipoData.searchId,
    companyName: ipoData.companyName,
    companyLogo: ipoData.logoUrl || ipoData.companyLogo || null,
    type: ipoData.isSme ? 'SME' : 'Mainboard',
    exchanged: ipoData.exchange || 'NSE',
    issueType: ipoData.issueType,
    symbol: ipoData.symbol,
    startDate: ipoData.startDate || ipoData.openDate,
    endDate: ipoData.endDate || ipoData.closeDate,
    allotmentDate: ipoData.allotmentDate,
    listingDate: ipoData.listingDate || ipoData.listing?.listingDate,
    lotSize: ipoData.lotSize,
    minimumPrice: ipoData.minPrice || ipoData.minimumPrice,
    maximumPrice: ipoData.maxPrice || ipoData.maximumPrice,
    issuePrice: ipoData.issuePrice,
    totalIssuePrice: ipoData.issueSize || ipoData.totalIssuePrice,
    sector: ipoData.sector,
    registrar: ipoData.registrar,
    faceValue: ipoData.faceValue,
    minBidQuantity: ipoData.minBidQuantity,
    cutOffPrice: ipoData.cutOffPrice,
    
    // Additional details from new API
    companyShortName: ipoData.companyShortName,
    aboutCompany: ipoData.aboutCompany,
    pros: ipoData.pros,
    cons: ipoData.cons,
    documentUrl: ipoData.documentUrl,
    rtaLink: ipoData.rtaLink,
    status: ipoData.status,
    dailyStartTime: ipoData.dailyStartTime,
    dailyEndTime: ipoData.dailyEndTime,
    lastBidPlaceTime: ipoData.lastBidPlaceTime,
    isAllotmentAnnounced: ipoData.isAllotmentAnnounced,
    preApplyOpen: ipoData.preApplyOpen,
    subscriptionRates: ipoData.subscriptionRates,
    listing: ipoData.listing,
    
    // GMP data from API (if available)
    gmpPrice: ipoData.gmp || ipoData.gmpPrice || null,
    estimatedListingPrice: ipoData.estimatedListingPrice || null,
    estimatedListingPercentage: ipoData.estimatedListingPercentage || ipoData.gmpPercentage || null,
    gmpLastUpdate: ipoData.gmpLastUpdate || ipoData.gmpUpdatedAt || null,
  };
}

/**
 * Fetch all IPOs from external API (up to 1000 total)
 */
async function fetchAllIPOs() {
  try {
    console.log('   Fetching IPOs from all statuses...');
    
    // API supports: open, upcoming, closed
    const statuses = ['open', 'upcoming', 'closed'];
    const allIPOs = [];
    const maxPerStatus = 350; // ~1000 total across 3 statuses
    
    for (const status of statuses) {
      try {
        console.log(`   Fetching ${status} IPOs...`);
        
        // Fetch multiple pages to get up to maxPerStatus IPOs
        let page = 1;
        let hasMore = true;
        let statusIPOs = [];
        
        while (hasMore && statusIPOs.length < maxPerStatus) {
          const endpoint = `/api/ipo/${status}?page=${page}&limit=100`;
          const data = await makeAPIRequest(endpoint);
          
          if (data.ipos && Array.isArray(data.ipos) && data.ipos.length > 0) {
            const convertedIPOs = data.ipos.map(convertIPOData);
            statusIPOs.push(...convertedIPOs);
            console.log(`   📄 ${status} page ${page}: ${convertedIPOs.length} IPOs (total: ${statusIPOs.length})`);
            
            // Check if there are more pages
            if (data.ipos.length < 100 || statusIPOs.length >= maxPerStatus) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }
        
        allIPOs.push(...statusIPOs.slice(0, maxPerStatus));
        console.log(`   ✅ ${status}: ${statusIPOs.length} IPOs fetched`);
      } catch (error) {
        console.error(`   ❌ Failed to fetch ${status} IPOs:`, error.message);
      }
    }
    
    // Limit to 1000 total IPOs
    const limitedIPOs = allIPOs.slice(0, 1000);
    console.log(`   📊 Total IPOs fetched: ${limitedIPOs.length} (limit: 1000)`);
    
    return limitedIPOs;
  } catch (error) {
    console.error('   ❌ Failed to fetch IPOs:', error.message);
    throw error;
  }
}

/**
 * Fetch mainboard IPOs from external API
 */
async function fetchMainboardIPOs() {
  const allIPOs = await fetchAllIPOs();
  return allIPOs.filter(ipo => ipo.type === 'Mainboard');
}

/**
 * Fetch SME IPOs from external API
 */
async function fetchSMEIPOs() {
  const allIPOs = await fetchAllIPOs();
  return allIPOs.filter(ipo => ipo.type === 'SME');
}

/**
 * Fetch GMP data for a specific IPO using Enterprise API
 */
async function fetchIPOGMPData(searchId) {
  try {
    if (!IPO_API_KEY_ENTERPRISE) {
      return null;
    }
    
    // Correct endpoint according to API docs
    const endpoint = `/api/ipo/id/${searchId}`;
    const response = await axios.get(`${IPO_API_BASE_URL}${endpoint}`, {
      headers: {
        'X-API-KEY': IPO_API_KEY_ENTERPRISE
      },
      timeout: 10000
    });
    
    if (response.data) {
      const ipoDetails = response.data;
      return {
        gmpPrice: ipoDetails.gmp || ipoDetails.gmpPrice || null,
        estimatedListingPrice: ipoDetails.estimatedListingPrice || null,
        estimatedListingPercentage: ipoDetails.estimatedListingPercentage || ipoDetails.gmpPercentage || null,
        gmpLastUpdate: ipoDetails.gmpLastUpdate || ipoDetails.gmpUpdatedAt || null,
      };
    }
    
    return null;
  } catch (error) {
    // Silently fail for GMP data - it's optional
    return null;
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
  console.log('⚠️  Subscription data not available in new API');
  console.log('✅ Subscription data sync skipped\n');
}

module.exports = {
  syncAllIPOData,
  syncSubscriptionData,
  getIPOStatus
};
