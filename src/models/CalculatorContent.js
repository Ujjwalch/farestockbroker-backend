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
  // Rich text HTML content
  content: {
    type: String,
    default: ''
  },
  // FAQs with rich text answers
  faqs: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String, // Rich text HTML
      required: true
    }
  }],
  metaTitle: {
    type: String,
    default: ''
  },
  metaDescription: {
    type: String,
    default: ''
  },
  keywords: [{
    type: String
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
