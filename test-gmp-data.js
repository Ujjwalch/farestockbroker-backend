const axios = require('axios');
require('dotenv').config({ path: './src/.env' });

async function testGMPData() {
  try {
    const apiKey = process.env.IPO_API_KEY;
    const apiSecret = process.env.IPO_API_SECRET;

    console.log('Testing GMP List API...\n');

    // Get GMP List
    const response = await axios.get('https://api.ipoapi.in/api/gmp-list?pageNumber=1&perPageRow=100', {
      headers: {
        ApiKey: apiKey,
        ApiSecret: apiSecret,
      },
    });

    if (response.data && response.data.isSuccess) {
      const gmpList = response.data.data || [];
      
      console.log(`Total IPOs in GMP List: ${gmpList.length}\n`);

      // Find Amagi
      const amagi = gmpList.find(item => 
        item.companyName && item.companyName.toLowerCase().includes('amagi')
      );

      if (amagi) {
        console.log('='.repeat(70));
        console.log('AMAGI GMP DATA');
        console.log('='.repeat(70));
        console.log(JSON.stringify(amagi, null, 2));
        console.log('='.repeat(70));
      } else {
        console.log('❌ Amagi not found in GMP list');
        console.log('\nFirst 5 companies in GMP list:');
        gmpList.slice(0, 5).forEach((item, i) => {
          console.log(`${i + 1}. ${item.companyName} (ID: ${item.ipoId})`);
          console.log(`   GMP: ₹${item.gmpPrice || 0}`);
          console.log(`   Estimated Listing: ${item.estimatedListingPrice || 'N/A'}`);
          console.log(`   Estimated %: ${item.estimatedListingPercentage || 'N/A'}`);
        });
      }
    } else {
      console.log('❌ Failed to fetch GMP data');
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testGMPData();
