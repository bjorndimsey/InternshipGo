-- Migration to create training_schedules table
-- This table stores training schedule entries for students' OJT journals

-- Create training_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS training_schedules (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL,
  task_classification TEXT NOT NULL,
  tools_device_software_used TEXT NOT NULL,
  total_hours DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key constrainta
  CONSTRAINT fk_training_schedules_student 
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_training_schedules_student ON training_schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_training_schedules_created_at ON training_schedules(created_at);

-- Add comments for documentation
COMMENT ON TABLE training_schedules IS 'Stores training schedule entries for students OJT journals (Section B)';
COMMENT ON COLUMN training_schedules.task_classification IS 'Task or job classification (e.g., Designing layouts)';
COMMENT ON COLUMN training_schedules.tools_device_software_used IS 'Tools, devices, or software used for the task';
COMMENT ON COLUMN training_schedules.total_hours IS 'Total hours spent on this task/job';

