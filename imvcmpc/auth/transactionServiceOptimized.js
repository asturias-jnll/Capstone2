const { Pool } = require('pg');
const config = require('./config');
const { 
    TransactionNotFoundError, 
    BranchNotFoundError, 
    InvalidTransactionDataError,
    DatabaseConnectionError 
} = require('./errors');

class TransactionServiceOptimized {
    constructor() {
        this.pool = new Pool(config.database);
    }

    // Get all branch table names for reference
    getBranchTableMap() {
        return {
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
    }

    // Determine which table to use based on branch ID
    getTableName(branchId) {
        const branchTableMap = this.getBranchTableMap();

        if (!branchId) {
            throw new Error('Branch ID is required to determine transaction table');
        }

        const tableName = branchTableMap[branchId];
        if (!tableName) {
            throw new BranchNotFoundError(branchId);
        }

        return tableName;
    }

    // Create a new transaction in the appropriate branch table only
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

            // Insert into the branch-specific table only
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

    // Get all transactions with optional filtering - use consolidated view
    async getTransactions(filters = {}, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // CRITICAL: Always filter by branch_id for data isolation
            if (!filters.branch_id) {
                throw new Error('Branch ID is required for data access');
            }

            // Use a UNION query to get data from all branch tables
            const branchTables = Object.values(this.getBranchTableMap());
            const unionQueries = branchTables.map((tableName, index) => {
                const paramOffset = index * 2; // Each query uses 2 parameters
                return `
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
                    WHERE t.branch_id = $${paramOffset + 1}
                `;
            });

            let query = unionQueries.join(' UNION ALL ');
            const values = branchTables.map(() => filters.branch_id);
            let paramCount = values.length;

            // Add additional filters
            if (filters.payee) {
                paramCount++;
                query = `SELECT * FROM (${query}) AS combined WHERE payee ILIKE $${paramCount}`;
                values.push(`%${filters.payee}%`);
            }

            if (filters.date_from) {
                paramCount++;
                query = `SELECT * FROM (${query}) AS combined WHERE transaction_date >= $${paramCount}`;
                values.push(filters.date_from);
            }

            if (filters.date_to) {
                paramCount++;
                query = `SELECT * FROM (${query}) AS combined WHERE transaction_date <= $${paramCount}`;
                values.push(filters.date_to);
            }

            if (filters.reference) {
                paramCount++;
                query = `SELECT * FROM (${query}) AS combined WHERE reference ILIKE $${paramCount}`;
                values.push(`%${filters.reference}%`);
            }

            // Add ordering
            query += ` ORDER BY transaction_date DESC, created_at DESC`;

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

    // Get transaction by ID - search across all branch tables efficiently
    async getTransactionById(transactionId, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // Use a UNION query to search all branch tables
            const branchTables = Object.values(this.getBranchTableMap());
            const unionQueries = branchTables.map((tableName) => {
                return `
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
            });

            const query = unionQueries.join(' UNION ALL ');
            const result = await client.query(query, [transactionId]);
            
            return result.rows.length > 0 ? result.rows[0] : null;
        } finally {
            client.release();
        }
    }

    // Update transaction - find and update in the correct branch table
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

            // Find which branch table contains this transaction
            const branchTables = Object.values(this.getBranchTableMap());
            let updatedTransaction = null;
            let tableName = null;

            for (const table of branchTables) {
                const checkQuery = `SELECT branch_id FROM ${table} WHERE id = $1`;
                const checkResult = await client.query(checkQuery, [transactionId]);
                
                if (checkResult.rows.length > 0) {
                    tableName = table;
                    break;
                }
            }

            if (!tableName) {
                throw new TransactionNotFoundError(transactionId);
            }

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

            const result = await client.query(updateQuery, values);
            
            if (result.rows.length === 0) {
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

    // Delete transaction from the correct branch table
    async deleteTransaction(transactionId, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Find which branch table contains this transaction
            const branchTables = Object.values(this.getBranchTableMap());
            let deletedTransaction = null;
            let tableName = null;

            for (const table of branchTables) {
                const checkQuery = `SELECT * FROM ${table} WHERE id = $1`;
                const checkResult = await client.query(checkQuery, [transactionId]);
                
                if (checkResult.rows.length > 0) {
                    tableName = table;
                    deletedTransaction = checkResult.rows[0];
                    break;
                }
            }

            if (!tableName) {
                await client.query('ROLLBACK');
                throw new TransactionNotFoundError(transactionId);
            }

            // Delete from the specific branch table
            const deleteQuery = `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`;
            const result = await client.query(deleteQuery, [transactionId]);
            
            if (result.rows.length === 0) {
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

    // Get transaction statistics - use UNION query for all branches
    async getTransactionStats(filters = {}, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // CRITICAL: Always filter by branch_id for data isolation
            if (!filters.branch_id) {
                throw new Error('Branch ID is required for data access');
            }

            // Use UNION query to get stats from all branch tables
            const branchTables = Object.values(this.getBranchTableMap());
            const unionQueries = branchTables.map((tableName, index) => {
                const paramOffset = index * 2;
                return `
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
                    WHERE t.branch_id = $${paramOffset + 1}
                `;
            });

            let query = `
                SELECT 
                    SUM(total_transactions) as total_transactions,
                    SUM(total_debits) as total_debits,
                    SUM(total_credits) as total_credits,
                    SUM(total_cash_in_bank) as total_cash_in_bank,
                    SUM(total_loan_receivables) as total_loan_receivables,
                    SUM(total_savings_deposits) as total_savings_deposits,
                    SUM(total_interest_income) as total_interest_income,
                    SUM(total_service_charge) as total_service_charge,
                    SUM(total_sundries) as total_sundries
                FROM (${unionQueries.join(' UNION ALL ')}) AS combined_stats
            `;
            
            const values = branchTables.map(() => filters.branch_id);
            let paramCount = values.length;

            if (filters.date_from) {
                paramCount++;
                query = `
                    SELECT 
                        SUM(total_transactions) as total_transactions,
                        SUM(total_debits) as total_debits,
                        SUM(total_credits) as total_credits,
                        SUM(total_cash_in_bank) as total_cash_in_bank,
                        SUM(total_loan_receivables) as total_loan_receivables,
                        SUM(total_savings_deposits) as total_savings_deposits,
                        SUM(total_interest_income) as total_interest_income,
                        SUM(total_service_charge) as total_service_charge,
                        SUM(total_sundries) as total_sundries
                    FROM (${unionQueries.join(' UNION ALL ')}) AS combined_stats
                    WHERE transaction_date >= $${paramCount}
                `;
                values.push(filters.date_from);
            }

            if (filters.date_to) {
                paramCount++;
                query += ` AND transaction_date <= $${paramCount}`;
                values.push(filters.date_to);
            }

            const result = await client.query(query, values);
            return result.rows[0];
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

    // Close database connection
    async close() {
        await this.pool.end();
    }
}

module.exports = TransactionServiceOptimized;
