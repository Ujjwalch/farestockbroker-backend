const axios = require('axios');

const BACKEND_URL = 'https://farestockbroker-backend-production.up.railway.app';

async function testDeployedBackend() {
  try {
    console.log('Testing deployed backend...\n');
    console.log(`Backend URL: ${BACKEND_URL}\n`);

    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthRes = await axios.get(`${BACKEND_URL}/api/health`);
    console.log('   ✅ Health check:', healthRes.data);

    // Test 2: Single listing price
    console.log('\n2. Testing single listing price...');
    const singleRes = await axios.get(
      `${BACKEND_URL}/api/nse/listing-price?companyName=Amagi&listingDate=2026-01-21`
    );
    console.log('   ✅ Response:', JSON.stringify(singleRes.data, null, 2));

    // Test 3: Batch listing prices
    console.log('\n3. Testing batch listing prices...');
    const batchRes = await axios.post(
      `${BACKEND_URL}/api/nse/batch-listing-prices`,
      {
        ipos: [
          {
            ipoId: 569,
            companyName: 'Amagi Media Labs Limited',
            listingDate: '2026-01-21'
          }
        ]
      }
    );
    console.log('   ✅ Response:', JSON.stringify(batchRes.data, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDeployedBackend();
