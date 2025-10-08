import Constants from 'expo-constants';

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  public_id?: string;
  error?: string;
}

export class CloudinaryService {
  // Original Cloudinary credentials for images and general files
  private static readonly CLOUD_NAME = Constants.expoConfig?.extra?.CLOUDINARY_CLOUD_NAME || 'dxrj2nmvv';
  private static readonly API_KEY = Constants.expoConfig?.extra?.CLOUDINARY_API_KEY || '521782871565753';
  private static readonly API_SECRET = Constants.expoConfig?.extra?.CLOUDINARY_API_SECRET || 'H-Bu741Ogw6q9917WQvXlMN8MUg';
  
  // New Cloudinary credentials for PDF requirements
  private static readonly REQUIREMENTS_CLOUD_NAME = Constants.expoConfig?.extra?.CLOUDINARY_REQUIREMENTS_CLOUD_NAME || 'dtws4lvdi';
  private static readonly REQUIREMENTS_API_KEY = Constants.expoConfig?.extra?.CLOUDINARY_REQUIREMENTS_API_KEY || '911342496479915';
  private static readonly REQUIREMENTS_API_SECRET = Constants.expoConfig?.extra?.CLOUDINARY_REQUIREMENTS_API_SECRET || 'QuiHU1_cooU0ZTrN9nHxxOWDPCQ';
  
  // Cloudinary credentials for evidence images (journal pictures)
  private static readonly EVIDENCE_CLOUD_NAME = Constants.expoConfig?.extra?.CLOUDINARY_EVIDENCE_CLOUD_NAME || 'dbdhg43de';
  private static readonly EVIDENCE_API_KEY = Constants.expoConfig?.extra?.CLOUDINARY_EVIDENCE_API_KEY || '638252629651465';
  private static readonly EVIDENCE_API_SECRET = Constants.expoConfig?.extra?.CLOUDINARY_EVIDENCE_API_SECRET || 'Yn2N0LUuWi59FV4PXlnC1YpWyQ8';
  

