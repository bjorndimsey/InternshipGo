const { query } = require('../config/supabase');
const CloudinaryService = require('../lib/cloudinaryService');

class LocationPictureController {
  // Get location pictures for a user
  static async getLocationPictures(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      console.log('🔍 Getting location pictures for user:', userId);

      const result = await query('location_pictures', 'select', null, { 
        user_id: parseInt(userId) 
      });
      
      if (result.error) {
        console.error('❌ Error fetching location pictures:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch location pictures',
          error: result.error.message
        });
      }

      const pictures = result.data || [];
      console.log('📸 Found location pictures:', pictures.length);

      res.json({
        success: true,
        message: 'Location pictures fetched successfully',
        pictures: pictures
      });

    } catch (error) {
      console.error('❌ Error in getLocationPictures:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Upload location pictures for a user
  static async uploadLocationPictures(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      console.log('📤 Uploading location pictures for user:', userId);

      const { description } = req.body;
      const files = req.files || [];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files provided'
        });
      }

      console.log('📁 Files received:', files.length);
      console.log('📝 Description:', description);

      const uploadedPictures = [];

      for (const file of files) {
        try {
          // Upload to Cloudinary
          const uploadResult = await CloudinaryService.uploadLocationPicture(file, userId);
          
          if (!uploadResult.success) {
            console.error('❌ Failed to upload to Cloudinary:', uploadResult.error);
            continue;
          }

          // Save to database
          const pictureData = {
            user_id: parseInt(userId),
            url: uploadResult.url,
            public_id: uploadResult.public_id,
            description: description || '',
            uploaded_at: new Date().toISOString()
          };

          const result = await query('location_pictures', 'insert', pictureData);
          
          if (result.error) {
            console.error('❌ Error saving picture to database:', result.error);
            // If database save fails, delete from Cloudinary
            if (uploadResult.public_id) {
              await CloudinaryService.deleteImage(uploadResult.public_id);
            }
            continue;
          }

          uploadedPictures.push({
            id: result.data[0].id,
            ...pictureData
          });

        } catch (fileError) {
          console.error('❌ Error processing file:', fileError);
          continue;
        }
      }

      console.log('✅ Successfully uploaded', uploadedPictures.length, 'pictures');

      res.json({
        success: true,
        message: `${uploadedPictures.length} pictures uploaded successfully`,
        pictures: uploadedPictures
      });

    } catch (error) {
      console.error('❌ Error in uploadLocationPictures:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Delete a location picture
  static async deleteLocationPicture(req, res) {
    try {
      const { pictureId } = req.params;
      
      if (!pictureId) {
        return res.status(400).json({
          success: false,
          message: 'Picture ID is required'
        });
      }

      console.log('🗑️ Deleting location picture:', pictureId);

      // First, get the picture to find the public_id
      const getResult = await query('location_pictures', 'select', null, { 
        id: parseInt(pictureId) 
      });
      
      if (getResult.error) {
        console.error('❌ Error fetching picture:', getResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch picture',
          error: getResult.error.message
        });
      }

      if (!getResult.data || getResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Picture not found'
        });
      }

      const picture = getResult.data[0];

      // Delete from Cloudinary if public_id exists
      if (picture.public_id) {
        const deleteResult = await CloudinaryService.deleteImage(picture.public_id);
        if (!deleteResult.success) {
          console.error('❌ Failed to delete from Cloudinary:', deleteResult.error);
          // Continue with database deletion even if Cloudinary deletion fails
        }
      }

      // Delete from database
      const result = await query('location_pictures', 'delete', null, { 
        id: parseInt(pictureId) 
      });
      
      if (result.error) {
        console.error('❌ Error deleting location picture from database:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete picture from database',
          error: result.error.message
        });
      }

      console.log('✅ Successfully deleted picture from database and Cloudinary');

      res.json({
        success: true,
        message: 'Picture deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error in deleteLocationPicture:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = LocationPictureController;
