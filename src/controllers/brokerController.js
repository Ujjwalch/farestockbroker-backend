const Broker = require('../models/Broker');
const { validationResult } = require('express-validator');

const getAllBrokers = async (req, res) => {
  try {
    const brokers = await Broker.find({ isActive: true })
      .select('-createdAt -updatedAt')
      .sort({ rating: -1, reviews: -1 });

    res.json({
      success: true,
      brokers: brokers
    });
  } catch (error) {
    console.error('Error fetching brokers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching brokers'
    });
  }
};

const getBrokerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const broker = await Broker.findOne({ _id: id, isActive: true })
      .select('-createdAt -updatedAt');

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: 'Broker not found'
      });
    }

    res.json(broker);
  } catch (error) {
    console.error('Error fetching broker:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching broker'
    });
  }
};

const getAllBrokersAdmin = async (req, res) => {
  try {
    const brokers = await Broker.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      brokers: brokers
    });
  } catch (error) {
    console.error('Error fetching brokers for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching brokers'
    });
  }
};

const createBroker = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const brokerData = req.body;
    
    if (typeof brokerData.features === 'string') {
      brokerData.features = brokerData.features.split(',').map(f => f.trim());
    }

    const broker = new Broker(brokerData);
    await broker.save();

    res.status(201).json({
      success: true,
      message: 'Broker created successfully',
      broker: broker
    });
  } catch (error) {
    console.error('Error creating broker:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating broker'
    });
  }
};

const updateBroker = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.features && typeof updateData.features === 'string') {
      updateData.features = updateData.features.split(',').map(f => f.trim());
    }

    const broker = await Broker.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: 'Broker not found'
      });
    }

    res.json({
      success: true,
      message: 'Broker updated successfully',
      broker: broker
    });
  } catch (error) {
    console.error('Error updating broker:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating broker'
    });
  }
};

const deleteBroker = async (req, res) => {
  try {
    const { id } = req.params;

    const broker = await Broker.findByIdAndDelete(id);

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: 'Broker not found'
      });
    }

    res.json({
      success: true,
      message: 'Broker deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting broker:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting broker'
    });
  }
};

module.exports = {
  getAllBrokers,
  getBrokerById,
  getAllBrokersAdmin,
  createBroker,
  updateBroker,
  deleteBroker
};