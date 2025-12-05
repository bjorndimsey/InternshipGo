-- Supabase migration for push_tokens table (FIXED VERSION)
-- Run this in your Supabase SQL Editor

-- Create push_tokens table for storing Expo push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, push_token)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(push_token);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Since backend uses service role key (bypasses RLS) or custom JWT auth,
-- we need to either:
-- Option 1: Disable RLS (if using service role key - recommended for backend-only access)
ALTER TABLE push_tokens DISABLE ROW LEVEL SECURITY;

-- OR Option 2: Create a policy that allows service role access
-- (Only use this if you need RLS enabled for other reasons)
-- CREATE POLICY "Service role can manage all push tokens"
--   ON push_tokens
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- Note: If you're using Supabase Auth (auth.uid()), you would use:
-- CREATE POLICY "Users can manage their own push tokens"
--   ON push_tokens
--   FOR ALL
--   USING (auth.uid()::text = user_id::text)
--   WITH CHECK (auth.uid()::text = user_id::text);
-- 
-- However, since your backend uses BIGINT user_id and custom JWT auth,
-- the RLS policy with auth.uid() won't work. Disable RLS instead.

