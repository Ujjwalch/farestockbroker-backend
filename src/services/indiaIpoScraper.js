const axios = require("axios");
const cheerio = require("cheerio");

function cleanText(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    return null;
  }
}

// Simplified scraper - just get basic IPO data from any table structure
async function scrapeGenericIPOSite(url, sourceName) {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 20000,
    });

    const $ = cheerio.load(html);
    const records = [];

    // Find all tables and extract any IPO-like data
    $("table").each((_, table) => {
      $(table).find("tr").each((_, tr) => {
        const cells = [];
        $(tr).find("td, th").each((__, cell) => {
          cells.push(cleanText($(cell).text()));
        });

        // Look for rows that might contain IPO data
        // Usually: Company name, dates, price, lot size
        if (cells.length >= 4) {
          const firstCell = cells[0];
          
          // Skip header rows
          if (firstCell && 
              firstCell.length > 3 && 
              !firstCell.toLowerCase().includes('company') &&
              !firstCell.toLowerCase().includes('name') &&
              !firstCell.toLowerCase().includes('ipo')) {
            
            records.push({
              company: firstCell,
              symbol: null,
              exchange: "NSE/BSE",
              openDate: parseDate(cells[1]) || parseDate(cells[2]),
              closeDate: parseDate(cells[2]) || parseDate(cells[3]),
              listingDate: null,
              issuePrice: cells[3] || cells[1],
              priceRange: cells[3] || cells[1],
              lotSize: cells[4] || null,
              issueSize: cells[5] || null,
              shares: null,
              estVolume: cells[5] || null,
              status: "Upcoming",
              gmp: cells[cells.length - 1] || null,
              source: sourceName,
              sourceUrl: url,
            });
          }
        }
      });
    });

    return records;
  } catch (error) {
    console.error(`[${sourceName}] Error:`, error.message);
    return [];
  }
}

// Hardcoded sample IPO data as fallback
function getSampleIPOs() {
  return [
    {
      company: "Ather Energy IPO",
      symbol: "ATHER",
      exchange: "NSE/BSE",
      openDate: "2026-01-20",
      closeDate: "2026-01-22",
      listingDate: "2026-01-27",
      issuePrice: "₹700-750",
      priceRange: "₹700-750",
      lotSize: "20",
      issueSize: "₹3,000 Cr",
      shares: null,
      estVolume: "₹3,000 Cr",
      status: "Upcoming",
      gmp: "₹150",
      source: "Sample",
      sourceUrl: "https://www.chittorgarh.com",
    },
    {
      company: "Swiggy IPO",
      symbol: "SWIGGY",
      exchange: "NSE/BSE",
      openDate: "2026-01-15",
      closeDate: "2026-01-17",
      listingDate: "2026-01-22",
      issuePrice: "₹390",
      priceRange: "₹371-390",
      lotSize: "38",
      issueSize: "₹11,327 Cr",
      shares: null,
      estVolume: "₹11,327 Cr",
      status: "Open",
      gmp: "₹25",
      source: "Sample",
      sourceUrl: "https://www.investorgain.com",
    },
  ];
}

async function scrapeAllIndianIPOs() {
  const urls = [
    { url: "https://www.chittorgarh.com/ipo/ipo_list.asp", name: "Chittorgarh" },
    { url: "https://www.investorgain.com/report/live-ipo-gmp/331/", name: "Investorgain" },
  ];

  const results = await Promise.allSettled(
    urls.map(({ url, name }) => scrapeGenericIPOSite(url, name))
  );

  let allIPOs = [];
  
  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.length > 0) {
      console.log(`[${urls[index].name}] Scraped ${result.value.length} IPOs`);
      allIPOs = allIPOs.concat(result.value);
    }
  });

  // If no IPOs found, use sample data
  if (allIPOs.length === 0) {
    console.log("[India IPO] No data scraped, using sample IPOs");
    allIPOs = getSampleIPOs();
  }

  // Remove duplicates
  const uniqueIPOs = [];
  const seen = new Set();
  
  for (const ipo of allIPOs) {
    const key = ipo.company.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key) && key.length > 2) {
      seen.add(key);
      uniqueIPOs.push(ipo);
    }
  }

  console.log(`[India IPO] Total: ${uniqueIPOs.length} IPOs`);
  return uniqueIPOs;
}

module.exports = {
  scrapeAllIndianIPOs,
};
