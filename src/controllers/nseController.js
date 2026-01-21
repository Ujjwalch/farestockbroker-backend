const axios = require('axios');

/**
 * NSE needs cookies + browser-like headers.
 * We'll fetch homepage once to get cookies.
 */
async function getNseCookies() {
  try {
    const res = await axios.get('https://www.nseindia.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      },
    });

    const rawCookies = res.headers['set-cookie'];
    if (!rawCookies) return '';

    return rawCookies.map((c) => c.split(';')[0]).join('; ');
  } catch (error) {
    console.error('Error getting NSE cookies:', error.message);
    return '';
  }
}

/**
 * NSE Autocomplete Search
 * Converts companyName -> NSE Symbol
 */
async function searchNseSymbol(companyName) {
  const cookies = await getNseCookies();

  const url = `https://www.nseindia.com/api/search/autocomplete?q=${encodeURIComponent(companyName)}`;

  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept': 'application/json,text/plain,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.nseindia.com/',
      'Cookie': cookies,
      'Connection': 'keep-alive',
    },
  });

  const data = res.data;
  const list = Array.isArray(data) ? data : data?.symbols || [];

  if (!list.length) return null;

  // Best pick: first result
  const first = list[0];
  const symbol = first?.symbol;

  return symbol || null;
}

/**
 * NSE Quote API: Get open price etc.
 */
async function getNseQuote(symbol) {
  const cookies = await getNseCookies();

  const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`;

  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept': 'application/json,text/plain,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`,
      'Cookie': cookies,
      'Connection': 'keep-alive',
    },
  });

  return res.data;
}

/**
 * Get listing price from NSE for a company
 */
exports.getListingPrice = async (req, res) => {
  try {
    const { companyName, symbol } = req.query;

    if (!companyName && !symbol) {
      return res.status(400).json({
        success: false,
        message: 'Either companyName or symbol is required',
      });
    }

    // If symbol is provided, use it directly
    let nseSymbol = symbol;

    // Otherwise, search for symbol using company name
    if (!nseSymbol && companyName) {
      nseSymbol = await searchNseSymbol(companyName);

      if (!nseSymbol) {
        return res.status(404).json({
          success: false,
          message: 'Could not find NSE symbol for this company',
          companyName,
        });
      }
    }

    // Fetch NSE quote
    const quote = await getNseQuote(nseSymbol);
    const openPrice = quote?.priceInfo?.open ?? null;
    const lastPrice = quote?.priceInfo?.lastPrice ?? null;
    const closePrice = quote?.priceInfo?.close ?? null;

    return res.json({
      success: true,
      message: 'Listing price fetched successfully',
      data: {
        companyName: companyName || quote?.info?.companyName,
        nseSymbol,
        listingPrice: openPrice, // Open price on listing day
        lastPrice,
        closePrice,
        priceInfo: quote?.priceInfo,
      },
    });
  } catch (error) {
    console.error('NSE API Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Batch fetch listing prices for multiple IPOs
 */
exports.getBatchListingPrices = async (req, res) => {
  try {
    const { ipos } = req.body; // Array of { companyName, ipoId }

    if (!Array.isArray(ipos) || ipos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ipos array is required',
      });
    }

    const results = await Promise.allSettled(
      ipos.map(async (ipo) => {
        try {
          const nseSymbol = await searchNseSymbol(ipo.companyName);
          if (!nseSymbol) {
            return {
              ipoId: ipo.ipoId,
              companyName: ipo.companyName,
              success: false,
              error: 'Symbol not found',
            };
          }

          const quote = await getNseQuote(nseSymbol);
          return {
            ipoId: ipo.ipoId,
            companyName: ipo.companyName,
            nseSymbol,
            listingPrice: quote?.priceInfo?.open ?? null,
            lastPrice: quote?.priceInfo?.lastPrice ?? null,
            success: true,
          };
        } catch (error) {
          return {
            ipoId: ipo.ipoId,
            companyName: ipo.companyName,
            success: false,
            error: error.message,
          };
        }
      })
    );

    const data = results.map((result) =>
      result.status === 'fulfilled' ? result.value : result.reason
    );

    return res.json({
      success: true,
      message: 'Batch listing prices fetched',
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
