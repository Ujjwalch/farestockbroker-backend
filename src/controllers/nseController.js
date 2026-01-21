const axios = require('axios');
const http = require('http');
const https = require('https');

// Create HTTP agents with keep-alive
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

// Retry helper function
async function retryRequest(requestFn, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isTimeout = error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED';
      
      if (isLastAttempt || !isTimeout) {
        throw error;
      }
      
      console.log(`   Retry ${attempt}/${maxRetries} after ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
}

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
    .replace(/\b(limited|ltd|private|pvt|pvt\.|inc|co|corporation|corp)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get search variations for better ticker matching
 */
function getSearchVariations(companyName, symbol = null) {
  const variations = [];
  
  // If symbol is provided, try it first
  if (symbol) {
    variations.push(symbol);
  }
  
  // Original name
  variations.push(companyName);
  
  // Without suffix
  const withoutSuffix = stripCompanySuffix(companyName);
  if (withoutSuffix !== companyName) {
    variations.push(withoutSuffix);
  }
  
  // First word only (for companies like "Amagi Media Labs" -> "Amagi")
  const firstWord = companyName.split(' ')[0];
  if (firstWord.length > 3) {
    variations.push(firstWord);
  }
  
  // First two words
  const words = companyName.split(' ');
  if (words.length >= 2) {
    variations.push(`${words[0]} ${words[1]}`);
  }
  
  return variations;
}

/**
 * Fallback: Try to get price from NSE public API (no auth needed)
 */
async function getNSEPublicQuote(symbol) {
  try {
    // NSE public quote API (doesn't require cookies)
    const url = `https://www.nseindia.com/api/quote-equity?symbol=${symbol}`;
    
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.nseindia.com/',
      },
      timeout: 30000,
    });

    const data = res.data;
    const priceInfo = data?.priceInfo;
    
    if (priceInfo) {
      return {
        open: priceInfo.open,
        close: priceInfo.close || priceInfo.lastPrice,
        lastPrice: priceInfo.lastPrice,
      };
    }
    
    return null;
  } catch (error) {
    console.error(`   NSE Public API Error for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Yahoo Search: companyName -> best ticker (with retry and variations)
 */
async function searchYahooTicker(query) {
  const variations = getSearchVariations(query);
  
  for (const searchTerm of variations) {
    try {
      console.log(`   Trying search: "${searchTerm}"`);
      
      const ticker = await retryRequest(async () => {
        const q = encodeURIComponent(searchTerm);
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${q}&quotesCount=6&newsCount=0`;

        const res = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
            'Accept': 'application/json,text/plain,*/*',
            'Connection': 'keep-alive',
          },
          timeout: 60000,
          httpAgent,
          httpsAgent,
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
        });

        const data = res.data;
        const quotes = data?.quotes || [];

        // Prefer Indian tickers (.NS / .BO)
        const indian = quotes.find((x) => x?.symbol?.endsWith('.NS')) ||
                       quotes.find((x) => x?.symbol?.endsWith('.BO'));

        return indian?.symbol || quotes?.[0]?.symbol || null;
      }, 2, 500); // Reduced retries for variations
      
      if (ticker) {
        console.log(`   ✅ Found ticker: ${ticker} (using "${searchTerm}")`);
        return ticker;
      }
    } catch (error) {
      console.log(`   ❌ Search failed for "${searchTerm}": ${error.message}`);
      // Continue to next variation
    }
  }
  
  console.error(`   No ticker found for "${query}" after trying ${variations.length} variations`);
  throw new Error(`Ticker not found after trying: ${variations.join(', ')}`);
}

/**
 * Yahoo Chart API - Get open price for listing date (with retry)
 */
async function getYahooOpenForDate(symbol, listingDateStr) {
  return retryRequest(async () => {
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
        'Connection': 'keep-alive',
      },
      timeout: 60000,
      httpAgent,
      httpsAgent,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
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
  }, 3, 1000).catch(error => {
    console.error(`   Yahoo Chart Error for ${symbol}:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
    });
    throw new Error(`Yahoo Chart failed after retries: ${error.message || error.code || 'Unknown error'}`);
  });
}

/**
 * Test endpoint to verify Yahoo Finance connectivity
 */
exports.testYahooFinance = async (req, res) => {
  try {
    console.log('\n🧪 Testing Yahoo Finance connectivity...');
    
    // Test 1: Search API
    console.log('1. Testing Yahoo Search API...');
    const searchUrl = 'https://query2.finance.yahoo.com/v1/finance/search?q=Amagi&quotesCount=6&newsCount=0';
    
    const searchRes = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
      },
      timeout: 60000,
      httpAgent,
      httpsAgent,
    });
    
    console.log('   ✅ Search API works');
    console.log('   Found quotes:', searchRes.data?.quotes?.length || 0);
    
    // Test 2: Chart API
    console.log('2. Testing Yahoo Chart API...');
    const chartUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/AMAGI.NS?period1=1737417600&period2=1737504000&interval=1d';
    
    const chartRes = await axios.get(chartUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
      },
      timeout: 60000,
      httpAgent,
      httpsAgent,
    });
    
    console.log('   ✅ Chart API works');
    
    return res.json({
      success: true,
      message: 'Yahoo Finance APIs are accessible',
      tests: {
        search: {
          success: true,
          quotesFound: searchRes.data?.quotes?.length || 0,
          quotes: searchRes.data?.quotes || []
        },
        chart: {
          success: true,
          hasData: !!chartRes.data?.chart?.result?.[0]
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Yahoo Finance test failed:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error response:', error.response?.status, error.response?.statusText);
    
    return res.status(500).json({
      success: false,
      message: 'Yahoo Finance test failed',
      error: {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText
      }
    });
  }
};

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
    const BATCH_SIZE = 3; // Reduced from 5
    const DELAY_MS = 2000; // Increased to 2 seconds
    
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

          // If symbol is provided, use it directly with .NS suffix
          let ticker = null;
          if (ipo.symbol) {
            ticker = `${ipo.symbol}.NS`;
            console.log(`   Using provided symbol: ${ticker}`);
          } else {
            // Search for ticker (will try multiple variations)
            console.log(`   Searching for: "${ipo.companyName}"`);
            ticker = await searchYahooTicker(ipo.companyName, ipo.symbol);
          }

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

          // Get open price for listing date from Yahoo Finance
          let priceData = null;
          try {
            priceData = await getYahooOpenForDate(ticker, finalListingDate);
          } catch (yahooError) {
            console.log(`   Yahoo Finance failed, trying NSE fallback...`);
            // Try NSE as fallback (will get current price, not historical)
            const nseSymbol = ticker.replace('.NS', '').replace('.BO', '');
            priceData = await getNSEPublicQuote(nseSymbol);
          }

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
