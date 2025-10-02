-- Migration script to export data from local database for Render
-- Run this on your local database to export data

-- Export all data as INSERT statements
-- You'll need to run this and copy the output to import into Render database

-- Export branches
SELECT 'INSERT INTO branches (id, name, location, is_main_branch, address, contact_number, email, manager_name, created_at, updated_at) VALUES (' ||
       id || ', ' ||
       quote_literal(name) || ', ' ||
       quote_literal(location) || ', ' ||
       is_main_branch || ', ' ||
       COALESCE(quote_literal(address), 'NULL') || ', ' ||
       COALESCE(quote_literal(contact_number), 'NULL') || ', ' ||
       COALESCE(quote_literal(email), 'NULL') || ', ' ||
       COALESCE(quote_literal(manager_name), 'NULL') || ', ' ||
       quote_literal(created_at::text) || ', ' ||
       quote_literal(updated_at::text) || ');'
FROM branches;

-- Export roles
SELECT 'INSERT INTO roles (id, name, display_name, description, created_at) VALUES (' ||
       id || ', ' ||
       quote_literal(name) || ', ' ||
       quote_literal(display_name) || ', ' ||
       COALESCE(quote_literal(description), 'NULL') || ', ' ||
       quote_literal(created_at::text) || ');'
FROM roles;

-- Export permissions
SELECT 'INSERT INTO permissions (id, name, display_name, description, resource, action, created_at) VALUES (' ||
       id || ', ' ||
       quote_literal(name) || ', ' ||
       quote_literal(display_name) || ', ' ||
       COALESCE(quote_literal(description), 'NULL') || ', ' ||
       quote_literal(resource) || ', ' ||
       quote_literal(action) || ', ' ||
       quote_literal(created_at::text) || ');'
FROM permissions;

-- Export role_permissions
SELECT 'INSERT INTO role_permissions (id, role_id, permission_id, created_at) VALUES (' ||
       id || ', ' ||
       role_id || ', ' ||
       permission_id || ', ' ||
       quote_literal(created_at::text) || ');'
FROM role_permissions;

-- Export users
SELECT 'INSERT INTO users (id, username, email, password_hash, first_name, last_name, role_id, branch_id, is_active, created_by, created_at, updated_at) VALUES (' ||
       id || ', ' ||
       quote_literal(username) || ', ' ||
       quote_literal(email) || ', ' ||
       quote_literal(password_hash) || ', ' ||
       quote_literal(first_name) || ', ' ||
       quote_literal(last_name) || ', ' ||
       role_id || ', ' ||
       COALESCE(branch_id::text, 'NULL') || ', ' ||
       is_active || ', ' ||
       COALESCE(created_by::text, 'NULL') || ', ' ||
       quote_literal(created_at::text) || ', ' ||
       quote_literal(updated_at::text) || ');'
FROM users;
