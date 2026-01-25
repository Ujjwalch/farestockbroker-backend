const BrokerLocation = require("../models/BrokerLocation");
const { geocodeAddress, isZeroCoords } = require("../services/geocodingService");

/**
 * Background geocode runner (fire & forget)
 * This makes sure admin API returns instantly.
 */
async function geocodeAndUpdateLocation(locationId) {
  try {
    const loc = await BrokerLocation.findById(locationId);
    if (!loc) return;

    // Only geocode if missing
    if (!isZeroCoords(loc.coordinates)) return;

    const coords = await geocodeAddress({
      address: loc.address,
      city: loc.city,
      state: loc.state,
      pincode: loc.pincode,
    });

    if (!coords) return;

    await BrokerLocation.findByIdAndUpdate(
      locationId,
      {
        coordinates: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      },
      { new: true }
    );
  } catch (err) {
    // silent fail so API never breaks for admin
    console.log("[Geocode Background Error]", err?.message || err);
  }
}

function startGeocodeJob(locationId) {
  // run after response is sent (non-blocking)
  setImmediate(() => geocodeAndUpdateLocation(locationId));
}

// Get all unique cities
exports.getCities = async (req, res) => {
  try {
    const cities = await BrokerLocation.distinct("city", { isActive: true });
    res.json(cities.sort());
  } catch (error) {
    res.status(500).json({ message: "Error fetching cities", error: error.message });
  }
};

// Get all unique states
exports.getStates = async (req, res) => {
  try {
    const states = await BrokerLocation.distinct("state", { isActive: true });
    res.json(states.sort());
  } catch (error) {
    res.status(500).json({ message: "Error fetching states", error: error.message });
  }
};

// Search broker locations
exports.searchLocations = async (req, res) => {
  try {
    const { city, state, brokerName } = req.query;

    let query = { isActive: true };

    if (city) query.city = new RegExp(city, "i");
    if (state) query.state = new RegExp(state, "i");
    if (brokerName) query.brokerName = new RegExp(brokerName, "i");

    const locations = await BrokerLocation.find(query)
      .populate("brokerId", "name logo rating brokerage")
      .sort({ city: 1, brokerName: 1 });

    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: "Error searching locations", error: error.message });
  }
};

// Get locations by broker ID
exports.getLocationsByBroker = async (req, res) => {
  try {
    const { brokerId } = req.params;

    const locations = await BrokerLocation.find({
      brokerId,
      isActive: true,
    }).sort({ isHeadOffice: -1, city: 1 });

    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: "Error fetching broker locations", error: error.message });
  }
};

// Get all locations (with pagination)
exports.getAllLocations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const locations = await BrokerLocation.find({ isActive: true })
      .populate("brokerId", "name logo rating brokerage")
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
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching locations", error: error.message });
  }
};

// ✅ Create new location (Admin) - instant response + background geocode
exports.createLocation = async (req, res) => {
  try {
    const location = new BrokerLocation(req.body);
    await location.save();

    // ✅ fire & forget geocoding
    startGeocodeJob(location._id);

    res.status(201).json({
      message: "Location created successfully (geocoding will update soon)",
      location,
    });
  } catch (error) {
    res.status(400).json({ message: "Error creating location", error: error.message });
  }
};

// ✅ Update location (Admin)
// ✅ Auto re-geocode when address/city/state/pincode changes
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch old location first
    const oldLocation = await BrokerLocation.findById(id);
    if (!oldLocation) {
      return res.status(404).json({ message: "Location not found" });
    }

    // Check if address fields changed
    const addressChanged =
      (req.body.address !== undefined && req.body.address !== oldLocation.address) ||
      (req.body.city !== undefined && req.body.city !== oldLocation.city) ||
      (req.body.state !== undefined && req.body.state !== oldLocation.state) ||
      (req.body.pincode !== undefined && req.body.pincode !== oldLocation.pincode);

    // If address changed, reset coordinates to force fresh geocode
    if (addressChanged) {
      req.body.coordinates = { latitude: 0, longitude: 0 };
    }

    // Update location
    const updatedLocation = await BrokerLocation.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    // Fire background geocode if needed
    if (addressChanged || isZeroCoords(updatedLocation.coordinates)) {
      startGeocodeJob(updatedLocation._id);
    }

    res.json({
      message: addressChanged
        ? "Location updated successfully (address changed → geocoding will update soon)"
        : "Location updated successfully (geocoding will update soon if needed)",
      location: updatedLocation,
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating location", error: error.message });
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
      return res.status(404).json({ message: "Location not found" });
    }

    res.json({ message: "Location deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting location", error: error.message });
  }
};

// ✅ Bulk import locations (Admin) - instant response + background geocode per doc
exports.bulkImportLocations = async (req, res) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ message: "Invalid locations data" });
    }

    console.log(`[BrokerLocation] Bulk importing ${locations.length} locations...`);

    const insertedDocs = await BrokerLocation.insertMany(locations, { ordered: false });

    console.log(`[BrokerLocation] ✓ Inserted ${insertedDocs.length} locations`);

    // ✅ Start background geocoding for all inserted docs that have 0 coords
    insertedDocs.forEach((doc) => {
      if (isZeroCoords(doc.coordinates)) {
        startGeocodeJob(doc._id);
      }
    });

    res.status(201).json({
      message: "Bulk import completed successfully (geocoding will update soon)",
      imported: insertedDocs.length,
      total: locations.length,
      success: true,
    });
  } catch (error) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      const inserted = error.insertedDocs?.length || 0;

      // ✅ background geocode for inserted docs
      (error.insertedDocs || []).forEach((doc) => {
        if (isZeroCoords(doc.coordinates)) startGeocodeJob(doc._id);
      });

      return res.status(201).json({
        message: `Imported ${inserted} locations, some duplicates skipped (geocoding will update soon)`,
        imported: inserted,
        total: req.body.locations?.length || 0,
        success: true,
      });
    }

    res.status(400).json({ message: "Error importing locations", error: error.message });
  }
};
