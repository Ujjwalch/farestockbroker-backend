const axios = require('axios');
require('dotenv').config({ path: './src/.env' });

async function searchAmagiIPO() {
  try {
    const apiKey = process.env.IPO_API_KEY;
    const apiSecret = process.env.IPO_API_SECRET;

    console.log('Searching for Amagi in Mainboard IPOs...\n');

    // Get mainboard IPOs
    const response = await axios.get('https://api.ipoapi.in/api/mainboard', {
      headers: {
        ApiKey: apiKey,
        ApiSecret: apiSecret,
      },
    });

    if (response.data && response.data.isSuccess) {
      const ipos = response.data.data || [];
      
      // Search for Amagi
      const amagi = ipos.find(ipo => 
        ipo.companyName && ipo.companyName.toLowerCase().includes('amagi')
      );

      if (amagi) {
        console.log('✅ Found Amagi IPO:');
        console.log('='.repeat(60));
        console.log(`Company Name: ${amagi.companyName}`);
        console.log(`IPO ID: ${amagi.ipoId}`);
        console.log(`Symbol: ${amagi.symbol || 'N/A'}`);
        console.log(`Start Date: ${amagi.startDate || 'N/A'}`);
        console.log(`End Date: ${amagi.endDate || 'N/A'}`);
        console.log(`Listing Date: ${amagi.listingDate || 'N/A'}`);
        console.log(`Allotment Date: ${amagi.allotmentDate || 'N/A'}`);
        console.log(`Price Range: ₹${amagi.minimumPrice} - ₹${amagi.maximumPrice}`);
        console.log(`Lot Size: ${amagi.lotSize || 'N/A'}`);
        console.log('='.repeat(60));
      } else {
        console.log('❌ Amagi IPO not found in mainboard list');
        console.log(`Total IPOs checked: ${ipos.length}`);
        
        // Show first few company names
        console.log('\nFirst 10 companies:');
        ipos.slice(0, 10).forEach((ipo, i) => {
          console.log(`  ${i + 1}. ${ipo.companyName}`);
        });
      }
    } else {
      console.log('❌ Failed to fetch IPO data');
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

searchAmagiIPO();
