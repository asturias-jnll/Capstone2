-- Migration script to add notifications table and triggers to existing database
-- Run this on your existing database if you don't want to recreate everything

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    branch_id INTEGER REFERENCES branches(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'system', -- 'system', 'important', 'transaction'
    type VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'completed'
    reference_type VARCHAR(50), -- 'change_request', 'transaction', 'user', etc.
    reference_id UUID, -- ID of the related entity (change_request id, transaction id, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    is_highlighted BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal', -- 'normal', 'important', 'urgent'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Add branch_id column if table already exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'branch_id') THEN
            ALTER TABLE notifications ADD COLUMN branch_id INTEGER REFERENCES branches(id);
        END IF;
    END IF;
END $$;

-- Rename message column to content if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message') THEN
        ALTER TABLE notifications RENAME COLUMN message TO content;
    END IF;
END $$;

-- Add type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE notifications ADD COLUMN type VARCHAR(20) DEFAULT 'info';
    END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'status') THEN
        ALTER TABLE notifications ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    END IF;
END $$;

-- Add related_entity_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'related_entity_type') THEN
        ALTER TABLE notifications ADD COLUMN related_entity_type VARCHAR(50);
    END IF;
END $$;

-- Add related_entity_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'related_entity_id') THEN
        ALTER TABLE notifications ADD COLUMN related_entity_id UUID;
    END IF;
END $$;

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE notifications ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_branch_id ON notifications(branch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_highlighted ON notifications(is_highlighted);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_reference_type ON notifications(reference_type);
CREATE INDEX IF NOT EXISTS idx_notifications_reference_id ON notifications(reference_id);

-- Function to create notification for change request
CREATE OR REPLACE FUNCTION create_change_request_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for the assigned finance officer
    IF NEW.assigned_to IS NOT NULL THEN
        INSERT INTO notifications (
            user_id,
            branch_id,
            title,
            content,
            category,
            type,
            status,
            reference_type,
            reference_id,
            is_highlighted,
            priority
        ) VALUES (
            NEW.assigned_to,
            NEW.branch_id,
            'Change Request Received',
            'A marketing clerk has requested changes to a transaction. Please review and take action.',
            'important',
            'warning',
            'pending',
            'change_request',
            NEW.id,
            TRUE,
            'important'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists before creating it
DROP TRIGGER IF EXISTS trigger_create_change_request_notification ON change_requests;

-- Trigger to automatically create notification when change request is created
CREATE TRIGGER trigger_create_change_request_notification
    AFTER INSERT ON change_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_change_request_notification();

-- Function to unhighlight notification when change request is processed
CREATE OR REPLACE FUNCTION unhighlight_change_request_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Unhighlight notification when change request status changes to approved or rejected
    IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
        UPDATE notifications
        SET is_highlighted = FALSE
        WHERE reference_type = 'change_request'
          AND reference_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists before creating it
DROP TRIGGER IF EXISTS trigger_unhighlight_change_request_notification ON change_requests;

-- Trigger to automatically unhighlight notification when change request is processed
CREATE TRIGGER trigger_unhighlight_change_request_notification
    AFTER UPDATE ON change_requests
    FOR EACH ROW
    EXECUTE FUNCTION unhighlight_change_request_notification();

-- Success message
SELECT 'Notifications table and triggers created successfully!' AS status;
