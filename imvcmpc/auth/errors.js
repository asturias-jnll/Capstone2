// Custom error classes for better error handling

class TransactionError extends Error {
    constructor(message, code = 'TRANSACTION_ERROR') {
        super(message);
        this.name = 'TransactionError';
        this.code = code;
    }
}

class TransactionNotFoundError extends TransactionError {
    constructor(transactionId) {
        super(`Transaction with ID ${transactionId} not found`, 'TRANSACTION_NOT_FOUND');
        this.name = 'TransactionNotFoundError';
        this.transactionId = transactionId;
    }
}

class BranchAccessDeniedError extends TransactionError {
    constructor(branchId, userId) {
        super(`Access denied to branch ${branchId} for user ${userId}`, 'BRANCH_ACCESS_DENIED');
        this.name = 'BranchAccessDeniedError';
        this.branchId = branchId;
        this.userId = userId;
    }
}

class InvalidTransactionDataError extends TransactionError {
    constructor(errors) {
        super(`Invalid transaction data: ${errors.join(', ')}`, 'INVALID_TRANSACTION_DATA');
        this.name = 'InvalidTransactionDataError';
        this.errors = errors;
    }
}

class DatabaseConnectionError extends TransactionError {
    constructor(message) {
        super(`Database connection error: ${message}`, 'DATABASE_CONNECTION_ERROR');
        this.name = 'DatabaseConnectionError';
    }
}

class BranchNotFoundError extends TransactionError {
    constructor(branchId) {
        super(`Branch with ID ${branchId} not found`, 'BRANCH_NOT_FOUND');
        this.name = 'BranchNotFoundError';
        this.branchId = branchId;
    }
}

module.exports = {
    TransactionError,
    TransactionNotFoundError,
    BranchAccessDeniedError,
    InvalidTransactionDataError,
    DatabaseConnectionError,
    BranchNotFoundError
};
