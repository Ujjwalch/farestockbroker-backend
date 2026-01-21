const axios = require('axios');

// In-memory cache
const CACHE = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * Format date to YYYY-MM-DD
 */
function formatDateYYYYMMDD(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Strip company suffix for better search
 */
function stripCompanySuffix(name = '') {
  return name
    .replace(/\b(limited|ltd|private|pvt|pvt\.|inc|co)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Yahoo Search: companyName -> best ticker
 */
async function searchYahooTicker(query) {
  try {
    const q = encodeURIComponent(query);
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${q}&quotesCount=6&newsCount=0`;

    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Accept': 'application/json,text/plain,*/*',
      },
      timeout: 10000, // 10 second timeout
    });

    const data = res.data;
    const quotes = data?.quotes || [];

    // Prefer Indian tickers (.NS / .BO)
    const indian = quotes.find((x) => x?.symbol?.endsWith('.NS')) ||
                   quotes.find((x) => x?.symbol?.endsWith('.BO'));

    return indian?.symbol || quotes?.[0]?.symbol || null;
  } catch (error) {
    console.error(`   Yahoo Search Error for "${query}": ${error.message}`);
    throw error;
  }
}

/**
 * Yahoo Chart API - Get open price for listing date
 */
async function getYahooOpenForDate(symbol, listingDateStr) {
  try {
    const listingDate = new Date(listingDateStr);
    if (isNaN(listingDate.getTime())) {
      throw new Error(`Invalid listing date: ${listingDateStr}`);
    }

    // Yahoo chart API needs unix seconds
    const start = Math.floor(listingDate.getTime() / 1000);
    const end = start + 86400; // +1 day

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?period1=${start}&period2=${end}&interval=1d`;

    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Accept': 'application/json,text/plain,*/*',
      },
      timeout: 10000, // 10 second timeout
    });

    const json = res.data;
    const result = json?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];

    const open = quote?.open?.[0] ?? null;
    const close = quote?.close?.[0] ?? null;

    if (open == null) {
      throw new Error(`No price data available for ${symbol} on ${listingDateStr}`);
    }

    return { open, close };
  } catch (error) {
    console.error(`   Yahoo Chart Error for ${symbol}: ${error.message}`);
    throw error;
  }
}

/**
 * Get listing price using Yahoo Finance
 */
exports.getListingPrice = async (req, res) => {
  try {
    const { companyName, listingDate, ipoId } = req.query;

    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: 'companyName is required',
      });
    }

    // Check cache first
    const cacheKey = `listing_${ipoId || companyName}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`Cache hit for ${companyName}`);
      return res.json(cached.data);
    }

    // If no listing date provided, try to fetch from IPO API
    let finalListingDate = listingDate;
    if (!finalListingDate && ipoId) {
      try {
        const ipoDetails = await getIPODetails(ipoId);
        finalListingDate = ipoDetails?.listingDate;
      } catch (err) {
        console.warn(`Could not fetch IPO details for ${ipoId}:`, err.message);
      }
    }

    if (!finalListingDate) {
      return res.status(400).json({
        success: false,
        message: 'listingDate is required (or provide ipoId)',
      });
    }

    // Search for ticker
    const cleanName = stripCompanySuffix(companyName);
    const ticker = await searchYahooTicker(cleanName);

    if (!ticker) {
      return res.status(404).json({
        success: false,
        message: 'Could not find ticker symbol for this company',
        companyName,
      });
    }

    // Get open price for listing date
    const priceData = await getYahooOpenForDate(ticker, finalListingDate);

    if (!priceData || priceData.open == null) {
      return res.status(404).json({
        success: false,
        message: 'Could not fetch listing price for this date',
        ticker,
        listingDate: finalListingDate,
      });
    }

    const responseData = {
      success: true,
      message: 'Listing price fetched successfully',
      data: {
        companyName,
        ticker,
        listingDate: finalListingDate,
        listingPrice: priceData.open,
        closePrice: priceData.close,
      },
    };

    // Cache the result
    CACHE.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    return res.json(responseData);
  } catch (error) {
    console.error('Yahoo Finance API Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Batch fetch listing prices for multiple IPOs using Yahoo Finance
 */
exports.getBatchListingPrices = async (req, res) => {
  try {
    const { ipos } = req.body; // Array of { companyName, ipoId, listingDate? }

    if (!Array.isArray(ipos) || ipos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ipos array is required',
      });
    }

    console.log(`\n📊 Batch listing price request for ${ipos.length} IPOs`);

    // Process in smaller batches to avoid rate limiting
    const BATCH_SIZE = 5;
    const DELAY_MS = 1000; // 1 second delay between batches
    
    const allResults = [];
    
    for (let i = 0; i < ipos.length; i += BATCH_SIZE) {
      const batch = ipos.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ipos.length / BATCH_SIZE)} (${batch.length} IPOs)`);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (ipo) => {
        try {
          // Check cache first
          const cacheKey = `listing_${ipo.ipoId || ipo.companyName}`;
          const cached = CACHE.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log(`✅ Cache hit: ${ipo.companyName}`);
            return cached.data.data; // Return the data portion
          }

          // Get listing date
          let finalListingDate = ipo.listingDate;
          if (!finalListingDate && ipo.ipoId) {
            try {
              const ipoDetails = await getIPODetails(ipo.ipoId);
              finalListingDate = ipoDetails?.listingDate;
            } catch (err) {
              console.warn(`⚠️  Could not fetch IPO details for ${ipo.companyName}:`, err.message);
            }
          }

          if (!finalListingDate) {
            console.log(`❌ ${ipo.companyName}: No listing date available`);
            return {
              ipoId: ipo.ipoId,
              companyName: ipo.companyName,
              success: false,
              error: 'Listing date not available',
            };
          }

          // Search for ticker
          const cleanName = stripCompanySuffix(ipo.companyName);
          console.log(`   Searching for: "${cleanName}"`);
          const ticker = await searchYahooTicker(cleanName);

          if (!ticker) {
            console.log(`❌ ${ipo.companyName}: Ticker not found`);
            return {
              ipoId: ipo.ipoId,
              companyName: ipo.companyName,
              success: false,
              error: 'Ticker not found',
            };
          }

          console.log(`   Found ticker: ${ticker}`);

          // Get open price for listing date
          const priceData = await getYahooOpenForDate(ticker, finalListingDate);

          if (!priceData || priceData.open == null) {
            console.log(`❌ ${ipo.companyName} (${ticker}): No price data for ${finalListingDate}`);
            return {
              ipoId: ipo.ipoId,
              companyName: ipo.companyName,
              ticker,
              success: false,
              error: 'Price data not available',
            };
          }

          console.log(`✅ ${ipo.companyName} (${ticker}): ₹${priceData.open.toFixed(2)}`);

          const result = {
            ipoId: ipo.ipoId,
            companyName: ipo.companyName,
            ticker,
            listingPrice: priceData.open,
            lastPrice: priceData.close,
            success: true,
          };

          // Cache the result
          CACHE.set(cacheKey, {
            data: { data: result },
            timestamp: Date.now(),
          });

          return result;
        } catch (error) {
          console.error(`❌ ${ipo.companyName}: ${error.message}`);
          console.error(`   Stack: ${error.stack}`);
          return {
            ipoId: ipo.ipoId,
            companyName: ipo.companyName,
            success: false,
            error: error.message || 'Unknown error',
          };
        }
      })
    );

      allResults.push(...batchResults);
      
      // Delay between batches (except for the last batch)
      if (i + BATCH_SIZE < ipos.length) {
        console.log(`   ⏳ Waiting ${DELAY_MS}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    const data = allResults.map((result) =>
      result.status === 'fulfilled' ? result.value : result.reason
    );

    const successCount = data.filter(d => d.success).length;
    console.log(`\n📊 Batch complete: ${successCount}/${ipos.length} successful\n`);

    return res.json({
      success: true,
      message: 'Batch listing prices fetched',
      data,
    });
  } catch (error) {
    console.error('❌ Batch listing prices error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Helper: Get IPO details from ipoapi.in
 */
async function getIPODetails(ipoId) {
  const apiKey = process.env.IPO_API_KEY;
  const apiSecret = process.env.IPO_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('IPO API credentials not configured');
  }

  const url = `https://api.ipoapi.in/api/ipo/${ipoId}`;
  const res = await axios.get(url, {
    headers: {
      ApiKey: apiKey,
      ApiSecret: apiSecret,
    },
  });

  if (!res.data || !res.data.isSuccess) {
    throw new Error('Failed to fetch IPO details');
  }

  return res.data.data;
}
