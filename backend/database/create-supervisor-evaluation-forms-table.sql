-- Migration to create supervisor_evaluation_forms table
-- This table stores supervisor evaluation forms for interns
-- One evaluation form per student per company (spans pages 36-44 in OJT Journal)

CREATE TABLE IF NOT EXISTS supervisor_evaluation_forms (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL,
  company_id BIGINT NOT NULL,
  application_id BIGINT,
  
  -- Section I: COMPANY AND SUPERVISOR
  organization_company_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  supervisor_position VARCHAR(255) NOT NULL,
  supervisor_phone VARCHAR(50),
  supervisor_email VARCHAR(255),
  
  -- Section II: ON-THE-JOB TRAINING DATA
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_hours DECIMAL(10, 2) NOT NULL,
  description_of_duties TEXT NOT NULL,
  
  -- Section III: PERFORMANCE EVALUATION
  -- Question 1: How well did the Trainee perform the assigned tasks?
  question_1_performance VARCHAR(20) NOT NULL CHECK (question_1_performance IN ('Outstanding', 'Good', 'Average', 'Poor')),
  
  -- Questions 2-4: Qualitative questions
  question_2_skills_career BOOLEAN NOT NULL, -- YES/NO: Has skills for IT career
  question_2_elaboration TEXT, -- Elaboration if NO
  question_3_fulltime_candidate BOOLEAN NOT NULL, -- YES/NO: Would consider for full-time
  question_4_interest_other_trainees BOOLEAN NOT NULL, -- YES/NO: Interested in other trainees
  question_4_elaboration TEXT, -- Elaboration if NO
  
  -- Rating Scale: 5-Excellent, 4-Very Good, 3-Good, 2-Poor, 1-Very Poor
  -- Section A: WORK PERFORMANCE (6 items)
  work_performance_1 INTEGER CHECK (work_performance_1 BETWEEN 1 AND 5), -- Shows creativity and originality
  work_performance_2 INTEGER CHECK (work_performance_2 BETWEEN 1 AND 5), -- Apply theories and knowledge
  work_performance_3 INTEGER CHECK (work_performance_3 BETWEEN 1 AND 5), -- Demonstrates technology skills
  work_performance_4 INTEGER CHECK (work_performance_4 BETWEEN 1 AND 5), -- Clear understanding of tasks
  work_performance_5 INTEGER CHECK (work_performance_5 BETWEEN 1 AND 5), -- Exhibits innovativeness
  work_performance_6 INTEGER CHECK (work_performance_6 BETWEEN 1 AND 5), -- Accomplishes tasks with desired output
  
  -- Section B: PERSONAL QUALITIES
  -- Communication Skills (2 items)
  communication_1 INTEGER CHECK (communication_1 BETWEEN 1 AND 5), -- Communicates with supervisors regularly
  communication_2 INTEGER CHECK (communication_2 BETWEEN 1 AND 5), -- Promotes good communication
  
  -- Interpersonal Skills (implied, but no specific items in form)
  
  -- General Professional Conduct (3 items - appears on page 3)
  professional_conduct_1 INTEGER CHECK (professional_conduct_1 BETWEEN 1 AND 5), -- Demonstrates respect and courtesy
  professional_conduct_2 INTEGER CHECK (professional_conduct_2 BETWEEN 1 AND 5), -- Establishes good working relationship
  professional_conduct_3 INTEGER CHECK (professional_conduct_3 BETWEEN 1 AND 5), -- Listens well and asks questions
  
  -- Punctuality (3 items)
  punctuality_1 INTEGER CHECK (punctuality_1 BETWEEN 1 AND 5), -- Demonstrated punctuality
  punctuality_2 INTEGER CHECK (punctuality_2 BETWEEN 1 AND 5), -- Reports to specified schedule
  punctuality_3 INTEGER CHECK (punctuality_3 BETWEEN 1 AND 5), -- Practices diligence and professionalism
  
  -- Flexibility (2 items)
  flexibility_1 INTEGER CHECK (flexibility_1 BETWEEN 1 AND 5), -- Exhibits flexibility and adaptability
  flexibility_2 INTEGER CHECK (flexibility_2 BETWEEN 1 AND 5), -- Carries out orders easily
  
  -- Attitude (5 items)
  attitude_1 INTEGER CHECK (attitude_1 BETWEEN 1 AND 5), -- Displays optimism and perseverance
  attitude_2 INTEGER CHECK (attitude_2 BETWEEN 1 AND 5), -- Demonstrates willingness to accept direction
  attitude_3 INTEGER CHECK (attitude_3 BETWEEN 1 AND 5), -- Exhibits zeal to learn
  attitude_4 INTEGER CHECK (attitude_4 BETWEEN 1 AND 5), -- Promotes self-confidence and maturity
  attitude_5 INTEGER CHECK (attitude_5 BETWEEN 1 AND 5), -- Exercises self-discipline and dedication
  
  -- Reliability (4 items)
  reliability_1 INTEGER CHECK (reliability_1 BETWEEN 1 AND 5), -- Handles tasks without supervision
  reliability_2 INTEGER CHECK (reliability_2 BETWEEN 1 AND 5), -- Follows orders and finishes on time
  reliability_3 INTEGER CHECK (reliability_3 BETWEEN 1 AND 5), -- Acts accordingly with responsibility
  reliability_4 INTEGER CHECK (reliability_4 BETWEEN 1 AND 5), -- Has initiative and drive
  
  -- TOTAL score (calculated from all ratings)
  total_score DECIMAL(10, 2),
  
  -- Supervisor signature
  supervisor_name VARCHAR(255), -- Supervisor's printed name
  supervisor_signature_url TEXT, -- URL to supervisor's signature image (optional)
  evaluation_date DATE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_supervisor_evaluation_forms_student 
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_supervisor_evaluation_forms_company 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_supervisor_evaluation_forms_application 
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
  
  -- Unique constraint: one evaluation form per student per company
  CONSTRAINT uq_supervisor_evaluation_forms_student_company 
    UNIQUE (student_id, company_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_supervisor_evaluation_forms_student ON supervisor_evaluation_forms(student_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_evaluation_forms_company ON supervisor_evaluation_forms(company_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_evaluation_forms_student_company ON supervisor_evaluation_forms(student_id, company_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_evaluation_forms_application ON supervisor_evaluation_forms(application_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_evaluation_forms_created_at ON supervisor_evaluation_forms(created_at);

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_supervisor_evaluation_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on each row update
CREATE OR REPLACE TRIGGER update_supervisor_evaluation_forms_updated_at
BEFORE UPDATE ON supervisor_evaluation_forms
FOR EACH ROW
EXECUTE FUNCTION update_supervisor_evaluation_forms_updated_at();

-- Add comments for documentation
COMMENT ON TABLE supervisor_evaluation_forms IS 'Stores supervisor evaluation forms for interns (pages 36-44 in OJT Journal)';
COMMENT ON COLUMN supervisor_evaluation_forms.question_1_performance IS 'Overall performance rating: Outstanding, Good, Average, or Poor';
COMMENT ON COLUMN supervisor_evaluation_forms.total_score IS 'Calculated total score from all rating items (sum of all 1-5 ratings)';

