const { Pool } = require('pg');
const config = require('./config');
const { 
    ChangeRequestNotFoundError, 
    BranchNotFoundError, 
    InvalidChangeRequestDataError,
    DatabaseConnectionError 
} = require('./errors');

class ChangeRequestService {
    constructor() {
        this.pool = new Pool(config.database);
    }

    // Create a new change request
    async createChangeRequest(changeRequestData, userId, branchId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            const {
                transaction_id,
                transaction_table,
                original_data,
                requested_changes,
                reason,
                request_type = 'modification'
            } = changeRequestData;

            // Find a finance officer in the same branch to assign the request to
            // Prefer production FOs (username starts with 'fo.') over test users
            const financeOfficerQuery = `
                SELECT u.id, u.first_name, u.last_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.branch_id = $1 AND r.name = 'finance_officer' AND u.is_active = true
                ORDER BY 
                    CASE WHEN u.username LIKE 'fo.%' THEN 0 ELSE 1 END,
                    u.created_at
                LIMIT 1
            `;
            
            const financeOfficerResult = await client.query(financeOfficerQuery, [branchId]);
            const assignedTo = financeOfficerResult.rows.length > 0 ? financeOfficerResult.rows[0].id : null;

            const values = [
                transaction_id,
                transaction_table,
                userId,
                assignedTo,
                branchId,
                request_type,
                JSON.stringify(original_data),
                JSON.stringify(requested_changes),
                reason
            ];

            const query = `
                INSERT INTO change_requests (
                    transaction_id, transaction_table, requested_by, assigned_to, 
                    branch_id, request_type, original_data, requested_changes, reason
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            const result = await client.query(query, values);

            await client.query('COMMIT');
            
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get change requests with optional filtering
    async getChangeRequests(filters = {}) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT 
                    cr.*,
                    u1.first_name as requested_by_first_name,
                    u1.last_name as requested_by_last_name,
                    u1.username as requested_by_username,
                    u2.first_name as assigned_to_first_name,
                    u2.last_name as assigned_to_last_name,
                    u2.username as assigned_to_username,
                    b.name as branch_name
                FROM change_requests cr
                LEFT JOIN users u1 ON cr.requested_by = u1.id
                LEFT JOIN users u2 ON cr.assigned_to = u2.id
                LEFT JOIN branches b ON cr.branch_id = b.id
                WHERE 1=1
            `;
            
            const values = [];
            let paramCount = 0;

            if (filters.branch_id) {
                paramCount++;
                query += ` AND cr.branch_id = $${paramCount}`;
                values.push(filters.branch_id);
            }

            if (filters.status) {
                paramCount++;
                query += ` AND cr.status = $${paramCount}`;
                values.push(filters.status);
            }

            if (filters.assigned_to) {
                paramCount++;
                query += ` AND cr.assigned_to = $${paramCount}`;
                values.push(filters.assigned_to);
            }

            if (filters.requested_by) {
                paramCount++;
                query += ` AND cr.requested_by = $${paramCount}`;
                values.push(filters.requested_by);
            }

            if (filters.transaction_id) {
                paramCount++;
                query += ` AND cr.transaction_id = $${paramCount}`;
                values.push(filters.transaction_id);
            }

            // Add ordering
            query += ` ORDER BY cr.created_at DESC`;

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

            console.log('Executing query:', query);
            console.log('Query values:', values);
            console.log('Filters passed to service:', filters);
            
            const result = await client.query(query, values);
            console.log('Query result rows:', result.rows.length);
            console.log('Query result data:', result.rows);
            
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Get change request by ID
    async getChangeRequestById(requestId) {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT 
                    cr.*,
                    u1.first_name as requested_by_first_name,
                    u1.last_name as requested_by_last_name,
                    u1.username as requested_by_username,
                    u2.first_name as assigned_to_first_name,
                    u2.last_name as assigned_to_last_name,
                    u2.username as assigned_to_username,
                    b.name as branch_name
                FROM change_requests cr
                LEFT JOIN users u1 ON cr.requested_by = u1.id
                LEFT JOIN users u2 ON cr.assigned_to = u2.id
                LEFT JOIN branches b ON cr.branch_id = b.id
                WHERE cr.id = $1
            `;

            const result = await client.query(query, [requestId]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // Update change request status
    async updateChangeRequestStatus(requestId, status, financeOfficerNotes = null, processedBy = null) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            const query = `
                UPDATE change_requests SET
                    status = $1,
                    finance_officer_notes = $2,
                    processed_at = CURRENT_TIMESTAMP,
                    processed_by = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `;

            const result = await client.query(query, [status, financeOfficerNotes, processedBy, requestId]);
            
            if (result.rows.length === 0) {
                throw new ChangeRequestNotFoundError(requestId);
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

    // Get count of change requests
    async getChangeRequestCount(filters = {}) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT COUNT(*) as count
                FROM change_requests cr
                WHERE 1=1
            `;
            
            const values = [];
            let paramCount = 0;

            if (filters.branch_id) {
                paramCount++;
                query += ` AND cr.branch_id = $${paramCount}`;
                values.push(filters.branch_id);
            }

            if (filters.status) {
                paramCount++;
                query += ` AND cr.status = $${paramCount}`;
                values.push(filters.status);
            }

            if (filters.assigned_to) {
                paramCount++;
                query += ` AND cr.assigned_to = $${paramCount}`;
                values.push(filters.assigned_to);
            }

            if (filters.transaction_id) {
                paramCount++;
                query += ` AND cr.transaction_id = $${paramCount}`;
                values.push(filters.transaction_id);
            }

            const result = await client.query(query, values);
            return parseInt(result.rows[0].count);
        } finally {
            client.release();
        }
    }

