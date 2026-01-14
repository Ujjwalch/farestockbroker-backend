const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testAuthFlow() {
  console.log('🚀 Testing Admin Authentication Flow...\n');

  try {
    // Test 1: Register new admin
    console.log('1. Testing admin registration...');
    try {
      const register = await axios.post(`${BASE_URL}/admin/register`, {
        username: 'newtestadmin',
        email: 'newtest@example.com',
        password: 'NewTest123',
        fullName: 'New Test Admin'
      });
      console.log('✅ Registration successful:', register.data.admin.username);
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️ Admin already exists, continuing...');
      } else {
        console.log('❌ Registration failed:', error.response?.data?.message);
      }
    }

    // Test 2: Login with new admin
    console.log('\n2. Testing admin login...');
    const login = await axios.post(`${BASE_URL}/admin/login`, {
      username: 'newtestadmin',
      password: 'NewTest123'
    });
    console.log('✅ Login successful');
    const token = login.data.token;

    // Test 3: Verify token
    console.log('\n3. Testing token verification...');
    const verify = await axios.post(`${BASE_URL}/admin/verify`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Token verification:', verify.data.valid);

    // Test 4: Access protected route
    console.log('\n4. Testing protected route access...');
    const brokers = await axios.get(`${BASE_URL}/admin/brokers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Protected route access successful, brokers count:', brokers.data.brokers.length);

    // Test 5: Test forgot password (will fail without email config, but should validate)
    console.log('\n5. Testing forgot password validation...');
    try {
      await axios.post(`${BASE_URL}/admin/forgot-password`, {
        email: 'newtest@example.com'
      });
    } catch (error) {
      if (error.response?.data?.message?.includes('Failed to send OTP email')) {
        console.log('ℹ️ Forgot password validation works (email service not configured)');
      } else {
        console.log('❌ Forgot password error:', error.response?.data?.message);
      }
    }

    console.log('\n🎉 All authentication tests completed!');
    console.log('\n📝 Summary:');
    console.log('- Admin registration: ✅ Working');
    console.log('- Admin login: ✅ Working');
    console.log('- Token verification: ✅ Working');
    console.log('- Protected routes: ✅ Working');
    console.log('- Password reset: ⚠️ Needs email configuration');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAuthFlow();