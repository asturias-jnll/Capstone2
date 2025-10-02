-- IMVCMPC Financial Management System Database Schema
-- Authentication and User Management Tables

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

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(10),
    civil_status VARCHAR(20),
    address TEXT,
    contact_number VARCHAR(20),
    email VARCHAR(100),
    emergency_contact VARCHAR(100),
    emergency_contact_number VARCHAR(20),
    branch_id INTEGER REFERENCES branches(id),
    membership_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Savings table
CREATE TABLE IF NOT EXISTS savings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    interest_rate DECIMAL(5,4) DEFAULT 0.00,
    last_transaction_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Disbursements table
CREATE TABLE IF NOT EXISTS disbursements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    loan_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,4) NOT NULL,
    term_months INTEGER NOT NULL,
    monthly_payment DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    disbursement_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    branch_id INTEGER REFERENCES branches(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_updated_at BEFORE UPDATE ON savings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disbursements_updated_at BEFORE UPDATE ON disbursements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ibaan Transactions table (Main Branch Transaction Ledger)
CREATE TABLE IF NOT EXISTS ibaan_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_ibaan_transactions_updated_at BEFORE UPDATE ON ibaan_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_member_number ON members(member_number);
CREATE INDEX IF NOT EXISTS idx_members_branch_id ON members(branch_id);
CREATE INDEX IF NOT EXISTS idx_savings_member_id ON savings(member_id);
CREATE INDEX IF NOT EXISTS idx_savings_account_number ON savings(account_number);
CREATE INDEX IF NOT EXISTS idx_disbursements_member_id ON disbursements(member_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_branch_id ON disbursements(branch_id);
-- Indexes for Ibaan transactions
CREATE INDEX IF NOT EXISTS idx_ibaan_transactions_date ON ibaan_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ibaan_transactions_payee ON ibaan_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_ibaan_transactions_branch_id ON ibaan_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_ibaan_transactions_created_by ON ibaan_transactions(created_by);

-- Indexes for Bauan transactions (moved to after table creation)
-- CREATE INDEX IF NOT EXISTS idx_bauan_transactions_date ON bauan_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_bauan_transactions_payee ON bauan_transactions(payee);
-- CREATE INDEX IF NOT EXISTS idx_bauan_transactions_branch_id ON bauan_transactions(branch_id);
-- CREATE INDEX IF NOT EXISTS idx_bauan_transactions_created_by ON bauan_transactions(created_by);

-- Indexes for San Jose transactions (moved to after table creation)
-- CREATE INDEX IF NOT EXISTS idx_sanjose_transactions_date ON sanjose_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_sanjose_transactions_payee ON sanjose_transactions(payee);
-- CREATE INDEX IF NOT EXISTS idx_sanjose_transactions_branch_id ON sanjose_transactions(branch_id);
-- CREATE INDEX IF NOT EXISTS idx_sanjose_transactions_created_by ON sanjose_transactions(created_by);

-- Indexes for Rosario transactions (moved to after table creation)
-- CREATE INDEX IF NOT EXISTS idx_rosario_transactions_date ON rosario_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_rosario_transactions_payee ON rosario_transactions(payee);
-- CREATE INDEX IF NOT EXISTS idx_rosario_transactions_branch_id ON rosario_transactions(branch_id);
-- CREATE INDEX IF NOT EXISTS idx_rosario_transactions_created_by ON rosario_transactions(created_by);

-- Indexes for San Juan transactions (moved to after table creation)
-- CREATE INDEX IF NOT EXISTS idx_sanjuan_transactions_date ON sanjuan_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_sanjuan_transactions_payee ON sanjuan_transactions(payee);
-- CREATE INDEX IF NOT EXISTS idx_sanjuan_transactions_branch_id ON sanjuan_transactions(branch_id);
-- CREATE INDEX IF NOT EXISTS idx_sanjuan_transactions_created_by ON sanjuan_transactions(created_by);

-- Indexes for Padre Garcia transactions (moved to after table creation)
-- CREATE INDEX IF NOT EXISTS idx_padregarcia_transactions_date ON padregarcia_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_padregarcia_transactions_payee ON padregarcia_transactions(payee);
-- CREATE INDEX IF NOT EXISTS idx_padregarcia_transactions_branch_id ON padregarcia_transactions(branch_id);
-- CREATE INDEX IF NOT EXISTS idx_padregarcia_transactions_created_by ON padregarcia_transactions(created_by);

-- Indexes for Lipa City transactions (moved to after table creation)
-- CREATE INDEX IF NOT EXISTS idx_lipacity_transactions_date ON lipacity_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_lipacity_transactions_payee ON lipacity_transactions(payee);
-- CREATE INDEX IF NOT EXISTS idx_lipacity_transactions_branch_id ON lipacity_transactions(branch_id);
-- CREATE INDEX IF NOT EXISTS idx_lipacity_transactions_created_by ON lipacity_transactions(created_by);

-- Indexes for Batangas City transactions (moved to after table creation)
-- CREATE INDEX IF NOT EXISTS idx_batangascity_transactions_date ON batangascity_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_batangascity_transactions_payee ON batangascity_transactions(payee);
-- CREATE INDEX IF NOT EXISTS idx_batangascity_transactions_branch_id ON batangascity_transactions(branch_id);
-- CREATE INDEX IF NOT EXISTS idx_batangascity_transactions_created_by ON batangascity_transactions(created_by);

-- Indexes for Mabini Lipa transactions (moved to after table creation)
-- CREATE INDEX IF NOT EXISTS idx_mabinilipa_transactions_date ON mabinilipa_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_mabinilipa_transactions_payee ON mabinilipa_transactions(payee);
-- CREATE INDEX IF NOT EXISTS idx_mabinilipa_transactions_branch_id ON mabinilipa_transactions(branch_id);
-- CREATE INDEX IF NOT EXISTS idx_mabinilipa_transactions_created_by ON mabinilipa_transactions(created_by);

-- Indexes for Calamias transactions (moved to after table creation)
-- CREATE INDEX IF NOT EXISTS idx_calamias_transactions_date ON calamias_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_calamias_transactions_payee ON calamias_transactions(payee);
-- CREATE INDEX IF NOT EXISTS idx_calamias_transactions_branch_id ON calamias_transactions(branch_id);
-- CREATE INDEX IF NOT EXISTS idx_calamias_transactions_created_by ON calamias_transactions(created_by);

-- Indexes for Lemery transactions (moved to after table creation)
-- CREATE INDEX IF NOT EXISTS idx_lemery_transactions_date ON lemery_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_lemery_transactions_payee ON lemery_transactions(payee);
-- CREATE INDEX IF NOT EXISTS idx_lemery_transactions_branch_id ON lemery_transactions(branch_id);
-- CREATE INDEX IF NOT EXISTS idx_lemery_transactions_created_by ON lemery_transactions(created_by);

-- Indexes for Mataas Na Kahoy transactions (moved to after table creation)
-- CREATE INDEX IF NOT EXISTS idx_mataasnakahoy_transactions_date ON mataasnakahoy_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_mataasnakahoy_transactions_payee ON mataasnakahoy_transactions(payee);
-- CREATE INDEX IF NOT EXISTS idx_mataasnakahoy_transactions_branch_id ON mataasnakahoy_transactions(branch_id);
-- CREATE INDEX IF NOT EXISTS idx_mataasnakahoy_transactions_created_by ON mataasnakahoy_transactions(created_by);

-- Indexes for Tanauan transactions (moved to after table creation)
-- CREATE INDEX IF NOT EXISTS idx_tanauan_transactions_date ON tanauan_transactions(transaction_date);
-- CREATE INDEX IF NOT EXISTS idx_tanauan_transactions_payee ON tanauan_transactions(payee);
-- CREATE INDEX IF NOT EXISTS idx_tanauan_transactions_branch_id ON tanauan_transactions(branch_id);
-- CREATE INDEX IF NOT EXISTS idx_tanauan_transactions_created_by ON tanauan_transactions(created_by);


-- ===========================================
-- BRANCH-SPECIFIC TRANSACTION TABLES
-- ===========================================

-- Bauan Transactions table
CREATE TABLE IF NOT EXISTS bauan_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- San Jose Transactions table
CREATE TABLE IF NOT EXISTS sanjose_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rosario Transactions table
CREATE TABLE IF NOT EXISTS rosario_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- San Juan Transactions table
CREATE TABLE IF NOT EXISTS sanjuan_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Padre Garcia Transactions table
CREATE TABLE IF NOT EXISTS padregarcia_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lipa City Transactions table
CREATE TABLE IF NOT EXISTS lipacity_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batangas City Transactions table
CREATE TABLE IF NOT EXISTS batangascity_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mabini Lipa Transactions table
CREATE TABLE IF NOT EXISTS mabinilipa_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calamias Transactions table
CREATE TABLE IF NOT EXISTS calamias_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lemery Transactions table
CREATE TABLE IF NOT EXISTS lemery_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mataas Na Kahoy Transactions table
CREATE TABLE IF NOT EXISTS mataasnakahoy_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tanauan Transactions table
CREATE TABLE IF NOT EXISTS tanauan_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    cross_reference VARCHAR(100),
    check_number VARCHAR(50),
    particulars TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    cash_in_bank DECIMAL(15,2) DEFAULT 0.00,
    loan_receivables DECIMAL(15,2) DEFAULT 0.00,
    savings_deposits DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    service_charge DECIMAL(15,2) DEFAULT 0.00,
    sundries DECIMAL(15,2) DEFAULT 0.00,
    branch_id INTEGER REFERENCES branches(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- TRIGGERS FOR BRANCH-SPECIFIC TABLES
-- ===========================================

-- Create triggers for updated_at on all branch tables
CREATE TRIGGER update_bauan_transactions_updated_at BEFORE UPDATE ON bauan_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sanjose_transactions_updated_at BEFORE UPDATE ON sanjose_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rosario_transactions_updated_at BEFORE UPDATE ON rosario_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sanjuan_transactions_updated_at BEFORE UPDATE ON sanjuan_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_padregarcia_transactions_updated_at BEFORE UPDATE ON padregarcia_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lipacity_transactions_updated_at BEFORE UPDATE ON lipacity_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batangascity_transactions_updated_at BEFORE UPDATE ON batangascity_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mabinilipa_transactions_updated_at BEFORE UPDATE ON mabinilipa_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calamias_transactions_updated_at BEFORE UPDATE ON calamias_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lemery_transactions_updated_at BEFORE UPDATE ON lemery_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mataasnakahoy_transactions_updated_at BEFORE UPDATE ON mataasnakahoy_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tanauan_transactions_updated_at BEFORE UPDATE ON tanauan_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- CHANGE REQUESTS SYSTEM
-- ===========================================

-- Change requests table for transaction modifications
CREATE TABLE IF NOT EXISTS change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL,
    transaction_table VARCHAR(50) NOT NULL, -- Which branch table the transaction belongs to
    requested_by UUID REFERENCES users(id) NOT NULL,
    assigned_to UUID REFERENCES users(id), -- Finance Officer who will handle the request
    branch_id INTEGER REFERENCES branches(id) NOT NULL,
    request_type VARCHAR(20) DEFAULT 'modification', -- 'modification', 'deletion', 'creation'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
    original_data JSONB, -- Original transaction data
    requested_changes JSONB, -- Changes requested by marketing clerk
    reason TEXT, -- Reason for the change request
    finance_officer_notes TEXT, -- Notes from finance officer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by UUID REFERENCES users(id)
);

-- Create indexes for change requests
CREATE INDEX IF NOT EXISTS idx_change_requests_transaction_id ON change_requests(transaction_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_requested_by ON change_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_change_requests_assigned_to ON change_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_change_requests_branch_id ON change_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_created_at ON change_requests(created_at);

-- Create trigger for updated_at on change_requests
CREATE TRIGGER update_change_requests_updated_at BEFORE UPDATE ON change_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- INDEXES FOR BRANCH-SPECIFIC TRANSACTION TABLES
-- ===========================================
-- These indexes are created after all table definitions to avoid dependency issues

-- Indexes for Bauan transactions
CREATE INDEX IF NOT EXISTS idx_bauan_transactions_date ON bauan_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bauan_transactions_payee ON bauan_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_bauan_transactions_branch_id ON bauan_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_bauan_transactions_created_by ON bauan_transactions(created_by);

-- Indexes for San Jose transactions
CREATE INDEX IF NOT EXISTS idx_sanjose_transactions_date ON sanjose_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_sanjose_transactions_payee ON sanjose_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_sanjose_transactions_branch_id ON sanjose_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_sanjose_transactions_created_by ON sanjose_transactions(created_by);

-- Indexes for Rosario transactions
CREATE INDEX IF NOT EXISTS idx_rosario_transactions_date ON rosario_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_rosario_transactions_payee ON rosario_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_rosario_transactions_branch_id ON rosario_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_rosario_transactions_created_by ON rosario_transactions(created_by);

-- Indexes for San Juan transactions
CREATE INDEX IF NOT EXISTS idx_sanjuan_transactions_date ON sanjuan_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_sanjuan_transactions_payee ON sanjuan_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_sanjuan_transactions_branch_id ON sanjuan_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_sanjuan_transactions_created_by ON sanjuan_transactions(created_by);

-- Indexes for Padre Garcia transactions
CREATE INDEX IF NOT EXISTS idx_padregarcia_transactions_date ON padregarcia_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_padregarcia_transactions_payee ON padregarcia_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_padregarcia_transactions_branch_id ON padregarcia_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_padregarcia_transactions_created_by ON padregarcia_transactions(created_by);

-- Indexes for Lipa City transactions
CREATE INDEX IF NOT EXISTS idx_lipacity_transactions_date ON lipacity_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_lipacity_transactions_payee ON lipacity_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_lipacity_transactions_branch_id ON lipacity_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_lipacity_transactions_created_by ON lipacity_transactions(created_by);

-- Indexes for Batangas City transactions
CREATE INDEX IF NOT EXISTS idx_batangascity_transactions_date ON batangascity_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_batangascity_transactions_payee ON batangascity_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_batangascity_transactions_branch_id ON batangascity_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_batangascity_transactions_created_by ON batangascity_transactions(created_by);

-- Indexes for Mabini Lipa transactions
CREATE INDEX IF NOT EXISTS idx_mabinilipa_transactions_date ON mabinilipa_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_mabinilipa_transactions_payee ON mabinilipa_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_mabinilipa_transactions_branch_id ON mabinilipa_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_mabinilipa_transactions_created_by ON mabinilipa_transactions(created_by);

-- Indexes for Calamias transactions
CREATE INDEX IF NOT EXISTS idx_calamias_transactions_date ON calamias_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_calamias_transactions_payee ON calamias_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_calamias_transactions_branch_id ON calamias_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_calamias_transactions_created_by ON calamias_transactions(created_by);

-- Indexes for Lemery transactions
CREATE INDEX IF NOT EXISTS idx_lemery_transactions_date ON lemery_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_lemery_transactions_payee ON lemery_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_lemery_transactions_branch_id ON lemery_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_lemery_transactions_created_by ON lemery_transactions(created_by);

-- Indexes for Mataas Na Kahoy transactions
CREATE INDEX IF NOT EXISTS idx_mataasnakahoy_transactions_date ON mataasnakahoy_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_mataasnakahoy_transactions_payee ON mataasnakahoy_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_mataasnakahoy_transactions_branch_id ON mataasnakahoy_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_mataasnakahoy_transactions_created_by ON mataasnakahoy_transactions(created_by);

-- Indexes for Tanauan transactions
CREATE INDEX IF NOT EXISTS idx_tanauan_transactions_date ON tanauan_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_tanauan_transactions_payee ON tanauan_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_tanauan_transactions_branch_id ON tanauan_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_tanauan_transactions_created_by ON tanauan_transactions(created_by);