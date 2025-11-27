-- Migration to add verification fields to attendance_records table
-- This allows companies to verify student attendance submissions

-- Add verification_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance_records' AND column_name = 'verification_status') THEN
        ALTER TABLE attendance_records 
        ADD COLUMN verification_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (verification_status IN ('pending', 'accepted', 'denied'));
        COMMENT ON COLUMN attendance_records.verification_status IS 'Status of attendance verification: pending, accepted, or denied';
    END IF;
END $$;

-- Add verified_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance_records' AND column_name = 'verified_by') THEN
        ALTER TABLE attendance_records 
        ADD COLUMN verified_by BIGINT DEFAULT NULL;
        COMMENT ON COLUMN attendance_records.verified_by IS 'User ID of the company representative who verified the attendance';
        -- Add foreign key constraint
        ALTER TABLE attendance_records 
        ADD CONSTRAINT fk_attendance_verified_by 
        FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add verified_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance_records' AND column_name = 'verified_at') THEN
        ALTER TABLE attendance_records 
        ADD COLUMN verified_at TIMESTAMP DEFAULT NULL;
        COMMENT ON COLUMN attendance_records.verified_at IS 'Timestamp when the attendance was verified';
    END IF;
END $$;

-- Add verification_remarks column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance_records' AND column_name = 'verification_remarks') THEN
        ALTER TABLE attendance_records 
        ADD COLUMN verification_remarks TEXT DEFAULT NULL;
        COMMENT ON COLUMN attendance_records.verification_remarks IS 'Remarks from the company regarding the attendance verification';
    END IF;
END $$;

-- Create index for better performance on verification_status queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_verification_status 
ON attendance_records(verification_status);

-- Create index for verified_by queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_verified_by 
ON attendance_records(verified_by);

-- Update existing records to have 'pending' status if they don't have one
UPDATE attendance_records 
SET verification_status = 'pending' 
WHERE verification_status IS NULL;

