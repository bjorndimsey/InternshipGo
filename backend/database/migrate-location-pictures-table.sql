-- Create location_pictures table
CREATE TABLE IF NOT EXISTS location_pictures (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    public_id TEXT,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_location_pictures_user_id ON location_pictures(user_id);
CREATE INDEX IF NOT EXISTS idx_location_pictures_uploaded_at ON location_pictures(uploaded_at);

-- Add comments
COMMENT ON TABLE location_pictures IS 'Stores location pictures uploaded by users';
COMMENT ON COLUMN location_pictures.user_id IS 'Reference to the user who uploaded the picture';
COMMENT ON COLUMN location_pictures.url IS 'URL of the uploaded picture (cloud storage or local path)';
COMMENT ON COLUMN location_pictures.description IS 'Optional description of the location picture';
COMMENT ON COLUMN location_pictures.uploaded_at IS 'When the picture was uploaded';
