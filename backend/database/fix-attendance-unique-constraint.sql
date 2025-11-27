-- Fix attendance_records unique constraint to include company_id
-- This allows the same student to have attendance records for the same date in different companies

-- Drop the old unique constraint
ALTER TABLE attendance_records 
DROP CONSTRAINT IF EXISTS attendance_records_user_id_attendance_date_key;

-- Add new unique constraint that includes company_id
ALTER TABLE attendance_records 
ADD CONSTRAINT attendance_records_user_company_date_unique 
UNIQUE(user_id, company_id, attendance_date);

-- Verify the constraint was created
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'attendance_records'::regclass
AND contype = 'u'
ORDER BY conname;

