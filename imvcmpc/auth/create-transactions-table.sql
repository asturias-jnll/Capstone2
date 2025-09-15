-- Create transactions table manually
CREATE TABLE IF NOT EXISTS transactions (
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

-- Create indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_payee ON transactions(payee);
CREATE INDEX IF NOT EXISTS idx_transactions_branch_id ON transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);