  /**
   * Upload image to Cloudinary using unsigned uploads with preset
   */
  static async uploadImage(
    file: File | Blob,
    folder: string = 'internship-avatars',
    options: any = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      console.log('☁️ Uploading image to Cloudinary...');
      
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Create form data for unsigned upload
      const formData = new FormData();
      formData.append('file', `data:${file.type};base64,${base64}`);
      formData.append('cloud_name', this.CLOUD_NAME);
      formData.append('api_key', this.API_KEY);
      formData.append('upload_preset', 'ml_default');
      formData.append('folder', folder);
      
      console.log('📤 Uploading with preset:', 'ml_default');
      console.log('📁 Folder:', folder);

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

      console.log('✅ Image uploaded successfully:', result.secure_url);
      
      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload PDF or raw file to Cloudinary using unsigned uploads with preset
   */
  static async uploadPDF(
    file: File | Blob,
    folder: string = 'MOAs',
    companyId: string = ''
  ): Promise<CloudinaryUploadResult> {
    try {
      console.log('☁️ Uploading PDF to Cloudinary...');
      
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Create form data for unsigned upload
      const formData = new FormData();
      formData.append('file', `data:${file.type};base64,${base64}`);
      formData.append('cloud_name', this.CLOUD_NAME);
      formData.append('api_key', this.API_KEY);
      formData.append('upload_preset', 'ml_default');
      formData.append('folder', folder);
      formData.append('resource_type', 'raw');
      
      // Set public_id without folder prefix (Cloudinary handles folder automatically)
      if (companyId) {
        formData.append('public_id', `${companyId}_${Date.now()}`);
      }
      
      console.log('📤 Uploading PDF with preset:', 'ml_default');
      console.log('📁 Folder:', folder);
      console.log('📄 Resource type: raw');
      console.log('🏢 Company ID:', companyId);

      // Upload to Cloudinary
      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/raw/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📊 Upload response:', result);

      if (!response.ok) {
        throw new Error(result.error?.message || 'Upload failed');
      }

      console.log('✅ PDF uploaded successfully:', result.secure_url);
      
      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      console.error('❌ Cloudinary PDF upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete image from Cloudinary using direct API calls
   */
  static async deleteImage(publicId: string): Promise<CloudinaryUploadResult> {
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
   * Delete PDF or raw file from Cloudinary using direct API calls
   */
  static async deletePDF(publicId: string): Promise<CloudinaryUploadResult> {
    try {
      console.log('🗑️ Deleting PDF from Cloudinary:', publicId);
      
      // Create signature for authenticated request
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = await this.generateSignature(publicId, timestamp);
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', this.API_KEY);
      formData.append('signature', signature);
      formData.append('resource_type', 'raw');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/raw/destroy`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.result === 'ok') {
        console.log('✅ PDF deleted successfully');
        return { success: true };
      } else {
        console.log('❌ Failed to delete PDF:', result.result);
        return { success: false, error: 'Delete failed' };
      }
    } catch (error) {
      console.error('❌ Cloudinary PDF delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Convert file to base64
   */
  private static fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Generate signature for upload requests
   */
  private static async generateUploadSignature(publicId: string, timestamp: number, folder: string, transformation: string): Promise<string> {
    // Create the string to sign in the correct order (without API secret)
    const params = [
      `folder=${folder}`,
      `public_id=${publicId}`,
      `timestamp=${timestamp}`,
      `transformation=${transformation}`
    ].join('&');
    
    console.log('🔐 String to sign:', params);
    console.log('🔐 API Secret:', this.API_SECRET);
    
    // Use Web Crypto API for HMAC-SHA1
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.API_SECRET),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    // Sign the parameters string (without API secret)
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(params));
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('🔑 Generated signature:', hashHex);
    
    return hashHex;
  }

  /**
   * Generate signature for authenticated requests (delete)
   */
  private static async generateSignature(publicId: string, timestamp: number): Promise<string> {
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

  /**
   * Generate Cloudinary URL with transformations
   */
  static getImageUrl(publicId: string, transformations: any = {}): string {
    const baseUrl = `https://res.cloudinary.com/${this.CLOUD_NAME}/image/upload`;
    // Default transformations for avatar display
    const transformString = 'w_300,h_300,c_fill,g_face,q_auto,f_auto';
    return `${baseUrl}/${transformString}/${publicId}`;
  }

  /**
   * Generate Cloudinary URL for PDF files
   */
  static getPDFUrl(publicId: string): string {
    return `https://res.cloudinary.com/${this.CLOUD_NAME}/raw/upload/${publicId}`;
  }

  /**
   * Upload location picture to Cloudinary
   */
  static async uploadLocationPicture(
    file: File | Blob,
    userId: string
  ): Promise<CloudinaryUploadResult> {
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
   * Generate Cloudinary URL for location pictures
   */
  static getLocationPictureUrl(publicId: string, transformations: any = {}): string {
    const baseUrl = `https://res.cloudinary.com/${this.CLOUD_NAME}/image/upload`;
    // Default transformations for location picture display
    const transformString = 'w_400,h_300,c_fill,q_auto,f_auto';
    return `${baseUrl}/${transformString}/${publicId}`;
  }

  /**
   * Upload PDF requirements to the dedicated requirements Cloudinary account
   */
  static async uploadRequirementPDF(
    file: File | Blob,
    fileName?: string,
    options: any = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      console.log('☁️ Uploading PDF requirement to Cloudinary...');
      
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Create form data for unsigned upload
      const formData = new FormData();
      formData.append('file', `data:${file.type};base64,${base64}`);
      formData.append('cloud_name', this.REQUIREMENTS_CLOUD_NAME);
      formData.append('api_key', this.REQUIREMENTS_API_KEY);
      formData.append('upload_preset', 'ml_default');
      formData.append('folder', 'Requirements');
      formData.append('resource_type', 'raw');
      
      // Set public_id if provided
      if (fileName) {
        formData.append('public_id', fileName);
      }
      
      console.log('📤 Uploading PDF requirement with preset:', 'ml_default');
      console.log('📁 Folder: Requirements');
      console.log('📄 Resource type: raw');
      console.log('🏢 Cloud Name:', this.REQUIREMENTS_CLOUD_NAME);

      // Upload to Cloudinary
      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.REQUIREMENTS_CLOUD_NAME}/raw/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📊 Upload response:', result);

      if (!response.ok) {
        throw new Error(result.error?.message || 'Upload failed');
      }

      console.log('✅ PDF requirement uploaded successfully:', result.secure_url);
      
      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      console.error('❌ Cloudinary PDF requirement upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete PDF requirement from the dedicated requirements Cloudinary account
   */
  static async deleteRequirementPDF(publicId: string): Promise<CloudinaryUploadResult> {
    try {
      console.log('🗑️ Deleting PDF requirement from Cloudinary:', publicId);
      
      // Create signature for authenticated request
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = await this.generateRequirementSignature(publicId, timestamp);
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', this.REQUIREMENTS_API_KEY);
      formData.append('signature', signature);
      formData.append('resource_type', 'raw');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.REQUIREMENTS_CLOUD_NAME}/raw/destroy`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.result === 'ok') {
        console.log('✅ PDF requirement deleted successfully');
        return { success: true };
      } else {
        console.log('❌ Failed to delete PDF requirement:', result.result);
        return { success: false, error: 'Delete failed' };
      }
    } catch (error) {
      console.error('❌ Cloudinary PDF requirement delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Generate Cloudinary URL for PDF requirements
   */
  static getRequirementPDFUrl(publicId: string): string {
    return `https://res.cloudinary.com/${this.REQUIREMENTS_CLOUD_NAME}/raw/upload/${publicId}`;
  }

  /**
   * Generate signature for requirements Cloudinary requests (delete)
   */
  private static async generateRequirementSignature(publicId: string, timestamp: number): Promise<string> {
    const message = `public_id=${publicId}&timestamp=${timestamp}${this.REQUIREMENTS_API_SECRET}`;
    
    // Use Web Crypto API for HMAC-SHA1
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.REQUIREMENTS_API_SECRET),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }

  /**
   * Upload group chat avatar to Cloudinary
   */
  static async uploadGroupAvatar(
    file: File | Blob,
    groupId: string,
    options: any = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      console.log('☁️ Uploading group avatar to Cloudinary...');
      
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Create form data for unsigned upload
      const formData = new FormData();
      formData.append('file', `data:${file.type};base64,${base64}`);
      formData.append('cloud_name', this.CLOUD_NAME);
      formData.append('api_key', this.API_KEY);
      formData.append('upload_preset', 'ml_default');
      formData.append('folder', 'internship-avatars/group-chats');
      formData.append('public_id', `group-chats/${groupId}_${Date.now()}`);
      
      console.log('📤 Uploading group avatar with preset:', 'ml_default');
      console.log('📁 Folder: internship-avatars/group-chats');
      console.log('👥 Group ID:', groupId);

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

      console.log('✅ Group avatar uploaded successfully:', result.secure_url);
      
      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      console.error('❌ Cloudinary group avatar upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Generate Cloudinary URL for group avatars
   */
  static getGroupAvatarUrl(publicId: string, transformations: any = {}): string {
    const baseUrl = `https://res.cloudinary.com/${this.CLOUD_NAME}/image/upload`;
    // Default transformations for group avatar display
    const transformString = 'w_200,h_200,c_fill,g_face,q_auto,f_auto';
    return `${baseUrl}/${transformString}/${publicId}`;
  }

  /**
   * Upload any file type to Cloudinary with automatic resource type detection
   */
  static async uploadFile(
    file: File | Blob,
    folder: string = 'documents',
    fileName?: string,
    options: any = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      console.log('☁️ Uploading file to Cloudinary...');
      
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Determine resource type based on file type
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const resourceType = isImage ? 'image' : 'raw';
      
      // Create form data for unsigned upload
      const formData = new FormData();
      formData.append('file', `data:${file.type};base64,${base64}`);
      formData.append('cloud_name', this.CLOUD_NAME);
      formData.append('api_key', this.API_KEY);
      formData.append('upload_preset', 'ml_default');
      formData.append('folder', folder);
      formData.append('resource_type', resourceType);
      
      // Set public_id if provided
      if (fileName) {
        formData.append('public_id', fileName);
      }
      
      console.log('📤 Uploading file with preset:', 'ml_default');
      console.log('📁 Folder:', folder);
      console.log('📄 Resource type:', resourceType);
      console.log('📝 File type:', file.type);

      // Upload to Cloudinary
      const endpoint = isImage 
        ? `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`
        : `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/raw/upload`;
        
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📊 Upload response:', result);

      if (!response.ok) {
        throw new Error(result.error?.message || 'Upload failed');
      }

      console.log('✅ File uploaded successfully:', result.secure_url);
      
      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      console.error('❌ Cloudinary file upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload evidence image (journal picture) to Cloudinary
   */
  static async uploadEvidenceImage(
    file: File | Blob,
    userId: string,
    taskId?: string,
    options: any = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      console.log('☁️ Uploading evidence image to Cloudinary...');
      
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Create form data for unsigned upload
      const formData = new FormData();
      formData.append('file', `data:${file.type};base64,${base64}`);
      formData.append('cloud_name', this.EVIDENCE_CLOUD_NAME);
      formData.append('api_key', this.EVIDENCE_API_KEY);
      formData.append('upload_preset', 'ml_default');
      formData.append('folder', 'Journal_pictures');
      
      // Set public_id with user and task information
      const timestamp = Date.now();
      const publicId = taskId 
        ? `Journal_pictures/${userId}_${taskId}_${timestamp}`
        : `Journal_pictures/${userId}_${timestamp}`;
      formData.append('public_id', publicId);
      
      console.log('📤 Uploading evidence image with preset:', 'ml_default');
      console.log('📁 Folder: Journal_pictures');
      console.log('👤 User ID:', userId);
      console.log('📝 Task ID:', taskId);
      console.log('🆔 Public ID:', publicId);

      // Upload to Cloudinary
      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.EVIDENCE_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📊 Upload response:', result);

      if (!response.ok) {
        throw new Error(result.error?.message || 'Upload failed');
      }

      console.log('✅ Evidence image uploaded successfully:', result.secure_url);
      
      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      console.error('❌ Cloudinary evidence image upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete evidence image from Cloudinary
   */
  static async deleteEvidenceImage(publicId: string): Promise<CloudinaryUploadResult> {
    try {
      console.log('🗑️ Deleting evidence image from Cloudinary:', publicId);
      
      // Create signature for authenticated request
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = await this.generateEvidenceSignature(publicId, timestamp);
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', this.EVIDENCE_API_KEY);
      formData.append('signature', signature);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.EVIDENCE_CLOUD_NAME}/image/destroy`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.result === 'ok') {
        console.log('✅ Evidence image deleted successfully');
        return { success: true };
      } else {
        console.log('❌ Failed to delete evidence image:', result.result);
        return { success: false, error: 'Delete failed' };
      }
    } catch (error) {
      console.error('❌ Cloudinary evidence image delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Generate Cloudinary URL for evidence images
   */
  static getEvidenceImageUrl(publicId: string, transformations: any = {}): string {
    const baseUrl = `https://res.cloudinary.com/${this.EVIDENCE_CLOUD_NAME}/image/upload`;
    // Default transformations for evidence image display
    const transformString = 'w_800,h_600,c_fill,q_auto,f_auto';
    return `${baseUrl}/${transformString}/${publicId}`;
  }

  /**
   * Generate signature for evidence Cloudinary requests (delete)
   */
  private static async generateEvidenceSignature(publicId: string, timestamp: number): Promise<string> {
    const message = `public_id=${publicId}&timestamp=${timestamp}${this.EVIDENCE_API_SECRET}`;
    
    // Use Web Crypto API for HMAC-SHA1
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.EVIDENCE_API_SECRET),
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

export default CloudinaryService;
