-- Schema: Student Personal Information Table
-- This table stores personal information needed for OJT Journal
-- Separate from the main students table for better data organization

CREATE TABLE IF NOT EXISTS student_personal_info (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL UNIQUE,
    -- Basic Information
    sex VARCHAR(20),
    civil_status VARCHAR(50),
    religion VARCHAR(100),
    citizenship VARCHAR(100),
    -- Address Information
    permanent_address TEXT,
    present_address TEXT,
    -- Academic Information
    academic_year VARCHAR(20),
    -- Family Information
    father_name VARCHAR(200),
    father_occupation VARCHAR(200),
    mother_name VARCHAR(200),
    mother_occupation VARCHAR(200),
    -- Emergency Contact Information
    emergency_contact_name VARCHAR(200),
    emergency_contact_relationship VARCHAR(100),
    emergency_contact_number VARCHAR(20),
    emergency_contact_address TEXT,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Foreign Key
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_student_personal_info_student_id ON student_personal_info(student_id);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_personal_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_student_personal_info_updated_at ON student_personal_info;
CREATE TRIGGER trigger_update_student_personal_info_updated_at
    BEFORE UPDATE ON student_personal_info
    FOR EACH ROW
    EXECUTE FUNCTION update_student_personal_info_updated_at();

