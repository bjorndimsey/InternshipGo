-- Supabase Migration: Add middle_name column to students and coordinators tables
-- Run this script in the Supabase SQL Editor

-- Add middle_name column to students table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'middle_name') THEN
        ALTER TABLE students ADD COLUMN middle_name VARCHAR(100) DEFAULT 'N/A';
        RAISE NOTICE 'Added middle_name column to students table';
    ELSE
        RAISE NOTICE 'middle_name column already exists in students table';
    END IF;
END $$;

-- Add middle_name column to coordinators table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'coordinators' AND column_name = 'middle_name') THEN
        ALTER TABLE coordinators ADD COLUMN middle_name VARCHAR(100) DEFAULT 'N/A';
        RAISE NOTICE 'Added middle_name column to coordinators table';
    ELSE
        RAISE NOTICE 'middle_name column already exists in coordinators table';
    END IF;
END $$;

-- Update existing records to have 'N/A' as middle_name if they are NULL
UPDATE students SET middle_name = 'N/A' WHERE middle_name IS NULL;
UPDATE coordinators SET middle_name = 'N/A' WHERE middle_name IS NULL;

-- Verify the changes
SELECT 'students' as table_name, COUNT(*) as total_records, 
       COUNT(CASE WHEN middle_name = 'N/A' THEN 1 END) as n_a_records
FROM students
UNION ALL
SELECT 'coordinators' as table_name, COUNT(*) as total_records,
       COUNT(CASE WHEN middle_name = 'N/A' THEN 1 END) as n_a_records
FROM coordinators;
