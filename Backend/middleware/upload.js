// middleware/upload.js
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// ==================== LOCAL STORAGE (Current MVP) ====================
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const shopId = req.params.shopId;
    const dir = path.join(__dirname, '../uploads', shopId);

    // Create directory if not exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Unique filename: timestamp-originalname
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

// Set storage engine dynamically: memory storage for S3 uploads, disk storage for local uploads
const storageEngine = process.env.STORAGE_TYPE === 's3'
  ? multer.memoryStorage()
  : localStorage;

// Multer Config (Dynamically switches storage target based on configuration)
const uploadMiddleware = multer({
  storage: storageEngine,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Images, and Word files are allowed!'));
    }
  }
});

module.exports = uploadMiddleware;