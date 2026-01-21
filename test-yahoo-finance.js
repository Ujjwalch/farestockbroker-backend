const axios = require('axios');

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
  const q = encodeURIComponent(query);
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${q}&quotesCount=6&newsCount=0`;

  console.log(`\n🔍 Searching Yahoo Finance for: "${query}"`);
  console.log(`URL: ${url}\n`);

  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept': 'application/json,text/plain,*/*',
    },
  });

  const data = res.data;
  const quotes = data?.quotes || [];

  console.log(`Found ${quotes.length} results:`);
  quotes.forEach((q, i) => {
    console.log(`  ${i + 1}. ${q.symbol} - ${q.shortname || q.longname || 'N/A'}`);
  });

  // Prefer Indian tickers (.NS / .BO)
  const indian = quotes.find((x) => x?.symbol?.endsWith('.NS')) ||
                 quotes.find((x) => x?.symbol?.endsWith('.BO'));

  const selectedTicker = indian?.symbol || quotes?.[0]?.symbol || null;
  console.log(`\n✅ Selected ticker: ${selectedTicker || 'NONE'}\n`);

  return selectedTicker;
}

/**
 * Yahoo Chart API - Get open price for listing date
 */
async function getYahooOpenForDate(symbol, listingDateStr) {
  const listingDate = new Date(listingDateStr);
  if (isNaN(listingDate.getTime())) {
    console.log(`❌ Invalid listing date: ${listingDateStr}`);
    return null;
  }

  // Yahoo chart API needs unix seconds
  const start = Math.floor(listingDate.getTime() / 1000);
  const end = start + 86400; // +1 day

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?period1=${start}&period2=${end}&interval=1d`;

  console.log(`📊 Fetching price data for ${symbol} on ${listingDateStr}`);
  console.log(`URL: ${url}\n`);

  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept': 'application/json,text/plain,*/*',
    },
  });

  const json = res.data;
  const result = json?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];

  const open = quote?.open?.[0] ?? null;
  const close = quote?.close?.[0] ?? null;
  const high = quote?.high?.[0] ?? null;
  const low = quote?.low?.[0] ?? null;

  if (open == null) {
    console.log(`❌ No price data available for this date\n`);
    return null;
  }

  console.log(`✅ Price data found:`);
  console.log(`   Open:  ₹${open?.toFixed(2)}`);
  console.log(`   Close: ₹${close?.toFixed(2)}`);
  console.log(`   High:  ₹${high?.toFixed(2)}`);
  console.log(`   Low:   ₹${low?.toFixed(2)}\n`);

  return { open, close, high, low };
}

/**
 * Test function
 */
async function testListingPrice(companyName, listingDate) {
  try {
    console.log('='.repeat(60));
    console.log(`Testing Yahoo Finance Integration`);
    console.log('='.repeat(60));
    console.log(`Company: ${companyName}`);
    console.log(`Listing Date: ${listingDate}`);
    console.log('='.repeat(60));

    // Step 1: Search for ticker
    const cleanName = stripCompanySuffix(companyName);
    console.log(`Cleaned company name: "${cleanName}"`);
    
    const ticker = await searchYahooTicker(cleanName);

    if (!ticker) {
      console.log('❌ FAILED: Could not find ticker symbol');
      return;
    }

    // Step 2: Get price data
    const priceData = await getYahooOpenForDate(ticker, listingDate);

    if (!priceData || priceData.open == null) {
      console.log('❌ FAILED: Could not fetch listing price');
      return;
    }

    console.log('='.repeat(60));
    console.log('✅ SUCCESS!');
    console.log('='.repeat(60));
    console.log(`Company: ${companyName}`);
    console.log(`Ticker: ${ticker}`);
    console.log(`Listing Date: ${listingDate}`);
    console.log(`Listing Price (Open): ₹${priceData.open.toFixed(2)}`);
    console.log(`Close Price: ₹${priceData.close.toFixed(2)}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run test
const companyName = process.argv[2] || 'Amagi Media Labs';
const listingDate = process.argv[3] || '2025-01-22'; // Today as default

testListingPrice(companyName, listingDate);
