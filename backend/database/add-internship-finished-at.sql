-- Migration to add finished_at column to applications table
-- This column will track when a student finishes/completes their internship

-- Add finished_at column if it doesn't exist
DO $$ 
BEGIN
    -- Add finished_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'applications' AND column_name = 'finished_at') THEN
        ALTER TABLE applications ADD COLUMN finished_at TIMESTAMP DEFAULT NULL;
        COMMENT ON COLUMN applications.finished_at IS 'Timestamp when the student finished/completed their internship';
    END IF;
END $$;

-- Create index for better performance on finished_at queries
CREATE INDEX IF NOT EXISTS idx_applications_finished_at ON applications(finished_at);

