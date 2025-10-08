const cloudinary = require('cloudinary').v2;
const { supabase } = require('../config/supabase');

// Configure Cloudinary for evidence images
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_EVIDENCE_CLOUD_NAME || 'dbdhg43de',
  api_key: process.env.CLOUDINARY_EVIDENCE_API_KEY || '638252629651465',
  api_secret: process.env.CLOUDINARY_EVIDENCE_API_SECRET || 'Yn2N0LUuWi59FV4PXlnC1YpWyQ8'
});

// Upload evidence image
const uploadEvidenceImage = async (req, res) => {
  try {
    console.log('📷 CLOUDINARY CONTROLLER - uploadEvidenceImage called');
    console.log('  - User ID:', req.query.userId);
    console.log('  - File info:', req.file);

    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('📷 Uploading image to Cloudinary...');

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'Journal_pictures',
      public_id: `Journal_pictures/${userId}_${Date.now()}`,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto'
    });

    console.log('✅ Image uploaded successfully:', result.secure_url);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      }
    });

  } catch (error) {
    console.error('❌ Error uploading evidence image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
};

// Delete evidence image
const deleteEvidenceImage = async (req, res) => {
  try {
    console.log('🗑️ CLOUDINARY CONTROLLER - deleteEvidenceImage called');
    console.log('  - Public ID:', req.params.publicId);

    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    console.log('🗑️ Deleting image from Cloudinary...');

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      console.log('✅ Image deleted successfully');
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      console.log('❌ Failed to delete image:', result.result);
      res.status(400).json({
        success: false,
        message: 'Failed to delete image',
        error: result.result
      });
    }

  } catch (error) {
    console.error('❌ Error deleting evidence image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
};

// Get image URL with transformations
const getImageUrl = async (req, res) => {
  try {
    console.log('🖼️ CLOUDINARY CONTROLLER - getImageUrl called');
    console.log('  - Public ID:', req.params.publicId);
    console.log('  - Transformations:', req.query);

    const { publicId } = req.params;
    const { width, height, crop, quality } = req.query;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    // Build transformation options
    const transformations = {};
    if (width) transformations.width = parseInt(width);
    if (height) transformations.height = parseInt(height);
    if (crop) transformations.crop = crop;
    if (quality) transformations.quality = quality;

    // Generate URL with transformations
    const url = cloudinary.url(publicId, {
      ...transformations,
      secure: true
    });

    console.log('✅ Image URL generated:', url);

    res.json({
      success: true,
      data: {
        url,
        publicId,
        transformations
      }
    });

  } catch (error) {
    console.error('❌ Error generating image URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate image URL',
      error: error.message
    });
  }
};

module.exports = {
  uploadEvidenceImage,
  deleteEvidenceImage,
  getImageUrl
};
