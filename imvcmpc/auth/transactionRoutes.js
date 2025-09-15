const express = require('express');
const router = express.Router();
const TransactionService = require('./transactionService');
const { authenticateToken, checkPermission, checkBranchAccess } = require('./middleware');

const transactionService = new TransactionService();

// Get all transactions with optional filtering
router.get('/', authenticateToken, checkPermission('transactions:read'), async (req, res) => {
    try {
        const filters = {
            branch_id: req.user.branch_id,
            ...req.query
        };

        // Convert string parameters to appropriate types
        if (filters.limit) filters.limit = parseInt(filters.limit);
        if (filters.offset) filters.offset = parseInt(filters.offset);

        const transactions = await transactionService.getTransactions(filters);
        
        res.json({
            success: true,
            data: transactions,
            count: transactions.length
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions',
            error: error.message
        });
    }
});

// Get transaction by ID
router.get('/:id', authenticateToken, checkPermission('transactions:read'), async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await transactionService.getTransactionById(id);
        
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
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction',
            error: error.message
        });
    }
});

// Create new transaction
router.post('/', authenticateToken, checkPermission('transactions:create'), async (req, res) => {
    try {
        const transactionData = req.body;
        
        // Validate transaction data
        const validation = transactionService.validateTransactionData(transactionData);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid transaction data',
                errors: validation.errors
            });
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
            req.user.branch_id
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
router.put('/:id', authenticateToken, checkPermission('transactions:update'), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Check if transaction exists and user has access
        const existingTransaction = await transactionService.getTransactionById(id);
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
        const validation = transactionService.validateTransactionData(updateData);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid transaction data',
                errors: validation.errors
            });
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
            req.user.id
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
router.delete('/:id', authenticateToken, checkPermission('transactions:delete'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if transaction exists and user has access
        const existingTransaction = await transactionService.getTransactionById(id);
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

        const deletedTransaction = await transactionService.deleteTransaction(id);

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
router.get('/stats/summary', authenticateToken, checkPermission('transactions:read'), async (req, res) => {
    try {
        const filters = {
            branch_id: req.user.branch_id,
            ...req.query
        };

        const stats = await transactionService.getTransactionStats(filters);
        
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
router.get('/stats/dashboard', authenticateToken, checkPermission('transactions:read'), async (req, res) => {
    try {
        const summary = await transactionService.getTransactionSummary(req.user.branch_id);
        
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
router.get('/recent/:limit?', authenticateToken, checkPermission('transactions:read'), async (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        const recentTransactions = await transactionService.getRecentTransactions(limit, req.user.branch_id);
        
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
router.get('/search/payee/:term', authenticateToken, checkPermission('transactions:read'), async (req, res) => {
    try {
        const { term } = req.params;
        const transactions = await transactionService.searchTransactionsByPayee(term, req.user.branch_id);
        
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
router.get('/date-range/:startDate/:endDate', authenticateToken, checkPermission('transactions:read'), async (req, res) => {
    try {
        const { startDate, endDate } = req.params;
        const transactions = await transactionService.getTransactionsByDateRange(
            startDate, 
            endDate, 
            req.user.branch_id
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
router.get('/month/:year/:month', authenticateToken, checkPermission('transactions:read'), async (req, res) => {
    try {
        const { year, month } = req.params;
        const transactions = await transactionService.getTransactionsByMonth(
            parseInt(year), 
            parseInt(month), 
            req.user.branch_id
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

module.exports = router;
