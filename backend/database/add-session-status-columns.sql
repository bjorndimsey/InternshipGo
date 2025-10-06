-- Add AM/PM session status columns to attendance_records table
-- This migration adds separate status tracking for AM and PM sessions

-- Add the new columns
ALTER TABLE attendance_records 
ADD COLUMN am_status VARCHAR(20) CHECK (am_status IN ('present', 'absent', 'late', 'leave', 'sick', 'not_marked')),
ADD COLUMN pm_status VARCHAR(20) CHECK (pm_status IN ('present', 'absent', 'late', 'leave', 'sick', 'not_marked'));

-- Create indexes for the new columns
CREATE INDEX idx_attendance_records_am_status ON attendance_records(am_status);
CREATE INDEX idx_attendance_records_pm_status ON attendance_records(pm_status);

-- Update existing records to have default values
UPDATE attendance_records 
SET am_status = 'not_marked', pm_status = 'not_marked' 
WHERE am_status IS NULL OR pm_status IS NULL;

-- Make the columns NOT NULL with default values
ALTER TABLE attendance_records 
ALTER COLUMN am_status SET DEFAULT 'not_marked',
ALTER COLUMN pm_status SET DEFAULT 'not_marked';

-- Update the existing records to set appropriate statuses based on time tracking
UPDATE attendance_records 
SET am_status = CASE 
    WHEN am_time_in IS NOT NULL AND am_time_out IS NOT NULL THEN 'present'
    WHEN am_time_in IS NOT NULL AND am_time_out IS NULL THEN 'present'
    ELSE 'not_marked'
END,
pm_status = CASE 
    WHEN pm_time_in IS NOT NULL AND pm_time_out IS NOT NULL THEN 'present'
    WHEN pm_time_in IS NOT NULL AND pm_time_out IS NULL THEN 'present'
    ELSE 'not_marked'
END
WHERE am_status = 'not_marked' OR pm_status = 'not_marked';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
AND column_name IN ('am_status', 'pm_status')
ORDER BY ordinal_position;
