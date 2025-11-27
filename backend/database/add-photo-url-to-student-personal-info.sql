-- Add photo_url column to student_personal_info table
ALTER TABLE student_personal_info 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN student_personal_info.photo_url IS 'URL of the student profile photo uploaded to Cloudinary';

