const mongoose = require('mongoose');

const brokerLocationSchema = new mongoose.Schema({
  brokerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Broker',
    required: true
  },
  brokerName: {
    type: String,
    required: true
  },
  branchName: {
    type: String,
    default: 'Main Branch'
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true,
    index: true
  },
  state: {
    type: String,
    required: true,
    index: true
  },
  pincode: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  coordinates: {
    latitude: {
      type: Number,
      required: false, // Optional - will be auto-geocoded
      default: 0
    },
    longitude: {
      type: Number,
      required: false, // Optional - will be auto-geocoded
      default: 0
    }
  },
  isHeadOffice: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
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

// Index for geospatial queries
brokerLocationSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });

// Compound index for city and state searches
brokerLocationSchema.index({ city: 1, state: 1 });

brokerLocationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

brokerLocationSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('BrokerLocation', brokerLocationSchema);
