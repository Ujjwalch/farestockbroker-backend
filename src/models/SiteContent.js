const mongoose = require('mongoose');

const heroSchema = new mongoose.Schema({
  badge: {
    type: String,
    default: 'India\'s Most Trusted'
  },
  title: {
    type: String,
    default: 'Compare & Choose the Best'
  },
  titleHighlight: {
    type: String,
    default: 'Stock Brokers'
  },
  subtitle: {
    type: String,
    default: 'Find the perfect broker for your investment journey. Compare brokerage, features, and ratings to make an informed decision.'
  },
  primaryCTA: {
    type: String,
    default: 'Compare Brokers'
  },
  secondaryCTA: {
    type: String,
    default: 'Learn More'
  }
});

const trustSignalSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  }
});

const siteContentSchema = new mongoose.Schema({
  brandName: {
    type: String,
    default: 'FarestockBroker'
  },
  hero: {
    type: heroSchema,
    default: () => ({})
  },
  trustSignals: {
    type: [trustSignalSchema],
    default: [
      { number: '50+', label: 'Verified Brokers' },
      { number: '1M+', label: 'Happy Investors' },
      { number: '₹100Cr+', label: 'Investments Facilitated' },
      { number: '4.8★', label: 'Average Rating' }
    ]
  },
  ctaTitle: {
    type: String,
    default: 'Ready to start your investment journey?'
  },
  ctaSubtitle: {
    type: String,
    default: 'Join thousands of investors who trust our platform to find the best brokers.'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

siteContentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

siteContentSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('SiteContent', siteContentSchema);