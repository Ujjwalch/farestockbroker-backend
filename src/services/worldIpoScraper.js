const axios = require("axios");
const cheerio = require("cheerio");

function cleanText(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function normalizeSymbol(s) {
  if (!s) return null;
  const t = cleanText(s).toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
  return t || null;
}

function parseDateAny(s) {
  // very basic parse: try to convert "Jan 15, 2026" -> "2026-01-15"
  if (!s) return null;
  s = cleanText(s);

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;

  const monthMap = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12",
  };

  const mm = monthMap[m[1].toLowerCase()];
  if (!mm) return null;

  const dd = String(m[2]).padStart(2, "0");
  const yyyy = m[3];

  return `${yyyy}-${mm}-${dd}`;
}

async function scrapeRenaissanceIpoCalendar() {
  const url = "https://www.renaissancecapital.com/IPO-Center/Calendar";
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
    timeout: 20000,
  });

  const $ = cheerio.load(html);

  // Find the table that contains "Company"
  let targetTable = null;
  $("table").each((_, table) => {
    const headers = [];
    $(table)
      .find("th")
      .each((__, th) => headers.push(cleanText($(th).text()).toLowerCase()));

    const joined = headers.join("|");
    if (joined.includes("company") || joined.includes("issuer")) {
      targetTable = table;
      return false;
    }
  });

  if (!targetTable) return [];

  // Extract header names
  const headers = [];
  $(targetTable)
    .find("thead th")
    .each((_, th) => headers.push(cleanText($(th).text()).toLowerCase()));

  const records = [];

  $(targetTable)
    .find("tbody tr")
    .each((_, tr) => {
      const cols = [];
      $(tr)
        .find("td")
        .each((__, td) => cols.push(cleanText($(td).text())));

      if (!cols.length) return;

      const rowObj = {};
      cols.forEach((val, idx) => {
        const key = headers[idx] || `col_${idx}`;
        rowObj[key] = val;
      });

      const company = rowObj.company || rowObj.issuer || cols[0];
      const symbol = normalizeSymbol(rowObj.symbol);
      const exchange = rowObj.exchange ? cleanText(rowObj.exchange) : null;
      const ipoDate =
        parseDateAny(rowObj.date) ||
        parseDateAny(rowObj["ipo date"]) ||
        parseDateAny(rowObj["pricing date"]);

      const priceRange = rowObj.price || rowObj["price range"] || null;
      const shares = rowObj.shares || null;
      const estVolume =
        rowObj["deal size"] || rowObj.amount || rowObj["market cap"] || null;

      if (!company) return;

      records.push({
        company: cleanText(company),
        symbol,
        exchange,
        ipoDate,
        priceRange,
        shares,
        estVolume,
        source: "RenaissanceCapital",
        sourceUrl: url,
      });
    });

  return records;
}

module.exports = {
  scrapeRenaissanceIpoCalendar,
};
