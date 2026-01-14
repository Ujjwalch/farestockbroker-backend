const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  mobile: {
    type: String,
    required: true,
    trim: true
  },
  accountType: {
    type: String,
    required: true,
    enum: ['Individual', 'NRI', 'HUF', 'Partnership Firm', 'LLP', 'Private Ltd']
  },
  brokerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Broker',
    required: true
  },
  brokerName: {
    type: String,
    required: true
  },
  leadStatus: {
    type: String,
    enum: ['pending', 'registered', 'failed'],
    default: 'pending'
  },
  zerodhaResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

userSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('User', userSchema);