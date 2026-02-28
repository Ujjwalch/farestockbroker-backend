const axios = require('axios');

const IPO_API_BASE_URL = process.env.IPO_API_BASE_URL || 'https://iponotify.me';
const IPO_API_KEY_BASE = process.env.IPO_API_KEY_BASE;
const IPO_API_KEY_ENTERPRISE = process.env.IPO_API_KEY_ENTERPRISE;

// Helper function to make IPO API requests with Enterprise key first
const makeIPORequest = async (endpoint, useEnterprise = true) => {
  const apiKey = useEnterprise ? IPO_API_KEY_ENTERPRISE : IPO_API_KEY_BASE;
  
  try {
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${IPO_API_BASE_URL}${endpoint}`,
      headers: {
        'X-API-KEY': apiKey
      }
    };

    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error(`IPO API Error (${useEnterprise ? 'Enterprise' : 'Base'} key):`, error.message);
    
    // If enterprise key fails, try base key
    if (useEnterprise && IPO_API_KEY_BASE) {
      console.log('Retrying with Base API key...');
      return makeIPORequest(endpoint, false);
    }
    
    throw new Error(error.response?.data?.message || 'Failed to fetch IPO data');
  }
};

// Helper function to convert iponotify.me data to our format
const convertIPOData = (ipoData) => {
  return {
    ipoId: ipoData.searchId,
    companyName: ipoData.companyName,
    companyLogo: ipoData.logoUrl || ipoData.companyLogo || null,
    type: ipoData.isSme ? 'SME' : 'Mainboard',
    exchanged: ipoData.exchange || 'NSE',
    issueType: ipoData.issueType,
    symbol: ipoData.symbol,
    
    // Timeline structure for frontend compatibility
    timeLine: {
      startDate: ipoData.startDate || ipoData.openDate,
      endDate: ipoData.endDate || ipoData.closeDate,
      allotmentDate: ipoData.allotmentDate,
      listingDate: ipoData.listingDate || ipoData.listing?.listingDate,
      refundDate: ipoData.refundDate,
      creditShareDate: ipoData.creditShareDate
    },
    
    // Keep flat structure for backward compatibility
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
    
    // GMP data from Enterprise API
    gmpPrice: ipoData.gmpPrice || ipoData.gmp?.price,
    estimatedListingPrice: ipoData.estimatedListingPrice || ipoData.gmp?.estimatedListing,
    estimatedListingPercentage: ipoData.estimatedListingPercentage || ipoData.gmp?.estimatedPercentage,
    gmpLastUpdate: ipoData.gmpLastUpdate || ipoData.gmp?.lastUpdate,
    
    // Additional details from Enterprise API
    // Handle fields that might be nested objects
    companyShortName: ipoData.companyShortName,
    aboutCompany: typeof ipoData.aboutCompany === 'object' && ipoData.aboutCompany?.aboutCompany 
      ? ipoData.aboutCompany.aboutCompany 
      : ipoData.aboutCompany,
    about: typeof ipoData.aboutCompany === 'object' && ipoData.aboutCompany?.aboutCompany 
      ? ipoData.aboutCompany.aboutCompany 
      : ipoData.aboutCompany, // Alias for frontend compatibility
    objectives: typeof ipoData.objectives === 'object' && ipoData.objectives?.objectives 
      ? ipoData.objectives.objectives 
      : ipoData.objectives,
    companyAddress: typeof ipoData.companyAddress === 'object' && ipoData.companyAddress?.companyAddress 
      ? ipoData.companyAddress.companyAddress 
      : ipoData.companyAddress,
    pros: ipoData.pros,
    cons: ipoData.cons,
    strengths: ipoData.strengths || ipoData.pros, // Map pros to strengths if strengths not available
    strength: ipoData.strength || ipoData.strengths || ipoData.pros, // Alias for frontend (singular)
    risks: ipoData.risks || ipoData.cons, // Map cons to risks if risks not available
    risk: ipoData.risk || ipoData.risks || ipoData.cons, // Alias for frontend (singular)
    financials: ipoData.financials,
    promoterHolding: ipoData.promoterHolding,
    peerComparison: ipoData.peerComparison,
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
    
    // Lot size details
    lotSizeDetails: ipoData.lotSizeDetails,
    
    // Valuation metrics
    valuations: ipoData.valuations
  };
};

// Get all mainboard IPOs
exports.getMainboardIPOs = async (req, res) => {
  try {
    const { page = 1, limit = 100, status } = req.query;
    
    // Build query
    const query = { type: 'Mainboard' };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Fetch from database cache
    const IPOCache = require('../models/IPOCache');
    const mainboardIPOs = await IPOCache.find(query)
      .sort({ startDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    const total = await IPOCache.countDocuments(query);
    
    res.json({
      success: true,
      isSuccess: true,
      message: 'Successfully fetched mainboard IPOs',
      totalRowCount: total,
      data: mainboardIPOs,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching mainboard IPOs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all SME IPOs
exports.getSMEIPOs = async (req, res) => {
  try {
    const { page = 1, limit = 100, status } = req.query;
    
    // Build query
    const query = { type: 'SME' };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Fetch from database cache
    const IPOCache = require('../models/IPOCache');
    const smeIPOs = await IPOCache.find(query)
      .sort({ startDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    const total = await IPOCache.countDocuments(query);
    
    res.json({
      success: true,
      isSuccess: true,
      message: 'Successfully fetched SME IPOs',
      totalRowCount: total,
      data: smeIPOs,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching SME IPOs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get IPO details by ID
exports.getIPODetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[IPO Details] ========================================`);
    console.log(`[IPO Details] Fetching details for ID: ${id}`);
    console.log(`[IPO Details] ========================================`);
    
    // First, try to get from cache (much faster and has all data)
    const IPOCache = require('../models/IPOCache');
    
    // Try to find by ipoId (which stores searchId from API)
    console.log(`[IPO Details] Step 1: Searching by ipoId...`);
    let cachedIPO = await IPOCache.findOne({ ipoId: id }).lean();
    
    // If not found by ipoId, try by symbol
    if (!cachedIPO) {
      console.log(`[IPO Details] Step 2: Not found by ipoId, trying symbol...`);
      cachedIPO = await IPOCache.findOne({ 
        symbol: { $regex: new RegExp(`^${id}$`, 'i') } 
      }).lean();
    }
    
    // If still not found, try case-insensitive search on company name
    if (!cachedIPO) {
      console.log(`[IPO Details] Step 3: Not found by symbol, trying company name...`);
      cachedIPO = await IPOCache.findOne({ 
        companyName: new RegExp(id.replace(/-/g, ' '), 'i') 
      }).lean();
    }
    
    if (cachedIPO) {
      console.log(`[IPO Details] ✓ Found in cache: ${cachedIPO.companyName}`);
      console.log(`[IPO Details] Fetching additional details from Enterprise API...`);
      
      // Try to get full details from Enterprise API
      try {
        const endpoint = `/api/ipo/id/${id}`;
        console.log(`[IPO Details] Calling Enterprise API: ${IPO_API_BASE_URL}${endpoint}`);
        const apiData = await makeIPORequest(endpoint, true);
        
        console.log(`[IPO Details] Enterprise API response:`, apiData ? 'Got response' : 'No response');
        console.log(`[IPO Details] Response has searchId:`, !!apiData?.searchId, 'companyName:', !!apiData?.companyName);
        
        if (apiData && apiData.searchId) {
          // Enterprise API returns data directly at root level (not wrapped in 'ipo' field)
          console.log(`[IPO Details] ✓ Got detailed data from Enterprise API`);
          
          // Also try to get data from Base API for additional fields
          let baseApiData = null;
          try {
            console.log(`[IPO Details] Also fetching from Base API for additional fields...`);
            const baseData = await makeIPORequest(endpoint, false);
            if (baseData && baseData.searchId) {
              baseApiData = baseData;
              console.log(`[IPO Details] ✓ Got additional data from Base API`);
            }
          } catch (baseError) {
            console.log(`[IPO Details] Base API failed (not critical):`, baseError.message);
          }
          
          // Convert both API responses
          const enterpriseData = convertIPOData(apiData);
          const baseData = baseApiData ? convertIPOData(baseApiData) : {};
          
          // Merge: cache < base < enterprise (enterprise takes highest priority)
          const mergedData = {
            ...cachedIPO,
            ...baseData,
            ...enterpriseData,
            // Ensure critical fields from cache are preserved
            _id: undefined,
            __v: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            lastSynced: undefined,
            dataSource: undefined
          };
          
          console.log(`[IPO Details] Returning merged data with ${Object.keys(mergedData).length} fields`);
          console.log(`[IPO Details] Has about:`, !!mergedData.about, 'objectives:', !!mergedData.objectives, 'financials:', !!mergedData.financials);
          return res.json({
            success: true,
            isSuccess: true,
            message: 'Successfully fetched IPO details',
            data: mergedData
          });
        } else {
          console.log(`[IPO Details] Enterprise API returned no valid data (missing searchId)`);
        }
      } catch (apiError) {
        console.log(`[IPO Details] Enterprise API failed:`, apiError.message);
        console.log(`[IPO Details] Error details:`, apiError.response?.status, apiError.response?.statusText);
      }
      
      // Fallback to cache data if API fails
      // Remove MongoDB internal fields
      delete cachedIPO._id;
      delete cachedIPO.__v;
      delete cachedIPO.createdAt;
      delete cachedIPO.updatedAt;
      delete cachedIPO.lastSynced;
      delete cachedIPO.dataSource;
      
      // Ensure all required fields exist with defaults
      const responseData = {
        ...cachedIPO,
        // Ensure timeLine structure exists
        timeLine: cachedIPO.timeLine || {
          startDate: cachedIPO.startDate,
          endDate: cachedIPO.endDate,
          allotmentDate: cachedIPO.allotmentDate,
          listingDate: cachedIPO.listingDate,
          refundDate: cachedIPO.refundDate,
          creditShareDate: cachedIPO.creditShareDate
        },
        // Ensure basic fields have defaults
        companyName: cachedIPO.companyName || 'Unknown Company',
        companyLogo: cachedIPO.companyLogo || null,
        type: cachedIPO.type || 'Mainboard',
        exchanged: cachedIPO.exchanged || 'NSE',
        issueType: cachedIPO.issueType || 'IPO',
        symbol: cachedIPO.symbol || '',
        lotSize: cachedIPO.lotSize || 0,
        minimumPrice: cachedIPO.minimumPrice || 0,
        maximumPrice: cachedIPO.maximumPrice || 0,
        issuePrice: cachedIPO.issuePrice || 0,
        totalIssuePrice: cachedIPO.totalIssuePrice || '₹0',
        faceValue: cachedIPO.faceValue || 0,
        sector: cachedIPO.sector || '',
        registrar: cachedIPO.registrar || '',
        status: cachedIPO.status || 'upcoming'
      };
      
      console.log(`[IPO Details] Returning cached data with ${Object.keys(responseData).length} fields`);
      console.log(`[IPO Details] Company: ${responseData.companyName}, Type: ${responseData.type}`);
      
      return res.json({
        success: true,
        isSuccess: true,
        message: 'Successfully fetched IPO details',
        data: responseData
      });
    }
    
    console.log(`[IPO Details] ✗ Not found in cache, fetching from Enterprise API...`);
    
    // If not in cache, use Enterprise API endpoint with searchId
    try {
      const endpoint = `/api/ipo/id/${id}`;
      console.log(`[IPO Details] Calling Enterprise API: ${IPO_API_BASE_URL}${endpoint}`);
      const data = await makeIPORequest(endpoint, true);
      console.log(`[IPO Details] Enterprise API response:`, data ? 'Success' : 'No data');
      
      if (data && data.ipo) {
        const ipoDetails = convertIPOData(data.ipo);
        console.log(`[IPO Details] ✓ Found in Enterprise API: ${ipoDetails.companyName}`);
        console.log(`[IPO Details] Converted data keys:`, Object.keys(ipoDetails));
        
        return res.json({
          success: true,
          isSuccess: true,
          message: 'Successfully fetched IPO details',
          data: ipoDetails
        });
      } else {
        console.log(`[IPO Details] Enterprise API returned no IPO data`);
      }
    } catch (err) {
      console.error(`[IPO Details] ✗ Enterprise API error:`, err.message);
    }
    
    // If Enterprise API fails, fallback to searching in status lists
    console.log(`[IPO Details] Fallback: Searching in status lists...`);
    const statuses = ['open', 'upcoming', 'closed'];
    let ipoDetails = null;
    
    for (const status of statuses) {
      try {
        const endpoint = `/api/ipo/${status}?limit=100`;
        console.log(`[IPO Details] Trying ${status} list...`);
        const data = await makeIPORequest(endpoint);
        
        if (data.ipos && data.ipos.length > 0) {
          console.log(`[IPO Details] Found ${data.ipos.length} IPOs in ${status} list`);
          const foundIPO = data.ipos.find(ipo => 
            ipo.searchId === id || 
            ipo.symbol === id || 
            ipo.companyName.toLowerCase().includes(id.toLowerCase())
          );
          
          if (foundIPO) {
            ipoDetails = convertIPOData(foundIPO);
            console.log(`[IPO Details] ✓ Found in API (${status}): ${ipoDetails.companyName}`);
            break;
          }
        }
      } catch (err) {
        console.error(`[IPO Details] Error fetching from ${status}:`, err.message);
        continue;
      }
    }
    
    if (!ipoDetails) {
      console.log(`[IPO Details] ✗ IPO not found anywhere`);
      return res.status(404).json({
        success: false,
        message: 'IPO not found'
      });
    }
    
    console.log(`[IPO Details] Returning fallback data`);
    res.json({
      success: true,
      isSuccess: true,
      message: 'Successfully fetched IPO details',
      data: ipoDetails
    });
  } catch (error) {
    console.error(`[IPO Details] ✗✗✗ Fatal error:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all IPOs (combined mainboard and SME)
exports.getAllIPOs = async (req, res) => {
  try {
    const { type, page = 1, limit = 50, status = 'open' } = req.query;
    
    // Map status to iponotify.me format
    let apiStatus = status;
    if (status === 'current' || status === 'open') apiStatus = 'open';
    if (status === 'upcoming') apiStatus = 'upcoming';
    if (status === 'closed' || status === 'listed') apiStatus = 'closed';
    
    const endpoint = `/api/ipo/${apiStatus}?page=${page}&limit=${limit}`;
    const data = await makeIPORequest(endpoint);
    
    let filteredIPOs = data.ipos || [];
    
    // Filter by type if specified
    if (type === 'sme') {
      filteredIPOs = filteredIPOs.filter(ipo => ipo.isSme);
    } else if (type === 'mainboard') {
      filteredIPOs = filteredIPOs.filter(ipo => !ipo.isSme);
    }
    
    // Convert to our format
    const convertedIPOs = filteredIPOs.map(convertIPOData);
    
    res.json({
      success: true,
      isSuccess: true,
      message: 'Successfully fetched all IPOs',
      totalRowCount: convertedIPOs.length,
      data: convertedIPOs,
      meta: data.metadata
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get IPO subscription status
exports.getIPOSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to get subscription data from cache first
    const IPOCache = require('../models/IPOCache');
    
    // Try to find by ipoId
    let cachedIPO = await IPOCache.findOne({ ipoId: id }).lean();
    
    // If not found by ipoId, try by symbol
    if (!cachedIPO) {
      cachedIPO = await IPOCache.findOne({ 
        symbol: { $regex: new RegExp(`^${id}$`, 'i') } 
      }).lean();
    }
    
    // If still not found, try case-insensitive search on company name
    if (!cachedIPO) {
      cachedIPO = await IPOCache.findOne({ 
        companyName: new RegExp(id.replace(/-/g, ' '), 'i') 
      }).lean();
    }
    
    // Check if we have subscription data
    if (cachedIPO && cachedIPO.subscriptionRates && Array.isArray(cachedIPO.subscriptionRates)) {
      // Transform subscriptionRates to match frontend format
      const subscriptionData = cachedIPO.subscriptionRates.map(rate => {
        // Determine subscriptionCategory: 0 for TOTAL, others get non-zero values
        let categoryId = 0;
        if (rate.category === 'TOTAL') {
          categoryId = 0;
        } else if (rate.category === 'QIB') {
          categoryId = 1;
        } else if (rate.category === 'NII') {
          categoryId = 2;
        } else if (rate.category === 'RETAIL') {
          categoryId = 3;
        } else if (rate.category === 'EMPLOYEES') {
          categoryId = 4;
        } else {
          categoryId = 5; // Other categories
        }
        
        return {
          name: rate.categoryName || rate.category || rate.name,
          subscriptionCategory: categoryId,
          shareOffered: rate.sharesOffered || rate.shareOffered || null,
          shareBid: rate.sharesBid || rate.shareBid || null,
          subscriptionTimes: (rate.subscriptionRate || rate.subscriptionTimes || rate.times || 0).toFixed(2),
          totalAmount: rate.totalAmount || rate.amount || '-'
        };
      });
      
      return res.json({
        success: true,
        isSuccess: true,
        message: 'Successfully fetched subscription data',
        data: subscriptionData
      });
    }
    
    // If no subscription data found, return empty array
    res.json({
      success: true,
      isSuccess: true,
      message: 'Subscription data not available',
      data: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get IPO GMP (Grey Market Premium)
exports.getIPOGMP = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to get GMP data from cache first
    const IPOCache = require('../models/IPOCache');
    
    // Try to find by ipoId
    let cachedIPO = await IPOCache.findOne({ ipoId: id }).lean();
    
    // If not found by ipoId, try by symbol
    if (!cachedIPO) {
      cachedIPO = await IPOCache.findOne({ 
        symbol: { $regex: new RegExp(`^${id}$`, 'i') } 
      }).lean();
    }
    
    // If still not found, try case-insensitive search on company name
    if (!cachedIPO) {
      cachedIPO = await IPOCache.findOne({ 
        companyName: new RegExp(id.replace(/-/g, ' '), 'i') 
      }).lean();
    }
    
    // Check if we have GMP data
    const gmpList = [];
    
    if (cachedIPO) {
      // If we have current GMP data, add it to the list
      if (cachedIPO.gmpPrice) {
        gmpList.push({
          gmpPrice: cachedIPO.gmpPrice,
          ipoPrice: cachedIPO.maximumPrice || cachedIPO.issuePrice,
          estimatedListingPrice: cachedIPO.estimatedListingPrice,
          estimatedListingPercentage: cachedIPO.estimatedListingPercentage,
          lastUpdate: cachedIPO.gmpLastUpdate || new Date().toISOString(),
          subjectToSauda: 'Yes' // Default value
        });
      }
    }
    
    res.json({
      success: true,
      isSuccess: true,
      message: gmpList.length > 0 ? 'Successfully fetched GMP data' : 'GMP data not available',
      data: {
        ipoId: id,
        gmpList: gmpList
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get IPO Reservation details
exports.getIPOReservation = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to get reservation data from cache first
    const IPOCache = require('../models/IPOCache');
    
    // Try to find by ipoId
    let cachedIPO = await IPOCache.findOne({ ipoId: id }).lean();
    
    // If not found by ipoId, try by symbol
    if (!cachedIPO) {
      cachedIPO = await IPOCache.findOne({ 
        symbol: { $regex: new RegExp(`^${id}$`, 'i') } 
      }).lean();
    }
    
    // If still not found, try case-insensitive search on company name
    if (!cachedIPO) {
      cachedIPO = await IPOCache.findOne({ 
        companyName: new RegExp(id.replace(/-/g, ' '), 'i') 
      }).lean();
    }
    
    // Check if we have lot size details (reservation data)
    if (cachedIPO && cachedIPO.lotSizeDetails) {
      return res.json({
        success: true,
        isSuccess: true,
        message: 'Successfully fetched reservation data',
        data: cachedIPO.lotSizeDetails
      });
    }
    
    // If no reservation data found, return null
    res.json({
      success: true,
      isSuccess: true,
      message: 'Reservation data not available',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get Basis of Allotment list
exports.getBasisOfAllotment = async (req, res) => {
  try {
    const { year, type } = req.query;
    
    // Note: iponotify.me API might not have basis of allotment data
    // This is a placeholder implementation
    res.json({
      success: true,
      isSuccess: true,
      message: 'Basis of allotment data not available in new API',
      totalRowCount: 0,
      data: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get GMP List (all IPOs with GMP)
exports.getGMPList = async (req, res) => {
  try {
    const { pageNumber, perPageRow } = req.query;
    
    // Note: iponotify.me API might not have GMP list data
    // This is a placeholder implementation
    res.json({
      success: true,
      isSuccess: true,
      message: 'GMP list not available in new API',
      totalRowCount: 0,
      data: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
