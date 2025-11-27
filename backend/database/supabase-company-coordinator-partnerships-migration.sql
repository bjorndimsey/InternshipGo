-- ============================================================================
-- Supabase Migration: Create Company-Coordinator Partnerships Junction Table
-- Description: Creates a many-to-many relationship table for partnerships
--              between companies and coordinators.
-- 
-- How to Run:
--   1. Go to your Supabase Dashboard
--   2. Navigate to SQL Editor
--   3. Click "New Query"
--   4. Copy and paste this entire file
--   5. Click "Run" to execute
-- ============================================================================

-- Step 1: Create the junction table
CREATE TABLE IF NOT EXISTS company_coordinator_partnerships (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    coordinator_id BIGINT NOT NULL,
    coordinator_user_id BIGINT NOT NULL,
    
    -- MOA Information (per partnership)
    moa_url TEXT,
    moa_public_id TEXT,
    moa_status VARCHAR(20) DEFAULT 'pending',
    moa_sent_date TIMESTAMP,
    moa_received_date TIMESTAMP,
    moa_expiry_date TIMESTAMP,
    moa_uploaded_by BIGINT,
    moa_uploaded_at TIMESTAMP,
    
    -- Approval Status (per partnership)
    coordinator_approved BOOLEAN DEFAULT FALSE,
    company_approved BOOLEAN DEFAULT FALSE,
    partnership_status VARCHAR(20) DEFAULT 'pending',
    partnership_approved_by BIGINT,
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

-- Step 2: Create indexes
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

-- Step 3: Add comments
COMMENT ON TABLE company_coordinator_partnerships IS 'Junction table for many-to-many partnerships between companies and coordinators. Each record represents one partnership with its own MOA and approval status.';

-- Step 4: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_partnerships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger
DROP TRIGGER IF EXISTS trigger_update_partnerships_updated_at ON company_coordinator_partnerships;
CREATE TRIGGER trigger_update_partnerships_updated_at
    BEFORE UPDATE ON company_coordinator_partnerships
    FOR EACH ROW
    EXECUTE FUNCTION update_partnerships_updated_at();

-- Step 6: Migrate existing data
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
  AND coord.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM company_coordinator_partnerships p
    WHERE p.company_id = c.id 
      AND p.coordinator_user_id = c.moa_uploaded_by
  );

-- ============================================================================
-- Migration Complete
-- ============================================================================

