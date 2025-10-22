const { Pool } = require('pg');
const config = require('./config');

class NotificationService {
    constructor() {
        this.pool = new Pool(config.database);
        this._hasMetadataColumn = null;
    }

    // Helper method to transform database record to frontend format
    transformToFrontendFormat(dbRecord) {
        if (!dbRecord) return null;
        
        // Map branch_id to branch code string
        const branchMap = {
            1: 'ibaamain',
            2: 'bauan',
            3: 'sanjose',
            4: 'rosario',
            5: 'sanjuan',
            6: 'padregarcia',
            7: 'lipacity',
            8: 'batangascity',
            9: 'mabini',
            10: 'calamias',
            11: 'lemery',
            12: 'mataasnakahoy',
            13: 'tanauan'
        };
        
        return {
            id: dbRecord.id,
            title: dbRecord.title,
            content: dbRecord.content,
            type: dbRecord.type,
            priority: dbRecord.priority,
            timestamp: dbRecord.created_at,
            isRead: dbRecord.is_read,
            category: dbRecord.category,
            branch: branchMap[dbRecord.branch_id] || 'unknown',
            status: dbRecord.status,
            reference_type: dbRecord.reference_type,
            reference_id: dbRecord.reference_id,
            is_highlighted: dbRecord.is_highlighted,
            user_id: dbRecord.user_id,
            branch_id: dbRecord.branch_id,
            branch_name: dbRecord.branch_name,
            read_at: dbRecord.read_at,
            metadata: dbRecord.metadata || null
        };
    }

    // Create a notification
    async createNotification(notificationData) {
        const client = await this.pool.connect();
        try {
            const {
                user_id,
                branch_id,
                title,
                content,
                category = 'system',
                type = null,
                status = 'pending',
                reference_type = null,
                reference_id = null,
                is_highlighted = false,
                priority = 'normal',
                metadata = null
            } = notificationData;

            // Detect metadata column once and cache
            if (this._hasMetadataColumn === null) {
                const colCheck = await client.query(
                    `SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='metadata'`
                );
                this._hasMetadataColumn = colCheck.rows.length > 0;
            }

            let result;
            if (this._hasMetadataColumn) {
                const query = `
                    INSERT INTO notifications (
                        user_id, branch_id, title, content, category, type, status,
                        reference_type, reference_id, is_highlighted, priority, metadata
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
                `;
                const values = [
                    user_id, branch_id, title, content, category, type, status,
                    reference_type, reference_id, is_highlighted, priority, metadata
                ];
                result = await client.query(query, values);
            } else {
                const query = `
                    INSERT INTO notifications (
                        user_id, branch_id, title, content, category, type, status,
                        reference_type, reference_id, is_highlighted, priority
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING *
                `;
                const values = [
                    user_id, branch_id, title, content, category, type, status,
                    reference_type, reference_id, is_highlighted, priority
                ];
                result = await client.query(query, values);
            }

            return this.transformToFrontendFormat(result.rows[0]);
        } finally {
            client.release();
        }
    }

    // Get notifications for a user with filters
    async getNotifications(userId, filters = {}) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT 
                    n.*,
                    b.name as branch_name,
                    u.first_name, 
                    u.last_name
                FROM notifications n
                LEFT JOIN branches b ON n.branch_id = b.id
                LEFT JOIN users u ON n.user_id = u.id
                WHERE n.user_id = $1
            `;
            
            const values = [userId];
            let paramCount = 1;

            if (filters.category) {
                paramCount++;
                query += ` AND n.category = $${paramCount}`;
                values.push(filters.category);
            }

            if (filters.is_read !== undefined) {
                paramCount++;
                query += ` AND n.is_read = $${paramCount}`;
                values.push(filters.is_read);
            }

            if (filters.is_highlighted !== undefined) {
                paramCount++;
                query += ` AND n.is_highlighted = $${paramCount}`;
                values.push(filters.is_highlighted);
            }

            if (filters.branch_id) {
                paramCount++;
                query += ` AND n.branch_id = $${paramCount}`;
                values.push(filters.branch_id);
            }

            // Add ordering
            query += ` ORDER BY n.created_at DESC`;

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
            return result.rows.map(row => this.transformToFrontendFormat(row));
        } finally {
            client.release();
        }
    }

    // Get notification by ID
    async getNotificationById(notificationId, userId) {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT 
                    n.*,
                    b.name as branch_name,
                    u.first_name, 
                    u.last_name
                FROM notifications n
                LEFT JOIN branches b ON n.branch_id = b.id
                LEFT JOIN users u ON n.user_id = u.id
                WHERE n.id = $1 AND n.user_id = $2
            `;

