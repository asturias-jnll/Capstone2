const express = require('express');
const router = express.Router();
const TransactionService = require('./transactionService');
const { authenticateToken, checkPermission, checkBranchAccess, auditLog } = require('./middleware');
const { transactionLimiter } = require('./rateLimiter');
const { 
    TransactionNotFoundError, 
    BranchNotFoundError, 
    InvalidTransactionDataError 
} = require('./errors');

const transactionService = new TransactionService();

// Get all transactions with optional filtering
router.get('/', authenticateToken, transactionLimiter, auditLog('view_transactions', 'transactions'), checkPermission('transactions:read'), async (req, res) => {
    try {
        // Ensure branch_id is always provided for data isolation
        const filters = {
            branch_id: req.user.branch_id,
            ...req.query
        };

        // Validate that branch_id is present
        if (!filters.branch_id) {
            return res.status(400).json({
                success: false,
                message: 'Branch ID is required for data access'
            });
        }

        // Convert string parameters to appropriate types
        if (filters.limit) filters.limit = parseInt(filters.limit);
        if (filters.offset) filters.offset = parseInt(filters.offset);

        const transactions = await transactionService.getTransactions(
            filters, 
            req.user.role, 
            req.user.is_main_branch
        );
        
        res.json({
            success: true,
            data: transactions,
            count: transactions.length
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        
        if (error instanceof BranchNotFoundError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid branch ID',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions',
            error: error.message
        });
    }
});

// Get transaction by ID
router.get('/:id', authenticateToken, auditLog('view_transaction', 'transactions'), checkPermission('transactions:read'), async (req, res) => {
    try {
        // Allow all users to access transaction data (main branch, non-main branch, admin, finance officer)
        // Removed access restriction - all users can now access transaction data

        const { id } = req.params;
        const transaction = await transactionService.getTransactionById(
            id, 
            req.user.role, 
            req.user.is_main_branch
        );
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Check if user has access to this transaction's branch
        if (req.user.branch_id !== transaction.branch_id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this transaction'
            });
        }

        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('Error fetching transaction:', error);
        
        if (error instanceof TransactionNotFoundError) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction',
            error: error.message
        });
    }
});

// Create new transaction
router.post('/', authenticateToken, auditLog('create_transaction', 'transactions'), checkPermission('transactions:create'), async (req, res) => {
    try {
        // Allow all users to create transactions (main branch, non-main branch, admin, finance officer)
        // Removed access restriction - all users can now create transactions

        const transactionData = req.body;
        
        // Validate transaction data
        try {
            transactionService.validateTransactionData(transactionData);
        } catch (error) {
            if (error instanceof InvalidTransactionDataError) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction data',
                    errors: error.errors
                });
            }
            throw error;
        }

        // Calculate account balances if not provided
        if (!transactionData.cash_in_bank && !transactionData.loan_receivables && 
            !transactionData.savings_deposits && !transactionData.interest_income && 
            !transactionData.service_charge && !transactionData.sundries) {
            
            const balances = transactionService.calculateAccountBalances(
                transactionData.debit_amount || 0,
                transactionData.credit_amount || 0,
                transactionData.particulars
            );
            
            Object.assign(transactionData, balances);
        }

        const newTransaction = await transactionService.createTransaction(
            transactionData,
            req.user.id,
            req.user.branch_id,
            req.user.role,
            req.user.is_main_branch
        );

        res.status(201).json({
            success: true,
            message: 'Transaction created successfully',
            data: newTransaction
        });
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create transaction',
            error: error.message
        });
    }
});

