// routes/upload.js
const express = require('express');
const uploadMiddleware = require('../middleware/upload');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const Order = require('../models/Order');
const Shop = require('../models/Shop');

const router = express.Router();

/**
 * @route   POST /api/upload/:shopId
 * @desc    Handle multiple document uploads from customers, analyze page counts,
 *          calculate pricing dynamically, and generate a secure print token.
 * @access  Public (Customer scanning storefront QR)
 * @param   {string} req.params.shopId - The target shop's identifier
 * @param   {Array<File>} req.files - Array of files handled by multer middleware
 * @param   {string} req.body.fileSettings - JSON serialized array containing printing options per file
 * @param   {string|boolean} req.body.priority - Priority print option flag (+10 flat fee if true)
 * @param   {string} req.body.notes - Optional print notes from the customer
 * @returns {Object} JSON payload containing success status, print token, total amount, and confirmation instructions
 */
router.post('/:shopId', uploadMiddleware.array('files'), async (req, res) => {
  try {
    const { shopId } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Verify shop
    const shop = await Shop.findOne({ shopId: shopId.toUpperCase() });
    if (!shop || shop.status !== 'approved') {
      return res.status(404).json({ error: 'Shop not found or not approved' });
    }
    if (shop.isBlocked) {
      return res.status(403).json({ error: 'This shop has been temporarily blocked by the admin' });
    }

    // Parse settings from frontend
    let fileSettings = [];
    try {
      fileSettings = JSON.parse(req.body.fileSettings || '[]');
    } catch (err) {
      console.error('Error parsing fileSettings:', err);
    }

    let totalAmount = 0;
    const dbFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const settings = fileSettings[i] || {};

      const copies = Number(settings.copies || 1);
      const colorMode = settings.colorMode || 'bw';
      const sides = settings.sides || 'single';

      // Count PDF pages
      let pages = 1;
      if (file.mimetype === 'application/pdf') {
        try {
          const pdfBytes = fs.readFileSync(file.path);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          pages = pdfDoc.getPageCount();
        } catch (err) {
          console.error('PDF page count error:', err);
        }
      }

      // Price Calculation
      const rate = colorMode === 'color' ? shop.pricing.colorRate : shop.pricing.bwRate;
      let finalRate = rate;
      if (sides === 'double') finalRate = Math.round(rate * 0.6);

      const fileAmount = Math.round(pages * copies * finalRate);
      totalAmount += fileAmount;

      // 🔥 IMPORTANT: Save RELATIVE path only
      const relativePath = `uploads/${shopId}/${file.filename}`;

      dbFiles.push({
        fileUrl: relativePath,        // ← Fixed
        fileName: file.originalname,
        pages,
        copies,
        colorMode,
        sides
      });
    }

    // Priority fee (optional)
    const priority = req.body.priority === 'true' || req.body.priority === true;
    if (priority) totalAmount += 10;

    // Generate Token using counter
    let updatedShop = await Shop.findOneAndUpdate(
      { shopId: shop.shopId },
      { $inc: { orderCounter: 1 } },
      { new: true }
    );

    // Auto reset counter when it reaches 100
    if (updatedShop.orderCounter >= 100) {
      updatedShop = await Shop.findOneAndUpdate(
        { shopId: shop.shopId },
        { orderCounter: 1 },           // Reset to 1
        { new: true }
      );
      console.log(`🔄 Token counter for shop ${shop.shopId} auto-reset to 1`);
    }

    const token = `#${updatedShop.orderCounter}`;
    // Save Order
    const order = new Order({
      token,
      shopId: shop.shopId,
      files: dbFiles,
      amount: totalAmount,
      customerNotes: req.body.notes || '',
      expiresAt: new Date(Date.now() + shop.autoDeleteHours * 60 * 60 * 1000)
    });

    await order.save();

    res.json({
      success: true,
      token,
      amount: totalAmount,
      message: 'Files uploaded successfully! Show this token at the shop.'
    });

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message || 'Upload failed. Please try again.' });
  }
});

module.exports = router;