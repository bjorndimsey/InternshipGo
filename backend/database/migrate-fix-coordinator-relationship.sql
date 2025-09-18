-- Fix coordinator relationship in student_requirements table
-- This migration updates the foreign key constraint and populates coordinator_id properly

-- First, drop the existing foreign key constraint
ALTER TABLE student_requirements DROP CONSTRAINT IF EXISTS student_requirements_coordinator_id_fkey;

-- Update the foreign key constraint to reference coordinators table
ALTER TABLE student_requirements 
ADD CONSTRAINT student_requirements_coordinator_id_fkey 
FOREIGN KEY (coordinator_id) REFERENCES coordinators(id) ON DELETE SET NULL;

-- Update existing student_requirements records to have proper coordinator_id
-- This will set coordinator_id based on the interns table relationship
-- We need to get the coordinators.id from the users.id stored in interns.coordinator_id
UPDATE student_requirements 
SET coordinator_id = c.id
FROM interns i
JOIN coordinators c ON i.coordinator_id = c.user_id
WHERE student_requirements.student_id = i.student_id
AND student_requirements.coordinator_id IS NULL;

-- Update the student_requirements_view to include coordinator information
CREATE OR REPLACE VIEW student_requirements_view AS
SELECT 
    sr.*,
    s.first_name,
    s.last_name,
    s.id_number,
    s.major,
    s.program,
    s.university,
    c.first_name as coordinator_first_name,
    c.last_name as coordinator_last_name,
    u.email as coordinator_email
FROM student_requirements sr
LEFT JOIN students s ON sr.student_id = s.id
LEFT JOIN coordinators c ON sr.coordinator_id = c.id
LEFT JOIN users u ON c.user_id = u.id;

-- Add comment to explain the relationship
COMMENT ON COLUMN student_requirements.coordinator_id IS 'References coordinators.id - the coordinator who created this requirement for the student';
