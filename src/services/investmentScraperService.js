const puppeteer = require('puppeteer');
const InvestmentOption = require('../models/InvestmentOption');

/**
 * Scrape detailed information from individual NCD page
 */
async function scrapeNCDDetails(page, detailUrl) {
    try {
        await page.goto(detailUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        const details = await page.evaluate(() => {
            const data = {};
            
            // Try to extract interest rate
            const interestElements = document.querySelectorAll('td, div, span');
            for (const el of interestElements) {
                const text = el.textContent;
                if (text.includes('%') && (text.includes('Interest') || text.includes('Coupon') || text.includes('Rate'))) {
                    const match = text.match(/(\d+\.?\d*)\s*%/);
                    if (match) {
                        data.interestRate = match[1] + '%';
                        break;
                    }
                }
            }
            
            // Try to extract minimum investment
            for (const el of interestElements) {
                const text = el.textContent;
                if (text.includes('Minimum') && (text.includes('Investment') || text.includes('Application'))) {
                    const match = text.match(/Rs\.?\s*([\d,]+)/i);
                    if (match) {
                        data.minInvestment = parseInt(match[1].replace(/,/g, ''));
                        break;
                    }
                }
            }
            
            // Try to extract maturity period
            for (const el of interestElements) {
                const text = el.textContent;
                if (text.includes('Maturity') || text.includes('Tenure')) {
                    const match = text.match(/(\d+)\s*(year|month|day)/i);
                    if (match) {
                        data.maturity = match[0];
                        break;
                    }
                }
            }
            
            // Extract description from meta or first paragraph
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                data.description = metaDesc.getAttribute('content');
            } else {
                const firstPara = document.querySelector('p');
                if (firstPara) {
                    data.description = firstPara.textContent.trim().substring(0, 500);
                }
            }
            
            return data;
        });

        return details;
    } catch (error) {
        console.log(`⚠️ Could not fetch details from ${detailUrl}: ${error.message}`);
        return {};
    }
}

/**
 * Scrape Bond data from various sources
 */
async function scrapeBondData(page) {
    const bondUrl = 'https://www.chittorgarh.com/report/corporate-bonds-in-india/154/';
    const items = [];
    
    try {
        console.log('🔗 Scraping Bond data...');
        await page.goto(bondUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await page.waitForSelector('table', { timeout: 30000 });

        const scrapedData = await page.evaluate(() => {
            const results = [];
            const tables = document.querySelectorAll('table');
            
            let mainTable = null;
            let maxRows = 0;
            
            tables.forEach(table => {
                const rows = table.querySelectorAll('tbody tr');
                if (rows.length > maxRows) {
                    maxRows = rows.length;
                    mainTable = table;
                }
            });
            
            if (!mainTable) return results;
            
            const rows = mainTable.querySelectorAll('tbody tr');
            
            rows.forEach((row) => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 3) {
                    const firstCell = cells[0];
                    const link = firstCell.querySelector('a');
                    const bondName = link ? link.textContent.trim() : firstCell.textContent.trim();
                    const detailLink = link ? link.getAttribute('href') : '';
                    
                    const issueDate = cells[1] ? cells[1].textContent.trim() : '';
                    const maturity = cells[2] ? cells[2].textContent.trim() : '';
                    const couponRate = cells[3] ? cells[3].textContent.trim() : '';
                    const rating = cells[4] ? cells[4].textContent.trim() : '';
                    
                    if (bondName && bondName.length > 0) {
                        results.push({
                            bondName,
                            issueDate,
                            maturity,
                            couponRate,
                            rating,
                            detailLink: detailLink ? `https://www.chittorgarh.com${detailLink}` : ''
                        });
                    }
                }
            });
            
            return results;
        });

        console.log(`✅ Found ${scrapedData.length} Bonds`);

        for (const data of scrapedData) {
            const slug = data.bondName.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            let cleanRating = 'Not Rated';
            if (data.rating) {
                const ratingMatch = data.rating.match(/([A-Z]+[\+\-]*)/);
                if (ratingMatch) {
                    cleanRating = ratingMatch[1];
                }
            }

            // Detect if it's a government bond based on issuer name
            const isGovtBond = /government|govt|sovereign|treasury|rbi|reserve bank/i.test(data.bondName);
            const bondType = isGovtBond ? 'govt_bond' : 'corporate_bond';

            items.push({
                title: data.bondName,
                issuer: data.bondName.split(' ')[0], // First word as issuer
                slug: slug,
                description: `${isGovtBond ? 'Government' : 'Corporate'} Bond: ${data.bondName}. ${data.couponRate ? `Coupon Rate: ${data.couponRate}` : ''}. Data from Chittorgarh.com`,
                openDate: parseDate(data.issueDate) || new Date(),
                closeDate: null,
                type: bondType, // Detect govt vs corporate
                category: 'BOND',
                status: 'Pending Review', // Pending review for admin approval
                minInvestment: 10000,
                rating: cleanRating,
                interestRate: data.couponRate || 'TBA',
                maturity: data.maturity || 'TBA',
                isActive: false,
                features: [
                    'Auto-Scraped Data',
                    isGovtBond ? 'Government Bond' : 'Corporate Bond',
                    'Verified Source',
                    data.couponRate ? `Coupon: ${data.couponRate}` : null,
                    data.maturity ? `Maturity: ${data.maturity}` : null,
                    `Rating: ${cleanRating}`
                ].filter(Boolean),
                applyLink: data.detailLink,
                updatedAt: new Date()
            });
        }

        return items;
    } catch (error) {
        console.error('❌ Bond scraping failed:', error.message);
        return [];
    }
}

