-- IMVCMPC Initial Seed Data
-- This file populates the database with initial roles, branches, and users

-- Insert initial branches
INSERT INTO branches (name, location, is_main_branch, address, contact_number, email, manager_name) VALUES
('Ibaan Main Branch', 'Ibaan, Batangas', true, 'Main Street, Ibaan, Batangas', '043-123-4567', 'ibaan@imvcmpc.com', 'Juan Dela Cruz'),
('Bauan Branch', 'Bauan, Batangas', false, 'Poblacion, Bauan, Batangas', '043-234-5678', 'bauan@imvcmpc.com', 'Maria Santos'),
('San Jose Branch', 'San Jose, Batangas', false, 'Town Center, San Jose, Batangas', '043-345-6789', 'sanjose@imvcmpc.com', 'Pedro Garcia');

-- Insert initial roles
INSERT INTO roles (name, display_name, description) VALUES
('finance_officer', 'Finance Officer', 'Manages financial operations and reports'),
('marketing_clerk', 'Marketing Clerk', 'Handles marketing activities and member relations'),
('it_head', 'IT Head', 'Manages IT systems and technical operations'),
('admin', 'Administrator', 'Full system access and administration');

-- Insert initial permissions
INSERT INTO permissions (name, display_name, description, resource, action) VALUES
('view_dashboard', 'View Dashboard', 'Access to main dashboard', 'dashboard', 'read'),
('manage_transactions', 'Manage Transactions', 'Create, edit, delete transactions', 'transactions', 'write'),
('view_reports', 'View Reports', 'Access to financial reports', 'reports', 'read'),
('manage_users', 'Manage Users', 'Create, edit, delete users', 'users', 'write'),
('view_analytics', 'View Analytics', 'Access to analytics and insights', 'analytics', 'read'),
('system_admin', 'System Administration', 'Full system administration', 'system', 'admin');

-- Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Finance Officer permissions
(1, 1), (1, 2), (1, 3), (1, 5),
-- Marketing Clerk permissions  
(2, 1), (2, 5),
-- IT Head permissions
(3, 1), (3, 4), (3, 5), (3, 6),
-- Admin permissions (all)
(4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6);

-- Insert initial users (password is 'password123' for all - hashed with bcrypt)
-- Note: In production, these should be changed immediately
INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, branch_id, is_active, created_by) VALUES
('fo.ibaan', 'fo.ibaan@imvcmpc.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXfs2Uqq.9Aa', 'Finance', 'Officer', 1, 1, true, 1),
('mc.ibaan', 'mc.ibaan@imvcmpc.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXfs2Uqq.9Aa', 'Marketing', 'Clerk', 2, 1, true, 1),
('it.head', 'it.head@imvcmpc.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXfs2Uqq.9Aa', 'IT', 'Head', 3, 1, true, 1),
('admin', 'admin@imvcmpc.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXfs2Uqq.9Aa', 'System', 'Administrator', 4, 1, true, 1),
('fo.bauan', 'fo.bauan@imvcmpc.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXfs2Uqq.9Aa', 'Finance', 'Officer Bauan', 1, 2, true, 1),
('mc.bauan', 'mc.bauan@imvcmpc.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXfs2Uqq.9Aa', 'Marketing', 'Clerk Bauan', 2, 2, true, 1);

-- Update the first user's created_by to reference itself (since it was created first)
UPDATE users SET created_by = 1 WHERE id = 1;
