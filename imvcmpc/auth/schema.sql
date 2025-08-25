-- IMVCMPC Financial Management System Database Schema
-- Authentication and User Management Tables

-- Create database if not exists
-- CREATE DATABASE imvcmpc_fms;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    is_main_branch BOOLEAN DEFAULT FALSE,
    address TEXT,
    contact_number VARCHAR(20),
    email VARCHAR(100),
    manager_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id) NOT NULL,
    branch_id INTEGER REFERENCES branches(id),
    employee_id VARCHAR(20) UNIQUE,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    is_main_branch_user BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table for JWT refresh tokens
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL,
    device_info TEXT,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default branches
INSERT INTO branches (id, name, location, is_main_branch) VALUES
(1, 'Main Branch', 'IBAAN', TRUE),
(2, 'Branch 2', 'BAUAN', FALSE),
(3, 'Branch 3', 'SAN JOSE', FALSE),
(4, 'Branch 4', 'ROSARIO', FALSE),
(5, 'Branch 5', 'SAN JUAN', FALSE),
(6, 'Branch 6', 'PADRE GARCIA', FALSE),
(7, 'Branch 7', 'LIPA CITY', FALSE),
(8, 'Branch 8', 'BATANGAS CITY', FALSE),
(9, 'Branch 9', 'MABINI LIPA', FALSE),
(10, 'Branch 10', 'CALAMIAS', FALSE),
(11, 'Branch 11', 'LEMERY', FALSE),
(12, 'Branch 12', 'MATAAS NA KAHOY', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Insert marketing clerk users with new credential format
-- Note: These are placeholder password hashes, they should be updated with actual bcrypt hashes
INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, branch_id, employee_id, is_active) VALUES
('mc.ibaan', 'mc.ibaan@imvcmpc.com', '$2b$10$placeholder.hash.for.ibaan123!', 'IBAAN', 'Marketing Clerk', 1, 1, 'MC001', true),
('mc.bauan', 'mc.bauan@imvcmpc.com', '$2b$10$placeholder.hash.for.bauan123!', 'BAUAN', 'Marketing Clerk', 1, 2, 'MC002', true),
('mc.sanjose', 'mc.sanjose@imvcmpc.com', '$2b$10$placeholder.hash.for.sanjose123!', 'SAN JOSE', 'Marketing Clerk', 1, 3, 'MC003', true),
('mc.rosario', 'mc.rosario@imvcmpc.com', '$2b$10$placeholder.hash.for.rosario123!', 'ROSARIO', 'Marketing Clerk', 1, 4, 'MC004', true),
('mc.sanjuan', 'mc.sanjuan@imvcmpc.com', '$2b$10$placeholder.hash.for.sanjuan123!', 'SAN JUAN', 'Marketing Clerk', 1, 5, 'MC005', true),
('mc.padregarcia', 'mc.padregarcia@imvcmpc.com', '$2b$10$placeholder.hash.for.padregarcia123!', 'PADRE GARCIA', 'Marketing Clerk', 1, 6, 'MC006', true),
('mc.lipacity', 'mc.lipacity@imvcmpc.com', '$2b$10$placeholder.hash.for.lipacity123!', 'LIPA CITY', 'Marketing Clerk', 1, 7, 'MC007', true),
('mc.batangascity', 'mc.batangascity@imvcmpc.com', '$2b$10$placeholder.hash.for.batangascity123!', 'BATANGAS CITY', 'Marketing Clerk', 1, 8, 'MC008', true),
('mc.mabinilipa', 'mc.mabinilipa@imvcmpc.com', '$2b$10$placeholder.hash.for.mabinilipa123!', 'MABINI LIPA', 'Marketing Clerk', 1, 9, 'MC009', true),
('mc.calamias', 'mc.calamias@imvcmpc.com', '$2b$10$placeholder.hash.for.calamias123!', 'CALAMIAS', 'Marketing Clerk', 1, 10, 'MC010', true),
('mc.lemery', 'mc.lemery@imvcmpc.com', '$2b$10$placeholder.hash.for.lemery123!', 'LEMERY', 'Marketing Clerk', 1, 11, 'MC011', true),
('mc.mataasnakahoy', 'mc.mataasnakahoy@imvcmpc.com', '$2b$10$placeholder.hash.for.mataasnakahoy123!', 'MATAAS NA KAHOY', 'Marketing Clerk', 1, 12, 'MC012', true)
ON CONFLICT (username) DO NOTHING;

-- Insert default roles
INSERT INTO roles (id, name, display_name, description) VALUES
(1, 'marketing_clerk', 'Marketing Clerk', 'Marketing clerk with branch-specific access'),
(2, 'finance_officer', 'Finance Officer', 'Finance officer with financial management capabilities'),
(3, 'it_head', 'IT Head', 'IT administrator with full system access')
ON CONFLICT (id) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (id, name, display_name, description, resource, action) VALUES
-- Marketing Clerk permissions
(1, 'read:member_data', 'Read Member Data', 'Can view member information', 'member_data', 'read'),
(2, 'write:member_data', 'Write Member Data', 'Can create and update member information', 'member_data', 'write'),
(3, 'read:basic_reports', 'Read Basic Reports', 'Can view basic reports', 'reports', 'read'),
(4, 'read:notifications', 'Read Notifications', 'Can view notifications', 'notifications', 'read'),
(5, 'write:notifications', 'Write Notifications', 'Can create and update notifications', 'notifications', 'write'),

-- Finance Officer permissions
(6, 'read:financial_data', 'Read Financial Data', 'Can view financial information', 'financial_data', 'read'),
(7, 'write:financial_data', 'Write Financial Data', 'Can create and update financial information', 'financial_data', 'write'),
(8, 'read:advanced_reports', 'Read Advanced Reports', 'Can view advanced financial reports', 'reports', 'read'),
(9, 'write:reports', 'Write Reports', 'Can create and update reports', 'reports', 'write'),
(10, 'read:mcda_analysis', 'Read MCDA Analysis', 'Can view multi-criteria decision analysis', 'mcda_analysis', 'read'),
(11, 'write:mcda_analysis', 'Write MCDA Analysis', 'Can perform MCDA analysis', 'mcda_analysis', 'write'),
(12, 'read:budget_data', 'Read Budget Data', 'Can view budget information', 'budget_data', 'read'),
(13, 'write:budget_data', 'Write Budget Data', 'Can create and update budget information', 'budget_data', 'write'),

-- IT Head permissions (wildcard)
(14, '*:*', 'Full Access', 'Full access to all resources', '*', '*')
ON CONFLICT (id) DO NOTHING;

-- Insert role permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Marketing Clerk permissions
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),

-- Finance Officer permissions
(2, 1), (2, 6), (2, 7), (2, 8), (2, 9), (2, 10), (2, 11), (2, 12), (2, 13),

-- IT Head permissions
(3, 14)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
