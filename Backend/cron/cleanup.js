const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const Order = require('../models/order');
const { deleteFileFromS3 } = require('../utils/s3');

/**
 * Initializes and starts the background cron job for auto-deleting expired orders.
 * The cron job runs every hour to check for orders that have passed their `expiresAt`
 * timestamp and are not bookmarked/marked by the shop owner.
 */
function initCleanupCron() {
  // Run every hour on the hour: '0 * * * *'
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron Job] Running expired orders cleanup...');
    
    try {
      const now = new Date();
      
      // Query unmarked orders where expiresAt is less than or equal to the current time
      const expiredOrders = await Order.find({
        expiresAt: { $lte: now },
        marked: { $ne: true } // Do not delete bookmarked orders
      });
      
      if (expiredOrders.length === 0) {
        console.log('[Cron Job] No expired orders found for cleanup.');
        return;
      }
      
      console.log(`[Cron Job] Found ${expiredOrders.length} expired orders to delete.`);
      
      let deletedFilesCount = 0;
      let deletedOrdersCount = 0;
      
      for (const order of expiredOrders) {
        // 1. Physically delete all uploaded files associated with the order from disk
        if (order.files && order.files.length > 0) {
          for (const file of order.files) {
            if (file.fileUrl) {
              if (file.fileUrl.startsWith('http')) {
                // Delete from AWS S3
                try {
                  await deleteFileFromS3(file.fileUrl);
                  deletedFilesCount++;
                } catch (s3Err) {
                  console.error(`[Cron Job] Failed to delete S3 file: ${file.fileUrl}`, s3Err);
                }
              } else {
                // fileUrl is stored relative to Backend directory (e.g. 'uploads/SHOPID/filename')
                const absolutePath = path.join(__dirname, '..', file.fileUrl);
                try {
                  if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath);
                    deletedFilesCount++;
                  }
                } catch (fileErr) {
                  console.error(`[Cron Job] Failed to delete physical file: ${absolutePath}`, fileErr);
                }
              }
            }
          }
        }
        
        // 2. Delete the order metadata from MongoDB
        await Order.findByIdAndDelete(order._id);
        deletedOrdersCount++;
      }
      
      console.log(`[Cron Job] Cleanup completed. Deleted ${deletedOrdersCount} orders and ${deletedFilesCount} physical files.`);
    } catch (error) {
      console.error('[Cron Job] Error during expired orders cleanup:', error);
    }
  });
  
  console.log('⏰ Backend cleanup cron job initialized (hourly schedule).');
}

module.exports = initCleanupCron;
