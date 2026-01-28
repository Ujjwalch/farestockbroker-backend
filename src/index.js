const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const brokerRoutes = require('./routes/brokerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contentRoutes = require('./routes/contentRoutes');
const leadRoutes = require('./routes/leadRoutes');
const educationRoutes = require('./routes/educationRoutes');
const ipoRoutes = require('./routes/ipoRoutes');
const ipoCacheRoutes = require('./routes/ipoCacheRoutes');
const nseRoutes = require('./routes/nseRoutes');
const calculatorContentRoutes = require('./routes/calculatorContentRoutes');
const brokerLocationRoutes = require('./routes/brokerLocation');
const blogRoutes = require('./routes/blogRoutes');
const newsRoutes = require('./routes/newsRoutes');
const connetDB = require('./config/database');
const { startWorldIpoCron } = require('./jobs/worldIpoCron');
const { startIPOSyncCron } = require('./jobs/ipoSyncCron');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased for large rich text content
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/brokers', brokerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/ipo', ipoRoutes);
app.use('/api/ipo-cache', ipoCacheRoutes); // Fast cached IPO data
app.use('/api/nse', nseRoutes);
app.use('/api/calculator-content', calculatorContentRoutes);
app.use('/api/broker-locations', brokerLocationRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/investments', require('./routes/investmentRoutes'));
app.use('/api/market', require('./routes/marketRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FarestockBroker API is running' });
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    error: err.message || 'Internal server error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  connetDB();
  startWorldIpoCron();
  startIPOSyncCron(); // Start IPO data sync cron
  console.log(`Server is running on port ${PORT}`);
});