// Utility script to help debug and clear token issues

console.log('🔧 Token Debugging Utility\n');

// Test token generation
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Generate a test token
const testAdminId = '507f1f77bcf86cd799439011'; // Sample ObjectId
const testToken = jwt.sign({ adminId: testAdminId }, JWT_SECRET, { expiresIn: '24h' });

console.log('✅ Generated test token:', testToken);
console.log('✅ Token parts:', testToken.split('.').length);

// Verify the test token
try {
  const decoded = jwt.verify(testToken, JWT_SECRET);
  console.log('✅ Token verification successful:', decoded);
} catch (error) {
  console.log('❌ Token verification failed:', error.message);
}

console.log('\n📝 To fix token issues:');
console.log('1. Clear localStorage in browser (F12 > Application > Local Storage)');
console.log('2. Login again to get a fresh token');
console.log('3. Check that JWT_SECRET is consistent between requests');

console.log('\n🔍 Current JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');