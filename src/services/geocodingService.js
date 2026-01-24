const https = require('https');

/**
 * Geocoding Service using OpenStreetMap Nominatim API
 * Free, no API key required
 */

/**
 * Geocode an address to get latitude and longitude
 * @param {string} address - Full address
 * @param {string} city - City name
 * @param {string} state - State name
 * @param {string} pincode - Pincode
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
async function geocodeAddress(address, city, state, pincode) {
  return new Promise((resolve, reject) => {
    // Construct full address for better accuracy
    const fullAddress = `${address}, ${city}, ${state}, ${pincode}, India`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;
    
    console.log(`[Geocoding] Searching for: ${city}, ${state}`);
    
    https.get(url, {
      headers: {
        'User-Agent': 'FareStockBroker-LocationService/1.0'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          
          if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            console.log(`[Geocoding] ✓ Found: ${lat}, ${lon}`);
            resolve({ latitude: lat, longitude: lon });
          } else {
            // Try with just city and state
            console.log(`[Geocoding] Exact address not found, trying city/state...`);
            geocodeByArea(city, state)
              .then(resolve)
              .catch(reject);
          }
        } catch (error) {
          console.error(`[Geocoding] Parse error:`, error.message);
          // Fallback to city/state
          geocodeByArea(city, state)
            .then(resolve)
            .catch(reject);
        }
      });
    }).on('error', (error) => {
      console.error(`[Geocoding] Request error:`, error.message);
      // Fallback to city/state
      geocodeByArea(city, state)
        .then(resolve)
        .catch(reject);
    });
  });
}

/**
 * Geocode by area (city + state) for better accuracy
 * @param {string} city - City name
 * @param {string} state - State name
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
async function geocodeByArea(city, state) {
  return new Promise((resolve, reject) => {
    const searchQuery = `${city}, ${state}, India`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`;
    
    console.log(`[Geocoding] Searching area: ${city}, ${state}`);
    
    https.get(url, {
      headers: {
        'User-Agent': 'FareStockBroker-LocationService/1.0'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          
          if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            console.log(`[Geocoding] ✓ Found area: ${lat}, ${lon}`);
            resolve({ latitude: lat, longitude: lon });
          } else {
            // Use city fallback coordinates
            console.log(`[Geocoding] Using fallback for ${city}`);
            const fallback = getCityFallback(city);
            resolve(fallback);
          }
        } catch (error) {
          console.error(`[Geocoding] Parse error:`, error.message);
          const fallback = getCityFallback(city);
          resolve(fallback);
        }
      });
    }).on('error', (error) => {
      console.error(`[Geocoding] Request error:`, error.message);
      const fallback = getCityFallback(city);
      resolve(fallback);
    });
  });
}

/**
 * Fallback coordinates for major Indian cities
 * @param {string} city - City name
 * @returns {{latitude: number, longitude: number}}
 */
function getCityFallback(city) {
  const fallbacks = {
    // Maharashtra
    'Mumbai': { latitude: 19.0760, longitude: 72.8777 },
    'Pune': { latitude: 18.5204, longitude: 73.8567 },
    'Nagpur': { latitude: 21.1458, longitude: 79.0882 },
    'Nashik': { latitude: 19.9975, longitude: 73.7898 },
    'Aurangabad': { latitude: 19.8762, longitude: 75.3433 },
    'Ahmednagar': { latitude: 19.0948, longitude: 74.7480 },
    
    // Karnataka
    'Bangalore': { latitude: 12.9716, longitude: 77.5946 },
    'Bengaluru': { latitude: 12.9716, longitude: 77.5946 },
    'Mysore': { latitude: 12.2958, longitude: 76.6394 },
    'Hubli': { latitude: 15.3647, longitude: 75.1240 },
    
    // Delhi NCR
    'Delhi': { latitude: 28.7041, longitude: 77.1025 },
    'New Delhi': { latitude: 28.6139, longitude: 77.2090 },
    'Gurgaon': { latitude: 28.4595, longitude: 77.0266 },
    'Noida': { latitude: 28.5355, longitude: 77.3910 },
    
    // Tamil Nadu
    'Chennai': { latitude: 13.0827, longitude: 80.2707 },
    'Coimbatore': { latitude: 11.0168, longitude: 76.9558 },
    'Madurai': { latitude: 9.9252, longitude: 78.1198 },
    
    // Gujarat
    'Ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
    'Surat': { latitude: 21.1702, longitude: 72.8311 },
    'Vadodara': { latitude: 22.3072, longitude: 73.1812 },
    
    // West Bengal
    'Kolkata': { latitude: 22.5726, longitude: 88.3639 },
    
    // Telangana
    'Hyderabad': { latitude: 17.3850, longitude: 78.4867 },
    
    // Rajasthan
    'Jaipur': { latitude: 26.9124, longitude: 75.7873 },
    'Udaipur': { latitude: 24.5854, longitude: 73.7125 },
    
    // Uttar Pradesh
    'Lucknow': { latitude: 26.8467, longitude: 80.9462 },
    'Kanpur': { latitude: 26.4499, longitude: 80.3319 },
    'Agra': { latitude: 27.1767, longitude: 78.0081 },
    
    // Kerala
    'Kochi': { latitude: 9.9312, longitude: 76.2673 },
    'Thiruvananthapuram': { latitude: 8.5241, longitude: 76.9366 },
    
    // Punjab
    'Chandigarh': { latitude: 30.7333, longitude: 76.7794 },
    'Ludhiana': { latitude: 30.9010, longitude: 75.8573 },
    
    // Madhya Pradesh
    'Indore': { latitude: 22.7196, longitude: 75.8577 },
    'Bhopal': { latitude: 23.2599, longitude: 77.4126 },
  };
  
  // Try exact match first
  if (fallbacks[city]) {
    return fallbacks[city];
  }
  
  // Try case-insensitive match
  const cityLower = city.toLowerCase();
  for (const [key, value] of Object.entries(fallbacks)) {
    if (key.toLowerCase() === cityLower) {
      return value;
    }
  }
  
  // Default to India center
  console.log(`[Geocoding] No fallback for ${city}, using India center`);
  return { latitude: 20.5937, longitude: 78.9629 };
}

/**
 * Validate coordinates
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {boolean}
 */
function isValidCoordinates(latitude, longitude) {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
}

module.exports = {
  geocodeAddress,
  geocodeByArea,
  getCityFallback,
  isValidCoordinates
};
