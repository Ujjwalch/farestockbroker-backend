const nodemailer = require('nodemailer');

async function createTestAccount() {
  try {
    // Generate test SMTP service account from ethereal.email
    let testAccount = await nodemailer.createTestAccount();

    console.log('📧 Ethereal Email Test Account Created:');
    console.log('EMAIL_HOST=smtp.ethereal.email');
    console.log('EMAIL_PORT=587');
    console.log(`EMAIL_USER=${testAccount.user}`);
    console.log(`EMAIL_PASS=${testAccount.pass}`);
    console.log('EMAIL_FROM=noreply@farestockbroker.com');
    console.log('');
    console.log('🔗 Preview emails at: https://ethereal.email/messages');
    console.log('');
    console.log('Copy these values to your .env file');

  } catch (error) {
    console.error('Error creating test account:', error);
  }
}

createTestAccount();