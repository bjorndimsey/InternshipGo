-- Step-by-step migration for adding AM/PM session status columns
-- Run these statements one by one in your Supabase SQL Editor

-- Step 1: Add the new columns
ALTER TABLE attendance_records 
ADD COLUMN am_status VARCHAR(20) CHECK (am_status IN ('present', 'absent', 'late', 'leave', 'sick', 'not_marked')),
ADD COLUMN pm_status VARCHAR(20) CHECK (pm_status IN ('present', 'absent', 'late', 'leave', 'sick', 'not_marked'));

-- Step 2: Set default values for existing records
UPDATE attendance_records 
SET am_status = 'not_marked', pm_status = 'not_marked' 
WHERE am_status IS NULL OR pm_status IS NULL;

-- Step 3: Make the columns NOT NULL with default values
ALTER TABLE attendance_records 
ALTER COLUMN am_status SET DEFAULT 'not_marked',
ALTER COLUMN pm_status SET DEFAULT 'not_marked';

-- Step 4: Update existing records based on time tracking
-- For records that have time tracking, set status to 'present'
UPDATE attendance_records 
SET am_status = 'present'
WHERE am_time_in IS NOT NULL;

UPDATE attendance_records 
SET pm_status = 'present'
WHERE pm_time_in IS NOT NULL;

-- Step 5: Create indexes for better performance
CREATE INDEX idx_attendance_records_am_status ON attendance_records(am_status);
CREATE INDEX idx_attendance_records_pm_status ON attendance_records(pm_status);

-- Step 6: Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
AND column_name IN ('am_status', 'pm_status')
ORDER BY ordinal_position;

-- Step 7: Check some sample data
SELECT 
    user_id,
    attendance_date,
    am_time_in,
    am_time_out,
    pm_time_in,
    pm_time_out,
    am_status,
    pm_status,
    status
FROM attendance_records 
LIMIT 5;
