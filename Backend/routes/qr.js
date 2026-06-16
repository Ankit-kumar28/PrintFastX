const express = require('express');
const QRCode = require('qrcode');
const Shop = require('../models/shop');

const router = express.Router();

// ── GET /api/qr/:shopId — Returns QR as PNG image ──────────────
router.get('/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findOne({ shopId });

    if (!shop || shop.status !== 'approved') {
      return res.status(404).json({ error: 'Shop not approved or not found' });
    }

    const uploadUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/upload/${shopId}`;

    const qrBuffer = await QRCode.toBuffer(uploadUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 512,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="${shopId}-qr.png"`);
    res.send(qrBuffer);
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// ── GET /api/qr/:shopId/data — Returns QR as base64 data URL ────
router.get('/:shopId/data', async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findOne({ shopId });

    if (!shop || shop.status !== 'approved') {
      return res.status(404).json({ error: 'Shop not approved or not found' });
    }

    const uploadUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/upload/${shopId}`;

    const dataUrl = await QRCode.toDataURL(uploadUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    res.json({
      qrDataUrl: dataUrl,
      uploadUrl,
      shopId,
      shopName: shop.shopName,
    });
  } catch (error) {
    console.error('QR data error:', error);
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// ── GET /api/qr/:shopId/download — Returns QR PNG for download ──
router.get('/:shopId/download', async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findOne({ shopId });

    if (!shop || shop.status !== 'approved') {
      return res.status(404).json({ error: 'Shop not approved or not found' });
    }

    const uploadUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/upload/${shopId}`;

    const qrBuffer = await QRCode.toBuffer(uploadUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 800,
      margin: 4,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${shop.shopName}-QR.png"`);
    res.send(qrBuffer);
  } catch (error) {
    console.error('QR download error:', error);
    res.status(500).json({ error: 'QR download failed' });
  }
});

module.exports = router;