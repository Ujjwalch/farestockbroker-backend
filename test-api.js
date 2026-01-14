const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testAPI() {
  console.log('🚀 Testing FarestockBroker API...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health:', health.data);

    // Test get all brokers
    console.log('\n2. Testing get all brokers...');
    const brokers = await axios.get(`${BASE_URL}/brokers`);
    console.log('✅ Brokers count:', brokers.data.brokers.length);

    // Test get single broker
    if (brokers.data.brokers.length > 0) {
      const brokerId = brokers.data.brokers[0]._id;
      console.log('\n3. Testing get single broker...');
      const broker = await axios.get(`${BASE_URL}/brokers/${brokerId}`);
      console.log('✅ Single broker:', broker.data.name);
    }

    // Test site content
    console.log('\n4. Testing site content...');
    const content = await axios.get(`${BASE_URL}/content`);
    console.log('✅ Site content brand:', content.data.content.brandName);

    // Test admin login
    console.log('\n5. Testing admin login...');
    const login = await axios.post(`${BASE_URL}/admin/login`, {
      username: 'admin',
      password: 'admin123'
    });
    console.log('✅ Admin login successful');
    const token = login.data.token;

    // Test admin verify
    console.log('\n6. Testing admin token verification...');
    const verify = await axios.post(`${BASE_URL}/admin/verify`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Token verification:', verify.data.valid);

    // Test admin get brokers
    console.log('\n7. Testing admin get all brokers...');
    const adminBrokers = await axios.get(`${BASE_URL}/admin/brokers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Admin brokers count:', adminBrokers.data.brokers.length);

    console.log('\n🎉 All API tests passed!');

  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

testAPI();