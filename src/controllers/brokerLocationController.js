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

// Create new location (Admin)
exports.createLocation = async (req, res) => {
  try {
    const locationData = req.body;
    
    // Auto-geocode if coordinates not provided or invalid
    if (!locationData.coordinates || 
        !isValidCoordinates(locationData.coordinates.latitude, locationData.coordinates.longitude)) {
      
      console.log('[BrokerLocation] Auto-geocoding address...');
      
      try {
        const coordinates = await geocodeAddress(
          locationData.address,
          locationData.city,
          locationData.state,
          locationData.pincode
        );
        
        locationData.coordinates = coordinates;
        console.log('[BrokerLocation] ✓ Coordinates set:', coordinates);
      } catch (geocodeError) {
        console.error('[BrokerLocation] Geocoding failed:', geocodeError.message);
        return res.status(400).json({ 
          message: 'Failed to geocode address. Please provide coordinates manually.',
          error: geocodeError.message 
        });
      }
    }
    
    const location = new BrokerLocation(locationData);
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
        
        // If address changed and no new coordinates provided, geocode
        if (addressChanged && 
            (!locationData.coordinates || 
             !isValidCoordinates(locationData.coordinates.latitude, locationData.coordinates.longitude))) {
          
          console.log('[BrokerLocation] Address changed, auto-geocoding...');
          
          try {
            const coordinates = await geocodeAddress(
              locationData.address || existingLocation.address,
              locationData.city || existingLocation.city,
              locationData.state || existingLocation.state,
              locationData.pincode || existingLocation.pincode
            );
            
            locationData.coordinates = coordinates;
            console.log('[BrokerLocation] ✓ Coordinates updated:', coordinates);
          } catch (geocodeError) {
            console.error('[BrokerLocation] Geocoding failed:', geocodeError.message);
            // Continue with update, keep old coordinates
          }
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

// Bulk import locations (Admin)
exports.bulkImportLocations = async (req, res) => {
  try {
    const { locations } = req.body;
    
    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ message: 'Invalid locations data' });
    }
    
    console.log(`[BrokerLocation] Bulk importing ${locations.length} locations...`);
    
    // Process each location and geocode if needed
    const processedLocations = [];
    const errors = [];
    
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      
      try {
        // Auto-geocode if coordinates not provided or invalid
        if (!location.coordinates || 
            !isValidCoordinates(location.coordinates.latitude, location.coordinates.longitude)) {
          
          console.log(`[BrokerLocation] Geocoding location ${i + 1}/${locations.length}: ${location.city}`);
          
          const coordinates = await geocodeAddress(
            location.address,
            location.city,
            location.state,
            location.pincode
          );
          
          location.coordinates = coordinates;
          
          // Add small delay to respect rate limits (1 req/sec)
          if (i < locations.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        processedLocations.push(location);
      } catch (error) {
        console.error(`[BrokerLocation] Error processing location ${i + 1}:`, error.message);
        errors.push({
          index: i,
          location: location.branchName || location.address,
          error: error.message
        });
      }
    }
    
    // Insert processed locations
    const result = await BrokerLocation.insertMany(processedLocations, { ordered: false });
    
    const response = {
      message: 'Bulk import completed',
      imported: result.length,
      total: locations.length,
      success: result.length === locations.length
    };
    
    if (errors.length > 0) {
      response.errors = errors;
      response.message = `Imported ${result.length} of ${locations.length} locations. ${errors.length} failed.`;
    }
    
    res.status(201).json(response);
  } catch (error) {
    res.status(400).json({ message: 'Error importing locations', error: error.message });
  }
};
