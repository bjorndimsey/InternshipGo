-- Fix certificates table foreign key constraint
-- Change student_id foreign key from students(id) to users(id)
-- because applications.student_id references users(id), not students(id)

-- Drop the existing foreign key constraint
ALTER TABLE certificates 
DROP CONSTRAINT IF EXISTS fk_certificates_student;

-- Add new foreign key constraint referencing users table
ALTER TABLE certificates 
ADD CONSTRAINT fk_certificates_student 
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update comment
COMMENT ON COLUMN certificates.student_id IS 'User ID of the student (references users.id, same as applications.student_id)';

