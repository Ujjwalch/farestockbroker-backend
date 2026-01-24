/**
 * ✅ Geocoding Service using Nominatim (OpenStreetMap)
 * Free service with rate limiting considerations
 */

/**
 * Check if coordinates are valid
 */
function isValidCoordinates(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Build full address string for geocoding
 */
function buildAddressQuery(address, city, state, pincode) {
  const parts = [
    address?.trim(),
    city?.trim(),
    state?.trim(),
    pincode?.trim(),
    "India",
  ].filter(Boolean);
  
  return parts.join(", ");
}

/**
 * Geocode address using Nominatim
 * Returns { latitude, longitude } or throws error
 */
async function geocodeAddress(address, city, state, pincode) {
  const query = buildAddressQuery(address, city, state, pincode);
  
  if (!query || query === "India") {
    throw new Error("Insufficient address information for geocoding");
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      query
    )}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "BrokerLocationApp/1.0", // Nominatim requires User-Agent
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`No geocoding results found for: ${city}, ${state}`);
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    if (!isValidCoordinates(lat, lng)) {
      throw new Error("Invalid coordinates returned from geocoding API");
    }

    return {
      latitude: lat,
      longitude: lng,
    };
  } catch (error) {
    console.error("[Geocoding] Error:", error.message);
    throw error;
  }
}

/**
 * Batch geocode multiple addresses with rate limiting
 * Returns array of { success, coordinates, error }
 */
async function geocodeBatch(locations, delayMs = 1000) {
  const results = [];

  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    
    try {
      const coordinates = await geocodeAddress(
        loc.address,
        loc.city,
        loc.state,
        loc.pincode
      );
      
      results.push({
        success: true,
        coordinates,
        index: i,
      });
    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        index: i,
      });
    }

    // Rate limiting delay (except for last item)
    if (i < locations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

module.exports = {
  geocodeAddress,
  geocodeBatch,
  isValidCoordinates,
  buildAddressQuery,
};