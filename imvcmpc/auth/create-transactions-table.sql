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

