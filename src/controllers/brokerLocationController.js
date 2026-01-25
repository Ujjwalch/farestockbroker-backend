const BrokerLocation = require("../models/BrokerLocation");
const fetch = require("node-fetch"); // ✅ npm i node-fetch@2

/**
 * ================================
 * AUTO NORMALIZE + AUTO GEOCODE
 * ================================
 * Free geocoding via OpenStreetMap Nominatim
 * - Address-first (unique pins)
 * - Fallback to city-level
 * - Auto-correct typos and wrong state mappings
 */

// ✅ Nominatim settings
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_DELAY_MS = 1200; // safe-ish for production load
const NOMINATIM_TIMEOUT_MS = 8000;
const NOMINATIM_RETRIES = 2;

// 🔥 IMPORTANT: Put your contact email here to reduce blocking chances
const NOMINATIM_USER_AGENT =
  "FareStockBrokerGeocoder/1.0 (contact: support@farestock.com)";

let _lastNominatimHit = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function throttleNominatim() {
  const now = Date.now();
  const gap = now - _lastNominatimHit;
  if (gap < NOMINATIM_DELAY_MS) {
    await sleep(NOMINATIM_DELAY_MS - gap);
  }
  _lastNominatimHit = Date.now();
}

function cleanText(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function titleCase(str) {
  const s = cleanText(str);
  if (!s) return s;
  return s
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Common typo correction maps
 */
const STATE_FIX_MAP = {
  chattisghad: "Chhattisgarh",
  chattisgarh: "Chhattisgarh",
  karanataka: "Karnataka",
  maharastra: "Maharashtra",
  tamilnadu: "Tamil Nadu",
  uttarpradesh: "Uttar Pradesh",
  madhyapradesh: "Madhya Pradesh",
  andhrapradesh: "Andhra Pradesh",
  westbengal: "West Bengal",
  westbengaal: "West Bengal",
  westbangal: "West Bengal",
  westbangla: "West Bengal",
  odissa: "Odisha",
  orissa: "Odisha",
  rajastan: "Rajasthan",
  uttrakhand: "Uttarakhand",
  pondicherry: "Puducherry",
};

const CITY_FIX_MAP = {
  ahmedhabad: "Ahmedabad",
  ahemdabad: "Ahmedabad",
  bangalore: "Bengaluru",
  bengaluru: "Bengaluru",
  belgavi: "Belagavi",
  calicut: "Kozhikode",
  bombay: "Mumbai",
};

/**
 * City -> Correct State mapping (high impact)
 * You can keep expanding this safely.
 */
const CITY_TO_STATE = {
  // Gujarat
  ahmedabad: "Gujarat",
  surat: "Gujarat",
  vadodara: "Gujarat",
  baroda: "Gujarat",
  rajkot: "Gujarat",
  jamnagar: "Gujarat",
  gandhinagar: "Gujarat",
  bhavnagar: "Gujarat",

  // Karnataka
  bengaluru: "Karnataka",
  bangalore: "Karnataka",
  belagavi: "Karnataka",
  mysuru: "Karnataka",
  mangaluru: "Karnataka",

  // Maharashtra
  mumbai: "Maharashtra",
  pune: "Maharashtra",
  nagpur: "Maharashtra",
  nashik: "Maharashtra",
  aurangabad: "Maharashtra",
  ahmednagar: "Maharashtra",

  // MP
  bhopal: "Madhya Pradesh",
  indore: "Madhya Pradesh",
  jabalpur: "Madhya Pradesh",

  // TN
  chennai: "Tamil Nadu",
  coimbatore: "Tamil Nadu",
  madurai: "Tamil Nadu",

  // Delhi
  "new delhi": "Delhi",
  delhi: "Delhi",

  // WB
  kolkata: "West Bengal",

  // Odisha
  bhubaneswar: "Odisha",
  cuttack: "Odisha",

  // Kerala
  kochi: "Kerala",
  ernakulam: "Kerala",
  trivandrum: "Kerala",
  thiruvananthapuram: "Kerala",
  kozhikode: "Kerala",
};

function normalizeState(state) {
  const s = cleanText(state);
  if (!s) return s;

  const key = s.toLowerCase().replace(/\s+/g, "");
  const fixed = STATE_FIX_MAP[key];
  return fixed ? fixed : titleCase(s);
}

function normalizeCity(city) {
  const c = cleanText(city);
  if (!c) return c;

  const key = c.toLowerCase().replace(/\s+/g, "");
  const fixed = CITY_FIX_MAP[key];
  return fixed ? fixed : titleCase(c);
}

/**
 * If city exists and we know it's state, override wrong state
 */
function inferStateFromCity(city) {
  const c = cleanText(city).toLowerCase();
  return CITY_TO_STATE[c] || null;
}

/**
 * Coordinates validator
 */
function isValidCoords(coords) {
  if (!coords) return false;
  const lat = Number(coords.latitude);
  const lng = Number(coords.longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/**
 * Build query candidates:
 * STRICT address-first to ensure unique pins if possible.
 */
function buildQueryCandidates(location) {
  const address = cleanText(location.address);
  const city = cleanText(location.city);
  const state = cleanText(location.state);
  const pincode = cleanText(location.pincode);

  const candidates = [];

  // ✅ If address exists: try strong combos first
  if (address) {
    if (address && city && state && pincode)
      candidates.push(`${address}, ${city}, ${state}, ${pincode}, India`);
    if (address && city && state) candidates.push(`${address}, ${city}, ${state}, India`);
    if (address && city && pincode) candidates.push(`${address}, ${city}, ${pincode}, India`);
    if (address && city) candidates.push(`${address}, ${city}, India`);

    // last resort with address only
    candidates.push(`${address}, India`);

    // fallback to city/state ONLY AFTER address attempts
    if (city && state) candidates.push(`${city}, ${state}, India`);
    if (city) candidates.push(`${city}, India`);

    return candidates;
  }

  // ✅ If no address: city-level
  if (city && state) candidates.push(`${city}, ${state}, India`);
  if (city) candidates.push(`${city}, India`);

  return candidates;
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Nominatim search single query
 */
async function nominatimSearch(query) {
  const url =
    `${NOMINATIM_BASE}?format=json` +
    `&q=${encodeURIComponent(query)}` +
    `&limit=1` +
    `&countrycodes=in` +
    `&addressdetails=1` +
    `&accept-language=en`;

  await throttleNominatim();

  const res = await fetchWithTimeout(
    url,
    {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        Accept: "application/json",
      },
    },
    NOMINATIM_TIMEOUT_MS
  );

  const rawText = await res.text().catch(() => "");

  if (!res.ok) {
    return { ok: false, status: res.status, rawText, data: null };
  }

  try {
    const data = JSON.parse(rawText);
    return { ok: true, status: res.status, rawText, data };
  } catch {
    return { ok: false, status: res.status, rawText, data: null };
  }
}

/**
 * Main geocode method with retries + fallbacks
 */
async function geocodeLocation(location) {
  const candidates = buildQueryCandidates(location);
  if (!candidates.length) return null;

  for (const query of candidates) {
    for (let attempt = 0; attempt <= NOMINATIM_RETRIES; attempt++) {
      const result = await nominatimSearch(query);

      if (!result.ok) {
        // basic backoff for rate-limit/block
        if (result.status === 429) {
          await sleep(5000);
        } else if (result.status === 403) {
          await sleep(7000);
        } else {
          await sleep(1200);
        }

        if (attempt < NOMINATIM_RETRIES) continue;
        break;
      }

      if (Array.isArray(result.data) && result.data.length > 0) {
        const lat = parseFloat(result.data[0].lat);
        const lon = parseFloat(result.data[0].lon);

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          // Decide accuracy level
          const isCityFallback =
            query.endsWith(", India") &&
            !query.includes(cleanText(location.address));

          return {
            coordinates: { latitude: lat, longitude: lon },
            geocodeLevel: isCityFallback ? "city" : "exact",
            queryUsed: query,
          };
        }
      }

      if (attempt < NOMINATIM_RETRIES) await sleep(1200);
    }
  }

  return null;
}

/**
 * Normalize + fix fields + optionally geocode if needed
 */
async function normalizeAndGeocodePayload(payload) {
  const updated = { ...payload };

  // normalize city/state
  if (updated.city) updated.city = normalizeCity(updated.city);
  if (updated.state) updated.state = normalizeState(updated.state);

  // infer correct state from known city list
  const inferredState = inferStateFromCity(updated.city);
  if (inferredState) {
    updated.state = inferredState;
  }

  // If coordinates missing or 0, geocode it
  const coords = updated.coordinates || {};
  const lat = Number(coords.latitude);
  const lng = Number(coords.longitude);

  const needsGeocode =
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat === 0 ||
    lng === 0 ||
    !updated.coordinates;

  if (needsGeocode) {
    const geo = await geocodeLocation(updated);
    if (geo && isValidCoords(geo.coordinates)) {
      updated.coordinates = geo.coordinates;

      // Optional fields (only if your schema supports them)
      updated.geocodeLevel = geo.geocodeLevel;
      updated.geocodeQuery = geo.queryUsed;
      updated.geocodedAt = new Date();
    }
  }

  return updated;
}

/**
 * ================================
 * CONTROLLER METHODS
 * ================================
 */

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

// ✅ Create new location (Admin) - auto-correct + auto-geocode
exports.createLocation = async (req, res) => {
  try {
    const fixedPayload = await normalizeAndGeocodePayload(req.body);

    const location = new BrokerLocation(fixedPayload);
    await location.save();

    res.status(201).json({
      message: "Location created successfully",
      location,
    });
  } catch (error) {
    res.status(400).json({ message: "Error creating location", error: error.message });
  }
};

// ✅ Update location (Admin) - auto-correct + auto-geocode
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const fixedPayload = await normalizeAndGeocodePayload(req.body);

    const location = await BrokerLocation.findByIdAndUpdate(id, fixedPayload, {
      new: true,
      runValidators: true,
    });

    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    res.json({
      message: "Location updated successfully",
      location,
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

// ✅ Bulk import locations (Admin) - auto-correct + auto-geocode
exports.bulkImportLocations = async (req, res) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ message: "Invalid locations data" });
    }

    console.log(`[BrokerLocation] Bulk importing ${locations.length} locations...`);

    // Fix + geocode each record (slow but reliable)
    const fixedLocations = [];
    for (const loc of locations) {
      const fixed = await normalizeAndGeocodePayload(loc);
      fixedLocations.push(fixed);
    }

    // Insert all locations
    const result = await BrokerLocation.insertMany(fixedLocations, { ordered: false });

    console.log(`[BrokerLocation] ✓ Inserted ${result.length} locations`);

    res.status(201).json({
      message: "Bulk import completed successfully",
      imported: result.length,
      total: locations.length,
      success: true,
    });
  } catch (error) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      const inserted = error.insertedDocs?.length || 0;
      return res.status(201).json({
        message: `Imported ${inserted} locations, some duplicates skipped`,
        imported: inserted,
        total: req.body.locations?.length || 0,
        success: true,
      });
    }

    res.status(400).json({ message: "Error importing locations", error: error.message });
  }
};
