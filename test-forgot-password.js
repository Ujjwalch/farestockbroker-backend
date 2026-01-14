const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testForgotPasswordFlow() {
  console.log('🚀 Testing Forgot Password Flow...\n');

  try {
    const email = 'newtest@example.com';

    // Step 1: Request OTP
    console.log('1. Requesting OTP...');
    const forgotResponse = await axios.post(`${BASE_URL}/admin/forgot-password`, {
      email: email
    });
    console.log('✅ OTP requested successfully');
    console.log('Response:', forgotResponse.data.message);

    // Wait a moment for the OTP to be generated
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Get OTP from console logs (in real app, user would get it from email)
    console.log('\n2. Please check the backend console for the OTP code...');
    console.log('Enter the OTP when prompted in the frontend.');

    // For testing, let's simulate with a known OTP pattern
    // In real usage, the user would enter the OTP from their email

    console.log('\n✅ Forgot password flow initiated successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Check backend console for OTP code');
    console.log('2. Use the frontend to enter OTP and reset password');
    console.log('3. Login with new password');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testForgotPasswordFlow();