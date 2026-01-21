const axios = require('axios');

const IPO_API_KEY = process.env.IPO_API_KEY;
const IPO_API_SECRET = process.env.IPO_API_SECRET;
const IPO_API_BASE_URL = process.env.IPO_API_BASE_URL || 'https://api.ipoapi.in/api';

// Helper function to make IPO API requests
const makeIPORequest = async (endpoint) => {
  try {
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${IPO_API_BASE_URL}${endpoint}`,
      headers: {
        'ApiKey': IPO_API_KEY,
        'ApiSecret': IPO_API_SECRET
      }
    };

    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error('IPO API Error:', error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch IPO data');
  }
};

// Get all mainboard IPOs
exports.getMainboardIPOs = async (req, res) => {
  try {
    const { pageNumber, perPageRow, year, yearConsider } = req.query;
    let endpoint = '/mainboard';
    
    // Build query parameters
    const params = new URLSearchParams();
    if (pageNumber) params.append('pageNumber', pageNumber);
    if (perPageRow) params.append('perPageRow', perPageRow);
    if (year) params.append('year', year);
    if (yearConsider) params.append('yearConsider', yearConsider);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    const data = await makeIPORequest(endpoint);
    res.json({
      success: true,
      ...data
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
    const { pageNumber, perPageRow, year, yearConsider } = req.query;
    let endpoint = '/sme';
    
    // Build query parameters
    const params = new URLSearchParams();
    if (pageNumber) params.append('pageNumber', pageNumber);
    if (perPageRow) params.append('perPageRow', perPageRow);
    if (year) params.append('year', year);
    if (yearConsider) params.append('yearConsider', yearConsider);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    const data = await makeIPORequest(endpoint);
    res.json({
      success: true,
      ...data
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
    const data = await makeIPORequest(`/detail/${id}`);
    res.json({
      success: true,
      ...data
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
    const { type, pageNumber, perPageRow, year, yearConsider } = req.query;
    
    // Build query parameters
    const params = new URLSearchParams();
    if (pageNumber) params.append('pageNumber', pageNumber);
    if (perPageRow) params.append('perPageRow', perPageRow);
    if (year) params.append('year', year);
    if (yearConsider) params.append('yearConsider', yearConsider);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    if (type === 'sme') {
      const data = await makeIPORequest(`/sme${queryString}`);
      return res.json({
        success: true,
        ...data
      });
    } else if (type === 'mainboard') {
      const data = await makeIPORequest(`/mainboard${queryString}`);
      return res.json({
        success: true,
        ...data
      });
    } else {
      // Get both mainboard and SME
      const [mainboardData, smeData] = await Promise.all([
        makeIPORequest(`/mainboard${queryString}`),
        makeIPORequest(`/sme${queryString}`)
      ]);

      const combinedData = [
        ...(mainboardData.data || []),
        ...(smeData.data || [])
      ];

      res.json({
        success: true,
        isSuccess: true,
        message: 'Successfully fetched all IPOs',
        totalRowCount: combinedData.length,
        mainboardCount: mainboardData.totalRowCount || 0,
        smeCount: smeData.totalRowCount || 0,
        data: combinedData
      });
    }
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
    const data = await makeIPORequest(`/subscription/${id}`);
    res.json({
      success: true,
      ...data
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
    const data = await makeIPORequest(`/gmp/${id}`);
    res.json({
      success: true,
      ...data
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
    const data = await makeIPORequest(`/reservation/${id}`);
    res.json({
      success: true,
      ...data
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
    
    // Default to current year and 'all' type if not provided
    const currentYear = new Date().getFullYear();
    const queryYear = year || currentYear;
    const queryType = type || 'all';
    
    const endpoint = `/basis-of-allotment/${queryYear}/${queryType}`;
    const data = await makeIPORequest(endpoint);
    
    res.json({
      success: true,
      ...data
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
    let endpoint = '/gmp-list';
    
    // Build query parameters
    const params = new URLSearchParams();
    if (pageNumber) params.append('pageNumber', pageNumber);
    if (perPageRow) params.append('perPageRow', perPageRow);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    const data = await makeIPORequest(endpoint);
    res.json({
      success: true,
      ...data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
