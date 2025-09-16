-- Migration to fix Google OAuth ID compatibility
-- This script updates the database schema to support large Google OAuth IDs

-- First, let's check if we need to migrate existing data
-- We'll create a backup table first
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

-- Update the users table to use BIGINT for id
-- Note: This is a complex operation that requires careful handling

-- Step 1: Drop foreign key constraints temporarily
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_user_id_fkey;
ALTER TABLE coordinators DROP CONSTRAINT IF EXISTS coordinators_user_id_fkey;
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_user_id_fkey;

-- Step 2: Update user_id columns to BIGINT
ALTER TABLE students ALTER COLUMN user_id TYPE BIGINT;
ALTER TABLE coordinators ALTER COLUMN user_id TYPE BIGINT;
ALTER TABLE companies ALTER COLUMN user_id TYPE BIGINT;

-- Step 3: Update the users table id column to BIGINT
-- This is tricky with SERIAL, so we'll recreate the sequence
ALTER TABLE users ALTER COLUMN id TYPE BIGINT;

-- Step 4: Recreate the sequence for BIGINT
DROP SEQUENCE IF EXISTS users_id_seq;
CREATE SEQUENCE users_id_seq AS BIGINT;
ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
ALTER SEQUENCE users_id_seq OWNED BY users.id;

-- Step 5: Set the sequence to the current max value
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));

-- Step 6: Recreate foreign key constraints
ALTER TABLE students ADD CONSTRAINT students_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE coordinators ADD CONSTRAINT coordinators_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE companies ADD CONSTRAINT companies_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 7: Update google_id column to handle large numeric values
-- Change from VARCHAR(255) to VARCHAR(50) to be more specific about Google ID length
ALTER TABLE users ALTER COLUMN google_id TYPE VARCHAR(50);

-- Step 8: Recreate indexes
DROP INDEX IF EXISTS idx_students_user_id;
DROP INDEX IF EXISTS idx_coordinators_user_id;
DROP INDEX IF EXISTS idx_companies_user_id;

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_coordinators_user_id ON coordinators(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

-- Clean up backup table (uncomment when you're sure everything works)
-- DROP TABLE users_backup;

COMMIT;
