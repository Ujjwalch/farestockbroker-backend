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

async function scrapeChittorgarh() {
  const url = "https://www.chittorgarh.com/ipo/ipo_list.asp";
  
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 20000,
    });

    const $ = cheerio.load(html);
    const records = [];

    $("table.table tbody tr").each((_, tr) => {
      const cols = [];
      $(tr).find("td").each((__, td) => {
        cols.push(cleanText($(td).text()));
      });

      if (cols.length >= 8 && cols[0] && cols[0].length > 2) {
        records.push({
          company: cleanText(cols[0]),
          symbol: null,
          exchange: "NSE/BSE",
          openDate: parseDate(cols[1]),
          closeDate: parseDate(cols[2]),
          listingDate: parseDate(cols[6]),
          issuePrice: cols[3],
          priceRange: cols[3],
          lotSize: cols[4],
          issueSize: cols[5],
          shares: null,
          estVolume: cols[5],
          status: cols[7] || "Upcoming",
          gmp: null,
          source: "Chittorgarh",
          sourceUrl: url,
        });
      }
    });

    return records;
  } catch (error) {
    console.error("[Chittorgarh] Error:", error.message);
    return [];
  }
}

async function scrapeInvestorgain() {
  const url = "https://www.investorgain.com/report/live-ipo-gmp/331/ipo-grey-market-premium-latest-live-update/";
  
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 20000,
    });

    const $ = cheerio.load(html);
    const records = [];

    $("table tr").each((_, tr) => {
      const cols = [];
      $(tr).find("td").each((__, td) => {
        cols.push(cleanText($(td).text()));
      });

      if (cols.length >= 6 && cols[0] && cols[0].length > 2 && !cols[0].includes("IPO Name")) {
        records.push({
          company: cleanText(cols[0]),
          symbol: null,
          exchange: "NSE/BSE",
          openDate: parseDate(cols[2]),
          closeDate: parseDate(cols[3]),
          listingDate: null,
          issuePrice: cols[1],
          priceRange: cols[1],
          lotSize: cols[4],
          issueSize: null,
          shares: null,
          estVolume: null,
          status: "Open",
          gmp: cols[5] && cols[5] !== "-" ? cols[5] : null,
          source: "Investorgain",
          sourceUrl: url,
        });
      }
    });

    return records;
  } catch (error) {
    console.error("[Investorgain] Error:", error.message);
    return [];
  }
}

async function scrapeAllIndianIPOs() {
  const results = await Promise.allSettled([
    scrapeChittorgarh(),
    scrapeInvestorgain(),
  ]);

  let allIPOs = [];
  
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const sources = ["Chittorgarh", "Investorgain"];
      console.log(`[${sources[index]}] Scraped ${result.value.length} IPOs`);
      allIPOs = allIPOs.concat(result.value);
    }
  });

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
