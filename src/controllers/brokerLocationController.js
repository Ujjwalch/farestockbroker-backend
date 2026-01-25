const BrokerLocation = require('../models/BrokerLocation');

// Get all unique cities
exports.getCities = async (req, res) => {
  try {
    const cities = await BrokerLocation.distinct('city', { isActive: true });
    res.json(cities.sort());
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cities', error: error.message });
  }
};

// Get all unique states
exports.getStates = async (req, res) => {
  try {
    const states = await BrokerLocation.distinct('state', { isActive: true });
    res.json(states.sort());
  } catch (error) {
    res.status(500).json({ message: 'Error fetching states', error: error.message });
  }
};

// Search broker locations
exports.searchLocations = async (req, res) => {
  try {
    const { city, state, brokerName } = req.query;
    
    let query = { isActive: true };
    
    if (city) {
      query.city = new RegExp(city, 'i');
    }
    
    if (state) {
      query.state = new RegExp(state, 'i');
    }
    
    if (brokerName) {
      query.brokerName = new RegExp(brokerName, 'i');
    }
    
    const locations = await BrokerLocation.find(query)
      .populate('brokerId', 'name logo rating brokerage')
      .sort({ city: 1, brokerName: 1 });
    
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: 'Error searching locations', error: error.message });
  }
};

// Get locations by broker ID
exports.getLocationsByBroker = async (req, res) => {
  try {
    const { brokerId } = req.params;
    
    const locations = await BrokerLocation.find({ 
      brokerId, 
      isActive: true 
    }).sort({ isHeadOffice: -1, city: 1 });
    
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching broker locations', error: error.message });
  }
};

// Get all locations (with pagination)
exports.getAllLocations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    
    const locations = await BrokerLocation.find({ isActive: true })
      .populate('brokerId', 'name logo rating brokerage')
      .sort({ city: 1, brokerName: 1 })
      .skip(skip)
      .limit(limit);
    
    const total = await BrokerLocation.countDocuments({ isActive: true });
    
    res.json({
      locations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching locations', error: error.message });
  }
};

// Create new location (Admin)
exports.createLocation = async (req, res) => {
  try {
    const location = new BrokerLocation(req.body);
    await location.save();
    
    res.status(201).json({
      message: 'Location created successfully',
      location
    });
  } catch (error) {
    res.status(400).json({ message: 'Error creating location', error: error.message });
  }
};

// Update location (Admin)
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const location = await BrokerLocation.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    
    res.json({
      message: 'Location updated successfully',
      location
    });
  } catch (error) {
    res.status(400).json({ message: 'Error updating location', error: error.message });
  }
};

// Delete location (Admin - soft delete)
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const location = await BrokerLocation.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting location', error: error.message });
  }
};

// Bulk import locations (Admin)
exports.bulkImportLocations = async (req, res) => {
  try {
    const { locations } = req.body;
    
    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ message: 'Invalid locations data' });
    }
    
    console.log(`[BrokerLocation] Bulk importing ${locations.length} locations...`);
    
    // Insert all locations
    const result = await BrokerLocation.insertMany(locations, { ordered: false });
    
    console.log(`[BrokerLocation] ✓ Inserted ${result.length} locations`);
    
    res.status(201).json({
      message: 'Bulk import completed successfully',
      imported: result.length,
      total: locations.length,
      success: true
    });
  } catch (error) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      const inserted = error.insertedDocs?.length || 0;
      return res.status(201).json({
        message: `Imported ${inserted} locations, some duplicates skipped`,
        imported: inserted,
        total: req.body.locations?.length || 0,
        success: true
      });
    }
    
    res.status(400).json({ message: 'Error importing locations', error: error.message });
  }
};
