

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const path = require('path');

dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize backend cron jobs for queue management
const initCleanupCron = require('./cron/cleanup');
initCleanupCron();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (so shop can download)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/shops', require('./routes/shops'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/orders', require('./routes/orders'));

// Health Check
app.get('/', (req, res) => {
  res.json({ message: 'PrintFastX Backend is running 🚀' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});