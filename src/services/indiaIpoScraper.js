const axios = require("axios");
const cheerio = require("cheerio");

function cleanText(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    // Try to parse various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }
  } catch (e) {
    console.error('Date parse error:', e);
  }
  return null;
}

async function scrapeChittorgarh() {
  const url = "https://www.chittorgarh.com/ipo/ipo_list_2026.asp";
  
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 20000,
    });

    const $ = cheerio.load(html);
    const records = [];

    // Find the IPO table
    $("table.table").each((_, table) => {
      $(table).find("tbody tr").each((_, tr) => {
        const cols = [];
        $(tr).find("td").each((__, td) => {
          cols.push(cleanText($(td).text()));
        });

        if (cols.length >= 8) {
          const company = cols[0];
          const openDate = parseDate(cols[1]);
          const closeDate = parseDate(cols[2]);
          const issuePrice = cols[3];
          const lotSize = cols[4];
          const issueSize = cols[5];
          const listingDate = parseDate(cols[6]);
          const status = cols[7] || "Upcoming";

          if (company) {
            records.push({
              company: cleanText(company),
              symbol: null,
              exchange: "NSE/BSE",
              openDate,
              closeDate,
              listingDate,
              issuePrice,
              priceRange: issuePrice,
              lotSize,
              issueSize,
              shares: null,
              estVolume: issueSize,
              status,
              gmp: null,
              source: "Chittorgarh",
              sourceUrl: url,
            });
          }
        }
      });
    });

    return records;
  } catch (error) {
    console.error("[Chittorgarh] Scrape error:", error.message);
    return [];
  }
}

async function scrapeInvestorgain() {
  const url = "https://www.investorgain.com/report/live-ipo-gmp/331/";
  
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 20000,
    });

    const $ = cheerio.load(html);
    const records = [];

    // Find IPO tables
    $("table").each((_, table) => {
      $(table).find("tr").each((_, tr) => {
        const cols = [];
        $(tr).find("td").each((__, td) => {
          cols.push(cleanText($(td).text()));
        });

        if (cols.length >= 6 && cols[0] && !cols[0].includes("IPO Name")) {
          const company = cols[0];
          const priceRange = cols[1];
          const openDate = parseDate(cols[2]);
          const closeDate = parseDate(cols[3]);
          const lotSize = cols[4];
          const gmp = cols[5];

          if (company) {
            records.push({
              company: cleanText(company),
              symbol: null,
              exchange: "NSE/BSE",
              openDate,
              closeDate,
              listingDate: null,
              issuePrice: priceRange,
              priceRange,
              lotSize,
              issueSize: null,
              shares: null,
              estVolume: null,
              status: "Open",
              gmp: gmp && gmp !== "-" ? gmp : null,
              source: "Investorgain",
              sourceUrl: url,
            });
          }
        }
      });
    });

    return records;
  } catch (error) {
    console.error("[Investorgain] Scrape error:", error.message);
    return [];
  }
}

async function scrapeAllIndianIPOs() {
  console.log("[India IPO] Starting multi-source scrape...");
  
  const results = await Promise.allSettled([
    scrapeChittorgarh(),
    scrapeInvestorgain(),
  ]);

  let allIPOs = [];
  
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const source = index === 0 ? "Chittorgarh" : "Investorgain";
      console.log(`[${source}] Scraped ${result.value.length} IPOs`);
      allIPOs = allIPOs.concat(result.value);
    } else {
      console.error(`[Source ${index}] Failed:`, result.reason);
    }
  });

  // Remove duplicates based on company name
  const uniqueIPOs = [];
  const seen = new Set();
  
  for (const ipo of allIPOs) {
    const key = ipo.company.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueIPOs.push(ipo);
    }
  }

  console.log(`[India IPO] Total unique IPOs: ${uniqueIPOs.length}`);
  return uniqueIPOs;
}

module.exports = {
  scrapeAllIndianIPOs,
  scrapeChittorgarh,
  scrapeInvestorgain,
};
