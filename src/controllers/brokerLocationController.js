const BrokerLocation = require("../models/BrokerLocation");
const Broker = require("../models/Broker");
const { geocodeAddress, isValidCoordinates } = require("../services/geocodingService");

/**
 * ✅ Escape regex to avoid breaking search + injection-like patterns
 */
function escapeRegex(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * ✅ Parse number safely
 */
function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * ✅ Get all unique cities (only active locations)
 */
exports.getCities = async (req, res) => {
  try {
    const cities = await BrokerLocation.distinct("city", { isActive: true });
    res.json((cities || []).filter(Boolean).sort());
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching cities", error: error.message });
  }
};

/**
 * ✅ Get all unique states (only active locations)
 */
exports.getStates = async (req, res) => {
  try {
    const states = await BrokerLocation.distinct("state", { isActive: true });
    res.json((states || []).filter(Boolean).sort());
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching states", error: error.message });
  }
};

/**
 * ✅ Search broker locations
 * Supports:
 * - city
 * - state
 * - brokerName
 * - q (global search)
 */
exports.searchLocations = async (req, res) => {
  try {
    const { city, state, brokerName, q } = req.query;

    const query = { isActive: true };

    if (city && city !== "all") {
      query.city = new RegExp(escapeRegex(city), "i");
    }

    if (state && state !== "all") {
      query.state = new RegExp(escapeRegex(state), "i");
    }

    if (brokerName && brokerName !== "all") {
      query.brokerName = new RegExp(escapeRegex(brokerName), "i");
    }

    // ✅ Global search
    if (q && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), "i");
      query.$or = [
        { brokerName: rx },
        { branchName: rx },
        { address: rx },
        { city: rx },
        { state: rx },
        { pincode: rx },
        { phone: rx },
        { email: rx },
      ];
    }

    const locations = await BrokerLocation.find(query)
      .populate("brokerId", "name logo rating brokerage")
      .sort({ city: 1, brokerName: 1, branchName: 1 });

    res.json(locations);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error searching locations", error: error.message });
  }
};

/**
 * ✅ Get locations by broker ID
 */
exports.getLocationsByBroker = async (req, res) => {
  try {
    const { brokerId } = req.params;

    const locations = await BrokerLocation.find({
      brokerId,
      isActive: true,
    }).sort({ isHeadOffice: -1, city: 1, branchName: 1 });

    res.json(locations);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching broker locations",
      error: error.message,
    });
  }
};

/**
 * ✅ Get all locations (with pagination)
 */
exports.getAllLocations = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const skip = (page - 1) * limit;

    const filter = { isActive: true };

    const [locations, total] = await Promise.all([
      BrokerLocation.find(filter)
        .populate("brokerId", "name logo rating brokerage")
        .sort({ city: 1, brokerName: 1, branchName: 1 })
        .skip(skip)
        .limit(limit),
      BrokerLocation.countDocuments(filter),
    ]);

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
    res
      .status(500)
      .json({ message: "Error fetching locations", error: error.message });
  }
};

/**
 * ✅ Near Me locations (Geo query)
 * Query:
 *  - lat
 *  - lng
 *  - radius (km) default 10
 */
exports.getNearMeLocations = async (req, res) => {
  try {
    const lat = toNumber(req.query.lat);
    const lng = toNumber(req.query.lng);
    const radiusKm = toNumber(req.query.radius, 10);

    if (!isValidCoordinates(lat, lng)) {
      return res.status(400).json({
        message: "Invalid coordinates. Provide valid lat/lng.",
      });
    }

    const maxDistanceMeters = Math.max(radiusKm, 1) * 1000;

    const locations = await BrokerLocation.find({
      isActive: true,
      geo: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: maxDistanceMeters,
        },
      },
    })
      .populate("brokerId", "name logo rating brokerage")
      .limit(200);

    res.json({
      count: locations.length,
      radiusKm,
      locations,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching nearby locations",
      error: error.message,
    });
  }
};

/**
 * ✅ Create new location (Admin)
 * - Auto-geocode if lat/lng not provided (or invalid)
 */
