const express = require('express');
const fs = require('fs');
const path = require('path');
const Order = require('../models/Order');
const Shop = require('../models/Shop');

const router = express.Router();

/**
 * @route   GET /api/orders/:shopId
 * @desc    Fetch all orders for a specific shop, sorted by creation date descending
 * @access  Private (Shop owner / Admin)
 * @param   {string} req.params.shopId - The unique ID of the shop
 * @returns {Array<Object>} List of orders or error message
 */
router.get('/:shopId', async (req, res) => {
  try {
    const shop = await Shop.findOne({ shopId: req.params.shopId.toUpperCase() });
    
    // Verify if the shop is blocked from admin panel before proceeding
    if (shop && shop.isBlocked) {
      return res.status(403).json({ error: 'Your shop has been blocked by the admin. Please contact support.' });
    }
    
    const orders = await Order.find({ shopId: req.params.shopId })
      .sort({ createdAt: -1 });
      
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PATCH /api/orders/:token/status
 * @desc    Update status of an order (e.g. pending, printing, ready, completed)
 * @access  Private (Shop owner)
 * @param   {string} req.params.token - Unique order identifier token
 * @param   {string} req.body.status - The new status value
 * @returns {Object} Updated order object
 */
router.patch('/:token/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOneAndUpdate(
      { token: req.params.token },
      { status },
      { new: true }
    );
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PATCH /api/orders/:token/mark
 * @desc    Toggle bookmark/mark status of an order to prevent automatic queue cleanup
 * @access  Private (Shop owner)
 * @param   {string} req.params.token - Unique order identifier token
 * @param   {boolean} req.body.marked - Bookmark status flag
 * @returns {Object} Updated order object
 */
router.patch('/:token/mark', async (req, res) => {
  try {
    const { marked } = req.body;
    const order = await Order.findOneAndUpdate(
      { token: req.params.token },
      { marked },
      { new: true }
    );
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/orders/:token
 * @desc    Manually delete/dismiss an order and purge all its uploaded physical files from disk
 * @access  Private (Shop owner)
 * @param   {string} req.params.token - Unique order identifier token
 * @returns {Object} Success flag and confirmation message
 */
router.delete('/:token', async (req, res) => {
  try {
    const order = await Order.findOne({ token: req.params.token });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Purge uploaded physical files from storage to release server disk space
    if (order.files && order.files.length > 0) {
      for (const file of order.files) {
        if (file.fileUrl) {
          const absolutePath = path.join(__dirname, '..', file.fileUrl);
          try {
            if (fs.existsSync(absolutePath)) {
              fs.unlinkSync(absolutePath);
            }
          } catch (fileErr) {
            console.error(`Failed to delete file on manual order delete: ${absolutePath}`, fileErr);
          }
        }
      }
    }
    
    // Remove database document
    await Order.deleteOne({ _id: order._id });
    
    res.json({ success: true, message: 'Order and its files deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;