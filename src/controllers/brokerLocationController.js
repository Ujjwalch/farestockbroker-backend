const BrokerLocation = require('../models/BrokerLocation');
const Broker = require('../models/Broker');
const { geocodeAddress, isValidCoordinates } = require('../services/geocodingService');

// Get all unique cities
exports.getCities = async (req, res) => {
  try {
    const cities = await BrokerLocation.distinct('city');
    res.json(cities.sort());
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cities', error: error.message });
  }
};

// Get all unique states
exports.getStates = async (req, res) => {
  try {
    const states = await BrokerLocation.distinct('state');
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
    const limit = parseInt(req.query.limit) || 50;
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

// Create new location (Admin) - INSTANT UPLOAD
exports.createLocation = async (req, res) => {
  try {
    const locationData = req.body;
    
    // If coordinates not provided or invalid, use default (0, 0)
    // Geocoding will be done in background
    if (!locationData.coordinates || 
        !isValidCoordinates(locationData.coordinates.latitude, locationData.coordinates.longitude)) {
      
      console.log('[BrokerLocation] No valid coordinates, using default (0, 0)');
      locationData.coordinates = {
        latitude: 0,
        longitude: 0
      };
    }
    
    // Save location immediately
    const location = new BrokerLocation(locationData);
    await location.save();
    
    // Geocode in background (non-blocking) if coordinates are default
    if (locationData.coordinates.latitude === 0 && locationData.coordinates.longitude === 0) {
      geocodeInBackground(location._id, locationData.address, locationData.city, locationData.state, locationData.pincode);
    }
    
    res.status(201).json({
      message: 'Location created successfully',
      location
    });
  } catch (error) {
    res.status(400).json({ message: 'Error creating location', error: error.message });
  }
};

// Background geocoding (non-blocking)
async function geocodeInBackground(locationId, address, city, state, pincode) {
  try {
    console.log(`[BrokerLocation] Background geocoding for ${locationId}...`);
    
    const coordinates = await geocodeAddress(address, city, state, pincode);
    
    await BrokerLocation.findByIdAndUpdate(locationId, {
      coordinates: coordinates
    });
    
    console.log(`[BrokerLocation] ✓ Geocoded ${locationId}:`, coordinates);
  } catch (error) {
    console.error(`[BrokerLocation] Background geocoding failed for ${locationId}:`, error.message);
    // Don't throw - just log the error
  }
}

// Update location (Admin)
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const locationData = req.body;
    
    // Auto-geocode if address changed and coordinates not provided
    if (locationData.address || locationData.city || locationData.state || locationData.pincode) {
      // Get existing location to check if address changed
      const existingLocation = await BrokerLocation.findById(id);
      
      if (existingLocation) {
        const addressChanged = 
          locationData.address !== existingLocation.address ||
          locationData.city !== existingLocation.city ||
          locationData.state !== existingLocation.state ||
          locationData.pincode !== existingLocation.pincode;
        
        // If address changed and no new coordinates provided, geocode in background
        if (addressChanged && 
            (!locationData.coordinates || 
             !isValidCoordinates(locationData.coordinates.latitude, locationData.coordinates.longitude))) {
          
          console.log('[BrokerLocation] Address changed, will geocode in background...');
          locationData.coordinates = { latitude: 0, longitude: 0 };
        }
      }
    }
    
    const location = await BrokerLocation.findByIdAndUpdate(
      id,
      locationData,
      { new: true, runValidators: true }
    );
    
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    
    // Geocode in background if coordinates are default
    if (location.coordinates.latitude === 0 && location.coordinates.longitude === 0) {
      geocodeInBackground(location._id, location.address, location.city, location.state, location.pincode);
    }
    
    res.json({
      message: 'Location updated successfully',
      location
    });
  } catch (error) {
    res.status(400).json({ message: 'Error updating location', error: error.message });
  }
};

// Delete location (Admin)
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

// Bulk import locations (Admin) - INSTANT UPLOAD
exports.bulkImportLocations = async (req, res) => {
  try {
    const { locations } = req.body;
    
    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ message: 'Invalid locations data' });
    }
    
    console.log(`[BrokerLocation] Bulk importing ${locations.length} locations...`);
    
    // Process locations - set default coordinates if not provided
    const processedLocations = locations.map(location => {
      if (!location.coordinates || 
          !isValidCoordinates(location.coordinates.latitude, location.coordinates.longitude)) {
        location.coordinates = {
          latitude: 0,
          longitude: 0
        };
      }
      return location;
    });
    
    // Insert all locations immediately
    const result = await BrokerLocation.insertMany(processedLocations, { ordered: false });
    
    console.log(`[BrokerLocation] ✓ Inserted ${result.length} locations`);
    
    // Geocode in background (non-blocking)
    const locationsToGeocode = result.filter(loc => 
      loc.coordinates.latitude === 0 && loc.coordinates.longitude === 0
    );
    
    if (locationsToGeocode.length > 0) {
      console.log(`[BrokerLocation] Starting background geocoding for ${locationsToGeocode.length} locations...`);
      bulkGeocodeInBackground(locationsToGeocode);
    }
    
    res.status(201).json({
      message: 'Bulk import completed successfully',
      imported: result.length,
      total: locations.length,
      success: true,
      geocodingInProgress: locationsToGeocode.length
    });
  } catch (error) {
    res.status(400).json({ message: 'Error importing locations', error: error.message });
  }
};

// Background bulk geocoding (non-blocking)
async function bulkGeocodeInBackground(locations) {
  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    
    try {
      console.log(`[BrokerLocation] Geocoding ${i + 1}/${locations.length}: ${location.city}`);
      
      const coordinates = await geocodeAddress(
        location.address,
        location.city,
        location.state,
        location.pincode
      );
      
      await BrokerLocation.findByIdAndUpdate(location._id, {
        coordinates: coordinates
      });
      
      console.log(`[BrokerLocation] ✓ Geocoded ${location.city}`);
      
      // Respect rate limits (1 req/sec)
      if (i < locations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[BrokerLocation] Geocoding failed for ${location.city}:`, error.message);
      // Continue with next location
    }
  }
  
  console.log(`[BrokerLocation] ✓ Background geocoding completed`);
}