exports.createLocation = async (req, res) => {
  try {
    const locationData = req.body;

    // ✅ Validate broker exists
    if (locationData?.brokerId) {
      const brokerExists = await Broker.exists({ _id: locationData.brokerId });
      if (!brokerExists) {
        return res.status(400).json({ message: "Invalid brokerId" });
      }
    }

    // Auto-geocode if coordinates not provided or invalid
    if (
      !locationData.coordinates ||
      !isValidCoordinates(
        locationData.coordinates.latitude,
        locationData.coordinates.longitude
      )
    ) {
      console.log("[BrokerLocation] Auto-geocoding address...");

      try {
        const coordinates = await geocodeAddress(
          locationData.address,
          locationData.city,
          locationData.state,
          locationData.pincode
        );

        locationData.coordinates = coordinates;
        console.log("[BrokerLocation] ✓ Coordinates set:", coordinates);
      } catch (geocodeError) {
        console.error("[BrokerLocation] Geocoding failed:", geocodeError.message);
        return res.status(400).json({
          message:
            "Failed to geocode address. Please provide coordinates manually.",
          error: geocodeError.message,
        });
      }
    }

    const location = new BrokerLocation(locationData);
    await location.save();

    res.status(201).json({
      message: "Location created successfully",
      location,
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating location", error: error.message });
  }
};

/**
 * ✅ Update location (Admin)
 * - If address changes and new coordinates not provided => geocode
 * - If geocode fails => update continues with old coordinates (safe)
 */
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const locationData = req.body;

    const existingLocation = await BrokerLocation.findById(id);
    if (!existingLocation) {
      return res.status(404).json({ message: "Location not found" });
    }

    const addressChanged =
      (locationData.address && locationData.address !== existingLocation.address) ||
      (locationData.city && locationData.city !== existingLocation.city) ||
      (locationData.state && locationData.state !== existingLocation.state) ||
      (locationData.pincode && locationData.pincode !== existingLocation.pincode);

    const hasValidNewCoordinates =
      locationData.coordinates &&
      isValidCoordinates(
        locationData.coordinates.latitude,
        locationData.coordinates.longitude
      );

    if (addressChanged && !hasValidNewCoordinates) {
      console.log("[BrokerLocation] Address changed, auto-geocoding...");

      try {
        const coordinates = await geocodeAddress(
          locationData.address || existingLocation.address,
          locationData.city || existingLocation.city,
          locationData.state || existingLocation.state,
          locationData.pincode || existingLocation.pincode
        );

        locationData.coordinates = coordinates;
        console.log("[BrokerLocation] ✓ Coordinates updated:", coordinates);
      } catch (geocodeError) {
        console.error("[BrokerLocation] Geocoding failed:", geocodeError.message);
        // keep old coordinates silently
      }
    }

    const location = await BrokerLocation.findByIdAndUpdate(id, locationData, {
      new: true,
      runValidators: true,
    });

    res.json({
      message: "Location updated successfully",
      location,
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating location", error: error.message });
  }
};

/**
 * ✅ Delete location (Admin) => soft delete (isActive false)
 */
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
    res
      .status(500)
      .json({ message: "Error deleting location", error: error.message });
  }
};

/**
 * ✅ FIXED: Bulk import locations (Admin)
 * - Optimized for performance
 * - Better error handling
 * - No frontend geocoding needed
 */
