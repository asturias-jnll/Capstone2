const { Pool } = require('pg');
const config = require('./config');
const { 
    TransactionNotFoundError, 
    BranchNotFoundError, 
    InvalidTransactionDataError,
    DatabaseConnectionError 
} = require('./errors');

class TransactionService {
    constructor() {
        this.pool = new Pool(config.database);
    }

    // Determine which table to use based on branch ID
    getTableName(branchId) {
        const branchTableMap = {
            1: 'ibaan_transactions',        // Main Branch - IBAAN
            2: 'bauan_transactions',        // Branch 2 - BAUAN
            3: 'sanjose_transactions',      // Branch 3 - SAN JOSE
            4: 'rosario_transactions',      // Branch 4 - ROSARIO
            5: 'sanjuan_transactions',      // Branch 5 - SAN JUAN
            6: 'padregarcia_transactions',  // Branch 6 - PADRE GARCIA
            7: 'lipacity_transactions',     // Branch 7 - LIPA CITY
            8: 'batangascity_transactions', // Branch 8 - BATANGAS CITY
            9: 'mabinilipa_transactions',   // Branch 9 - MABINI LIPA
            10: 'calamias_transactions',    // Branch 10 - CALAMIAS
            11: 'lemery_transactions',      // Branch 11 - LEMERY
            12: 'mataasnakahoy_transactions', // Branch 12 - MATAAS NA KAHOY
            13: 'tanauan_transactions'      // Branch 13 - TANAUAN
        };

        if (!branchId) {
            throw new Error('Branch ID is required to determine transaction table');
        }

        const tableName = branchTableMap[branchId];
        if (!tableName) {
            throw new BranchNotFoundError(branchId);
        }

        return tableName;
    }

    // Create a new transaction in the appropriate branch table
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

            // Generate a single UUID for this transaction
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

            // Get the appropriate table name for this branch
            const tableName = this.getTableName(branchId);

            // Insert into the branch-specific table
            const query = `
                INSERT INTO ${tableName} (
                    id, transaction_date, payee, reference, cross_reference, check_number,
                    particulars, debit_amount, credit_amount, cash_in_bank,
                    loan_receivables, savings_deposits, interest_income,
                    service_charge, sundries, branch_id, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING *
            `;

            const result = await client.query(query, values);

            await client.query('COMMIT');
            
            // Return the transaction data
            return result.rows[0];
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
            // CRITICAL: Always filter by branch_id for data isolation
            if (!filters.branch_id) {
                throw new Error('Branch ID is required for data access');
            }

            // Determine which table to use based on branch
            const tableName = this.getTableName(filters.branch_id);
            
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
                WHERE t.branch_id = $1
            `;
            
            const values = [filters.branch_id];
            let paramCount = 1;

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

    // Get transaction by ID - search across all branch tables
    async getTransactionById(transactionId, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // Get all branch table names
            const branchTableMap = {
                1: 'ibaan_transactions',        // Main Branch - IBAAN
                2: 'bauan_transactions',        // Branch 2 - BAUAN
                3: 'sanjose_transactions',      // Branch 3 - SAN JOSE
                4: 'rosario_transactions',      // Branch 4 - ROSARIO
                5: 'sanjuan_transactions',      // Branch 5 - SAN JUAN
                6: 'padregarcia_transactions',  // Branch 6 - PADRE GARCIA
                7: 'lipacity_transactions',     // Branch 7 - LIPA CITY
                8: 'batangascity_transactions', // Branch 8 - BATANGAS CITY
                9: 'mabinilipa_transactions',   // Branch 9 - MABINI LIPA
                10: 'calamias_transactions',    // Branch 10 - CALAMIAS
                11: 'lemery_transactions',      // Branch 11 - LEMERY
                12: 'mataasnakahoy_transactions', // Branch 12 - MATAAS NA KAHOY
                13: 'tanauan_transactions'      // Branch 13 - TANAUAN
            };

            // Search through each branch table to find the transaction
            for (const [branchId, tableName] of Object.entries(branchTableMap)) {
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
                if (result.rows.length > 0) {
                    return result.rows[0];
                }
            }

            return null;
        } finally {
            client.release();
        }
    }

    // Update transaction - search across branch tables to find and update
    async updateTransaction(transactionId, updateData, userId, userRole = null, isMainBranch = false) {
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
            } = updateData;

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

            // Get all branch table names to search for the transaction
            const branchTableMap = {
                1: 'ibaan_transactions',        // Main Branch - IBAAN
                2: 'bauan_transactions',        // Branch 2 - BAUAN
                3: 'sanjose_transactions',      // Branch 3 - SAN JOSE
                4: 'rosario_transactions',      // Branch 4 - ROSARIO
                5: 'sanjuan_transactions',      // Branch 5 - SAN JUAN
                6: 'padregarcia_transactions',  // Branch 6 - PADRE GARCIA
                7: 'lipacity_transactions',     // Branch 7 - LIPA CITY
                8: 'batangascity_transactions', // Branch 8 - BATANGAS CITY
                9: 'mabinilipa_transactions',   // Branch 9 - MABINI LIPA
                10: 'calamias_transactions',    // Branch 10 - CALAMIAS
                11: 'lemery_transactions',      // Branch 11 - LEMERY
                12: 'mataasnakahoy_transactions', // Branch 12 - MATAAS NA KAHOY
                13: 'tanauan_transactions'      // Branch 13 - TANAUAN
            };

            let transactionFound = false;
            let result = null;

            // Search through each branch table to find and update the transaction
            for (const [branchId, tableName] of Object.entries(branchTableMap)) {
                // First check if transaction exists in this table
                const checkQuery = `SELECT id FROM ${tableName} WHERE id = $1`;
                const checkResult = await client.query(checkQuery, [transactionId]);
                
                if (checkResult.rows.length > 0) {
                    // Update in the specific branch table
                    const updateQuery = `
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

