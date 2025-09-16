-- Add public_id column to location_pictures table for Cloudinary integration
ALTER TABLE location_pictures ADD COLUMN IF NOT EXISTS public_id TEXT;

-- Add index for faster queries on public_id
CREATE INDEX IF NOT EXISTS idx_location_pictures_public_id ON location_pictures(public_id);

-- Update existing records to have NULL public_id (they won't be deletable from Cloudinary)
-- This is safe since existing records don't have Cloudinary public_ids
