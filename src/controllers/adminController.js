const Admin = require('../models/Admin');
const { generateToken, verifyToken } = require('../middlewares/auth');
const { validationResult } = require('express-validator');
const { sendOTPEmail, sendWelcomeEmail } = require('../services/emailService');

const loginAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { username, password } = req.body;

    const admin = await Admin.findOne({ username, isActive: true });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id);

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

const registerAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { username, email, password, fullName } = req.body;

    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this username or email already exists'
      });
    }

    const admin = new Admin({
      username,
      email,
      password,
      fullName: fullName || ''
    });

    await admin.save();

    // Send welcome email asynchronously (don't wait)
    sendWelcomeEmail(email, fullName || username, username).catch(emailError => {
      console.error('Failed to send welcome email:', emailError);
    });

    // Return immediately
    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'No admin found with this email address'
      });
    }

    const otp = admin.generateResetOTP();
    await admin.save();

    const emailResult = await sendOTPEmail(email, otp, admin.fullName || admin.username);
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent to your email address. Valid for 60 seconds.',
      email: email
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process forgot password request'
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;

    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'No admin found with this email address'
      });
    }

    const otpResult = admin.verifyResetOTP(otp);
    
    if (!otpResult.valid) {
      await admin.save();
      return res.status(400).json({
        success: false,
        message: otpResult.message
      });
    }

    const resetToken = generateToken(admin._id, '5m');

    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken: resetToken
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, newPassword } = req.body;
    const resetToken = req.header('Authorization')?.substring(7);

    if (!resetToken) {
      return res.status(401).json({
        success: false,
        message: 'Reset token required'
      });
    }

    const decoded = verifyToken(resetToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin || admin._id.toString() !== decoded.adminId) {
      return res.status(404).json({
        success: false,
        message: 'Invalid reset request'
      });
    }

    if (!admin.resetOTP || new Date() > admin.resetOTPExpires) {
      return res.status(400).json({
        success: false,
        message: 'Reset session expired. Please start over.'
      });
    }

    admin.password = newPassword;
    admin.clearResetOTP();
    await admin.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};

const verifyAdmin = async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ valid: false });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.json({ valid: false });
    }

    const admin = await Admin.findById(decoded.adminId).select('-password');
    
    if (!admin || !admin.isActive) {
      return res.json({ valid: false });
    }

    res.json({ 
      valid: true,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.json({ valid: false });
  }
};

const logoutAdmin = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { username, password, email, fullName } = req.body;

    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this username or email already exists'
      });
    }

    const admin = new Admin({
      username,
      password,
      email,
      fullName: fullName || ''
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating admin'
    });
  }
};

module.exports = {
  loginAdmin,
  registerAdmin,
  forgotPassword,
  verifyOTP,
  resetPassword,
  verifyAdmin,
  logoutAdmin,
  createAdmin
};