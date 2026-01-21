const axios = require('axios');
require('dotenv').config({ path: './src/.env' });

const API_BASE = 'http://localhost:5000/api';

async function testFullIntegration() {
  try {
    console.log('='.repeat(70));
    console.log('FULL INTEGRATION TEST: Yahoo Finance Listing Prices');
    console.log('='.repeat(70));

    // Step 1: Get listed IPOs from mainboard
    console.log('\n📊 Step 1: Fetching mainboard IPOs...');
    const mainboardRes = await axios.get(`${API_BASE}/ipo/mainboard`, {
      headers: {
        ApiKey: process.env.IPO_API_KEY,
        ApiSecret: process.env.IPO_API_SECRET,
      },
    });

    const allIPOs = mainboardRes.data.data || [];
    console.log(`   Found ${allIPOs.length} mainboard IPOs`);

    // Filter for listed IPOs (listing date in the past)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const listedIPOs = allIPOs.filter(ipo => {
      if (!ipo.listingDate) return false;
      const listingDate = new Date(ipo.listingDate);
      return listingDate <= today;
    });

    console.log(`   ${listedIPOs.length} IPOs are listed`);

    if (listedIPOs.length === 0) {
      console.log('\n⚠️  No listed IPOs found to test');
      return;
    }

    // Take first 5 listed IPOs for testing
    const testIPOs = listedIPOs.slice(0, 5);
    console.log(`\n📋 Testing with ${testIPOs.length} IPOs:`);
    testIPOs.forEach((ipo, i) => {
      console.log(`   ${i + 1}. ${ipo.companyName} (ID: ${ipo.ipoId}, Listing: ${ipo.listingDate})`);
    });

    // Step 2: Call batch listing prices API
    console.log('\n📊 Step 2: Calling batch listing prices API...\n');
    
    const batchData = testIPOs.map(ipo => ({
      ipoId: ipo.ipoId,
      companyName: ipo.companyName,
      listingDate: ipo.listingDate
    }));

    const listingRes = await axios.post(
      `${API_BASE}/nse/batch-listing-prices`,
      { ipos: batchData }
    );

    console.log('\n📊 Step 3: Results:\n');
    console.log('='.repeat(70));

    const results = listingRes.data.data || [];
    let successCount = 0;
    let failCount = 0;

    results.forEach((result, i) => {
      const ipo = testIPOs[i];
      console.log(`\n${i + 1}. ${result.companyName}`);
      console.log('-'.repeat(70));
      
      if (result.success) {
        successCount++;
        console.log(`   ✅ SUCCESS`);
        console.log(`   Ticker: ${result.ticker}`);
        console.log(`   Listing Price: ₹${result.listingPrice?.toFixed(2)}`);
        console.log(`   Close Price: ₹${result.lastPrice?.toFixed(2)}`);
        
        // Calculate gain/loss
        if (ipo.maximumPrice && result.listingPrice) {
          const gain = result.listingPrice - ipo.maximumPrice;
          const percentage = ((gain / ipo.maximumPrice) * 100).toFixed(2);
          console.log(`   Issue Price: ₹${ipo.maximumPrice}`);
          console.log(`   Gain/Loss: ${gain > 0 ? '+' : ''}₹${gain.toFixed(2)} (${gain > 0 ? '+' : ''}${percentage}%)`);
        }
      } else {
        failCount++;
        console.log(`   ❌ FAILED: ${result.error}`);
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total IPOs tested: ${testIPOs.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`Success Rate: ${((successCount / testIPOs.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run test
console.log('\n⚠️  Make sure the backend server is running on http://localhost:5000\n');
testFullIntegration();
