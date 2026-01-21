const axios = require('axios');
require('dotenv').config({ path: './src/.env' });

async function checkListingDates() {
  try {
    const apiKey = process.env.IPO_API_KEY;
    const apiSecret = process.env.IPO_API_SECRET;

    console.log('Fetching mainboard IPOs...\n');

    const response = await axios.get('https://api.ipoapi.in/api/mainboard', {
      headers: {
        ApiKey: apiKey,
        ApiSecret: apiSecret,
      },
    });

    const allIPOs = response.data.data || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`Total mainboard IPOs: ${allIPOs.length}\n`);

    // Categorize IPOs
    const listed = [];
    const upcoming = [];
    const noListingDate = [];

    allIPOs.forEach(ipo => {
      if (!ipo.listingDate) {
        noListingDate.push(ipo);
      } else {
        const listingDate = new Date(ipo.listingDate);
        if (listingDate <= today) {
          listed.push(ipo);
        } else {
          upcoming.push(ipo);
        }
      }
    });

    console.log('='.repeat(70));
    console.log('LISTING DATE ANALYSIS');
    console.log('='.repeat(70));
    console.log(`✅ Already Listed: ${listed.length}`);
    console.log(`⏳ Upcoming Listings: ${upcoming.length}`);
    console.log(`❓ No Listing Date: ${noListingDate.length}`);
    console.log('='.repeat(70));

    if (listed.length > 0) {
      console.log('\n📊 ALREADY LISTED IPOs (First 10):');
      console.log('-'.repeat(70));
      listed.slice(0, 10).forEach((ipo, i) => {
        console.log(`${i + 1}. ${ipo.companyName}`);
        console.log(`   ID: ${ipo.ipoId} | Symbol: ${ipo.symbol || 'N/A'} | Listed: ${ipo.listingDate}`);
      });
    }

    if (upcoming.length > 0) {
      console.log('\n⏳ UPCOMING LISTINGS (First 10):');
      console.log('-'.repeat(70));
      upcoming.slice(0, 10).forEach((ipo, i) => {
        console.log(`${i + 1}. ${ipo.companyName}`);
        console.log(`   ID: ${ipo.ipoId} | Symbol: ${ipo.symbol || 'N/A'} | Listing: ${ipo.listingDate}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log(`Today's date: ${today.toISOString().split('T')[0]}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

checkListingDates();
