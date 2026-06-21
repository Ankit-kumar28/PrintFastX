const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  shopId: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  shopName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  // Optional for Google-auth shops
  password: {
    type: String,
    default: null
  },
  // Google OAuth fields
  googleId: {
    type: String,
    default: null,
    sparse: true
  },
  avatar: {
    type: String,
    default: null
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  phone: String,
  address: String,
  ownerName: {
    type: String,
    default: null
  },
  whatsappNumber: {
    type: String,
    default: null
  },
  referralCode: {
    type: String,
    default: null
  },
  state: {
    type: String,
    default: null
  },
  onboarded: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  orderCounter: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  pricing: {
    bwRate: { type: Number, default: 2 },      // ₹ per page
    colorRate: { type: Number, default: 8 },
    priorityFee: { type: Number, default: 10 }, // ₹ flat rate for priority bypass
    passportRate: { type: Number, default: 30 },
    photoBwRate: { type: Number, default: 5 },
    photoColorRate: { type: Number, default: 10 }
  },
  autoDeleteHours: {
    type: Number,
    default: 24
  }
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);