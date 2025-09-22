-- Create ibaan_transactions table (Main Branch Transaction Ledger)
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

-- Create all_branch_transactions table (Consolidated Transaction Ledger)
CREATE TABLE IF NOT EXISTS all_branch_transactions (
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

-- Create indexes for ibaan_transactions table
CREATE INDEX IF NOT EXISTS idx_ibaan_transactions_date ON ibaan_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ibaan_transactions_payee ON ibaan_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_ibaan_transactions_branch_id ON ibaan_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_ibaan_transactions_created_by ON ibaan_transactions(created_by);

-- Create indexes for all_branch_transactions table
CREATE INDEX IF NOT EXISTS idx_all_branch_transactions_date ON all_branch_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_all_branch_transactions_payee ON all_branch_transactions(payee);
CREATE INDEX IF NOT EXISTS idx_all_branch_transactions_branch_id ON all_branch_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_all_branch_transactions_created_by ON all_branch_transactions(created_by);

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
-- INDEXES FOR BRANCH-SPECIFIC TABLES
-- ===========================================

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

