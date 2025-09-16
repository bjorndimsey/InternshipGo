-- Add partnership status fields to companies table
DO $$ 
BEGIN
    -- Add partnership_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'partnership_status') THEN
        ALTER TABLE companies ADD COLUMN partnership_status VARCHAR(20) DEFAULT 'pending' CHECK (partnership_status IN ('pending', 'approved', 'rejected'));
    END IF;
    
    -- Add partnership_approved_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'partnership_approved_by') THEN
        ALTER TABLE companies ADD COLUMN partnership_approved_by BIGINT;
    END IF;
    
    -- Add partnership_approved_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'partnership_approved_at') THEN
        ALTER TABLE companies ADD COLUMN partnership_approved_at TIMESTAMP;
    END IF;
    
    -- Add foreign key constraint for partnership_approved_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_partnership_approved_by_fkey') THEN
        ALTER TABLE companies ADD CONSTRAINT companies_partnership_approved_by_fkey 
        FOREIGN KEY (partnership_approved_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;
