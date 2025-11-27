    -- Partnership Approval Migration
-- This migration adds two-way approval columns to coordinators and companies tables

-- Add approval columns to coordinators table
ALTER TABLE coordinators 
ADD COLUMN IF NOT EXISTS company_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS coordinator_approved BOOLEAN DEFAULT FALSE;

-- Add approval columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS company_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS coordinator_approved BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN coordinators.company_approved IS 'Indicates if the company has approved this coordinator for partnership';
COMMENT ON COLUMN coordinators.coordinator_approved IS 'Indicates if the coordinator has approved the company for partnership';
COMMENT ON COLUMN companies.company_approved IS 'Indicates if the company has approved the coordinator for partnership';
COMMENT ON COLUMN companies.coordinator_approved IS 'Indicates if the coordinator has approved this company for partnership';

