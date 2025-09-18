-- Migration: Create student_submitted_requirements table
-- This table stores requirements that students have uploaded/submitted
-- Separate from coordinator-assigned requirements for better tracking

-- Create student_submitted_requirements table
CREATE TABLE IF NOT EXISTS student_submitted_requirements (
    id SERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    requirement_id VARCHAR(50) NOT NULL, -- References the original requirement
    requirement_name VARCHAR(255) NOT NULL,
    requirement_description TEXT,
    is_required BOOLEAN DEFAULT true,
    due_date DATE,
    
    -- Student submission details
    submitted_file_url TEXT NOT NULL,
    submitted_file_public_id VARCHAR(255),
    submitted_file_name VARCHAR(255),
    submitted_file_size BIGINT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Status and feedback
    status VARCHAR(50) DEFAULT 'submitted', -- submitted, approved, rejected, needs_revision
    coordinator_feedback TEXT,
    coordinator_reviewed_at TIMESTAMP,
    coordinator_id BIGINT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (coordinator_id) REFERENCES coordinators(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_submitted_requirements_student_id 
    ON student_submitted_requirements(student_id);

CREATE INDEX IF NOT EXISTS idx_student_submitted_requirements_requirement_id 
    ON student_submitted_requirements(requirement_id);

CREATE INDEX IF NOT EXISTS idx_student_submitted_requirements_status 
    ON student_submitted_requirements(status);

CREATE INDEX IF NOT EXISTS idx_student_submitted_requirements_submitted_at 
    ON student_submitted_requirements(submitted_at);

CREATE INDEX IF NOT EXISTS idx_student_submitted_requirements_coordinator_id 
    ON student_submitted_requirements(coordinator_id);

-- Create a view for easy querying with student and coordinator details
CREATE OR REPLACE VIEW student_submitted_requirements_view AS
SELECT 
    ssr.id,
    ssr.student_id,
    s.first_name as student_first_name,
    s.last_name as student_last_name,
    s.id_number as student_id_number,
    s.program as student_program,
    s.major as student_major,
    s.university as student_university,
    
    ssr.requirement_id,
    ssr.requirement_name,
    ssr.requirement_description,
    ssr.is_required,
    ssr.due_date,
    
    ssr.submitted_file_url,
    ssr.submitted_file_public_id,
    ssr.submitted_file_name,
    ssr.submitted_file_size,
    ssr.submitted_at,
    
    ssr.status,
    ssr.coordinator_feedback,
    ssr.coordinator_reviewed_at,
    ssr.coordinator_id,
    c.first_name as coordinator_first_name,
    c.last_name as coordinator_last_name,
    u.email as coordinator_email,
    
    ssr.created_at,
    ssr.updated_at
FROM student_submitted_requirements ssr
LEFT JOIN students s ON ssr.student_id = s.id
LEFT JOIN coordinators c ON ssr.coordinator_id = c.id
LEFT JOIN users u ON c.user_id = u.id;

-- Create a function to submit a requirement
CREATE OR REPLACE FUNCTION submit_student_requirement(
    p_student_id BIGINT,
    p_requirement_id VARCHAR(50),
    p_requirement_name VARCHAR(255),
    p_requirement_description TEXT,
    p_is_required BOOLEAN,
    p_due_date DATE,
    p_submitted_file_url TEXT,
    p_submitted_file_public_id VARCHAR(255),
    p_submitted_file_name VARCHAR(255),
    p_submitted_file_size BIGINT,
    p_coordinator_id BIGINT
) RETURNS JSON AS $$
DECLARE
    result JSON;
    submission_id INTEGER;
BEGIN
    -- Insert the submission
    INSERT INTO student_submitted_requirements (
        student_id,
        requirement_id,
        requirement_name,
        requirement_description,
        is_required,
        due_date,
        submitted_file_url,
        submitted_file_public_id,
        submitted_file_name,
        submitted_file_size,
        coordinator_id
    ) VALUES (
        p_student_id,
        p_requirement_id,
        p_requirement_name,
        p_requirement_description,
        p_is_required,
        p_due_date,
        p_submitted_file_url,
        p_submitted_file_public_id,
        p_submitted_file_name,
        p_submitted_file_size,
        p_coordinator_id
    ) RETURNING id INTO submission_id;
    
    -- Return success response
    result := json_build_object(
        'success', true,
        'message', 'Requirement submitted successfully',
        'submission_id', submission_id
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get student submissions for a coordinator
CREATE OR REPLACE FUNCTION get_coordinator_student_submissions(
    p_coordinator_id BIGINT,
    p_status VARCHAR(50) DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    result JSON;
    submissions JSON;
BEGIN
    -- Get submissions for this coordinator
    SELECT json_agg(
        json_build_object(
            'id', ssr.id,
            'student_id', ssr.student_id,
            'student_name', s.first_name || ' ' || s.last_name,
            'student_id_number', s.id_number,
            'student_program', s.program,
            'requirement_id', ssr.requirement_id,
            'requirement_name', ssr.requirement_name,
            'due_date', ssr.due_date,
            'submitted_file_url', ssr.submitted_file_url,
            'submitted_file_name', ssr.submitted_file_name,
            'submitted_at', ssr.submitted_at,
            'status', ssr.status,
            'coordinator_feedback', ssr.coordinator_feedback
        )
    ) INTO submissions
    FROM student_submitted_requirements ssr
    LEFT JOIN students s ON ssr.student_id = s.id
    WHERE ssr.coordinator_id = p_coordinator_id
    AND (p_status IS NULL OR ssr.status = p_status)
    ORDER BY ssr.submitted_at DESC;
    
    -- Build result
    result := json_build_object(
        'success', true,
        'submissions', COALESCE(submissions, '[]'::json),
        'count', COALESCE(json_array_length(submissions), 0)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update submission status
CREATE OR REPLACE FUNCTION update_submission_status(
    p_submission_id INTEGER,
    p_status VARCHAR(50),
    p_feedback TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Update the submission
    UPDATE student_submitted_requirements 
    SET 
        status = p_status,
        coordinator_feedback = p_feedback,
        coordinator_reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_submission_id;
    
    -- Check if any rows were affected
    IF FOUND THEN
        result := json_build_object(
            'success', true,
            'message', 'Submission status updated successfully'
        );
    ELSE
        result := json_build_object(
            'success', false,
            'message', 'Submission not found'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add some sample data for testing
INSERT INTO student_submitted_requirements (
    student_id,
    requirement_id,
    requirement_name,
    requirement_description,
    is_required,
    due_date,
    submitted_file_url,
    submitted_file_public_id,
    submitted_file_name,
    submitted_file_size,
    coordinator_id,
    status
) VALUES 
(
    3, -- student_id
    'req_1758021162228_oakzp3ade', -- requirement_id
    'Resume Submission',
    'Please submit your updated resume',
    true,
    '2025-09-20',
    'https://res.cloudinary.com/dtws4lvdi/raw/upload/v1758076976/Requirements/requirement_req_1758021162228_oakzp3ade_1758076973561',
    'Requirements/requirement_req_1758021162228_oakzp3ade_1758076973561',
    'resume_john_doe.pdf',
    2048576,
    4, -- coordinator_id
    'submitted'
),
(
    3, -- student_id
    'req_1758021174758_mb24je796', -- requirement_id
    'Transcript Submission',
    'Please submit your official transcript',
    true,
    '2025-09-25',
    'https://res.cloudinary.com/dtws4lvdi/raw/upload/v1758076976/Requirements/requirement_req_1758021174758_mb24je796_1758076973561',
    'Requirements/requirement_req_1758021174758_mb24je796_1758076973561',
    'transcript_john_doe.pdf',
    1536000,
    4, -- coordinator_id
    'approved'
);

-- Create a summary view for dashboard statistics
CREATE OR REPLACE VIEW submission_summary_view AS
SELECT 
    coordinator_id,
    COUNT(*) as total_submissions,
    COUNT(CASE WHEN status = 'submitted' THEN 1 END) as pending_review,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
    COUNT(CASE WHEN status = 'needs_revision' THEN 1 END) as needs_revision,
    COUNT(CASE WHEN submitted_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as submissions_this_week,
    COUNT(CASE WHEN submitted_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as submissions_this_month
FROM student_submitted_requirements
GROUP BY coordinator_id;

COMMENT ON TABLE student_submitted_requirements IS 'Stores requirements submitted by students for coordinator review';
COMMENT ON VIEW student_submitted_requirements_view IS 'Complete view of student submissions with student and coordinator details';
COMMENT ON VIEW submission_summary_view IS 'Summary statistics for coordinator dashboard';
