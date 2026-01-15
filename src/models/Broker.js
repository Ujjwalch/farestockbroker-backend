const mongoose = require('mongoose');

const chargeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  amount: {
    type: String,
    required: true
  }
});

const brokerageDetailsSchema = new mongoose.Schema({
  intraday: {
    turnover: { type: String, default: '' },
    stt: { type: String, default: '' },
    sebiCharges: { type: String, default: '' },
    brokerage: { type: String, default: '' },
    exchangeFee: { type: String, default: '' }
  },
  delivery: {
    turnover: { type: String, default: '' },
    stt: { type: String, default: '' },
    sebiCharges: { type: String, default: '' },
    brokerage: { type: String, default: '' },
    exchangeFee: { type: String, default: '' }
  },
  fo: {
    turnover: { type: String, default: '' },
    stt: { type: String, default: '' },
    sebiCharges: { type: String, default: '' },
    brokerage: { type: String, default: '' },
    exchangeFee: { type: String, default: '' }
  },
  equityFutures: { type: String, default: '' },
  equityOptions: { type: String, default: '' },
  currencyFutures: { type: String, default: '' },
  currencyOptions: { type: String, default: '' },
  commodityFutures: { type: String, default: '' },
  commodityOptions: { type: String, default: '' }
});

const marginsSchema = new mongoose.Schema({
  equityDelivery: { type: String, default: '' },
  equityIntraday: { type: String, default: '' },
  equityFutures: { type: String, default: '' },
  equityOptions: { type: String, default: '' },
  currencyFutures: { type: String, default: '' },
  currencyOptions: { type: String, default: '' },
  commodityFutures: { type: String, default: '' },
  commodityOptions: { type: String, default: '' }
});

const brokeragePlanSchema = new mongoose.Schema({
  planName: { type: String, required: true },
  charges: {
    accountOpening: { type: String, default: '' },
    accountMaintenance: { type: String, default: '' },
    callAndTrade: { type: String, default: '' }
  },
  brokerageDetails: {
    type: brokerageDetailsSchema,
    default: () => ({})
  },
  margins: {
    type: marginsSchema,
    default: () => ({})
  }
});

const brokerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  fullDescription: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 4.5
  },
  reviews: {
    type: Number,
    default: 0
  },
  brokerage: {
    type: String,
    required: true
  },
  features: [{
    type: String,
    required: true
  }],
  pros: [{
    type: String
  }],
  cons: [{
    type: String
  }],
  charges: [chargeSchema],
  
  markets: [{
    type: String,
    default: ['NSE', 'BSE']
  }],
  security: {
    type: String,
    default: 'SEBI Regulated, Bank-Grade'
  },
  executionSpeed: {
    type: String,
    default: 'Sub-second Order Placement'
  },
  founded: {
    type: String,
    default: ''
  },
  customers: {
    type: String,
    default: ''
  },
  
  broker_url: {
    type: String,
    default: ''
  },
  
  logo: {
    type: String,
    default: ''
  },
  
  brokerageDetails: {
    type: brokerageDetailsSchema,
    default: () => ({})
  },
  
  margins: {
    type: marginsSchema,
    default: () => ({})
  },
  
  brokeragePlans: [brokeragePlanSchema],
  
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

brokerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

brokerSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Broker', brokerSchema);