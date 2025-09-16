-- Migration to add location fields to users table
-- This migration adds latitude and longitude columns to the users table

-- Add latitude and longitude columns if they don't exist
DO $$ 
BEGIN
    -- Add latitude column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'latitude') THEN
        ALTER TABLE users ADD COLUMN latitude DECIMAL(10, 8);
    END IF;
    
    -- Add longitude column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'longitude') THEN
        ALTER TABLE users ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
END $$;

-- Add check constraints for valid coordinate ranges
DO $$ 
BEGIN
    -- Add latitude constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_latitude_range') THEN
        ALTER TABLE users ADD CONSTRAINT check_latitude_range CHECK (
            latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
        );
    END IF;
    
    -- Add longitude constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_longitude_range') THEN
        ALTER TABLE users ADD CONSTRAINT check_longitude_range CHECK (
            longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
        );
    END IF;
END $$;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_users_location ON users (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
