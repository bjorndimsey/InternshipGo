-- Applications table migration
-- This table stores student applications for internships

CREATE TABLE IF NOT EXISTS applications (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    position VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    cover_letter TEXT,
    resume_url TEXT,
    resume_public_id VARCHAR(255),
    transcript_url TEXT,
    transcript_public_id VARCHAR(255),
    expected_start_date DATE,
    expected_end_date DATE,
    availability TEXT,
    motivation TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under-review', 'approved', 'rejected')),
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by BIGINT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON applications(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at);

-- Add unique constraint to prevent duplicate applications
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_student_company_unique 
ON applications(student_id, company_id) 
WHERE status IN ('pending', 'under-review', 'approved');
