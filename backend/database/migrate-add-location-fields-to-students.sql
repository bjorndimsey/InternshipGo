-- Add location fields to students table
DO $$ 
BEGIN
    -- Add latitude column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'latitude') THEN
        ALTER TABLE students ADD COLUMN latitude DECIMAL(10, 8);
    END IF;
    
    -- Add longitude column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'longitude') THEN
        ALTER TABLE students ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
    
    -- Add profile_picture column if it doesn't exist (referenced in InternsPage)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'profile_picture') THEN
        ALTER TABLE students ADD COLUMN profile_picture TEXT;
    END IF;
    
    -- Add email column if it doesn't exist (for easier access)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'email') THEN
        ALTER TABLE students ADD COLUMN email VARCHAR(255);
    END IF;
END $$;