// Update transaction
router.put('/:id', authenticateToken, auditLog('update_transaction', 'transactions'), checkPermission('transactions:update'), async (req, res) => {
    try {
        // Allow all users to update transactions (main branch, non-main branch, admin, finance officer)
        // Removed access restriction - all users can now update transactions

        const { id } = req.params;
        const updateData = req.body;

        // Check if transaction exists and user has access
        const existingTransaction = await transactionService.getTransactionById(
            id, 
            req.user.role, 
            req.user.is_main_branch
        );
        if (!existingTransaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Check if user has access to this transaction's branch
        if (req.user.branch_id !== existingTransaction.branch_id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this transaction'
            });
        }

        // Validate update data
        try {
            transactionService.validateTransactionData(updateData);
        } catch (error) {
            if (error instanceof InvalidTransactionDataError) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction data',
                    errors: error.errors
                });
            }
            throw error;
        }

        // Calculate account balances if not provided
        if (!updateData.cash_in_bank && !updateData.loan_receivables && 
            !updateData.savings_deposits && !updateData.interest_income && 
            !updateData.service_charge && !updateData.sundries) {
            
            const balances = transactionService.calculateAccountBalances(
                updateData.debit_amount || 0,
                updateData.credit_amount || 0,
                updateData.particulars
            );
            
            Object.assign(updateData, balances);
        }

        const updatedTransaction = await transactionService.updateTransaction(
            id,
            updateData,
            req.user.id,
            req.user.role,
            req.user.is_main_branch
        );

        res.json({
            success: true,
            message: 'Transaction updated successfully',
            data: updatedTransaction
        });
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update transaction',
            error: error.message
        });
    }
});

// Delete transaction
router.delete('/:id', authenticateToken, auditLog('delete_transaction', 'transactions'), checkPermission('transactions:delete'), async (req, res) => {
    try {
        // Allow all users to delete transactions (main branch, non-main branch, admin, finance officer)
        // Removed access restriction - all users can now delete transactions

        const { id } = req.params;

        // Check if transaction exists (searches across all branch tables)
        const existingTransaction = await transactionService.getTransactionById(
            id, 
            req.user.role,
            req.user.is_main_branch
        );

        if (!existingTransaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Check if user has access to this transaction's branch
        if (req.user.branch_id !== existingTransaction.branch_id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this transaction'
            });
        }

        // Delete from both tables (the service method handles this)
        const deletedTransaction = await transactionService.deleteTransaction(
            id, 
            req.user.role, 
            req.user.is_main_branch
        );

        res.json({
            success: true,
            message: 'Transaction deleted successfully',
            data: deletedTransaction
        });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete transaction',
            error: error.message
        });
    }
});

// Get transaction statistics
router.get('/stats/summary', authenticateToken, transactionLimiter, auditLog('view_transactions', 'transactions'), checkPermission('transactions:read'), async (req, res) => {
    try {
        // Allow all users to access transaction data (main branch, non-main branch, admin, finance officer)
        // Removed access restriction - all users can now access transaction data

        const filters = {
            branch_id: req.user.branch_id,
            ...req.query
        };

        const stats = await transactionService.getTransactionStats(
            filters, 
            req.user.role, 
            req.user.is_main_branch
        );
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching transaction stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction statistics',
            error: error.message
        });
    }
});

// Get transaction summary for dashboard
router.get('/stats/dashboard', authenticateToken, transactionLimiter, checkPermission('transactions:read'), async (req, res) => {
    try {
        // Allow all users to access transaction data (main branch, non-main branch, admin, finance officer)
        // Removed access restriction - all users can now access transaction data

        const summary = await transactionService.getTransactionSummary(
            req.user.branch_id, 
            req.user.role, 
            req.user.is_main_branch
        );
        
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error fetching transaction summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction summary',
            error: error.message
        });
    }
});

// Get recent transactions
router.get('/recent/:limit?', authenticateToken, transactionLimiter, checkPermission('transactions:read'), async (req, res) => {
    try {
        // Allow all users to access transaction data (main branch, non-main branch, admin, finance officer)
        // Removed access restriction - all users can now access transaction data

        const limit = parseInt(req.params.limit) || 10;
        const recentTransactions = await transactionService.getRecentTransactions(
            limit, 
            req.user.branch_id, 
            req.user.role, 
            req.user.is_main_branch
        );
        
        res.json({
            success: true,
            data: recentTransactions,
            count: recentTransactions.length
        });
    } catch (error) {
        console.error('Error fetching recent transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent transactions',
            error: error.message
        });
    }
});

