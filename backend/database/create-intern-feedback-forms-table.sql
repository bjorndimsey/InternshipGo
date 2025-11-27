-- Migration to create intern_feedback_forms table
-- This table stores intern feedback forms submitted by students

-- Create intern_feedback_forms table if it doesn't exist
CREATE TABLE IF NOT EXISTS intern_feedback_forms (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL,
  company_id BIGINT NOT NULL,
  question_1 VARCHAR(2) NOT NULL CHECK (question_1 IN ('SA', 'A', 'N', 'D', 'SD')),
  question_2 VARCHAR(2) NOT NULL CHECK (question_2 IN ('SA', 'A', 'N', 'D', 'SD')),
  question_3 VARCHAR(2) NOT NULL CHECK (question_3 IN ('SA', 'A', 'N', 'D', 'SD')),
  question_4 VARCHAR(2) NOT NULL CHECK (question_4 IN ('SA', 'A', 'N', 'D', 'SD')),
  question_5 VARCHAR(2) NOT NULL CHECK (question_5 IN ('SA', 'A', 'N', 'D', 'SD')),
  question_6 VARCHAR(2) NOT NULL CHECK (question_6 IN ('SA', 'A', 'N', 'D', 'SD')),
  question_7 VARCHAR(2) NOT NULL CHECK (question_7 IN ('SA', 'A', 'N', 'D', 'SD')),
  problems_met TEXT NOT NULL,
  other_concerns TEXT NOT NULL,
  form_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_intern_feedback_forms_student 
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_intern_feedback_forms_company 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Unique constraint: one feedback form per student per company
  CONSTRAINT uq_intern_feedback_forms_student_company 
    UNIQUE (student_id, company_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_intern_feedback_forms_student ON intern_feedback_forms(student_id);
CREATE INDEX IF NOT EXISTS idx_intern_feedback_forms_company ON intern_feedback_forms(company_id);
CREATE INDEX IF NOT EXISTS idx_intern_feedback_forms_student_company ON intern_feedback_forms(student_id, company_id);
CREATE INDEX IF NOT EXISTS idx_intern_feedback_forms_created_at ON intern_feedback_forms(created_at);

-- Add comments for documentation
COMMENT ON TABLE intern_feedback_forms IS 'Stores intern feedback forms submitted by students for completed internships';
COMMENT ON COLUMN intern_feedback_forms.question_1 IS 'Response to: My training is aligned with my field of specialization. (SA/A/N/D/SD)';
COMMENT ON COLUMN intern_feedback_forms.question_2 IS 'Response to: My training is challenging. (SA/A/N/D/SD)';
COMMENT ON COLUMN intern_feedback_forms.question_3 IS 'Response to: I have opportunities for learning. (SA/A/N/D/SD)';
COMMENT ON COLUMN intern_feedback_forms.question_4 IS 'Response to: I am aware with the policies of the HTE. (SA/A/N/D/SD)';
COMMENT ON COLUMN intern_feedback_forms.question_5 IS 'Response to: I have positive working relationship with my site supervisor and other employees of the HTE. (SA/A/N/D/SD)';
COMMENT ON COLUMN intern_feedback_forms.question_6 IS 'Response to: I am aware of the risks and hazards of my working environment. (SA/A/N/D/SD)';
COMMENT ON COLUMN intern_feedback_forms.question_7 IS 'Response to: My department is committed to ensuring the health and safety of the Interns. (SA/A/N/D/SD)';
COMMENT ON COLUMN intern_feedback_forms.problems_met IS 'Text describing problems encountered during internship';
COMMENT ON COLUMN intern_feedback_forms.other_concerns IS 'Text describing other concerns or feedback';
COMMENT ON COLUMN intern_feedback_forms.form_date IS 'Date when the feedback form was created or last updated';

