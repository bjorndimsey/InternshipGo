-- Create working_hours table
CREATE TABLE IF NOT EXISTS working_hours (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    start_time VARCHAR(5) NOT NULL, -- Format: HH:MM
    start_period VARCHAR(2) NOT NULL CHECK (start_period IN ('AM', 'PM')),
    end_time VARCHAR(5) NOT NULL, -- Format: HH:MM
    end_period VARCHAR(2) NOT NULL CHECK (end_period IN ('AM', 'PM')),
    break_start VARCHAR(5), -- Format: HH:MM (optional)
    break_start_period VARCHAR(2) CHECK (break_start_period IN ('AM', 'PM')),
    break_end VARCHAR(5), -- Format: HH:MM (optional)
    break_end_period VARCHAR(2) CHECK (break_end_period IN ('AM', 'PM')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one working hours record per company
    UNIQUE(company_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_working_hours_company_id ON working_hours(company_id);

-- Note: RLS policies are disabled due to auth.uid() returning UUID
-- while user_id columns are BIGINT. Security is handled at the application level.
-- ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_working_hours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_working_hours_updated_at
    BEFORE UPDATE ON working_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_working_hours_updated_at();

-- Add comments for documentation
COMMENT ON TABLE working_hours IS 'Stores working hours configuration for each company';
COMMENT ON COLUMN working_hours.company_id IS 'Reference to the company';
COMMENT ON COLUMN working_hours.start_time IS 'Work start time in HH:MM format';
COMMENT ON COLUMN working_hours.start_period IS 'AM or PM for start time';
COMMENT ON COLUMN working_hours.end_time IS 'Work end time in HH:MM format';
COMMENT ON COLUMN working_hours.end_period IS 'AM or PM for end time';
COMMENT ON COLUMN working_hours.break_start IS 'Break start time in HH:MM format (optional)';
COMMENT ON COLUMN working_hours.break_start_period IS 'AM or PM for break start time';
COMMENT ON COLUMN working_hours.break_end IS 'Break end time in HH:MM format (optional)';
COMMENT ON COLUMN working_hours.break_end_period IS 'AM or PM for break end time';
