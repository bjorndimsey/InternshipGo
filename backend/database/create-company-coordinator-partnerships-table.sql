-- ============================================================================
-- Migration: Create Company-Coordinator Partnerships Junction Table
-- Description: Creates a many-to-many relationship table for partnerships
--              between companies and coordinators, replacing the one-to-one
--              structure in the companies table.
-- 
-- Date: 2024
-- Phase: 1 - Database Migration (Non-Breaking)
-- ============================================================================

-- Step 1: Create the junction table
CREATE TABLE IF NOT EXISTS company_coordinator_partnerships (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    coordinator_id BIGINT NOT NULL,
    coordinator_user_id BIGINT NOT NULL,  -- For easy lookup without joins
    
    -- MOA Information (per partnership)
    moa_url TEXT,
    moa_public_id TEXT,
    moa_status VARCHAR(20) DEFAULT 'pending' CHECK (moa_status IN ('pending', 'active', 'expired', 'sent', 'received', 'approved', 'rejected')),
    moa_sent_date TIMESTAMP,
    moa_received_date TIMESTAMP,
    moa_expiry_date TIMESTAMP,
    moa_uploaded_by BIGINT,  -- Which coordinator uploaded it (usually same as coordinator_user_id)
    moa_uploaded_at TIMESTAMP,
    
    -- Approval Status (per partnership)
    coordinator_approved BOOLEAN DEFAULT FALSE,
    company_approved BOOLEAN DEFAULT FALSE,
    partnership_status VARCHAR(20) DEFAULT 'pending' CHECK (partnership_status IN ('pending', 'approved', 'rejected')),
    partnership_approved_by BIGINT,  -- User who approved (coordinator or company user_id)
    partnership_approved_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (coordinator_id) REFERENCES coordinators(id) ON DELETE CASCADE,
    FOREIGN KEY (coordinator_user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique constraint: one partnership record per company-coordinator pair
    UNIQUE(company_id, coordinator_id)
);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_partnerships_company_id 
ON company_coordinator_partnerships(company_id);

CREATE INDEX IF NOT EXISTS idx_partnerships_coordinator_id 
ON company_coordinator_partnerships(coordinator_id);

CREATE INDEX IF NOT EXISTS idx_partnerships_coordinator_user_id 
ON company_coordinator_partnerships(coordinator_user_id);

CREATE INDEX IF NOT EXISTS idx_partnerships_status 
ON company_coordinator_partnerships(partnership_status);

CREATE INDEX IF NOT EXISTS idx_partnerships_moa_status 
ON company_coordinator_partnerships(moa_status);

CREATE INDEX IF NOT EXISTS idx_partnerships_company_coordinator 
ON company_coordinator_partnerships(company_id, coordinator_id);

-- Step 3: Add comments for documentation
COMMENT ON TABLE company_coordinator_partnerships IS 'Junction table for many-to-many partnerships between companies and coordinators. Each record represents one partnership with its own MOA and approval status.';
COMMENT ON COLUMN company_coordinator_partnerships.company_id IS 'Reference to the company in this partnership';
COMMENT ON COLUMN company_coordinator_partnerships.coordinator_id IS 'Reference to the coordinator in this partnership';
COMMENT ON COLUMN company_coordinator_partnerships.coordinator_user_id IS 'User ID of the coordinator (for easy lookup without joins)';
COMMENT ON COLUMN company_coordinator_partnerships.moa_url IS 'Cloudinary URL of the MOA document for this specific partnership';
COMMENT ON COLUMN company_coordinator_partnerships.moa_public_id IS 'Cloudinary public_id for MOA document management';
COMMENT ON COLUMN company_coordinator_partnerships.moa_status IS 'Status of the MOA: pending, active, expired, sent, received, approved, rejected';
COMMENT ON COLUMN company_coordinator_partnerships.coordinator_approved IS 'Whether the coordinator has approved this partnership';
COMMENT ON COLUMN company_coordinator_partnerships.company_approved IS 'Whether the company has approved this partnership';
COMMENT ON COLUMN company_coordinator_partnerships.partnership_status IS 'Overall partnership status: pending (waiting for approvals), approved (both approved), rejected';

-- Step 4: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_partnerships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_partnerships_updated_at ON company_coordinator_partnerships;
CREATE TRIGGER trigger_update_partnerships_updated_at
    BEFORE UPDATE ON company_coordinator_partnerships
    FOR EACH ROW
    EXECUTE FUNCTION update_partnerships_updated_at();

-- ============================================================================
-- Step 6: Migrate existing data from companies table to junction table
-- ============================================================================
-- This migrates existing partnerships from the old structure to the new one
-- Only migrates companies that have moa_uploaded_by set (active partnerships)

INSERT INTO company_coordinator_partnerships (
    company_id,
    coordinator_id,
    coordinator_user_id,
    moa_url,
    moa_public_id,
    moa_status,
    moa_expiry_date,
    moa_uploaded_by,
    moa_uploaded_at,
    coordinator_approved,
    company_approved,
    partnership_status,
    partnership_approved_by,
    partnership_approved_at,
    created_at,
    updated_at
)
SELECT 
    c.id as company_id,
    coord.id as coordinator_id,
    c.moa_uploaded_by as coordinator_user_id,
    c.moa_url,
    c.moa_public_id,
    COALESCE(c.moa_status, 'pending') as moa_status,
    c.moa_expiry_date,
    c.moa_uploaded_by,
    c.moa_uploaded_at,
    COALESCE(c.coordinator_approved, false) as coordinator_approved,
    COALESCE(c.company_approved, false) as company_approved,
    COALESCE(c.partnership_status, 'pending') as partnership_status,
    c.partnership_approved_by,
    c.partnership_approved_at,
    COALESCE(c.moa_uploaded_at, c.created_at, CURRENT_TIMESTAMP) as created_at,
    COALESCE(c.updated_at, CURRENT_TIMESTAMP) as updated_at
FROM companies c
LEFT JOIN coordinators coord ON coord.user_id = c.moa_uploaded_by
WHERE c.moa_uploaded_by IS NOT NULL
  AND coord.id IS NOT NULL  -- Only migrate if coordinator exists
  AND NOT EXISTS (
    -- Avoid duplicates if migration is run multiple times
    SELECT 1 FROM company_coordinator_partnerships p
    WHERE p.company_id = c.id 
      AND p.coordinator_user_id = c.moa_uploaded_by
  );

-- ============================================================================
-- Verification Queries (Optional - run these to verify the migration)
-- ============================================================================

-- Check how many partnerships were migrated
-- SELECT COUNT(*) as migrated_partnerships FROM company_coordinator_partnerships;

-- Check for companies with partnerships
-- SELECT 
--     c.id,
--     c.company_name,
--     c.moa_uploaded_by,
--     COUNT(p.id) as partnership_count
-- FROM companies c
-- LEFT JOIN company_coordinator_partnerships p ON p.company_id = c.id
-- WHERE c.moa_uploaded_by IS NOT NULL
-- GROUP BY c.id, c.company_name, c.moa_uploaded_by;

-- Check for coordinators with partnerships
-- SELECT 
--     coord.id,
--     coord.first_name || ' ' || coord.last_name as coordinator_name,
--     COUNT(p.id) as partnership_count
-- FROM coordinators coord
-- LEFT JOIN company_coordinator_partnerships p ON p.coordinator_id = coord.id
-- GROUP BY coord.id, coord.first_name, coord.last_name
-- HAVING COUNT(p.id) > 0;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This migration creates the junction table and migrates existing data.
-- The old columns in companies and coordinators tables are kept for
-- backward compatibility during the transition period.
--
-- Next Steps:
--   1. Update backend controllers to write to both old and new tables
--   2. Update backend controllers to read from junction table
--   3. Update frontend components
--   4. After 1 month of stable operation, remove old columns
--
-- Rollback (if needed):
--   DROP TABLE IF EXISTS company_coordinator_partnerships CASCADE;
--   DROP FUNCTION IF EXISTS update_partnerships_updated_at() CASCADE;
-- ============================================================================

