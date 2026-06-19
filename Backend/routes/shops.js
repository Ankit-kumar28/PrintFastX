// routes/shops.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const Shop = require('../models/shop');
const Order = require('../models/order');
const { auth, adminAuth } = require('../middleware/auth');
const { sendAdminNotificationEmail, sendShopkeeperApprovalEmail } = require('../utils/mailer');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helper: sign JWT ───────────────────────────────────────────
function signToken(shop) {
  return jwt.sign(
    { id: shop._id, shopId: shop.shopId, role: 'shop' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ==================== SHOP ROUTES ====================

// Register Shop (email/password)
router.post('/register', async (req, res) => {
  try {
    const { shopName, email, password, phone, address } = req.body;

    const existingShop = await Shop.findOne({ email });
    if (existingShop) return res.status(400).json({ error: 'Shop already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const shopId = shopName.toUpperCase().slice(0, 4) + Math.floor(100 + Math.random() * 900);

    const shop = new Shop({
      shopId,
      shopName,
      email,
      password: hashedPassword,
      phone,
      address,
      authProvider: 'local',
      status: 'pending'
    });

    await shop.save();

    // Send notification email to admin (non-blocking)
    sendAdminNotificationEmail(shop).catch(err =>
      console.error('[Mailer] Admin notification error on register:', err)
    );

    res.status(201).json({
      message: 'Shop registered successfully. Waiting for admin approval.',
      shopId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shop Login (email/password)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const shop = await Shop.findOne({ email });

    if (!shop) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Block Google-only accounts from password login
    if (shop.authProvider === 'google') {
      return res.status(400).json({ error: 'This account uses Google Sign-In. Please use the Google button.' });
    }

    if (shop.status !== 'approved') {
      return res.status(400).json({ error: 'Your shop is pending admin approval.' });
    }

    const isMatch = await bcrypt.compare(password, shop.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = signToken(shop);
    res.json({ token, shop: { shopId: shop.shopId, shopName: shop.shopName, avatar: shop.avatar } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Google Auth (Login + Register in one) ──────────────────────
router.post('/google-auth', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential is required' });

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) return res.status(400).json({ error: 'Could not retrieve email from Google account' });

    // Check if a local (password-based) shop exists with this email
    const existingLocal = await Shop.findOne({ email, authProvider: 'local' });
    if (existingLocal) {
      return res.status(400).json({
        error: 'An account with this email already exists. Please log in with your email and password.'
      });
    }

    // Find or create a Google-auth shop
    let shop = await Shop.findOne({ googleId });

    if (!shop) {
      // New shop via Google — initially onboarded is false
      shop = new Shop({
        shopName: name || 'My Print Shop',
        email,
        googleId,
        avatar: picture || null,
        authProvider: 'google',
        onboarded: false,
        status: 'pending',
        password: null,
      });

      await shop.save();
    } else {
      // Update avatar in case it changed
      shop.avatar = picture || shop.avatar;
      await shop.save();
    }

    // Return token and onboard status
    const token = signToken(shop);
    res.json({
      token,
      shop: {
        shopId: shop.shopId,
        shopName: shop.shopName,
        avatar: shop.avatar,
        status: shop.status,
        onboarded: shop.onboarded
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    if (error.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Invalid Google token. Please try again.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ─── Get Logged-in Shop Profile ──────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    res.json(shop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Onboard Google Shop (Setup shop details) ──────────────────────
router.post('/onboard', auth, async (req, res) => {
  try {
    const { shopName, ownerName, whatsappNumber, address, referralCode, state } = req.body;
    const shop = await Shop.findById(req.user.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    // Generate unique shopId if not set
    if (!shop.shopId) {
      let shopId = '';
      let isUnique = false;
      while (!isUnique) {
        const safeName = shopName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        const finalSafeName = safeName || 'SHOP';
        shopId = finalSafeName + Math.floor(100 + Math.random() * 900);
        const existing = await Shop.findOne({ shopId });
        if (!existing) isUnique = true;
      }
      shop.shopId = shopId;
    }

    shop.shopName = shopName;
    shop.ownerName = ownerName;
    shop.whatsappNumber = whatsappNumber;
    shop.phone = whatsappNumber; // compatibility
    shop.address = address;
    shop.referralCode = referralCode || null;
    shop.state = state;
    shop.onboarded = true;
    shop.status = 'pending';

    await shop.save();

    // Send full shop details to admin for review (non-blocking)
    sendAdminNotificationEmail(shop).catch(err =>
      console.error('[Mailer] Admin notification error on onboard:', err)
    );

    // Re-sign token since shopId is now assigned
    const token = signToken(shop);
    res.json({
      token,
      shop: {
        shopId: shop.shopId,
        shopName: shop.shopName,
        avatar: shop.avatar,
        status: shop.status,
        onboarded: shop.onboarded
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Verify Public Shop ID ──────────────────────
router.get('/public/:shopId', async (req, res) => {
  try {
    const shop = await Shop.findOne({ shopId: req.params.shopId.toUpperCase(), onboarded: true });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (shop.isBlocked) return res.status(403).json({ error: 'This shop has been temporarily blocked by the admin' });
    res.json({
      shopId: shop.shopId,
      shopName: shop.shopName,
      status: shop.status,
      pricing: shop.pricing
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@printfastx.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (email === adminEmail && password === adminPassword) {
      const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        token,
        admin: { name: 'Super Admin', email }
      });
    }

    res.status(401).json({ error: 'Invalid admin credentials' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Shops (Admin Only)
router.get('/admin/shops', adminAuth, async (req, res) => {
  try {
    const shops = await Shop.find({ onboarded: true }).sort({ createdAt: -1 });
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve / Reject Shop
router.patch('/admin/approve/:shopId', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const shop = await Shop.findOneAndUpdate(
      { shopId: req.params.shopId },
      { status },
      { new: true }
    );
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    // Send approval confirmation email to shopkeeper (non-blocking)
    if (status === 'approved' && shop.email) {
      sendShopkeeperApprovalEmail(shop).catch(err =>
        console.error('[Mailer] Shopkeeper approval email error:', err)
      );
    }

    res.json({ message: `Shop ${status} successfully`, shop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Block / Unblock Shop
router.patch('/admin/block/:shopId', adminAuth, async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const shop = await Shop.findOneAndUpdate(
      { shopId: req.params.shopId },
      { isBlocked },
      { new: true }
    );
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    res.json({ message: `Shop ${isBlocked ? 'blocked' : 'unblocked'} successfully`, shop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Analytics (Admin)
router.get('/admin/analytics', adminAuth, async (req, res) => {
  try {
    const shopStats = await Order.aggregate([
      {
        $group: {
          _id: '$shopId',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments();
    const totalShops = await Shop.countDocuments();

    res.json({ totalShops, totalOrders, shopStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Shop Settings (Pricing, autoDeleteHours, shop profile)
router.patch('/settings', auth, async (req, res) => {
  try {
    const { bwRate, colorRate, priorityFee, autoDeleteHours, shopName, ownerName, whatsappNumber, state } = req.body;
    const shop = await Shop.findById(req.user.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    if (!shop.pricing) {
      shop.pricing = { bwRate: 2, colorRate: 8, priorityFee: 10 };
    }

    if (bwRate !== undefined) shop.pricing.bwRate = Number(bwRate);
    if (colorRate !== undefined) shop.pricing.colorRate = Number(colorRate);
    if (priorityFee !== undefined) shop.pricing.priorityFee = Number(priorityFee);
    if (autoDeleteHours !== undefined) shop.autoDeleteHours = Number(autoDeleteHours);
    if (shopName !== undefined) shop.shopName = shopName;
    if (ownerName !== undefined) shop.ownerName = ownerName;
    if (whatsappNumber !== undefined) {
      shop.whatsappNumber = whatsappNumber;
      shop.phone = whatsappNumber; // keep phone in sync
    }
    if (state !== undefined) shop.state = state;

    await shop.save();
    res.json({ success: true, shop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;