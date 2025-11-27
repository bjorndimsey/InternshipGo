-- Migration for account_appeals table
-- Run this in your Supabase SQL Editor to store account appeals in the database

CREATE TABLE IF NOT EXISTS account_appeals (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INTEGER NULL,
  reviewed_at TIMESTAMP NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_account_appeals_email ON account_appeals(email);
CREATE INDEX IF NOT EXISTS idx_account_appeals_status ON account_appeals(status);
CREATE INDEX IF NOT EXISTS idx_account_appeals_created_at ON account_appeals(created_at);

-- Add comment to table
COMMENT ON TABLE account_appeals IS 'Stores account appeals from disabled users requesting account restoration';

