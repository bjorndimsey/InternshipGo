-- Supabase Migration: Classes and Student Enrollments
-- This version is compatible with Supabase SQL editor

-- Step 1: Create classes table
CREATE TABLE IF NOT EXISTS classes (
    id BIGSERIAL PRIMARY KEY,
    class_name VARCHAR(255) NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    class_code VARCHAR(6) UNIQUE NOT NULL,
    coordinator_id BIGINT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Add foreign key constraint for coordinator_id
ALTER TABLE classes 
ADD CONSTRAINT fk_classes_coordinator_id 
FOREIGN KEY (coordinator_id) REFERENCES coordinators(id) ON DELETE CASCADE;

-- Step 3: Add check constraint for status
ALTER TABLE classes 
ADD CONSTRAINT check_classes_status 
CHECK (status IN ('active', 'inactive', 'archived'));

-- Step 4: Create class_enrollments table
CREATE TABLE IF NOT EXISTS class_enrollments (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'enrolled'
);

-- Step 5: Add foreign key constraints for class_enrollments
ALTER TABLE class_enrollments 
ADD CONSTRAINT fk_class_enrollments_class_id 
FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

ALTER TABLE class_enrollments 
ADD CONSTRAINT fk_class_enrollments_student_id 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- Step 6: Add unique constraint to prevent duplicate enrollments
ALTER TABLE class_enrollments 
ADD CONSTRAINT unique_class_student 
UNIQUE(class_id, student_id);

-- Step 7: Add check constraint for enrollment status
ALTER TABLE class_enrollments 
ADD CONSTRAINT check_enrollment_status 
CHECK (status IN ('enrolled', 'dropped', 'completed'));

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classes_coordinator_id ON classes(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_year ON classes(school_year);
CREATE INDEX IF NOT EXISTS idx_classes_class_code ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status ON class_enrollments(status);

-- Step 9: Verify the tables were created
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('classes', 'class_enrollments')
ORDER BY table_name, ordinal_position;

