-- Migration script to add admin_coordinators table
-- Run this in your Supabase SQL editor

-- Create admin_coordinators table
CREATE TABLE IF NOT EXISTS admin_coordinators (
    id BIGSERIAL PRIMARY KEY,
    coordinator_id BIGINT NOT NULL,
    assigned_by BIGINT NOT NULL, -- User ID who assigned admin status (usually system admin)
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '{
        "can_manage_coordinators": true,
        "can_manage_interns": true,
        "can_manage_companies": true,
        "can_view_reports": true,
        "can_manage_events": true,
        "can_manage_notifications": true
    }',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coordinator_id) REFERENCES coordinators(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(coordinator_id) -- Each coordinator can only have one admin record
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_coordinators_coordinator_id ON admin_coordinators(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_admin_coordinators_assigned_by ON admin_coordinators(assigned_by);
CREATE INDEX IF NOT EXISTS idx_admin_coordinators_is_active ON admin_coordinators(is_active);

-- Add comments for documentation
COMMENT ON TABLE admin_coordinators IS 'Manages admin privileges for coordinators';
COMMENT ON COLUMN admin_coordinators.coordinator_id IS 'Reference to the coordinator who has admin privileges';
COMMENT ON COLUMN admin_coordinators.assigned_by IS 'User ID who assigned the admin status';
COMMENT ON COLUMN admin_coordinators.permissions IS 'JSON object containing specific permissions for this admin coordinator';
COMMENT ON COLUMN admin_coordinators.is_active IS 'Whether the admin status is currently active';
COMMENT ON COLUMN admin_coordinators.notes IS 'Additional notes about the admin assignment';

-- Insert sample admin coordinator (optional)
-- Replace coordinator_id with an actual coordinator ID from your database
-- INSERT INTO admin_coordinators (coordinator_id, assigned_by, notes) 
-- VALUES (1, 1, 'Initial admin coordinator setup');
