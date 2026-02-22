const axios = require('axios');

const IPO_API_BASE_URL = process.env.IPO_API_BASE_URL || 'https://iponotify.me';
const IPO_API_KEY_BASE = process.env.IPO_API_KEY_BASE;
const IPO_API_KEY_ENTERPRISE = process.env.IPO_API_KEY_ENTERPRISE;

// Helper function to make IPO API requests with fallback
const makeIPORequest = async (endpoint, useEnterprise = false) => {
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
    
    // If base key fails, try enterprise key
    if (!useEnterprise && IPO_API_KEY_ENTERPRISE) {
      console.log('Retrying with Enterprise API key...');
      return makeIPORequest(endpoint, true);
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
    listing: ipoData.listing
  };
};

// Get all mainboard IPOs
exports.getMainboardIPOs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'open' } = req.query;
    
    // Map status to iponotify.me format
    let apiStatus = status;
    if (status === 'current' || status === 'open') apiStatus = 'open';
    if (status === 'upcoming') apiStatus = 'upcoming';
    if (status === 'closed' || status === 'listed') apiStatus = 'closed';
    
    const endpoint = `/api/ipo/${apiStatus}?page=${page}&limit=${limit}`;
    const data = await makeIPORequest(endpoint);
    
    // Filter for mainboard only and convert data format
    const mainboardIPOs = (data.ipos || [])
      .filter(ipo => !ipo.isSme)
      .map(convertIPOData);
    
    res.json({
      success: true,
      isSuccess: true,
      message: 'Successfully fetched mainboard IPOs',
      totalRowCount: mainboardIPOs.length,
      data: mainboardIPOs,
      meta: data.metadata
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all SME IPOs
exports.getSMEIPOs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'open' } = req.query;
    
    // Map status to iponotify.me format
    let apiStatus = status;
    if (status === 'current' || status === 'open') apiStatus = 'open';
    if (status === 'upcoming') apiStatus = 'upcoming';
    if (status === 'closed' || status === 'listed') apiStatus = 'closed';
    
    const endpoint = `/api/ipo/${apiStatus}?page=${page}&limit=${limit}`;
    const data = await makeIPORequest(endpoint);
    
    // Filter for SME only and convert data format
    const smeIPOs = (data.ipos || [])
      .filter(ipo => ipo.isSme)
      .map(convertIPOData);
    
    res.json({
      success: true,
      isSuccess: true,
      message: 'Successfully fetched SME IPOs',
      totalRowCount: smeIPOs.length,
      data: smeIPOs,
      meta: data.metadata
    });
  } catch (error) {
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
    console.log(`[IPO Details] Fetching details for ID: ${id}`);
    
    // First, try to get from cache (much faster and has all data)
    const IPOCache = require('../models/IPOCache');
    const cachedIPO = await IPOCache.findOne({ ipoId: id }).lean();
    
    if (cachedIPO) {
      console.log(`[IPO Details] Found in cache: ${cachedIPO.companyName}`);
      // Remove MongoDB internal fields
      delete cachedIPO._id;
      delete cachedIPO.__v;
      delete cachedIPO.createdAt;
      delete cachedIPO.updatedAt;
      
      // Ensure timeLine structure exists for frontend compatibility
      if (!cachedIPO.timeLine) {
        cachedIPO.timeLine = {
          startDate: cachedIPO.startDate,
          endDate: cachedIPO.endDate,
          allotmentDate: cachedIPO.allotmentDate,
          listingDate: cachedIPO.listingDate,
          refundDate: cachedIPO.refundDate,
          creditShareDate: cachedIPO.creditShareDate
        };
      }
      
      return res.json({
        success: true,
        isSuccess: true,
        message: 'Successfully fetched IPO details',
        data: cachedIPO
      });
    }
    
    console.log(`[IPO Details] Not found in cache, searching API...`);
    
    // If not in cache, try to get from API
    const statuses = ['open', 'upcoming', 'closed'];
    let ipoDetails = null;
    
    for (const status of statuses) {
      try {
        const endpoint = `/api/ipo/${status}?limit=100`;
        const data = await makeIPORequest(endpoint);
        
        if (data.ipos && data.ipos.length > 0) {
          const foundIPO = data.ipos.find(ipo => 
            ipo.searchId === id || 
            ipo.symbol === id || 
            ipo.companyName.toLowerCase().includes(id.toLowerCase())
          );
          
          if (foundIPO) {
            ipoDetails = convertIPOData(foundIPO);
            console.log(`[IPO Details] Found in API (${status}): ${ipoDetails.companyName}`);
            break;
          }
        }
      } catch (err) {
        console.error(`[IPO Details] Error fetching from ${status}:`, err.message);
        // Continue to next status if this one fails
        continue;
      }
    }
    
    if (!ipoDetails) {
      return res.status(404).json({
        success: false,
        message: 'IPO not found'
      });
    }
    
    res.json({
      success: true,
      isSuccess: true,
      message: 'Successfully fetched IPO details',
      data: ipoDetails
    });
  } catch (error) {
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
    
    // Note: iponotify.me API might not have subscription data
    // This is a placeholder implementation
    res.json({
      success: true,
      isSuccess: true,
      message: 'Subscription data not available in new API',
      data: {
        ipoId: id,
        subscriptionData: null,
        message: 'Subscription tracking coming soon'
      }
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
    
    // Note: iponotify.me API might not have GMP data
    // This is a placeholder implementation
    res.json({
      success: true,
      isSuccess: true,
      message: 'GMP data not available in new API',
      data: {
        ipoId: id,
        gmpList: [],
        message: 'GMP tracking coming soon'
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
    
    // Note: iponotify.me API might not have reservation data
    // This is a placeholder implementation
    res.json({
      success: true,
      isSuccess: true,
      message: 'Reservation data not available in new API',
      data: {
        ipoId: id,
        reservationData: null,
        message: 'Reservation details coming soon'
      }
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
