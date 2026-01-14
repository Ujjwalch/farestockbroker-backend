const axios = require('axios');

const testLeadRegistration = async () => {
  try {
    const response = await axios.post('https://signup.zerodha.com/api/partner/lead/register/', {
      name: 'Test User',
      email: 'test@example.com',
      mobile: '9876543210',
      partner: "ZMPCIC"
    });

    console.log('Success:', response.data);
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
};

testLeadRegistration();