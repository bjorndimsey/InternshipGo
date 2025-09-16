-- Migration script to add Google OAuth support to existing database

-- Add Google OAuth columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Make password_hash nullable for Google OAuth users
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Add unique constraint for google_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_unique') THEN
        ALTER TABLE users ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);
    END IF;
END $$;

-- Add constraint to ensure either password_hash or google_id is present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_auth_method') THEN
        ALTER TABLE users ADD CONSTRAINT check_auth_method CHECK (
            (password_hash IS NOT NULL AND google_id IS NULL) OR 
            (password_hash IS NULL AND google_id IS NOT NULL)
        );
    END IF;
END $$;

-- Create index for Google ID
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Update existing users to have a default password if they don't have one
-- This is a safety measure for existing data
UPDATE users 
SET password_hash = 'legacy_user_' || id::text 
WHERE password_hash IS NULL AND google_id IS NULL;
