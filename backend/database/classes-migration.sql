-- Migration script for Classes and Student Enrollments
-- Run this script to add the classes and class_enrollments tables to your database

-- Step 1: Create classes table
CREATE TABLE IF NOT EXISTS classes (
    id BIGSERIAL PRIMARY KEY,
    class_name VARCHAR(255) NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    class_code VARCHAR(6) UNIQUE NOT NULL,
    coordinator_id BIGINT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coordinator_id) REFERENCES coordinators(id) ON DELETE CASCADE
);

-- Step 2: Create class_enrollments table
CREATE TABLE IF NOT EXISTS class_enrollments (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'dropped', 'completed')),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(class_id, student_id)
);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classes_coordinator_id ON classes(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_year ON classes(school_year);
CREATE INDEX IF NOT EXISTS idx_classes_class_code ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status ON class_enrollments(status);

-- Step 4: Verify the tables were created
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('classes', 'class_enrollments')
ORDER BY table_name, ordinal_position;