exports.bulkImportLocations = async (req, res) => {
  try {
    let locations = req.body;

    // ✅ Handle both formats
    if (!Array.isArray(locations)) {
      locations = req.body.locations || [];
    }

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ 
        message: "Invalid request: locations array required" 
      });
    }

    console.log(`[BrokerLocation] Bulk importing ${locations.length} locations...`);

    // ✅ Validate all broker IDs upfront
    const uniqueBrokerIds = [...new Set(
      locations.map(loc => loc.brokerId).filter(Boolean)
    )];
    
    if (uniqueBrokerIds.length === 0) {
      return res.status(400).json({ 
        message: "No valid brokerId found in locations" 
      });
    }

    const validBrokers = await Broker.find({ 
      _id: { $in: uniqueBrokerIds } 
    }).select('_id');
    
    const validBrokerIdSet = new Set(validBrokers.map(b => b._id.toString()));

    // ✅ Process locations with better error handling
    const processedLocations = [];
    const errors = [];

    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];

      try {
        // Validate brokerId
        if (!location.brokerId) {
          throw new Error("brokerId is required");
        }

        if (!validBrokerIdSet.has(location.brokerId.toString())) {
          throw new Error(`Invalid brokerId: ${location.brokerId}`);
        }

        // Build processed location
        const processed = {
          brokerId: location.brokerId,
          brokerName: location.brokerName || "",
          branchName: location.branchName || "Main Branch",
          address: location.address || "",
          city: location.city || "",
          state: location.state || "",
          pincode: location.pincode || "000000",
          phone: location.phone || "",
          email: location.email || "",
          coordinates: {
            latitude: 0,
            longitude: 0,
          },
          isHeadOffice: Boolean(location.isHeadOffice),
          isActive: true,
        };

        // ✅ Check if valid coordinates provided
        const lat = Number(location.coordinates?.latitude);
        const lng = Number(location.coordinates?.longitude);

        if (isValidCoordinates(lat, lng)) {
          // Use provided coordinates
          processed.coordinates = { latitude: lat, longitude: lng };
          processedLocations.push(processed);
        } else {
          // ✅ Try geocoding with timeout
          try {
            console.log(
              `[BrokerLocation] Geocoding ${i + 1}/${locations.length}: ${processed.city}, ${processed.state}`
            );
            
            const coordinates = await Promise.race([
              geocodeAddress(
                processed.address,
                processed.city,
                processed.state,
                processed.pincode
              ),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Geocoding timeout")), 5000)
              )
            ]);

            processed.coordinates = coordinates;
            processedLocations.push(processed);

            // ✅ Small delay to avoid rate limiting (only if geocoding)
            if (i < locations.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (geocodeError) {
            console.warn(
              `[BrokerLocation] Geocoding failed for ${processed.city}: ${geocodeError.message}`
            );
            // ✅ Still add location with default 0,0 coordinates
            processedLocations.push(processed);
          }
        }

      } catch (error) {
        console.error(
          `[BrokerLocation] Error processing location ${i + 1}:`,
          error.message
        );
        errors.push({
          index: i,
          location: location?.branchName || location?.city || "Unknown",
          error: error.message,
        });
      }
    }

    // ✅ Insert all valid locations
    let insertedCount = 0;
    if (processedLocations.length > 0) {
      try {
        const result = await BrokerLocation.insertMany(processedLocations, {
          ordered: false, // Continue on error
        });
        insertedCount = result.length;
        console.log(`[BrokerLocation] Successfully inserted ${insertedCount} locations`);
      } catch (insertError) {
        console.error("[BrokerLocation] Insert error:", insertError.message);
        
        // ✅ Handle partial success
        if (insertError.writeErrors) {
          insertedCount = insertError.insertedDocs?.length || 0;
          insertError.writeErrors.forEach(err => {
            errors.push({
              index: err.index,
              location: processedLocations[err.index]?.branchName || "Unknown",
              error: err.errmsg || "Database insert error",
            });
          });
        } else if (insertError.code === 11000) {
          return res.status(400).json({
            message: "Duplicate locations detected",
            error: insertError.message,
          });
        } else {
          throw insertError;
        }
      }
    }

    // ✅ Build response
    const response = {
      message: `Imported ${insertedCount} of ${locations.length} locations`,
      imported: insertedCount,
      total: locations.length,
      failed: errors.length,
      success: errors.length === 0,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    const statusCode = insertedCount > 0 ? 201 : 400;
    res.status(statusCode).json(response);

  } catch (error) {
    console.error("[BrokerLocation] Bulk import error:", error);
    res.status(500).json({ 
      message: "Error importing locations", 
      error: error.message 
    });
  }
};