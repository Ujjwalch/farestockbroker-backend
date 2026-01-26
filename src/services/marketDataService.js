const yahooFinance = require('yahoo-finance2').default;

// Cache to prevent hitting rate limits
let cache = {
    indices: { data: null, lastFetch: 0 },
    movers: { data: null, lastFetch: 0 }
};

const CACHE_DURATION = 15 * 1000; // 15 seconds

// Nifty 50 Symbols (Top weighted)
const NIFTY50_SYMBOLS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "HUL.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "LICI.NS",
    "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "HCLTECH.NS", "ASIANPAINT.NS",
    "MARUTI.NS", "TITAN.NS", "ULTRACEMCO.NS", "SUNPHARMA.NS", "TATAMOTORS.NS",
    "NTPC.NS", "BAJFINANCE.NS", "NESTLEIND.NS", "POWERGRID.NS", "TATASTEEL.NS",
    "M&M.NS", "ADANIENT.NS", "JSWSTEEL.NS", "COALINDIA.NS", "ONGC.NS"
];

const getIndices = async () => {
    try {
        const now = Date.now();
        if (cache.indices.data && (now - cache.indices.lastFetch < CACHE_DURATION)) {
            return cache.indices.data;
        }

        try {
            const results = await Promise.all([
                yahooFinance.quote('^NSEI'),
                yahooFinance.quote('^BSESN'),
                yahooFinance.quote('^NSEBANK')
            ]);

            const data = results.map(q => ({
                symbol: q.symbol,
                name: q.shortName || q.longName,
                price: q.regularMarketPrice,
                change: q.regularMarketChange,
                percentChange: q.regularMarketChangePercent,
                timestamp: q.regularMarketTime
            }));

            cache.indices = { data, lastFetch: now };
            return data;
        } catch (apiError) {
            console.warn('Yahoo Finance API failed, using mock data:', apiError.message);
            // Mock Data Fallback
            return [
                { symbol: '^NSEI', name: 'Nifty 50', price: 21456.65, change: 123.45, percentChange: 0.58, timestamp: new Date() },
                { symbol: '^BSESN', name: 'SENSEX', price: 71139.90, change: 445.75, percentChange: 0.63, timestamp: new Date() },
                { symbol: '^NSEBANK', name: 'Bank Nifty', price: 46058.20, change: -12.50, percentChange: -0.03, timestamp: new Date() }
            ];
        }
    } catch (error) {
        console.error('Error in getIndices:', error);
        throw error;
    }
};

const getTopMovers = async () => {
    try {
        const now = Date.now();
        if (cache.movers.data && (now - cache.movers.lastFetch < 60 * 1000)) {
            return cache.movers.data;
        }

        try {
            const quotes = await yahooFinance.quote(NIFTY50_SYMBOLS);
            const sorted = quotes.sort((a, b) => b.regularMarketChangePercent - a.regularMarketChangePercent);

            const formatQuote = (q) => ({
                symbol: q.symbol,
                name: q.shortName || q.symbol,
                price: q.regularMarketPrice,
                change: q.regularMarketChange,
                percentChange: q.regularMarketChangePercent
            });

            const data = {
                gainers: sorted.slice(0, 5).map(formatQuote),
                losers: sorted.slice(-5).reverse().map(formatQuote)
            };

            cache.movers = { data, lastFetch: now };
            return data;
        } catch (apiError) {
            console.warn('Yahoo Finance API failed (Movers), using mock data');
            return {
                gainers: [
                    { symbol: 'ADANIENT.NS', name: 'Adani Ent', price: 3024.50, change: 145.20, percentChange: 5.04 },
                    { symbol: 'TATASTEEL.NS', name: 'Tata Steel', price: 134.65, change: 4.20, percentChange: 3.22 },
                    { symbol: 'INFY.NS', name: 'Infosys', price: 1650.30, change: 35.50, percentChange: 2.20 },
                    { symbol: 'RELIANCE.NS', name: 'Reliance', price: 2750.45, change: 45.10, percentChange: 1.67 },
                    { symbol: 'SBIN.NS', name: 'SBI', price: 645.20, change: 9.80, percentChange: 1.54 }
                ],
                losers: [
                    { symbol: 'WIPRO.NS', name: 'Wipro', price: 450.25, change: -12.40, percentChange: -2.68 },
                    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', price: 1450.60, change: -25.30, percentChange: -1.71 },
                    { symbol: 'TECHM.NS', name: 'Tech Mahindra', price: 1280.45, change: -18.20, percentChange: -1.40 },
                    { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma', price: 1120.30, change: -14.50, percentChange: -1.28 },
                    { symbol: 'ITC.NS', name: 'ITC', price: 410.50, change: -3.20, percentChange: -0.77 }
                ]
            };
        }

    } catch (error) {
        console.error('Error fetching movers:', error);
        throw new Error('Failed to fetch top movers');
    }
};

module.exports = {
    getIndices,
    getTopMovers
};
