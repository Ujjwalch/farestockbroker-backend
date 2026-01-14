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
const connetDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/brokers', brokerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/education', educationRoutes);

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
  console.log(`Server is running on port ${PORT}`);
});