const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  fullName: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  resetOTP: {
    type: String,
    default: null
  },
  resetOTPExpires: {
    type: Date,
    default: null
  },
  resetOTPAttempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.generateResetOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  this.resetOTP = otp;
  this.resetOTPExpires = new Date(Date.now() + 60 * 1000); 
  this.resetOTPAttempts = 0;
  
  return otp;
};

adminSchema.methods.verifyResetOTP = function(otp) {
  if (!this.resetOTP || !this.resetOTPExpires) {
    return { valid: false, message: 'No OTP found. Please request a new one.' };
  }
  
  if (new Date() > this.resetOTPExpires) {
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }
  
  if (this.resetOTPAttempts >= 3) {
    return { valid: false, message: 'Too many attempts. Please request a new OTP.' };
  }
  
  if (this.resetOTP !== otp) {
    this.resetOTPAttempts += 1;
    return { valid: false, message: 'Invalid OTP. Please try again.' };
  }
  
  return { valid: true, message: 'OTP verified successfully.' };
};

adminSchema.methods.clearResetOTP = function() {
  this.resetOTP = null;
  this.resetOTPExpires = null;
  this.resetOTPAttempts = 0;
};

module.exports = mongoose.model('Admin', adminSchema);