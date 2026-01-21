const axios = require('axios');
require('dotenv').config({ path: './src/.env' });

async function testIndividualGMP() {
  try {
    const apiKey = process.env.IPO_API_KEY;
    const apiSecret = process.env.IPO_API_SECRET;

    const ipoId = 569; // Amagi
    console.log(`Testing individual GMP API for IPO ID: ${ipoId}\n`);

    const response = await axios.get(`https://api.ipoapi.in/api/gmp/${ipoId}`, {
      headers: {
        ApiKey: apiKey,
        ApiSecret: apiSecret,
      },
    });

    if (response.data && response.data.isSuccess) {
      console.log('='.repeat(70));
      console.log('GMP DATA FOR AMAGI (IPO ID: 569)');
      console.log('='.repeat(70));
      console.log(JSON.stringify(response.data, null, 2));
      console.log('='.repeat(70));
      
      const data = response.data.data;
      if (data && data.gmpList && data.gmpList.length > 0) {
        const latest = data.gmpList[data.gmpList.length - 1];
        console.log('\nLATEST GMP ENTRY:');
        console.log(`  GMP Price: ₹${latest.gmpPrice}`);
        console.log(`  Estimated Listing Price: ${latest.estimatedListingPrice}`);
        console.log(`  Estimated Listing %: ${latest.estimatedListingPercentage}`);
        console.log(`  Last Update: ${latest.lastUpdate}`);
      }
    } else {
      console.log('❌ Failed to fetch GMP data');
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testIndividualGMP();
