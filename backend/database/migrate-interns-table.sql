-- Create interns table to track which students are managed by which coordinators
CREATE TABLE IF NOT EXISTS interns (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    school_year VARCHAR(10) NOT NULL,
    coordinator_id BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (coordinator_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(student_id, school_year) -- Prevent duplicate entries for same student and school year
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interns_student_id ON interns(student_id);
CREATE INDEX IF NOT EXISTS idx_interns_coordinator_id ON interns(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_interns_school_year ON interns(school_year);
CREATE INDEX IF NOT EXISTS idx_interns_status ON interns(status);

-- Add comment to table
COMMENT ON TABLE interns IS 'Tracks which students are managed as interns by which coordinators for specific school years';
