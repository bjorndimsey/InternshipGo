-- ============================================================================
-- Supabase Migration: Create Custom Certificate Templates Table
-- Description: Creates a table to store multiple custom certificate templates
--              per company, replacing the single column approach
-- 
-- How to Run:
--   1. Go to your Supabase Dashboard
--   2. Navigate to SQL Editor
--   3. Click "New Query"
--   4. Copy and paste this entire file
--   5. Click "Run" to execute
-- ============================================================================

-- Step 1: Create company_certificate_templates table
CREATE TABLE IF NOT EXISTS company_certificate_templates (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    template_name VARCHAR(100) NOT NULL DEFAULT 'Custom Template',
    template_image_url TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Step 2: Add comment for documentation
COMMENT ON TABLE company_certificate_templates IS 'Stores custom certificate template images uploaded by companies. Each company can have multiple templates.';
COMMENT ON COLUMN company_certificate_templates.template_name IS 'User-friendly name for the template (e.g., "Company Logo Template", "Formal Template")';
COMMENT ON COLUMN company_certificate_templates.template_image_url IS 'Cloudinary URL of the custom certificate template background image. Recommended dimensions: 1200x1600px. Format: PNG or JPG with transparency support.';
COMMENT ON COLUMN company_certificate_templates.is_default IS 'If true, this template will be selected by default when generating certificates';

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_company_certificate_templates_company_id 
ON company_certificate_templates(company_id);

CREATE INDEX IF NOT EXISTS idx_company_certificate_templates_default 
ON company_certificate_templates(company_id, is_default) 
WHERE is_default = TRUE;

-- Step 4: Migrate existing custom_certificate_template_url data (if any)
-- This will move data from the old column to the new table
INSERT INTO company_certificate_templates (company_id, template_image_url, template_name, is_default, created_at, updated_at)
SELECT 
    id as company_id,
    custom_certificate_template_url as template_image_url,
    'Custom Template' as template_name,
    TRUE as is_default,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM companies
WHERE custom_certificate_template_url IS NOT NULL
AND custom_certificate_template_url != ''
AND NOT EXISTS (
    SELECT 1 FROM company_certificate_templates 
    WHERE company_certificate_templates.company_id = companies.id
);

-- Step 5: (Optional) Drop the old column after migration
-- Uncomment the line below if you want to remove the old column
-- ALTER TABLE companies DROP COLUMN IF EXISTS custom_certificate_template_url;

-- ============================================================================
-- Verification Query (Optional - run this to verify the migration worked)
-- ============================================================================
-- SELECT 
--     table_name, 
--     column_name, 
--     data_type
-- FROM information_schema.columns 
-- WHERE table_name = 'company_certificate_templates';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This migration creates a new table for storing multiple custom certificate
-- templates per company. The old single-column approach is replaced with a
-- more flexible multi-template system.
--
-- Usage:
--   1. Companies can upload multiple templates via ProfilePage
--   2. Each template has a name and can be set as default
--   3. Templates can be deleted individually
--   4. When generating certificates, all custom templates appear as options
--
-- Rollback (if needed):
--   DROP TABLE IF EXISTS company_certificate_templates;
-- ============================================================================

