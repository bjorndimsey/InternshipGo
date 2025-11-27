-- Schema: HTE (Host Training Establishment) Information Table
-- This table stores HTE information needed for OJT Journal
-- Linked to applications table (one HTE info per application/company)

CREATE TABLE IF NOT EXISTS hte_information (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL UNIQUE,
    company_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    -- Company Information (pre-filled from companies table)
    company_name VARCHAR(255),
    company_address TEXT,
    -- HTE Photo
    hte_photo_url TEXT,
    -- HTE Details
    nature_of_hte VARCHAR(255),
    head_of_hte VARCHAR(255),
    head_position VARCHAR(255),
    immediate_supervisor VARCHAR(255),
    supervisor_position VARCHAR(255),
    -- Contact Information
    telephone_no VARCHAR(50),
    mobile_no VARCHAR(50),
    email_address VARCHAR(255),
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Foreign Keys
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_hte_information_application_id ON hte_information(application_id);
CREATE INDEX IF NOT EXISTS idx_hte_information_company_id ON hte_information(company_id);
CREATE INDEX IF NOT EXISTS idx_hte_information_student_id ON hte_information(student_id);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hte_information_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_hte_information_updated_at ON hte_information;
CREATE TRIGGER trigger_update_hte_information_updated_at
    BEFORE UPDATE ON hte_information
    FOR EACH ROW
    EXECUTE FUNCTION update_hte_information_updated_at();

