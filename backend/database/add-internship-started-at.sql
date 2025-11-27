-- Migration to add started_at column to applications table
-- This column will track when a student starts their internship

-- Add started_at column if it doesn't exist
DO $$ 
BEGIN
    -- Add started_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'applications' AND column_name = 'started_at') THEN
        ALTER TABLE applications ADD COLUMN started_at TIMESTAMP DEFAULT NULL;
        COMMENT ON COLUMN applications.started_at IS 'Timestamp when the student started their internship';
    END IF;
END $$;

-- Create index for better performance on started_at queries
CREATE INDEX IF NOT EXISTS idx_applications_started_at ON applications(started_at);

