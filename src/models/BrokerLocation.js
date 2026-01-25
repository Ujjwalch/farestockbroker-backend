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
    required: true,
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
    default: ''
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
      default: 0
    },
    longitude: {
      type: Number,
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
  }
}, {
  timestamps: true
});

// Indexes for fast queries
brokerLocationSchema.index({ city: 1, state: 1 });
brokerLocationSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });

module.exports = mongoose.model('BrokerLocation', brokerLocationSchema);
