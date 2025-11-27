-- ============================================================================
-- Migration: Add Custom Certificate Template Support
-- Description: Adds support for companies to upload custom certificate 
--              template background images
-- Date: 2024
-- ============================================================================

-- Add custom_certificate_template_url column to companies table
DO $$ 
BEGIN
    -- Check if column already exists before adding
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'custom_certificate_template_url'
    ) THEN
        ALTER TABLE companies 
        ADD COLUMN custom_certificate_template_url TEXT;
        
        -- Add comment for documentation
        COMMENT ON COLUMN companies.custom_certificate_template_url IS 
            'Cloudinary URL of custom certificate template background image uploaded by company. ' ||
            'This image will be used as the background when generating certificates. ' ||
            'Recommended dimensions: 1200x1600px. Format: PNG or JPG with transparency support.';
        
        RAISE NOTICE '✅ Added custom_certificate_template_url column to companies table';
    ELSE
        RAISE NOTICE '⚠️ Column custom_certificate_template_url already exists in companies table';
    END IF;
END $$;

-- Create index for better query performance (optional but recommended)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'companies' 
        AND indexname = 'idx_companies_custom_certificate_template'
    ) THEN
        CREATE INDEX idx_companies_custom_certificate_template 
        ON companies(custom_certificate_template_url) 
        WHERE custom_certificate_template_url IS NOT NULL;
        
        RAISE NOTICE '✅ Created index on custom_certificate_template_url';
    ELSE
        RAISE NOTICE '⚠️ Index idx_companies_custom_certificate_template already exists';
    END IF;
END $$;

-- Verify the migration
DO $$
DECLARE
    column_exists BOOLEAN;
    index_exists BOOLEAN;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'custom_certificate_template_url'
    ) INTO column_exists;
    
    -- Check if index exists
    SELECT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'companies' 
        AND indexname = 'idx_companies_custom_certificate_template'
    ) INTO index_exists;
    
    -- Report results
    IF column_exists THEN
        RAISE NOTICE '✅ Migration completed successfully!';
        RAISE NOTICE '   - Column custom_certificate_template_url: EXISTS';
        IF index_exists THEN
            RAISE NOTICE '   - Index idx_companies_custom_certificate_template: EXISTS';
        ELSE
            RAISE NOTICE '   - Index idx_companies_custom_certificate_template: MISSING';
        END IF;
    ELSE
        RAISE EXCEPTION '❌ Migration failed: Column was not created';
    END IF;
END $$;

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
--   ALTER TABLE companies DROP COLUMN IF EXISTS custom_certificate_template_url;
--   DROP INDEX IF EXISTS idx_companies_custom_certificate_template;
-- ============================================================================
