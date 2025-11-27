-- Database schema for InternshipGo application

-- Base users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('Student', 'Coordinator', 'Company')),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Add Google OAuth columns if they don't exist
DO $$ 
BEGIN
    -- Add google_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'google_id') THEN
        ALTER TABLE users ADD COLUMN google_id TEXT;
    END IF;
    
    -- Add profile_picture column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'profile_picture') THEN
        ALTER TABLE users ADD COLUMN profile_picture TEXT;
    END IF;
    
    -- Add background_picture column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'background_picture') THEN
        ALTER TABLE users ADD COLUMN background_picture TEXT;
    END IF;
    
    -- Make password_hash nullable if it's not already
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'password_hash' AND is_nullable = 'NO') THEN
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    END IF;
END $$;

-- Add unique constraint for google_id after ensuring column exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_unique') THEN
        ALTER TABLE users ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);
    END IF;
END $$;

-- Add constraint to ensure either password_hash or google_id is present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_auth_method') THEN
        ALTER TABLE users ADD CONSTRAINT check_auth_method CHECK (
            password_hash IS NOT NULL OR google_id IS NOT NULL
        );
    END IF;
END $$;

-- Add middle_name column to students table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'middle_name') THEN
        ALTER TABLE students ADD COLUMN middle_name VARCHAR(100) DEFAULT 'N/A';
    END IF;
END $$;

-- Add middle_name column to coordinators table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'coordinators' AND column_name = 'middle_name') THEN
        ALTER TABLE coordinators ADD COLUMN middle_name VARCHAR(100) DEFAULT 'N/A';
    END IF;
END $$;

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    id_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) DEFAULT 'N/A',
    last_name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL,
    year VARCHAR(10) NOT NULL,
    date_of_birth DATE NOT NULL,
    program VARCHAR(100) NOT NULL,
    major VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Coordinators table
CREATE TABLE IF NOT EXISTS coordinators (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) DEFAULT 'N/A',
    last_name VARCHAR(100) NOT NULL,
    program VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    campus_assignment VARCHAR(20) CHECK (campus_assignment IN ('in-campus', 'off-campus')),
    assigned_by BIGINT,
    assigned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    qualifications TEXT,
    skills_required TEXT,
    company_description TEXT,
    website VARCHAR(255),
    phone_number VARCHAR(20),
    contact_person VARCHAR(100),
    company_size VARCHAR(50),
    founded_year INTEGER,
    benefits TEXT,
    work_environment TEXT,
    available_intern_slots INTEGER DEFAULT 0,
    total_intern_capacity INTEGER DEFAULT 0,
    current_intern_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

    -- Conversations table for messaging
CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
    name VARCHAR(255),
    avatar_url TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Conversation participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    is_important BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_id_number ON students(id_number);
CREATE INDEX IF NOT EXISTS idx_coordinators_user_id ON coordinators(user_id);
CREATE INDEX IF NOT EXISTS idx_coordinators_campus_assignment ON coordinators(campus_assignment);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_available_slots ON companies(available_intern_slots);
CREATE INDEX IF NOT EXISTS idx_companies_total_capacity ON companies(total_intern_capacity);

-- Messaging indexes
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
    id BIGSERIAL PRIMARY KEY,
    class_name VARCHAR(255) NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    class_code VARCHAR(6) UNIQUE NOT NULL,
    coordinator_id BIGINT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coordinator_id) REFERENCES coordinators(id) ON DELETE CASCADE
);

-- Student class enrollments table (junction table)
CREATE TABLE IF NOT EXISTS class_enrollments (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'dropped', 'completed')),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(class_id, student_id)
);

-- Classes indexes
CREATE INDEX IF NOT EXISTS idx_classes_coordinator_id ON classes(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_year ON classes(school_year);
CREATE INDEX IF NOT EXISTS idx_classes_class_code ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status ON class_enrollments(status);

-- Insert sample data (optional)
-- INSERT INTO users (user_type, email, password_hash) 
-- VALUES ('Student', 'student@example.com', 'hashed_password');
-- INSERT INTO students (user_id, id_number, first_name, middle_name, last_name, age, year, date_of_birth, program, major, address)
-- VALUES (1, '1234-5678', 'John', 'Michael', 'Doe', 20, '3rd Year', '2003-01-15', 'Computer Science', 'Software Engineering', '123 Main St');
