class CloudinaryService {
  static CLOUD_NAME = 'dxrj2nmvv';
  static API_KEY = '521782871565753';
  static API_SECRET = 'H-Bu741Ogw6q9917WQvXlMN8MUg';

  /**
   * Upload location picture to Cloudinary
   */
  static async uploadLocationPicture(file, userId) {
    try {
      console.log('☁️ Uploading location picture to Cloudinary...');
      
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Create form data for unsigned upload
      const formData = new FormData();
      formData.append('file', `data:${file.type};base64,${base64}`);
      formData.append('cloud_name', this.CLOUD_NAME);
      formData.append('api_key', this.API_KEY);
      formData.append('upload_preset', 'ml_default');
      formData.append('folder', 'internship-avatars/location-pictures');
      formData.append('public_id', `location-pictures/${userId}_${Date.now()}`);
      
      console.log('📤 Uploading location picture with preset:', 'ml_default');
      console.log('📁 Folder: internship-avatars/location-pictures');
      console.log('👤 User ID:', userId);

      // Upload to Cloudinary
      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📊 Upload response:', result);

      if (!response.ok) {
        throw new Error(result.error?.message || 'Upload failed');
      }

      console.log('✅ Location picture uploaded successfully:', result.secure_url);
      
      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      console.error('❌ Cloudinary location picture upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete image from Cloudinary using direct API calls
   */
  static async deleteImage(publicId) {
    try {
      console.log('🗑️ Deleting image from Cloudinary:', publicId);
      
      // Create signature for authenticated request
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = await this.generateSignature(publicId, timestamp);
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', this.API_KEY);
      formData.append('signature', signature);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/destroy`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.result === 'ok') {
        console.log('✅ Image deleted successfully');
        return { success: true };
      } else {
        console.log('❌ Failed to delete image:', result.result);
        return { success: false, error: 'Delete failed' };
      }
    } catch (error) {
      console.error('❌ Cloudinary delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Convert file to base64 (Node.js version)
   */
  static fileToBase64(file) {
    return new Promise((resolve, reject) => {
      try {
        // For multer file objects, the buffer is available
        const base64 = file.buffer.toString('base64');
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate signature for authenticated requests (delete)
   */
  static async generateSignature(publicId, timestamp) {
    const message = `public_id=${publicId}&timestamp=${timestamp}${this.API_SECRET}`;
    
    // Use Web Crypto API for HMAC-SHA1
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.API_SECRET),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }
}

module.exports = CloudinaryService;
