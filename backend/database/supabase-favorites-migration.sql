-- Supabase Migration: Create student_favorites table
-- Run this in your Supabase SQL Editor

-- Create student_favorites table
CREATE TABLE IF NOT EXISTS student_favorites (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_student_favorites_student_id 
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_favorites_company_id 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Ensure unique combination of student and company
    CONSTRAINT unique_student_company_favorite 
        UNIQUE(student_id, company_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_favorites_student_id 
    ON student_favorites (student_id);

CREATE INDEX IF NOT EXISTS idx_student_favorites_company_id 
    ON student_favorites (company_id);

CREATE INDEX IF NOT EXISTS idx_student_favorites_created_at 
    ON student_favorites (created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE student_favorites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Students can only see their own favorites
CREATE POLICY "Students can view their own favorites" ON student_favorites
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM students 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Students can insert their own favorites
CREATE POLICY "Students can add their own favorites" ON student_favorites
    FOR INSERT WITH CHECK (
        student_id IN (
            SELECT id FROM students 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Students can delete their own favorites
CREATE POLICY "Students can remove their own favorites" ON student_favorites
    FOR DELETE USING (
        student_id IN (
            SELECT id FROM students 
            WHERE user_id = auth.uid()
        )
    );

-- Add comment to explain the table
COMMENT ON TABLE student_favorites IS 'Stores student favorite companies for quick access';
COMMENT ON COLUMN student_favorites.student_id IS 'References students.id - the student who favorited the company';
COMMENT ON COLUMN student_favorites.company_id IS 'References companies.id - the company that was favorited';