    // Process change request (approve and apply changes)
    async processChangeRequest(requestId, processedBy) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Get the change request
            const request = await this.getChangeRequestById(requestId);
            if (!request) {
                throw new ChangeRequestNotFoundError(requestId);
            }

            if (request.status !== 'pending') {
                throw new Error('Change request has already been processed');
            }

            // Apply the changes to the transaction
            if (request.request_type === 'modification') {
                await this.applyTransactionChanges(request);
            }

            // Update the change request status
            await this.updateChangeRequestStatus(requestId, 'approved', 'Changes applied successfully', processedBy);

            await client.query('COMMIT');
            return { success: true, message: 'Change request processed successfully' };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Apply transaction changes
    async applyTransactionChanges(request) {
        const client = await this.pool.connect();
        try {
            const { transaction_id, transaction_table, requested_changes } = request;
            
            console.log('Applying transaction changes:', {
                transaction_id,
                transaction_table,
                requested_changes
            });
            
            // Parse the requested changes
            const changes = typeof requested_changes === 'string' 
                ? JSON.parse(requested_changes) 
                : requested_changes;

            console.log('Parsed changes:', changes);

            // Build the update query dynamically
            const updateFields = [];
            const values = [];
            let paramCount = 0;

            Object.keys(changes).forEach(key => {
                if (key !== 'branch_id' && changes[key] !== undefined) {
                    paramCount++;
                    updateFields.push(`${key} = $${paramCount}`);
                    values.push(changes[key]);
                }
            });

            if (updateFields.length === 0) {
                throw new Error('No valid changes to apply');
            }

            paramCount++;
            values.push(transaction_id);

            const query = `
                UPDATE ${transaction_table} SET
                    ${updateFields.join(', ')},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCount}
            `;

            console.log('Executing update query:', query);
            console.log('Query values:', values);

            const result = await client.query(query, values);
            
            console.log('Update result:', {
                rowCount: result.rowCount,
                rows: result.rows
            });
            
            if (result.rowCount === 0) {
                throw new Error(`Transaction not found in table ${transaction_table} or could not be updated`);
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error applying transaction changes:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Validate change request data
    validateChangeRequestData(changeRequestData) {
        const errors = [];

        if (!changeRequestData.transaction_id) {
            errors.push('Transaction ID is required');
        }

        if (!changeRequestData.transaction_table) {
            errors.push('Transaction table is required');
        }

        if (!changeRequestData.original_data) {
            errors.push('Original data is required');
        }

        if (!changeRequestData.requested_changes) {
            errors.push('Requested changes are required');
        }

        if (errors.length > 0) {
            throw new InvalidChangeRequestDataError(errors);
        }

        return {
            isValid: true,
            errors: []
        };
    }

    // Close database connection
    async close() {
        await this.pool.end();
    }

    // Get change request by ID
    async getChangeRequestById(requestId) {
        const query = `
            SELECT 
                cr.*,
                u1.first_name as requested_by_first_name,
                u1.last_name as requested_by_last_name,
                u2.first_name as assigned_to_first_name,
                u2.last_name as assigned_to_last_name
            FROM change_requests cr
            LEFT JOIN users u1 ON cr.requested_by = u1.id
            LEFT JOIN users u2 ON cr.assigned_to = u2.id
            WHERE cr.id = $1
        `;
        
        const result = await this.pool.query(query, [requestId]);
        return result.rows[0] || null;
    }
}

module.exports = ChangeRequestService;
