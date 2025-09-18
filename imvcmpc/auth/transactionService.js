const { Pool } = require('pg');
const config = require('./config');

class TransactionService {
    constructor() {
        this.pool = new Pool(config.database);
    }

    // Determine which table to use based on user role and branch
    getTableName(userRole, branchId, isMainBranch) {
        // Main branch users (Ibaan) use ibaan_transactions
        if (isMainBranch || userRole === 'admin' || userRole === 'finance_officer') {
            return 'ibaan_transactions';
        }
        // All other users use all_branch_transactions
        return 'all_branch_transactions';
    }

    // Create a new transaction in both tables
    async createTransaction(transactionData, userId, branchId, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            const {
                transaction_date,
                payee,
                reference,
                cross_reference,
                check_number,
                particulars,
                debit_amount,
                credit_amount,
                cash_in_bank,
                loan_receivables,
                savings_deposits,
                interest_income,
                service_charge,
                sundries
            } = transactionData;

            // Generate a single UUID for this transaction to use in both tables
            const transactionId = require('crypto').randomUUID();

            const values = [
                transactionId,
                transaction_date,
                payee,
                reference || null,
                cross_reference || null,
                check_number || null,
                particulars,
                debit_amount || 0,
                credit_amount || 0,
                cash_in_bank || 0,
                loan_receivables || 0,
                savings_deposits || 0,
                interest_income || 0,
                service_charge || 0,
                sundries || 0,
                branchId,
                userId
            ];

            // Insert into ibaan_transactions
            const ibaanQuery = `
                INSERT INTO ibaan_transactions (
                    id, transaction_date, payee, reference, cross_reference, check_number,
                    particulars, debit_amount, credit_amount, cash_in_bank,
                    loan_receivables, savings_deposits, interest_income,
                    service_charge, sundries, branch_id, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING *
            `;

            const ibaanResult = await client.query(ibaanQuery, values);

            // Insert into all_branch_transactions
            const allBranchQuery = `
                INSERT INTO all_branch_transactions (
                    id, transaction_date, payee, reference, cross_reference, check_number,
                    particulars, debit_amount, credit_amount, cash_in_bank,
                    loan_receivables, savings_deposits, interest_income,
                    service_charge, sundries, branch_id, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING *
            `;

            const allBranchResult = await client.query(allBranchQuery, values);

            await client.query('COMMIT');
            
            // Return the transaction data (both should be identical)
            return ibaanResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get all transactions with optional filtering
    async getTransactions(filters = {}, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // Determine which table to use
            const tableName = this.getTableName(userRole, filters.branch_id, isMainBranch);
            
            let query = `
                SELECT 
                    t.*,
                    b.name as branch_name,
                    b.location as branch_location,
                    u.first_name,
                    u.last_name,
                    u.username
                FROM ${tableName} t
                LEFT JOIN branches b ON t.branch_id = b.id
                LEFT JOIN users u ON t.created_by = u.id
                WHERE 1=1
            `;
            
            const values = [];
            let paramCount = 0;

            // Add filters
            if (filters.branch_id) {
                paramCount++;
                query += ` AND t.branch_id = $${paramCount}`;
                values.push(filters.branch_id);
            }

            if (filters.payee) {
                paramCount++;
                query += ` AND t.payee ILIKE $${paramCount}`;
                values.push(`%${filters.payee}%`);
            }

            if (filters.date_from) {
                paramCount++;
                query += ` AND t.transaction_date >= $${paramCount}`;
                values.push(filters.date_from);
            }

            if (filters.date_to) {
                paramCount++;
                query += ` AND t.transaction_date <= $${paramCount}`;
                values.push(filters.date_to);
            }

            if (filters.reference) {
                paramCount++;
                query += ` AND t.reference ILIKE $${paramCount}`;
                values.push(`%${filters.reference}%`);
            }

            // Add ordering
            query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;

            // Add pagination if specified
            if (filters.limit) {
                paramCount++;
                query += ` LIMIT $${paramCount}`;
                values.push(filters.limit);
            }

            if (filters.offset) {
                paramCount++;
                query += ` OFFSET $${paramCount}`;
                values.push(filters.offset);
            }

            const result = await client.query(query, values);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Get transaction by ID
    async getTransactionById(transactionId, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // Determine which table to use
            const tableName = this.getTableName(userRole, null, isMainBranch);
            
            const query = `
                SELECT 
                    t.*,
                    b.name as branch_name,
                    b.location as branch_location,
                    u.first_name,
                    u.last_name,
                    u.username
                FROM ${tableName} t
                LEFT JOIN branches b ON t.branch_id = b.id
                LEFT JOIN users u ON t.created_by = u.id
                WHERE t.id = $1
            `;

            const result = await client.query(query, [transactionId]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // Update transaction
    async updateTransaction(transactionId, updateData, userId, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            const {
                transaction_date,
                payee,
                reference,
                cross_reference,
                check_number,
                particulars,
                debit_amount,
                credit_amount,
                cash_in_bank,
                loan_receivables,
                savings_deposits,
                interest_income,
                service_charge,
                sundries
            } = updateData;

            // Determine which table to use
            const tableName = this.getTableName(userRole, null, isMainBranch);

            const query = `
                UPDATE ${tableName} SET
                    transaction_date = $1,
                    payee = $2,
                    reference = $3,
                    cross_reference = $4,
                    check_number = $5,
                    particulars = $6,
                    debit_amount = $7,
                    credit_amount = $8,
                    cash_in_bank = $9,
                    loan_receivables = $10,
                    savings_deposits = $11,
                    interest_income = $12,
                    service_charge = $13,
                    sundries = $14,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $15
                RETURNING *
            `;

            const values = [
                transaction_date,
                payee,
                reference || null,
                cross_reference || null,
                check_number || null,
                particulars,
                debit_amount || 0,
                credit_amount || 0,
                cash_in_bank || 0,
                loan_receivables || 0,
                savings_deposits || 0,
                interest_income || 0,
                service_charge || 0,
                sundries || 0,
                transactionId
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // Delete transaction from both tables
    async deleteTransaction(transactionId, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            let deletedFromIbaan = null;
            let deletedFromAllBranch = null;
            
            // Try to delete from ibaan_transactions table
            try {
                const ibaanQuery = `DELETE FROM ibaan_transactions WHERE id = $1 RETURNING *`;
                const ibaanResult = await client.query(ibaanQuery, [transactionId]);
                deletedFromIbaan = ibaanResult.rows[0];
            } catch (error) {
                // Transaction might not exist in ibaan_transactions, continue
                console.log('Transaction not found in ibaan_transactions:', error.message);
            }
            
            // Try to delete from all_branch_transactions table
            try {
                const allBranchQuery = `DELETE FROM all_branch_transactions WHERE id = $1 RETURNING *`;
                const allBranchResult = await client.query(allBranchQuery, [transactionId]);
                deletedFromAllBranch = allBranchResult.rows[0];
            } catch (error) {
                // Transaction might not exist in all_branch_transactions, continue
                console.log('Transaction not found in all_branch_transactions:', error.message);
            }
            
            // Check if transaction was deleted from at least one table
            if (!deletedFromIbaan && !deletedFromAllBranch) {
                await client.query('ROLLBACK');
                throw new Error('Transaction not found in any table');
            }
            
            await client.query('COMMIT');
            
            // Return the deleted transaction data (prefer ibaan_transactions if available)
            return deletedFromIbaan || deletedFromAllBranch;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get transaction statistics
    async getTransactionStats(filters = {}, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // Determine which table to use
            const tableName = this.getTableName(userRole, filters.branch_id, isMainBranch);
            
            let query = `
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(debit_amount) as total_debits,
                    SUM(credit_amount) as total_credits,
                    SUM(cash_in_bank) as total_cash_in_bank,
                    SUM(loan_receivables) as total_loan_receivables,
                    SUM(savings_deposits) as total_savings_deposits,
                    SUM(interest_income) as total_interest_income,
                    SUM(service_charge) as total_service_charge,
                    SUM(sundries) as total_sundries
                FROM ${tableName} t
                WHERE 1=1
            `;
            
            const values = [];
            let paramCount = 0;

            // Add filters
            if (filters.branch_id) {
                paramCount++;
                query += ` AND t.branch_id = $${paramCount}`;
                values.push(filters.branch_id);
            }

            if (filters.date_from) {
                paramCount++;
                query += ` AND t.transaction_date >= $${paramCount}`;
                values.push(filters.date_from);
            }

            if (filters.date_to) {
                paramCount++;
                query += ` AND t.transaction_date <= $${paramCount}`;
                values.push(filters.date_to);
            }

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // Search transactions by payee
    async searchTransactionsByPayee(searchTerm, branchId = null, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // Determine which table to use
            const tableName = this.getTableName(userRole, branchId, isMainBranch);
            
            let query = `
                SELECT 
                    t.*,
                    b.name as branch_name,
                    b.location as branch_location
                FROM ${tableName} t
                LEFT JOIN branches b ON t.branch_id = b.id
                WHERE t.payee ILIKE $1
            `;
            
            const values = [`%${searchTerm}%`];
            let paramCount = 1;

            if (branchId) {
                paramCount++;
                query += ` AND t.branch_id = $${paramCount}`;
                values.push(branchId);
            }

            query += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT 50`;

            const result = await client.query(query, values);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Get transactions by date range
    async getTransactionsByDateRange(startDate, endDate, branchId = null, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // Determine which table to use
            const tableName = this.getTableName(userRole, branchId, isMainBranch);
            
            let query = `
                SELECT 
                    t.*,
                    b.name as branch_name,
                    b.location as branch_location
                FROM ${tableName} t
                LEFT JOIN branches b ON t.branch_id = b.id
                WHERE t.transaction_date BETWEEN $1 AND $2
            `;
            
            const values = [startDate, endDate];
            let paramCount = 2;

            if (branchId) {
                paramCount++;
                query += ` AND t.branch_id = $${paramCount}`;
                values.push(branchId);
            }

            query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;

            const result = await client.query(query, values);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Validate transaction data
    validateTransactionData(transactionData) {
        const errors = [];

        if (!transactionData.transaction_date) {
            errors.push('Transaction date is required');
        }

        if (!transactionData.payee || transactionData.payee.trim() === '') {
            errors.push('Payee is required');
        }

        if (!transactionData.particulars || transactionData.particulars.trim() === '') {
            errors.push('Particulars is required');
        }

        const debitAmount = parseFloat(transactionData.debit_amount) || 0;
        const creditAmount = parseFloat(transactionData.credit_amount) || 0;

        if (debitAmount === 0 && creditAmount === 0) {
            errors.push('Either debit or credit amount must be greater than 0');
        }

        if (debitAmount < 0 || creditAmount < 0) {
            errors.push('Debit and credit amounts cannot be negative');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Calculate account balances based on transaction type
    calculateAccountBalances(debitAmount, creditAmount, particulars) {
        const particularsLower = particulars.toLowerCase();
        
        return {
            cash_in_bank: this.calculateCashInBank(debitAmount, creditAmount, particularsLower),
            loan_receivables: this.calculateLoanReceivables(debitAmount, creditAmount, particularsLower),
            savings_deposits: this.calculateSavingsDeposits(debitAmount, creditAmount, particularsLower),
            interest_income: this.calculateInterestIncome(debitAmount, creditAmount, particularsLower),
            service_charge: this.calculateServiceCharge(debitAmount, creditAmount, particularsLower),
            sundries: this.calculateSundries(debitAmount, creditAmount, particularsLower)
        };
    }

    calculateCashInBank(debitAmount, creditAmount, particularsLower) {
        if (particularsLower.includes('deposit') || particularsLower.includes('savings')) {
            return creditAmount;
        } else if (particularsLower.includes('loan') || particularsLower.includes('disbursement')) {
            return -debitAmount;
        }
        return 0;
    }

    calculateLoanReceivables(debitAmount, creditAmount, particularsLower) {
        if (particularsLower.includes('loan') || particularsLower.includes('disbursement')) {
            return debitAmount;
        } else if (particularsLower.includes('repayment') || particularsLower.includes('payment')) {
            return -creditAmount;
        }
        return 0;
    }

    calculateSavingsDeposits(debitAmount, creditAmount, particularsLower) {
        if (particularsLower.includes('savings') || particularsLower.includes('deposit')) {
            return creditAmount;
        }
        return 0;
    }

    calculateInterestIncome(debitAmount, creditAmount, particularsLower) {
        if (particularsLower.includes('interest') || particularsLower.includes('income')) {
            return creditAmount;
        }
        return 0;
    }

    calculateServiceCharge(debitAmount, creditAmount, particularsLower) {
        if (particularsLower.includes('service') || particularsLower.includes('charge') || particularsLower.includes('fee')) {
            return creditAmount;
        }
        return 0;
    }

    calculateSundries(debitAmount, creditAmount, particularsLower) {
        if (particularsLower.includes('sundries') || particularsLower.includes('miscellaneous') || particularsLower.includes('other')) {
            return creditAmount;
        }
        return 0;
    }

    // Get transaction summary for dashboard
    async getTransactionSummary(branchId = null, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // Determine which table to use
            const tableName = this.getTableName(userRole, branchId, isMainBranch);
            
            let query = `
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(debit_amount) as total_debits,
                    SUM(credit_amount) as total_credits,
                    SUM(cash_in_bank) as total_cash_in_bank,
                    SUM(loan_receivables) as total_loan_receivables,
                    SUM(savings_deposits) as total_savings_deposits,
                    SUM(interest_income) as total_interest_income,
                    SUM(service_charge) as total_service_charge,
                    SUM(sundries) as total_sundries,
                    AVG(debit_amount) as avg_debit,
                    AVG(credit_amount) as avg_credit
                FROM ${tableName} t
                WHERE 1=1
            `;
            
            const values = [];
            let paramCount = 0;

            if (branchId) {
                paramCount++;
                query += ` AND t.branch_id = $${paramCount}`;
                values.push(branchId);
            }

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // Get recent transactions
    async getRecentTransactions(limit = 10, branchId = null, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // Determine which table to use
            const tableName = this.getTableName(userRole, branchId, isMainBranch);
            
            let query = `
                SELECT 
                    t.*,
                    b.name as branch_name,
                    b.location as branch_location,
                    u.first_name,
                    u.last_name,
                    u.username
                FROM ${tableName} t
                LEFT JOIN branches b ON t.branch_id = b.id
                LEFT JOIN users u ON t.created_by = u.id
                WHERE 1=1
            `;
            
            const values = [];
            let paramCount = 0;

            if (branchId) {
                paramCount++;
                query += ` AND t.branch_id = $${paramCount}`;
                values.push(branchId);
            }

            query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1}`;
            values.push(limit);

            const result = await client.query(query, values);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Get transactions by month
    async getTransactionsByMonth(year, month, branchId = null, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // Determine which table to use
            const tableName = this.getTableName(userRole, branchId, isMainBranch);
            
            let query = `
                SELECT 
                    t.*,
                    b.name as branch_name,
                    b.location as branch_location
                FROM ${tableName} t
                LEFT JOIN branches b ON t.branch_id = b.id
                WHERE EXTRACT(YEAR FROM t.transaction_date) = $1 
                AND EXTRACT(MONTH FROM t.transaction_date) = $2
            `;
            
            const values = [year, month];
            let paramCount = 2;

            if (branchId) {
                paramCount++;
                query += ` AND t.branch_id = $${paramCount}`;
                values.push(branchId);
            }

            query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;

            const result = await client.query(query, values);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Close database connection
    async close() {
        await this.pool.end();
    }
}

module.exports = TransactionService;