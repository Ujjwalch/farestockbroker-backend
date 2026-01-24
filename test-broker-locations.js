/**
 * Test Broker Location API Endpoints
 * Run this after starting the backend server
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:5000';

function testEndpoint(method, path, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   ${method} ${path}`);
    
    const url = new URL(path, BASE_URL);
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`   ✅ Success (${res.statusCode})`);
          try {
            const json = JSON.parse(data);
            console.log(`   Response:`, JSON.stringify(json).substring(0, 100) + '...');
          } catch (e) {
            console.log(`   Response:`, data.substring(0, 100));
          }
          resolve({ status: res.statusCode, data });
        } else {
          console.log(`   ❌ Failed (${res.statusCode})`);
          console.log(`   Error:`, data);
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Request failed:`, error.message);
      reject(error);
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Testing Broker Location API Endpoints\n');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Get all locations
    await testEndpoint('GET', '/api/broker-locations', 'Get all broker locations');
    
    // Test 2: Get cities
    await testEndpoint('GET', '/api/broker-locations/cities', 'Get all cities');
    
    // Test 3: Get states
    await testEndpoint('GET', '/api/broker-locations/states', 'Get all states');
    
    // Test 4: Search locations
    await testEndpoint('GET', '/api/broker-locations/search?city=Pune', 'Search locations by city');
    
    // Test 5: Health check
    await testEndpoint('GET', '/api/health', 'API Health Check');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
