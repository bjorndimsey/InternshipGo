-- ============================================================================
-- Supabase Migration: Add Custom Certificate Template Support
-- Description: Adds support for companies to upload custom certificate 
--              template background images
-- 
-- How to Run:
--   1. Go to your Supabase Dashboard
--   2. Navigate to SQL Editor
--   3. Click "New Query"
--   4. Copy and paste this entire file
--   5. Click "Run" to execute
-- ============================================================================

-- Step 1: Add custom_certificate_template_url column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS custom_certificate_template_url TEXT;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN companies.custom_certificate_template_url IS 'Cloudinary URL of custom certificate template background image uploaded by company. This image will be used as the background when generating certificates. Recommended dimensions: 1200x1600px. Format: PNG or JPG with transparency support.';

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_custom_certificate_template 
ON companies(custom_certificate_template_url) 
WHERE custom_certificate_template_url IS NOT NULL;

-- ============================================================================
-- Verification Query (Optional - run this to verify the migration worked)
-- ============================================================================
-- SELECT 
--     column_name, 
--     data_type, 
--     is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'companies' 
-- AND column_name = 'custom_certificate_template_url';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This migration adds support for custom certificate templates.
-- Companies can now upload their own certificate background images which
-- will be used when generating certificates for completed interns.
--
-- Usage:
--   1. Companies upload template via ProfilePage → Account Settings
--   2. Template is stored in Cloudinary and URL saved to this column
--   3. When generating certificates, custom template appears as an option
--   4. Certificate generator overlays text on the custom background
--
-- Rollback (if needed):
--   DROP INDEX IF EXISTS idx_companies_custom_certificate_template;
--   ALTER TABLE companies DROP COLUMN IF EXISTS custom_certificate_template_url;
-- ============================================================================