/**
 * Scrape AIF data (Alternative Investment Funds)
 * Note: AIF data might not be available on public websites, this is a placeholder
 */
async function scrapeAIFData(page) {
    // AIFs are typically not listed publicly like NCDs/Bonds
    // This would need to be sourced from SEBI or specific AIF platforms
    // For now, returning empty array - can be implemented when source is identified
    
    console.log('ℹ️ AIF scraping: Public AIF data sources limited. Manual entry recommended.');
    return [];
}

/**
 * Scrape all investment types
 */
async function scrapeAllInvestments() {
    let browser;
    
    try {
        console.log('🚀 Launching browser for investment scraping...');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Scrape NCDs
        const ncdResult = await scrapeNCDData(browser, page);
        
        // Scrape Bonds
        const bondItems = await scrapeBondData(page);
        
        // Save bond items
        let bondsInserted = 0;
        let bondsUpdated = 0;
        
        if (bondItems.length > 0) {
            for (const item of bondItems) {
                const exists = await InvestmentOption.findOne({ slug: item.slug });
                if (exists) {
                    // If already exists and approved, keep it approved
                    if (exists.status === 'Approved') {
                        item.status = 'Approved';
                        item.isActive = exists.isActive;
                    }
                    await InvestmentOption.updateOne({ _id: exists._id }, item);
                    bondsUpdated++;
                } else {
                    await InvestmentOption.create(item);
                    bondsInserted++;
                }
            }
            console.log(`💾 Bonds Updated: ${bondsInserted} inserted, ${bondsUpdated} updated`);
        }
        
        // Note: AIFs require SEBI registration and are not publicly listed
        console.log('ℹ️ AIFs require manual entry (not publicly available).');
        
        return {
            success: true,
            inserted: (ncdResult.inserted || 0) + bondsInserted,
            updated: (ncdResult.updated || 0) + bondsUpdated,
            total: (ncdResult.total || 0) + bondItems.length,
            breakdown: {
                ncds: ncdResult.total || 0,
                bonds: bondItems.length
            }
        };

    } catch (error) {
        console.error('❌ Investment scraping failed:', error.message);
        return { success: false, error: error.message };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Scrape NCD data from Chittorgarh.com (modified to work with browser instance)
 */
async function scrapeNCDData(browser, page) {
    const sourceUrl = 'https://www.chittorgarh.com/report/latest-ncd-issue-in-india-list/27/';
    
    try {
        console.log(`🌐 Navigating to ${sourceUrl}...`);
        await page.goto(sourceUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('⏳ Waiting for content to load...');
        await page.waitForSelector('table', { timeout: 30000 });

        console.log('📊 Extracting NCD data...');
        
        const scrapedData = await page.evaluate(() => {
            const results = [];
            const tables = document.querySelectorAll('table');
            
            let mainTable = null;
            let maxRows = 0;
            
            tables.forEach(table => {
                const rows = table.querySelectorAll('tbody tr');
                if (rows.length > maxRows) {
                    maxRows = rows.length;
                    mainTable = table;
                }
            });
            
            if (!mainTable) return results;
            
            const rows = mainTable.querySelectorAll('tbody tr');
            
            rows.forEach((row) => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 6) {
                    const firstCell = cells[0];
                    const link = firstCell.querySelector('a');
                    const companyName = link ? link.textContent.trim() : firstCell.textContent.trim();
                    const detailLink = link ? link.getAttribute('href') : '';
                    
                    const openDate = cells[1] ? cells[1].textContent.trim() : '';
                    const closeDate = cells[2] ? cells[2].textContent.trim() : '';
                    const issueAmountBase = cells[3] ? cells[3].textContent.trim() : '';
                    const issueAmountShelf = cells[4] ? cells[4].textContent.trim() : '';
                    const rating = cells[5] ? cells[5].textContent.trim() : '';
                    
                    if (companyName && companyName.length > 0) {
                        results.push({
                            companyName,
                            openDate,
                            closeDate,
                            issueAmountBase,
                            issueAmountShelf,
                            rating,
                            detailLink: detailLink ? `https://www.chittorgarh.com${detailLink}` : ''
                        });
                    }
                }
            });
            
            return results;
        });

        console.log(`✅ Found ${scrapedData.length} NCD issues`);

        const items = [];
        for (const data of scrapedData) {
            console.log(`📄 Fetching details for: ${data.companyName}...`);
            
            // Fetch detailed information if detail link exists
            let detailedInfo = {};
            if (data.detailLink && data.detailLink.includes('chittorgarh.com')) {
                detailedInfo = await scrapeNCDDetails(page, data.detailLink);
                // Small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const slug = data.companyName.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            let cleanRating = 'Not Rated';
            if (data.rating) {
                const ratingMatch = data.rating.match(/:\s*([A-Z]+[\+\-]*)/);
                if (ratingMatch) {
                    cleanRating = ratingMatch[1];
                }
            }

            const baseDescription = `NCD Issue by ${data.companyName}. Base Issue: ₹${data.issueAmountBase} Cr${data.issueAmountShelf ? `, Shelf: ₹${data.issueAmountShelf} Cr` : ''}. ${detailedInfo.description || 'Data from Chittorgarh.com'}`;

            items.push({
                title: data.companyName,
                issuer: data.companyName,
                slug: slug,
                description: baseDescription,
                openDate: parseDate(data.openDate) || new Date(),
                closeDate: parseDate(data.closeDate),
                type: 'NCD',
                category: 'NCD',
                status: 'Pending Review', // Always pending review for admin approval
                minInvestment: detailedInfo.minInvestment || 10000,
                rating: cleanRating,
                interestRate: detailedInfo.interestRate || 'TBA',
                maturity: detailedInfo.maturity || 'TBA',
                isActive: false, // Inactive until admin reviews and approves
                features: [
                    'Auto-Scraped Data',
                    'NCD Issue',
                    'Verified Source',
                    `Base Issue: ₹${data.issueAmountBase} Cr`,
                    data.issueAmountShelf ? `Shelf: ₹${data.issueAmountShelf} Cr` : null,
                    `Rating: ${cleanRating}`,
                    detailedInfo.interestRate ? `Interest: ${detailedInfo.interestRate}` : null,
                    detailedInfo.maturity ? `Maturity: ${detailedInfo.maturity}` : null
                ].filter(Boolean),
                applyLink: data.detailLink,
                updatedAt: new Date()
            });
        }

        if (items.length > 0) {
            let insertedCount = 0;
            let updatedCount = 0;

            for (const item of items) {
                const exists = await InvestmentOption.findOne({ slug: item.slug });
                if (exists) {
                    // If already exists and approved, keep it approved
                    if (exists.status === 'Approved') {
                        item.status = 'Approved';
                        item.isActive = exists.isActive; // Preserve admin's active/inactive choice
                    }
                    await InvestmentOption.updateOne({ _id: exists._id }, item);
                    updatedCount++;
                } else {
                    // New item - set to pending review
                    await InvestmentOption.create(item);
                    insertedCount++;
                }
            }
            
            console.log(`💾 NCD Data Updated: ${insertedCount} inserted, ${updatedCount} updated`);
            return { success: true, inserted: insertedCount, updated: updatedCount, total: items.length };
        } else {
            console.warn('⚠️ No NCD items found');
            return { success: false, message: 'No items found' };
        }

    } catch (error) {
        console.error('❌ NCD Scraping failed:', error.message);
        return { success: false, error: error.message, inserted: 0, updated: 0, total: 0 };
    }
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
        const cleaned = dateStr.replace(/\s+/g, ' ').trim();
        const d = new Date(cleaned);
        if (!isNaN(d.getTime())) return d;
        return null;
    } catch {
        return null;
    }
}

function determineStatus(open, close) {
    const now = new Date();
    const openDate = parseDate(open);
    const closeDate = parseDate(close);

    if (closeDate && now > closeDate) return 'Closed';
    if (openDate && now < openDate) return 'Upcoming';
    if (openDate && now >= openDate) return 'Open';
    return 'Pending Review';
}

module.exports = { scrapeNCDData, scrapeAllInvestments };