                    result = await client.query(updateQuery, values);
                    transactionFound = true;
                    break;
                }
            }
            
            if (!transactionFound) {
                await client.query('ROLLBACK');
                throw new TransactionNotFoundError(transactionId);
            }
            
            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Delete transaction from branch table
    async deleteTransaction(transactionId, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Get all branch table names to search for the transaction
            const branchTableMap = {
                1: 'ibaan_transactions',        // Main Branch - IBAAN
                2: 'bauan_transactions',        // Branch 2 - BAUAN
                3: 'sanjose_transactions',      // Branch 3 - SAN JOSE
                4: 'rosario_transactions',      // Branch 4 - ROSARIO
                5: 'sanjuan_transactions',      // Branch 5 - SAN JUAN
                6: 'padregarcia_transactions',  // Branch 6 - PADRE GARCIA
                7: 'lipacity_transactions',     // Branch 7 - LIPA CITY
                8: 'batangascity_transactions', // Branch 8 - BATANGAS CITY
                9: 'mabinilipa_transactions',   // Branch 9 - MABINI LIPA
                10: 'calamias_transactions',    // Branch 10 - CALAMIAS
                11: 'lemery_transactions',      // Branch 11 - LEMERY
                12: 'mataasnakahoy_transactions', // Branch 12 - MATAAS NA KAHOY
                13: 'tanauan_transactions'      // Branch 13 - TANAUAN
            };

            let transactionFound = false;
            let result = null;

            // Search through each branch table to find and delete the transaction
            for (const [branchId, tableName] of Object.entries(branchTableMap)) {
                // First check if transaction exists in this table
                const checkQuery = `SELECT id FROM ${tableName} WHERE id = $1`;
                const checkResult = await client.query(checkQuery, [transactionId]);
                
                if (checkResult.rows.length > 0) {
                    // Delete from the specific branch table
                    const deleteQuery = `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`;
                    result = await client.query(deleteQuery, [transactionId]);
                    transactionFound = true;
                    break;
                }
            }
            
            if (!transactionFound) {
                await client.query('ROLLBACK');
                throw new TransactionNotFoundError(transactionId);
            }
            
            await client.query('COMMIT');
            
            // Return the deleted transaction data
            return result.rows[0];
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
            // CRITICAL: Always filter by branch_id for data isolation
            if (!filters.branch_id) {
                throw new Error('Branch ID is required for data access');
            }

            // Determine which table to use based on branch
            const tableName = this.getTableName(filters.branch_id);
            
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
                WHERE t.branch_id = $1
            `;
            
            const values = [filters.branch_id];
            let paramCount = 1;

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
            // Branch ID is required for data isolation
            if (!branchId) {
                throw new Error('Branch ID is required for data access');
            }

            // Determine which table to use based on branch
            const tableName = this.getTableName(branchId);
            
            let query = `
                SELECT 
                    t.*,
                    b.name as branch_name,
                    b.location as branch_location
                FROM ${tableName} t
                LEFT JOIN branches b ON t.branch_id = b.id
                WHERE t.payee ILIKE $1 AND t.branch_id = $2
            `;
            
            const values = [`%${searchTerm}%`, branchId];

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
            // Branch ID is required for data isolation
            if (!branchId) {
                throw new Error('Branch ID is required for data access');
            }

            // Determine which table to use based on branch
            const tableName = this.getTableName(branchId);
            
            let query = `
                SELECT 
                    t.*,
                    b.name as branch_name,
                    b.location as branch_location
                FROM ${tableName} t
                LEFT JOIN branches b ON t.branch_id = b.id
                WHERE t.transaction_date BETWEEN $1 AND $2 AND t.branch_id = $3
            `;
            
            const values = [startDate, endDate, branchId];

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

        if (errors.length > 0) {
            throw new InvalidTransactionDataError(errors);
        }

        return {
            isValid: true,
            errors: []
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
            // Branch ID is required for data isolation
            if (!branchId) {
                throw new Error('Branch ID is required for data access');
            }

            // Determine which table to use based on branch
            const tableName = this.getTableName(branchId);
            
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
                WHERE t.branch_id = $1
            `;
            
            const values = [branchId];

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
            // Branch ID is required for data isolation
            if (!branchId) {
                throw new Error('Branch ID is required for data access');
            }

            // Determine which table to use based on branch
            const tableName = this.getTableName(branchId);
            
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
                WHERE t.branch_id = $1
                ORDER BY t.created_at DESC LIMIT $2
            `;
            
            const values = [branchId, limit];

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
            // Branch ID is required for data isolation
            if (!branchId) {
                throw new Error('Branch ID is required for data access');
            }

            // Determine which table to use based on branch
            const tableName = this.getTableName(branchId);
            
            let query = `
                SELECT 
                    t.*,
                    b.name as branch_name,
                    b.location as branch_location
                FROM ${tableName} t
                LEFT JOIN branches b ON t.branch_id = b.id
                WHERE EXTRACT(YEAR FROM t.transaction_date) = $1 
                AND EXTRACT(MONTH FROM t.transaction_date) = $2
                AND t.branch_id = $3
            `;
            
            const values = [year, month, branchId];

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