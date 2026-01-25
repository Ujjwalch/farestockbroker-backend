/**
 * Free Geocoding using OpenStreetMap Nominatim
 * - No paid API
 * - Rate limited (1 req/sec)
 * - Caching so same query doesn't spam Nominatim
 * - Retry + timeout protection
 */

let fetchFn = global.fetch;

// ✅ fallback if node doesn't support fetch
if (!fetchFn) {
  try {
    // node-fetch v3 is ESM, so require() won't work
    // but many projects still have node-fetch v2
    // we'll attempt require and fallback safely
    // eslint-disable-next-line global-require
    fetchFn = require("node-fetch");
  } catch (e) {
    // if you are here, install one of:
    // npm i node-fetch@2
    // OR upgrade node to 18+
    fetchFn = null;
  }
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// very small in-memory cache (fast + free)
const geoCache = new Map();

// basic rate limiter: 1 request/sec
let lastRequestAt = 0;
async function rateLimit() {
  const now = Date.now();
  const diff = now - lastRequestAt;
  if (diff < 1100) await sleep(1100 - diff);
  lastRequestAt = Date.now();
}

function buildQuery(address, city, state, pincode) {
  const parts = [];

  if (address && String(address).trim()) parts.push(String(address).trim());
  if (city && String(city).trim()) parts.push(String(city).trim());
  if (state && String(state).trim()) parts.push(String(state).trim());
  if (pincode && String(pincode).trim()) parts.push(String(pincode).trim());

  parts.push("India");
  return parts.join(", ");
}

function normalizeKey(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ✅ fetch with timeout (prevents hanging)
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  if (!fetchFn) throw new Error("Fetch not available. Use Node 18+ or install node-fetch@2");

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchFn(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ✅ retry wrapper (Nominatim can fail randomly)
async function fetchWithRetry(url, options = {}, retries = 2) {
  let lastErr;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchWithTimeout(url, options, 8000);
    } catch (err) {
      lastErr = err;
      await sleep(500 + i * 700);
    }
  }

  throw lastErr;
}

async function geocodeNominatim(query) {
  await rateLimit();

  const url = `${NOMINATIM_BASE}?format=json&q=${encodeURIComponent(query)}&limit=1`;

  // ✅ Nominatim needs proper headers (sometimes blocks)
  const res = await fetchWithRetry(
    url,
    {
      headers: {
        "User-Agent": "FareStockBroker/1.0 (Backend Geocoding)",
        "Accept": "application/json",
        "Accept-Language": "en",
      },
    },
    2
  ).catch(() => null);

  if (!res || !res.ok) return null;

  const data = await res.json().catch(() => null);
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = parseFloat(data[0].lat);
  const lon = parseFloat(data[0].lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    latitude: lat,
    longitude: lon,
    usedQuery: query,
  };
}

/**
 * Robust geocode:
 * Try full address first, then fallbacks
 */
async function geocodeAddress({ address, city, state, pincode }) {
  const attempts = [];

  // 1) full address
  attempts.push(buildQuery(address, city, state, pincode));

  // 2) remove pincode
  attempts.push(buildQuery(address, city, state, ""));

  // 3) city+state only
  attempts.push(buildQuery("", city, state, ""));

  // 4) city only
  attempts.push(buildQuery("", city, "", ""));

  for (const query of attempts) {
    const cacheKey = normalizeKey(query);

    if (geoCache.has(cacheKey)) {
      return geoCache.get(cacheKey);
    }

    const coords = await geocodeNominatim(query);
    if (coords) {
      geoCache.set(cacheKey, coords);
      return coords;
    }
  }

  return null;
}

function isZeroCoords(coords) {
  const lat = Number(coords?.latitude || 0);
  const lng = Number(coords?.longitude || 0);
  return lat === 0 && lng === 0;
}

module.exports = {
  geocodeAddress,
  isZeroCoords,
};
