const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use directConnection with standard (non-SRV) URI format if SRV fails
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
    });
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);

    // Check if it's a DNS resolution issue
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.log('⚠️  DNS resolution failed. Possible causes:');
      console.log('   1. Go to MongoDB Atlas → Network Access → Add IP: 0.0.0.0/0');
      console.log('   2. Check your internet connection');
      console.log('   3. Your network may block external DNS (try a mobile hotspot)');
    }

    console.log('🔄 Retrying in 15s...');
    setTimeout(connectDB, 15000);
  }
};

module.exports = connectDB;