// Search transactions by payee
router.get('/search/payee/:term', authenticateToken, transactionLimiter, checkPermission('transactions:read'), async (req, res) => {
    try {
        // Allow all users to access transaction data (main branch, non-main branch, admin, finance officer)
        // Removed access restriction - all users can now access transaction data

        const { term } = req.params;
        const transactions = await transactionService.searchTransactionsByPayee(
            term, 
            req.user.branch_id, 
            req.user.role, 
            req.user.is_main_branch
        );
        
        res.json({
            success: true,
            data: transactions,
            count: transactions.length
        });
    } catch (error) {
        console.error('Error searching transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search transactions',
            error: error.message
        });
    }
});

// Get transactions by date range
router.get('/date-range/:startDate/:endDate', authenticateToken, transactionLimiter, checkPermission('transactions:read'), async (req, res) => {
    try {
        // Allow all users to access transaction data (main branch, non-main branch, admin, finance officer)
        // Removed access restriction - all users can now access transaction data

        const { startDate, endDate } = req.params;
        const transactions = await transactionService.getTransactionsByDateRange(
            startDate, 
            endDate, 
            req.user.branch_id, 
            req.user.role, 
            req.user.is_main_branch
        );
        
        res.json({
            success: true,
            data: transactions,
            count: transactions.length
        });
    } catch (error) {
        console.error('Error fetching transactions by date range:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions by date range',
            error: error.message
        });
    }
});

// Get transactions by month
router.get('/month/:year/:month', authenticateToken, transactionLimiter, checkPermission('transactions:read'), async (req, res) => {
    try {
        // Allow all users to access transaction data (main branch, non-main branch, admin, finance officer)
        // Removed access restriction - all users can now access transaction data

        const { year, month } = req.params;
        const transactions = await transactionService.getTransactionsByMonth(
            parseInt(year), 
            parseInt(month), 
            req.user.branch_id, 
            req.user.role, 
            req.user.is_main_branch
        );
        
        res.json({
            success: true,
            data: transactions,
            count: transactions.length
        });
    } catch (error) {
        console.error('Error fetching transactions by month:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions by month',
            error: error.message
        });
    }
});

// Bulk upload transactions (Marketing Clerk only)
router.post('/bulk', authenticateToken, auditLog('bulk_create_transactions', 'transactions'), checkPermission('transactions:create'), async (req, res) => {
    try {
        const { transactions: transactionsData, branch_id } = req.body;
        
        // Validate that transactions array exists and is not empty
        if (!transactionsData || !Array.isArray(transactionsData) || transactionsData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Transactions array is required and must not be empty'
            });
        }
        
        // Ensure user has permission and is from the correct branch
        const userBranchId = req.user.branch_id;
        const targetBranchId = parseInt(branch_id);
        
        if (userBranchId !== targetBranchId) {
            return res.status(403).json({
                success: false,
                message: 'Cannot upload transactions to a different branch'
            });
        }
        
        // Validate each transaction
        const validationErrors = [];
        transactionsData.forEach((transaction, index) => {
            try {
                transactionService.validateTransactionData(transaction);
            } catch (error) {
                if (error instanceof InvalidTransactionDataError) {
                    validationErrors.push({
                        index: index + 1,
                        errors: error.errors
                    });
                }
            }
        });
        
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors in transaction data',
                errors: validationErrors
            });
        }
        
        // Create transactions in bulk
        const result = await transactionService.createBulkTransactions(
            transactionsData,
            req.user.id,
            userBranchId,
            req.user.role,
            req.user.is_main_branch
        );
        
        res.status(201).json({
            success: true,
            message: `Successfully created ${result.created} transactions`,
            data: {
                created: result.created,
                failed: result.failed,
                transactions: result.transactions
            }
        });
        
    } catch (error) {
        console.error('Error creating bulk transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create bulk transactions',
            error: error.message
        });
    }
});

module.exports = router;
