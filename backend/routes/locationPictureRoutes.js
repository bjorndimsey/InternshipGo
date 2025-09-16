const express = require('express');
const router = express.Router();
const LocationPictureController = require('../controllers/locationPictureController');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 5 // Maximum 5 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// GET /api/users/:userId/location-pictures - Get location pictures for a user
router.get('/:userId/location-pictures', LocationPictureController.getLocationPictures);

// POST /api/users/:userId/location-pictures - Upload location pictures for a user
router.post('/:userId/location-pictures', upload.array('pictures', 5), LocationPictureController.uploadLocationPictures);

// DELETE /api/users/location-pictures/:pictureId - Delete a location picture
router.delete('/location-pictures/:pictureId', LocationPictureController.deleteLocationPicture);

module.exports = router;
