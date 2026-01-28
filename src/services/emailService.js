const nodemailer = require('nodemailer');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Create transporter
const createTransporter = () => {
  // In development, use console logging instead of real email
  if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') {
    return {
      sendMail: async (mailOptions) => {
        console.log('\n📧 EMAIL WOULD BE SENT:');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Content:', mailOptions.text || 'HTML content');

        // Extract OTP from HTML content for development
        const otpMatch = mailOptions.html?.match(/class="otp-code">(\d{6})</);
        if (otpMatch) {
          console.log('🔑 OTP CODE:', otpMatch[1]);
        }

        return { messageId: 'dev-' + Date.now() };
      }
    };
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp, adminName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'FarestockBroker <noreply@farestockbroker.com>',
      to: email,
      subject: 'Password Reset OTP - FarestockBroker Admin',
      text: `Your OTP for password reset is: ${otp}. Valid for 60 seconds.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset OTP</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
              <p>FarestockBroker Admin Panel</p>
            </div>
            <div class="content">
              <h2>Hello ${adminName || 'Admin'},</h2>
              <p>We received a request to reset your password for your FarestockBroker admin account.</p>
              
              <div class="otp-box">
                <p><strong>Your OTP Code:</strong></p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This OTP is valid for <strong>60 seconds only</strong></li>
                  <li>Do not share this code with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>
              
              <p>Enter this OTP in the password reset form to continue with resetting your password.</p>
              
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} FarestockBroker. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email for new admin registration
const sendWelcomeEmail = async (email, adminName, username) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'FarestockBroker <noreply@farestockbroker.com>',
      to: email,
      subject: 'Welcome to FarestockBroker Admin Panel',
      text: `Welcome ${adminName}! Your admin account has been created successfully. Username: ${username}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to FarestockBroker</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to FarestockBroker!</h1>
              <p>Admin Panel Access Granted</p>
            </div>
            <div class="content">
              <h2>Hello ${adminName},</h2>
              <p>Congratulations! Your admin account has been successfully created for the FarestockBroker platform.</p>
              
              <div class="info-box">
                <h3>Your Account Details:</h3>
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Role:</strong> Administrator</p>
              </div>
              
              <p>You can now access the admin panel to:</p>
              <ul>
                <li>Manage broker listings</li>
                <li>Update site content</li>
                <li>Monitor platform analytics</li>
                <li>Configure system settings</li>
              </ul>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              
              <p>Thank you for joining the FarestockBroker team!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} FarestockBroker. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Send inquiry email to admin
const sendInquiryEmail = async (data) => {
  try {
    const transporter = createTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'ujjwal99355@gmail.com';

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'FarestockBroker <noreply@farestockbroker.com>',
      to: adminEmail,
      subject: `New Broker Inquiry: ${data.brokerName}`,
      text: `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nMessage: ${data.message}\nBroker: ${data.brokerName} (${data.branchName})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0f172a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; color: #64748b; }
            .value { color: #0f172a; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Broker Inquiry</h2>
              <p>${data.brokerName}</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Name</div>
                <div class="value">${data.name}</div>
              </div>
              <div class="field">
                <div class="label">Email</div>
                <div class="value">${data.email}</div>
              </div>
              <div class="field">
                <div class="label">Phone</div>
                <div class="value">${data.phone}</div>
              </div>
              <div class="field">
                <div class="label">Branch</div>
                <div class="value">${data.branchName}</div>
              </div>
              <div class="field">
                <div class="label">Message</div>
                <div class="value">${data.message}</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Inquiry email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending inquiry email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendInquiryEmail
};