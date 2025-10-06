-- Attendance tracking migration
-- This table stores daily attendance records for interns

-- Drop table if it exists (for clean migration)
DROP TABLE IF EXISTS attendance_records CASCADE;

-- Also drop the function if it exists
DROP FUNCTION IF EXISTS update_attendance_records_updated_at();

CREATE TABLE attendance_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave', 'sick')),
    am_time_in TIME,
    am_time_out TIME,
    pm_time_in TIME,
    pm_time_out TIME,
    total_hours DECIMAL(4,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(user_id, attendance_date)
);

-- Create indexes for faster lookups
DROP INDEX IF EXISTS idx_attendance_records_user_id;
DROP INDEX IF EXISTS idx_attendance_records_company_id;
DROP INDEX IF EXISTS idx_attendance_records_date;
DROP INDEX IF EXISTS idx_attendance_records_status;

CREATE INDEX idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX idx_attendance_records_company_id ON attendance_records(company_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER trigger_update_attendance_records_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_records_updated_at();

-- Note: RLS policies are disabled due to auth.uid() returning UUID
-- while user_id columns are BIGINT. Security is handled at the application level.
-- ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