            const result = await client.query(query, [notificationId, userId]);
            return this.transformToFrontendFormat(result.rows[0]);
        } finally {
            client.release();
        }
    }

    // Mark notification as read
    async markAsRead(notificationId, userId) {
        const client = await this.pool.connect();
        try {
            const query = `
                UPDATE notifications 
                SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND user_id = $2
                RETURNING *
            `;

            const result = await client.query(query, [notificationId, userId]);
            return this.transformToFrontendFormat(result.rows[0]);
        } finally {
            client.release();
        }
    }

    // Update highlight status
    async updateHighlightStatus(notificationId, userId, isHighlighted) {
        const client = await this.pool.connect();
        try {
            const query = `
                UPDATE notifications 
                SET is_highlighted = $1
                WHERE id = $2 AND user_id = $3
                RETURNING *
            `;

            const result = await client.query(query, [isHighlighted, notificationId, userId]);
            return this.transformToFrontendFormat(result.rows[0]);
        } finally {
            client.release();
        }
    }

    // Unhighlight notification (used when change request is processed)
    async unhighlightNotification(referenceType, referenceId) {
        const client = await this.pool.connect();
        try {
            const query = `
                UPDATE notifications 
                SET is_highlighted = FALSE
                WHERE reference_type = $1 AND reference_id = $2
                RETURNING *
            `;

            const result = await client.query(query, [referenceType, referenceId]);
            return result.rows.map(row => this.transformToFrontendFormat(row));
        } finally {
            client.release();
        }
    }

    // Update notification status (used when report request is completed)
    async updateNotificationStatus(referenceType, referenceId, status) {
        const client = await this.pool.connect();
        try {
            // Check if updated_at column exists
            const columnCheck = await client.query(
                `SELECT column_name FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'updated_at'`
            );
            const hasUpdatedAt = columnCheck.rows.length > 0;

            let query;
            if (hasUpdatedAt) {
                query = `
                    UPDATE notifications 
                    SET status = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE reference_type = $2 AND reference_id = $3
                    RETURNING *
                `;
            } else {
                query = `
                    UPDATE notifications 
                    SET status = $1
                    WHERE reference_type = $2 AND reference_id = $3
                    RETURNING *
                `;
            }

            const result = await client.query(query, [status, referenceType, referenceId]);
            console.log(`✅ Updated ${result.rows.length} notification(s) status to '${status}' for ${referenceType}:${referenceId}`);
            return result.rows.map(row => this.transformToFrontendFormat(row));
        } finally {
            client.release();
        }
    }

    // Delete notification
    async deleteNotification(notificationId, userId) {
        const client = await this.pool.connect();
        try {
            const query = `
                DELETE FROM notifications 
                WHERE id = $1 AND user_id = $2
                RETURNING *
            `;

            const result = await client.query(query, [notificationId, userId]);
            return this.transformToFrontendFormat(result.rows[0]);
        } finally {
            client.release();
        }
    }

    // Get unread count
    async getUnreadCount(userId, filters = {}) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT COUNT(*) as count
                FROM notifications
                WHERE user_id = $1 AND is_read = FALSE
            `;
            
            const values = [userId];
            let paramCount = 1;

            if (filters.category) {
                paramCount++;
                query += ` AND category = $${paramCount}`;
                values.push(filters.category);
            }

            if (filters.branch_id) {
                paramCount++;
                query += ` AND branch_id = $${paramCount}`;
                values.push(filters.branch_id);
            }

            const result = await client.query(query, values);
            return parseInt(result.rows[0].count);
        } finally {
            client.release();
        }
    }

    // Mark all as read
    async markAllAsRead(userId, filters = {}) {
        const client = await this.pool.connect();
        try {
            let query = `
                UPDATE notifications 
                SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                WHERE user_id = $1 AND is_read = FALSE
            `;
            
            const values = [userId];
            let paramCount = 1;

            if (filters.category) {
                paramCount++;
                query += ` AND category = $${paramCount}`;
                values.push(filters.category);
            }

            if (filters.branch_id) {
                paramCount++;
                query += ` AND branch_id = $${paramCount}`;
                values.push(filters.branch_id);
            }

            query += ` RETURNING *`;

            const result = await client.query(query, values);
            return result.rows.map(row => this.transformToFrontendFormat(row));
        } finally {
            client.release();
        }
    }

    // Close database connection
    async close() {
        await this.pool.end();
    }
}

module.exports = NotificationService;
