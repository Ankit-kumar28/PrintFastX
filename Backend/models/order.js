const mongoose = require('mongoose');

/**
 * Order Schema definition representing customer print requests.
 * Contains file metadata, color configurations, print layout settings, 
 * pricing, status flow, and expiration information.
 */
const orderSchema = new mongoose.Schema({
  // The token issued to the customer to claim their print job (e.g. #42)
  token: {
    type: String,
    required: true,
    unique: true
  },
  // The ID of the shop where this order was submitted
  shopId: {
    type: String,
    required: true
  },
  // Detailed metadata of uploaded files within the order
  files: [{
    // Relative filepath of the document stored on disk (e.g., 'uploads/SHOPID/filename')
    fileUrl: { type: String, required: true },
    // Original name of the uploaded file
    fileName: { type: String, required: true },
    // Total count of pages computed from the file
    pages: { type: Number, default: 1 },
    // Number of print copies requested for this file
    copies: { type: Number, default: 1 },
    // Color configuration preference
    colorMode: {
      type: String,
      enum: ['bw', 'color'],
      default: 'bw'
    },
    // Layout sides configuration (single-sided vs double-sided/duplex)
    sides: {
      type: String,
      enum: ['single', 'double'],
      default: 'single'
    },
    // Paper dimensions configuration
    paperSize: {
      type: String,
      default: 'A4'
    }
  }],
  // Total calculated cost in INR (₹)
  amount: Number,
  // Custom print instructions provided by the customer
  customerNotes: String,
  // Current step in the order printing workflow
  status: {
    type: String,
    enum: ['pending', 'printing', 'ready', 'completed'],
    default: 'pending'
  },
  // Flag indicating if the order is bookmarked. Bookmarked orders ignore queue auto-deletion.
  marked: {
    type: Boolean,
    default: false
  },
  // Timestamp when the order and its files are scheduled for automatic deletion
  expiresAt: Date
}, { 
  // Automatically manage createdAt and updatedAt timestamps
  timestamps: true 
});

module.exports = mongoose.model('Order', orderSchema);