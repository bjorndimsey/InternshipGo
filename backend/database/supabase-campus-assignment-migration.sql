-- Supabase Migration: Add campus assignment columns to coordinators table
-- Run this in your Supabase SQL Editor

-- Add campus assignment columns to coordinators table
ALTER TABLE coordinators 
ADD COLUMN IF NOT EXISTS campus_assignment VARCHAR(20) CHECK (campus_assignment IN ('in-campus', 'off-campus')),
ADD COLUMN IF NOT EXISTS assigned_by BIGINT,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;

-- Add foreign key constraint for assigned_by
-- Note: Supabase doesn't support IF NOT EXISTS for constraints
-- If the constraint already exists, this will fail gracefully
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_coordinators_assigned_by'
    ) THEN
        ALTER TABLE coordinators 
        ADD CONSTRAINT fk_coordinators_assigned_by 
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_coordinators_campus_assignment ON coordinators(campus_assignment);

-- Add comments to document the new columns
COMMENT ON COLUMN coordinators.campus_assignment IS 'Campus assignment type: in-campus or off-campus';
COMMENT ON COLUMN coordinators.assigned_by IS 'User ID who assigned the campus assignment';
COMMENT ON COLUMN coordinators.assigned_at IS 'Timestamp when the campus assignment was made';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'coordinators' 
AND column_name IN ('campus_assignment', 'assigned_by', 'assigned_at');
