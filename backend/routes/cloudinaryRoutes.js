const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinaryController = require('../controllers/cloudinaryController');
const authMiddleware = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Upload evidence image
router.post('/evidence-image', upload.single('image'), cloudinaryController.uploadEvidenceImage);

// Delete evidence image
router.delete('/evidence-image/:publicId', cloudinaryController.deleteEvidenceImage);

// Get image URL with transformations
router.get('/evidence-image/:publicId', cloudinaryController.getImageUrl);

module.exports = router;
