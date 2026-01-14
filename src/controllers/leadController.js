const User = require('../models/User');
const Broker = require('../models/Broker');
const axios = require('axios');

const registerLead = async (req, res) => {
  try {
    const { name, email, mobile, accountType, brokerId } = req.body;

    if (!name || !email || !mobile || !accountType || !brokerId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be 10 digits'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const broker = await Broker.findById(brokerId);
    if (!broker) {
      return res.status(404).json({
        success: false,
        message: 'Broker not found'
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: email },
        { mobile: mobile }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or mobile already exists'
      });
    }

    const user = new User({
      name,
      email,
      mobile,
      accountType,
      brokerId,
      brokerName: broker.name,
      leadStatus: 'pending'
    });

    await user.save();

    const zerodhaPayload = {
      name: name,
      mobile: mobile,
      email: email,
      partner: "ZMPCIC"
    };

    try {
      const zerodhaResponse = await axios.post(
        'https://signup.zerodha.com/api/partner/lead/register/',
        zerodhaPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      user.leadStatus = 'registered';
      user.zerodhaResponse = zerodhaResponse.data;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Lead registered successfully',
        data: {
          userId: user._id,
          leadStatus: 'registered',
          brokerUrl: broker.broker_url
        }
      });

    } catch (zerodhaError) {
      console.error('Zerodha API Error:', zerodhaError.response?.data || zerodhaError.message);
      
      user.leadStatus = 'failed';
      user.zerodhaResponse = zerodhaError.response?.data || { error: zerodhaError.message };
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'User details saved. Our executive will contact you for further process.',
        data: {
          userId: user._id,
          leadStatus: 'failed',
          brokerUrl: broker.broker_url
        }
      });
    }

  } catch (error) {
    console.error('Lead registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getLeads = async (req, res) => {
  try {
    const leads = await User.find()
      .populate('brokerId', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      leads
    });
  } catch (error) {
    console.error('Get leads error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch leads'
    });
  }
};

module.exports = {
  registerLead,
  getLeads
};