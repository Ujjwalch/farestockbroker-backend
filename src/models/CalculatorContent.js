const mongoose = require('mongoose');

const calculatorContentSchema = new mongoose.Schema({
  calculatorId: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'sip', 'stepup', 'mutualfund', 'fd', 'ppf', 'pf', 'nps', 'rd', 
      'ssy', 'scss', 'elss', 'swp', 'emi', 'downpayment', 'cagr', 
      'depreciation', 'brokerage', 'returns', 'risk'
    ]
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  what: {
    type: String,
    required: true
  },
  howToUse: {
    type: String,
    required: true
  },
  benefits: [{
    type: String,
    required: true
  }],
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

// Update the updatedAt timestamp before saving
calculatorContentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CalculatorContent', calculatorContentSchema);
