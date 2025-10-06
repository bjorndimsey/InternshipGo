-- Migration to add hours_of_internship column to applications table
-- This column will store the total hours of internship that the student expects to complete

-- Add hours_of_internship column to applications table
DO $$ 
BEGIN
    -- Add hours_of_internship column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'applications' AND column_name = 'hours_of_internship') THEN
        ALTER TABLE applications ADD COLUMN hours_of_internship VARCHAR(100) DEFAULT NULL;
        COMMENT ON COLUMN applications.hours_of_internship IS 'Total hours of internship expected by the student (e.g., "136 hours", "40 hours per week")';
    END IF;
END $$;

-- Create index for better performance on hours_of_internship queries
CREATE INDEX IF NOT EXISTS idx_applications_hours_of_internship ON applications(hours_of_internship);

-- Update existing applications to have NULL for hours_of_internship (they were created before this field existed)
UPDATE applications 
SET hours_of_internship = NULL 
WHERE hours_of_internship IS NULL;
