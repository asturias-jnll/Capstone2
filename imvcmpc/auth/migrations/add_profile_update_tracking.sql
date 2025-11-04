-- Migration: Add profile update tracking columns to users table
-- Description: This migration adds columns to track when users last updated their profile or changed password
-- to enforce 30-day restriction (users can only update once every 30 days, but are not required to do so)

-- Add last_profile_update column to track when user last updated their profile information
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_profile_update TIMESTAMP;

-- Add last_password_change column to track when user last changed their password
-- Note: password_changed_at already exists in the schema, but we'll use it differently
-- We'll rename it for clarity or use last_password_change as the main tracking column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP;

-- Create index for better query performance when checking update restrictions
CREATE INDEX IF NOT EXISTS idx_users_last_profile_update ON users(last_profile_update);
CREATE INDEX IF NOT EXISTS idx_users_last_password_change ON users(last_password_change);

-- Add comments to document the columns
COMMENT ON COLUMN users.last_profile_update IS 'Timestamp of last profile update. Users can only update profile once every 30 days.';
COMMENT ON COLUMN users.last_password_change IS 'Timestamp of last password change. Users can only change password once every 30 days.';

-- Migration completed
