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
    const data = await makeIPORequest('/mainboard');
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
    const data = await makeIPORequest('/sme');
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
    const data = await makeIPORequest(`/ipo/${id}`);
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
    const { type } = req.query; // 'mainboard', 'sme', or 'all'
    
    if (type === 'sme') {
      const data = await makeIPORequest('/sme');
      return res.json({
        success: true,
        ...data
      });
    } else if (type === 'mainboard') {
      const data = await makeIPORequest('/mainboard');
      return res.json({
        success: true,
        ...data
      });
    } else {
      // Get both mainboard and SME
      const [mainboardData, smeData] = await Promise.all([
        makeIPORequest('/mainboard'),
        makeIPORequest('/sme')
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
