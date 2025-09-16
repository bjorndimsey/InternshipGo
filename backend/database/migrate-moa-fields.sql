-- Add MOA related fields to companies table
DO $$ 
BEGIN
    -- Add moa_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'moa_url') THEN
        ALTER TABLE companies ADD COLUMN moa_url TEXT;
    END IF;
    
    -- Add moa_public_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'moa_public_id') THEN
        ALTER TABLE companies ADD COLUMN moa_public_id TEXT;
    END IF;
    
    -- Add moa_uploaded_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'moa_uploaded_by') THEN
        ALTER TABLE companies ADD COLUMN moa_uploaded_by BIGINT;
    END IF;
    
    -- Add moa_uploaded_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'moa_uploaded_at') THEN
        ALTER TABLE companies ADD COLUMN moa_uploaded_at TIMESTAMP;
    END IF;
    
    -- Add moa_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'moa_status') THEN
        ALTER TABLE companies ADD COLUMN moa_status VARCHAR(20) DEFAULT 'pending';
    END IF;
    
    -- Add moa_expiry_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'moa_expiry_date') THEN
        ALTER TABLE companies ADD COLUMN moa_expiry_date DATE;
    END IF;
    
    -- Add check constraint for moa_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_moa_status_check') THEN
        ALTER TABLE companies ADD CONSTRAINT companies_moa_status_check 
        CHECK (moa_status IN ('active', 'expired', 'pending'));
    END IF;
    
    -- Add foreign key constraint for moa_uploaded_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_moa_uploaded_by_fkey') THEN
        ALTER TABLE companies ADD CONSTRAINT companies_moa_uploaded_by_fkey 
        FOREIGN KEY (moa_uploaded_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;
