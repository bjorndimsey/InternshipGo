-- Supabase migration to add location fields to users table
-- Run this in your Supabase SQL editor

-- Add latitude and longitude columns if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add check constraints for valid coordinate ranges (drop first if they exist)
DO $$ 
BEGIN
    -- Drop constraints if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_latitude_range') THEN
        ALTER TABLE users DROP CONSTRAINT check_latitude_range;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_longitude_range') THEN
        ALTER TABLE users DROP CONSTRAINT check_longitude_range;
    END IF;
    
    -- Add constraints
    ALTER TABLE users 
    ADD CONSTRAINT check_latitude_range CHECK (
        latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
    );
    
    ALTER TABLE users 
    ADD CONSTRAINT check_longitude_range CHECK (
        longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
    );
END $$;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_users_location ON users (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
