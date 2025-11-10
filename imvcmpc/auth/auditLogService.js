const db = require('./database');

class AuditLogService {
    /**
     * Create an audit log entry
     * @param {Object} logData - Audit log data
     * @param {string} logData.user_id - User ID
     * @param {number} logData.branch_id - Branch ID (optional)
     * @param {string} logData.action - Action name (e.g., 'view_dashboard', 'generate_report')
     * @param {string} logData.resource - Resource type (e.g., 'dashboard', 'analytics', 'transactions', 'reports')
     * @param {string} logData.resource_id - Resource ID (optional)
     * @param {Object} logData.details - Additional details object
     * @param {string} logData.ip_address - IP address (optional)
     * @param {string} logData.user_agent - User agent (optional)
     * @param {string} logData.status - Status ('success' or 'failed', default: 'success')
     * @returns {Promise<Object>} Created audit log entry
     */
    async createAuditLog(logData) {
        try {
            const {
                user_id,
                branch_id = null,
                action,
                resource = null,
                resource_id = null,
                details = {},
                ip_address = null,
                user_agent = null,
                status = 'success'
            } = logData;

            if (!user_id || !action) {
                throw new Error('user_id and action are required');
            }

            const result = await db.query(`
                INSERT INTO audit_logs (user_id, branch_id, action, resource, resource_id, details, ip_address, user_agent, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `, [
                user_id,
                branch_id,
                action,
                resource,
                resource_id,
                JSON.stringify(details),
                ip_address,
                user_agent,
                status
            ]);

            return result.rows[0];
        } catch (error) {
            console.error('Error creating audit log:', error);
            throw error;
        }
    }
}

module.exports = AuditLogService;

