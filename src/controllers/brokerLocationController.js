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

    // ✅ Validate broker exists (optional but strong)
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
 * ✅ Bulk import locations (Admin)
 * Body: { locations: [...] }
 *
 * - Auto-geocode missing coordinates (1 req/sec delay)
 * - Inserts all valid docs, returns error list
 */
exports.bulkImportLocations = async (req, res) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ message: "Invalid locations data" });
    }

    console.log(`[BrokerLocation] Bulk importing ${locations.length} locations...`);

    const processedLocations = [];
    const errors = [];

    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];

      try {
        // ✅ must have brokerId
        if (!location.brokerId) {
          throw new Error("brokerId is required for each location");
        }

        // Auto-geocode if coordinates not provided or invalid
        if (
          !location.coordinates ||
          !isValidCoordinates(
            location.coordinates.latitude,
            location.coordinates.longitude
          )
        ) {
          console.log(
            `[BrokerLocation] Geocoding ${i + 1}/${locations.length}: ${location.city}, ${location.state}`
          );

          const coordinates = await geocodeAddress(
            location.address,
            location.city,
            location.state,
            location.pincode
          );

          location.coordinates = coordinates;

          // ✅ Delay 1 sec
          if (i < locations.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        // ✅ Make sure pincode never empty
        if (!location.pincode) location.pincode = "000000";

        processedLocations.push(location);
      } catch (error) {
        console.error(
          `[BrokerLocation] Error processing location ${i + 1}:`,
          error.message
        );

        errors.push({
          index: i,
          location: location?.branchName || location?.address || "Unknown",
          error: error.message,
        });
      }
    }

    const result = await BrokerLocation.insertMany(processedLocations, {
      ordered: false,
    });

    const response = {
      message: "Bulk import completed",
      imported: result.length,
      total: locations.length,
      success: result.length === locations.length,
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.message = `Imported ${result.length} of ${locations.length}. ${errors.length} failed.`;
    }

    res.status(201).json(response);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error importing locations", error: error.message });
  }
};
