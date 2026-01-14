const mongoose = require('mongoose');
const Broker = require('../models/Broker');
const Admin = require('../models/Admin');
const SiteContent = require('../models/SiteContent');
const path = require('path');

// Load environment variables from the correct path
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sampleBrokers = [
  {
    name: "Zerodha",
    description: "India's largest discount broker with zero brokerage on equity delivery trades.",
    fullDescription: "Zerodha is India's largest discount broker offering zero brokerage on equity delivery trades. Known for its innovative trading platforms and educational initiatives.",
    rating: 4.8,
    reviews: 125000,
    brokerage: "₹0 for delivery, ₹20 for intraday",
    features: [
      "Zero brokerage on delivery",
      "Advanced trading platforms",
      "Educational resources",
      "Mobile app trading"
    ],
    pros: [
      "Zero brokerage on equity delivery",
      "Excellent trading platforms (Kite)",
      "Strong educational content",
      "Transparent pricing"
    ],
    cons: [
      "No advisory services",
      "Limited customer support",
      "Charges for call & trade"
    ],
    charges: [
      { type: "Equity Delivery", amount: "₹0" },
      { type: "Equity Intraday", amount: "₹20 or 0.03%" },
      { type: "Equity Futures", amount: "₹20 or 0.03%" },
      { type: "Equity Options", amount: "₹20 per lot" },
      { type: "Account Opening", amount: "₹200" }
    ],
    markets: ["NSE", "BSE", "MCX"],
    security: "SEBI Regulated, Bank-Grade Security",
    executionSpeed: "Sub-second Order Placement",
    founded: "2010",
    customers: "6+ Million",
    brokerageDetails: {
      intraday: {
        turnover: "0.03%",
        stt: "0.025%",
        sebiCharges: "₹10/crore",
        brokerage: "₹20",
        exchangeFee: "0.00345%"
      },
      delivery: {
        turnover: "0.05%",
        stt: "0.1%",
        sebiCharges: "₹10/crore",
        brokerage: "₹0",
        exchangeFee: "0.00345%"
      },
      fo: {
        turnover: "0.03%",
        stt: "0.05%",
        sebiCharges: "₹10/crore",
        brokerage: "₹20",
        exchangeFee: "0.00345%"
      }
    },
    isActive: true
  },
  {
    name: "Upstox",
    description: "Technology-driven discount broker with competitive pricing and modern trading tools.",
    fullDescription: "Upstox is a technology-driven discount broker offering competitive pricing and modern trading tools with a focus on mobile-first trading experience.",
    rating: 4.6,
    reviews: 89000,
    brokerage: "₹20 flat for all trades",
    features: [
      "Flat ₹20 brokerage",
      "Advanced charting tools",
      "API trading support",
      "Mobile-first platform"
    ],
    pros: [
      "Flat ₹20 brokerage for all segments",
      "Good mobile app",
      "API support for algo trading",
      "Quick account opening"
    ],
    cons: [
      "Limited research reports",
      "Customer support issues",
      "Platform stability concerns"
    ],
    charges: [
      { type: "All Equity Trades", amount: "₹20 flat" },
      { type: "Currency Futures", amount: "₹20 flat" },
      { type: "Commodity Trading", amount: "₹20 flat" },
      { type: "Account Opening", amount: "₹150" }
    ],
    markets: ["NSE", "BSE", "MCX"],
    security: "SEBI Regulated, Advanced Security",
    executionSpeed: "Lightning-fast Execution",
    founded: "2012",
    customers: "3+ Million",
    brokerageDetails: {
      intraday: {
        turnover: "0.03%",
        stt: "0.025%",
        sebiCharges: "₹10/crore",
        brokerage: "₹20",
        exchangeFee: "0.00345%"
      },
      delivery: {
        turnover: "0.05%",
        stt: "0.1%",
        sebiCharges: "₹10/crore",
        brokerage: "₹20",
        exchangeFee: "0.00345%"
      },
      fo: {
        turnover: "0.03%",
        stt: "0.05%",
        sebiCharges: "₹10/crore",
        brokerage: "₹20",
        exchangeFee: "0.00345%"
      }
    },
    isActive: true
  },
  {
    name: "Angel One",
    description: "Full-service broker offering comprehensive investment solutions and research.",
    fullDescription: "Angel One is a full-service broker providing comprehensive investment solutions, research reports, and advisory services along with competitive brokerage rates.",
    rating: 4.4,
    reviews: 67000,
    brokerage: "₹20 per trade or 0.05%",
    features: [
      "Research & advisory",
      "Multiple investment options",
      "Comprehensive platform",
      "Customer support"
    ],
    pros: [
      "Comprehensive research reports",
      "Multiple investment products",
      "Good customer support",
      "Advisory services available"
    ],
    cons: [
      "Higher brokerage compared to discount brokers",
      "Complex fee structure",
      "Platform can be overwhelming"
    ],
    charges: [
      { type: "Equity Delivery", amount: "₹20 or 0.05%" },
      { type: "Equity Intraday", amount: "₹20 or 0.05%" },
      { type: "Futures & Options", amount: "₹20 per lot" },
      { type: "Account Opening", amount: "₹444" }
    ],
    markets: ["NSE", "BSE", "MCX", "NCDEX"],
    security: "SEBI Regulated, Multi-layer Security",
    executionSpeed: "Fast Order Execution",
    founded: "1996",
    customers: "2+ Million",
    brokerageDetails: {
      intraday: {
        turnover: "0.05%",
        stt: "0.025%",
        sebiCharges: "₹10/crore",
        brokerage: "₹20 or 0.05%",
        exchangeFee: "0.00345%"
      },
      delivery: {
        turnover: "0.05%",
        stt: "0.1%",
        sebiCharges: "₹10/crore",
        brokerage: "₹20 or 0.05%",
        exchangeFee: "0.00345%"
      },
      fo: {
        turnover: "0.05%",
        stt: "0.05%",
        sebiCharges: "₹10/crore",
        brokerage: "₹20",
        exchangeFee: "0.00345%"
      }
    },
    isActive: true
  }
];

const defaultAdmin = {
  username: "admin",
  password: "admin123", // This will be hashed
  email: "admin@farestockbroker.com"
};

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Broker.deleteMany({});
    await Admin.deleteMany({});
    await SiteContent.deleteMany({});

    console.log('Cleared existing data...');

    // Seed brokers
    await Broker.insertMany(sampleBrokers);
    console.log('Seeded brokers...');

    // Seed admin
    const admin = new Admin(defaultAdmin);
    await admin.save();
    console.log('Seeded admin user...');

    // Seed site content (will use defaults from model)
    const siteContent = new SiteContent();
    await siteContent.save();
    console.log('Seeded site content...');

    console.log('Database seeding completed successfully!');
    console.log('Admin credentials: username=admin, password=admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };