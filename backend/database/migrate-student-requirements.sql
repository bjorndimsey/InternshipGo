-- Migration: Create student_requirements table
-- This table stores individual student requirement submissions and status

-- First, add university column to students table if it doesn't exist
DO $$ 
BEGIN
    -- Add university column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'university') THEN
        ALTER TABLE students ADD COLUMN university VARCHAR(255) DEFAULT 'University of Technology';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS student_requirements (
    id SERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    requirement_id VARCHAR(50) NOT NULL,
    requirement_name VARCHAR(255) NOT NULL,
    requirement_description TEXT,
    is_required BOOLEAN DEFAULT true,
    due_date DATE,
    file_url TEXT,
    file_public_id VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    coordinator_id BIGINT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (coordinator_id) REFERENCES coordinators(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_requirements_student_id ON student_requirements (student_id);
CREATE INDEX IF NOT EXISTS idx_student_requirements_requirement_id ON student_requirements (requirement_id);
CREATE INDEX IF NOT EXISTS idx_student_requirements_coordinator_id ON student_requirements (coordinator_id);
CREATE INDEX IF NOT EXISTS idx_student_requirements_completed ON student_requirements (completed);
CREATE INDEX IF NOT EXISTS idx_student_requirements_due_date ON student_requirements (due_date);

-- Create a view for easy querying of student requirements with student info
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
    c.last_name as coordinator_last_name
FROM student_requirements sr
LEFT JOIN students s ON sr.student_id = s.id
LEFT JOIN coordinators c ON sr.coordinator_id = c.id;

-- Create a separate table for global requirements template
CREATE TABLE IF NOT EXISTS global_requirements (
    id SERIAL PRIMARY KEY,
    requirement_id VARCHAR(50) UNIQUE NOT NULL,
    requirement_name VARCHAR(255) NOT NULL,
    requirement_description TEXT,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some default global requirements template
INSERT INTO global_requirements (
    requirement_id, 
    requirement_name, 
    requirement_description, 
    is_required
) VALUES 
('1', 'Resume', 'Updated resume with current information', true),
('2', 'Official Transcript', 'Official academic transcript', true),
('3', 'Recommendation Letter', 'Letter of recommendation from academic advisor', true),
('4', 'Medical Clearance', 'Medical clearance certificate', true),
('5', 'Insurance Documentation', 'Health insurance documentation', true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_student_requirements_updated_at
    BEFORE UPDATE ON student_requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_student_requirements_updated_at();
