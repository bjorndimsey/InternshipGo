# Cloudinary Setup Guide

## Security Notice
⚠️ **IMPORTANT**: API keys have been moved to environment variables for security. The hardcoded keys in the code are now fallbacks and should be replaced with environment variables.

## Environment Variables Setup

1. **Copy the example file:**
   ```bash
   cp env.example .env
   ```

2. **Edit the `.env` file** with your actual Cloudinary credentials:
   ```env
   # Original Cloudinary credentials for images and general files
   CLOUDINARY_CLOUD_NAME=your_cloud_name_here
   CLOUDINARY_API_KEY=your_api_key_here
   CLOUDINARY_API_SECRET=your_api_secret_here

   # Cloudinary credentials for PDF requirements
   CLOUDINARY_REQUIREMENTS_CLOUD_NAME=your_requirements_cloud_name_here
   CLOUDINARY_REQUIREMENTS_API_KEY=your_requirements_api_key_here
   CLOUDINARY_REQUIREMENTS_API_SECRET=your_requirements_api_secret_here

   # Cloudinary credentials for evidence images (journal pictures)
   CLOUDINARY_EVIDENCE_CLOUD_NAME=your_evidence_cloud_name_here
   CLOUDINARY_EVIDENCE_API_KEY=your_evidence_api_key_here
   CLOUDINARY_EVIDENCE_API_SECRET=your_evidence_api_secret_here
   ```

3. **Replace the placeholder values** with your actual Cloudinary credentials from your Cloudinary dashboard.

## Security Best Practices

- ✅ Never commit `.env` files to version control
- ✅ Use different API keys for different environments (development, staging, production)
- ✅ Regularly rotate your API keys
- ✅ Use the least privilege principle for API key permissions
- ✅ Monitor your Cloudinary usage for any suspicious activity

## Current API Keys Status

The following API keys are currently exposed in the codebase and should be rotated:

1. **Main Cloudinary Account:**
   - Cloud Name: `dxrj2nmvv`
   - API Key: `521782871565753`
   - API Secret: `H-Bu741Ogw6q9917WQvXlMN8MUg`

2. **Requirements Cloudinary Account:**
   - Cloud Name: `dtws4lvdi`
   - API Key: `911342496479915`
   - API Secret: `QuiHU1_cooU0ZTrN9nHxxOWDPCQ`

3. **Evidence Cloudinary Account:**
   - Cloud Name: `dbdhg43de`
   - API Key: `638252629651465`
   - API Secret: `Yn2N0LUuWi59FV4PXlnC1YpWyQ8`

## Next Steps

1. **Immediately rotate all exposed API keys** in your Cloudinary dashboard
2. **Update your `.env` file** with the new keys
3. **Test the application** to ensure everything works with the new keys
4. **Consider using Cloudinary's signed uploads** for additional security

## Troubleshooting

If you encounter issues after setting up environment variables:

1. Make sure the `.env` file is in the root directory
2. Restart your development server after creating/updating the `.env` file
3. Check that all environment variable names match exactly (case-sensitive)
4. Verify your Cloudinary credentials are correct
