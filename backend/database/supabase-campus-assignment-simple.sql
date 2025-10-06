-- Simple Supabase Migration: Add campus assignment columns to coordinators table
-- This version avoids complex syntax that might not work in Supabase

-- Step 1: Add the new columns
ALTER TABLE coordinators 
ADD COLUMN campus_assignment VARCHAR(20),
ADD COLUMN assigned_by BIGINT,
ADD COLUMN assigned_at TIMESTAMP;

-- Step 2: Add check constraint for campus_assignment
ALTER TABLE coordinators 
ADD CONSTRAINT check_campus_assignment 
CHECK (campus_assignment IN ('in-campus', 'off-campus'));

-- Step 3: Add foreign key constraint for assigned_by
ALTER TABLE coordinators 
ADD CONSTRAINT fk_coordinators_assigned_by 
FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- Step 4: Create index for better performance
CREATE INDEX idx_coordinators_campus_assignment ON coordinators(campus_assignment);

-- Step 5: Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'coordinators' 
AND column_name IN ('campus_assignment', 'assigned_by', 'assigned_at');
