-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location VARCHAR(255),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('meeting', 'workshop', 'orientation', 'deadline', 'other')),
    attendees INTEGER DEFAULT 0,
    max_attendees INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on event_date for better query performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- Create index on created_by for coordinator queries
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- Create index on event_type for filtering
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
