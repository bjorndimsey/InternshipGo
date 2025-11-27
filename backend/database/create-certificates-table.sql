-- Migration to create certificates table
-- This table stores generated certificates for completed internships

-- Create certificates table if it doesn't exist
CREATE TABLE IF NOT EXISTS certificates (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  application_id BIGINT NOT NULL,
  certificate_url TEXT NOT NULL,
  certificate_public_id TEXT NOT NULL,
  template_id VARCHAR(50) NOT NULL,
  total_hours INTEGER,
  start_date DATE,
  end_date DATE,
  contact_person_title VARCHAR(100),
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_certificates_company 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_certificates_student 
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_certificates_application 
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_certificates_generated_by 
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_certificates_company ON certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_application ON certificates(application_id);
CREATE INDEX IF NOT EXISTS idx_certificates_generated_at ON certificates(generated_at);
CREATE INDEX IF NOT EXISTS idx_certificates_template ON certificates(template_id);

-- Add comments for documentation
COMMENT ON TABLE certificates IS 'Stores generated certificates for completed internships';
COMMENT ON COLUMN certificates.certificate_url IS 'Cloudinary URL of the generated certificate image';
COMMENT ON COLUMN certificates.certificate_public_id IS 'Cloudinary public_id for certificate image management';
COMMENT ON COLUMN certificates.template_id IS 'ID of the certificate template used (e.g., red_border_classic)';
COMMENT ON COLUMN certificates.total_hours IS 'Total hours completed by the intern';
COMMENT ON COLUMN certificates.generated_by IS 'User ID of the company user who generated the certificate';
COMMENT ON COLUMN certificates.student_id IS 'User ID of the student (references users.id, same as applications.student_id)';

