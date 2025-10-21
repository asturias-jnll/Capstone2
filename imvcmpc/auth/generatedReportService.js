const { Pool } = require('pg');
const config = require('./config');
const NotificationService = require('./notificationService');

class GeneratedReportService {
    constructor() {
        this.pool = new Pool(config.database);
        this.notificationService = new NotificationService();
    }

    /**
     * Create a new generated report
     * @param {Object} params - Report parameters
     * @returns {Object} Created report with notification
     */
    async createGeneratedReport({
        reportRequestId = null,
        generatedBy,
        branchId,
        reportType,
        config: reportConfig,
        data: reportData,
        pdfData, // base64 string
        fileName
    }) {
        console.log('🚀 Starting createGeneratedReport:', {
            reportRequestId,
            generatedBy,
            branchId,
            reportType,
            fileName: fileName ? fileName.substring(0, 50) + '...' : 'none'
        });
        
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Convert base64 to buffer for storage
            const pdfBuffer = Buffer.from(pdfData, 'base64');
            const fileSize = pdfBuffer.length;

            // Insert report into database
            const insertQuery = `
                INSERT INTO generated_reports (
                    report_request_id,
                    generated_by,
                    branch_id,
                    report_type,
                    config,
                    data,
                    file_url,
                    status,
                    created_at,
                    completed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING *
            `;

            const result = await client.query(insertQuery, [
                reportRequestId,
                generatedBy,
                branchId,
                reportType,
                JSON.stringify(reportConfig),
                JSON.stringify(reportData),
                `data:application/pdf;base64,${pdfData}`, // Store as data URL for now
                'completed'
            ]);

            const report = result.rows[0];

            // Update report request status if linked
            if (reportRequestId) {
                await client.query(
                    'UPDATE report_requests SET status = $1 WHERE id = $2',
                    ['completed', reportRequestId]
                );
            }

            // Find Finance Officer in the same branch
            const foQuery = `
                SELECT u.id, u.first_name, u.last_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.branch_id = $1 AND r.name = 'finance_officer' AND u.is_active = true
                ORDER BY u.created_at
                LIMIT 1
            `;
            const foResult = await client.query(foQuery, [branchId]);
            const financeOfficer = foResult.rows[0];

            console.log('🔍 Finance Officer Query Result:', {
                branchId,
                query: foQuery,
                resultCount: foResult.rows.length,
                financeOfficer: financeOfficer ? { id: financeOfficer.id, name: `${financeOfficer.first_name} ${financeOfficer.last_name}` } : null,
                rawFinanceOfficer: financeOfficer
            });

            // Create notification for Finance Officer
            let notification = null;
            if (financeOfficer) {
                console.log('🔔 Creating notification for Finance Officer:', {
                    userId: financeOfficer.id,
                    branchId: branchId,
                    title: `New ${reportType} Report Available`
                });
                
                try {
                    console.log('🔔 About to create notification with userId:', financeOfficer.id);
                    console.log('🔔 financeOfficer object keys:', Object.keys(financeOfficer));
                    console.log('🔔 financeOfficer.id type:', typeof financeOfficer.id);
                    
                    notification = await this.notificationService.createNotification({
                        user_id: financeOfficer.id,
                        branch_id: branchId,
                        title: `New ${reportType} Report Available`,
                        content: `Marketing Clerk has generated a ${reportType} report for your review.`,
                        type: 'report_generated',
                        reference_type: 'generated_report',
                        reference_id: report.id,
                        metadata: {
                            report_type: reportType,
                            generated_by: generatedBy,
                            report_id: report.id,
                            file_name: fileName,
                            file_size: fileSize,
                            redirect_url: `/financeofficer/html/reports.html?reportId=${report.id}`
                        }
                    });
                    console.log('✅ Notification created successfully:', notification ? notification.id : 'null');
                } catch (error) {
                    console.error('❌ Notification creation failed:', error);
                }
            } else {
                console.log('⚠️ No Finance Officer found for branch:', branchId);
            }

            await client.query('COMMIT');
            return { report, notification, fileSize };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get report by ID
     * @param {string} reportId - Report ID
     * @param {string} userId - User ID for access control
     * @param {string} userRole - User role
     * @param {number} userBranchId - User's branch ID
     * @returns {Object|null} Report data
     */
    async getReportById(reportId, userId, userRole, userBranchId) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT gr.*, 
                       u.first_name as generated_by_first_name,
                       u.last_name as generated_by_last_name,
                       b.name as branch_name
                FROM generated_reports gr
                LEFT JOIN users u ON gr.generated_by = u.id
                LEFT JOIN branches b ON gr.branch_id = b.id
                WHERE gr.id = $1
            `;
            const params = [reportId];

            // Add access control based on role
            if (userRole === 'marketing_clerk') {
                query += ' AND gr.generated_by = $2';
                params.push(userId);
            } else if (userRole === 'finance_officer') {
                query += ' AND gr.branch_id = $2';
                params.push(userBranchId);
            }

            const result = await client.query(query, params);
            const report = result.rows[0];

            if (!report) {
                return null;
            }

            // Parse JSON fields
            if (report.config && typeof report.config === 'string') {
                try {
                    report.config = JSON.parse(report.config);
                } catch (e) {
                    report.config = {};
                }
            }

            if (report.data && typeof report.data === 'string') {
                try {
                    report.data = JSON.parse(report.data);
                } catch (e) {
                    report.data = {};
                }
            }

            return report;
        } finally {
            client.release();
        }
    }

    /**
     * Get reports for a user (filtered by role)
     * @param {string} userId - User ID
     * @param {string} userRole - User role
     * @param {number} userBranchId - User's branch ID
     * @param {Object} filters - Query filters
     * @returns {Object} Reports with pagination
     */
    async getReportsByUser(userId, userRole, userBranchId, filters = {}) {
        const client = await this.pool.connect();
        try {
            const {
                page = 1,
                limit = 20,
                report_type = null,
                status = null,
                start_date = null,
                end_date = null
            } = filters;

            const offset = (page - 1) * limit;

            let whereClause = '';
            const params = [];
            let paramCount = 0;

            // Build WHERE clause based on role
            if (userRole === 'marketing_clerk') {
                whereClause = 'WHERE gr.generated_by = $1';
                params.push(userId);
                paramCount = 1;
            } else if (userRole === 'finance_officer') {
                whereClause = 'WHERE gr.branch_id = $1';
                params.push(userBranchId);
                paramCount = 1;
            }

            // Add filters
            if (report_type) {
                paramCount++;
                whereClause += whereClause ? ' AND' : 'WHERE';
                whereClause += ` gr.report_type = $${paramCount}`;
                params.push(report_type);
            }

            if (status) {
                paramCount++;
                whereClause += whereClause ? ' AND' : 'WHERE';
                whereClause += ` gr.status = $${paramCount}`;
                params.push(status);
            }

            if (start_date) {
                paramCount++;
                whereClause += whereClause ? ' AND' : 'WHERE';
                whereClause += ` gr.created_at >= $${paramCount}`;
                params.push(start_date);
            }

            if (end_date) {
                paramCount++;
                whereClause += whereClause ? ' AND' : 'WHERE';
                whereClause += ` gr.created_at <= $${paramCount}`;
                params.push(end_date);
            }

            // Count query
            const countQuery = `
                SELECT COUNT(*) as total
                FROM generated_reports gr
                ${whereClause}
            `;
            const countResult = await client.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total);

            // Data query
            const dataQuery = `
                SELECT gr.id,
                       gr.report_type,
                       gr.status,
                       gr.created_at,
                       gr.completed_at,
                       gr.file_url,
                       u.first_name as generated_by_first_name,
                       u.last_name as generated_by_last_name,
                       b.name as branch_name
                FROM generated_reports gr
                LEFT JOIN users u ON gr.generated_by = u.id
                LEFT JOIN branches b ON gr.branch_id = b.id
                ${whereClause}
                ORDER BY gr.created_at DESC
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;

            params.push(limit, offset);
            const result = await client.query(dataQuery, params);

            return {
                reports: result.rows,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } finally {
            client.release();
        }
    }

    /**
     * Get PDF data for download
     * @param {string} reportId - Report ID
     * @param {string} userId - User ID for access control
     * @param {string} userRole - User role
     * @param {number} userBranchId - User's branch ID
     * @returns {Buffer|null} PDF buffer
     */
    async getReportPDF(reportId, userId, userRole, userBranchId) {
        const client = await this.pool.connect();
        try {
            let query = 'SELECT file_url FROM generated_reports WHERE id = $1';
            const params = [reportId];

            // Add access control
            if (userRole === 'marketing_clerk') {
                query += ' AND generated_by = $2';
                params.push(userId);
            } else if (userRole === 'finance_officer') {
                query += ' AND branch_id = $2';
                params.push(userBranchId);
            }

            const result = await client.query(query, params);
            const report = result.rows[0];

            if (!report || !report.file_url) {
                return null;
            }

            // Extract base64 data from data URL
            if (report.file_url.startsWith('data:application/pdf;base64,')) {
                const base64Data = report.file_url.split(',')[1];
                return Buffer.from(base64Data, 'base64');
            }

            return null;
        } finally {
            client.release();
        }
    }

    /**
     * Mark report as viewed by Finance Officer
     * @param {string} reportId - Report ID
     * @param {string} userId - User ID
     * @returns {Object|null} Updated report
     */
    async markReportAsViewed(reportId, userId) {
        const client = await this.pool.connect();
        try {
            // Check if user has access to this report
            const accessQuery = `
                SELECT id FROM generated_reports 
                WHERE id = $1 AND branch_id = (
                    SELECT branch_id FROM users WHERE id = $2
                )
            `;
            const accessResult = await client.query(accessQuery, [reportId, userId]);

            if (accessResult.rows.length === 0) {
                return null;
            }

            // Update viewed timestamp (using created_at since updated_at doesn't exist)
            const updateQuery = `
                UPDATE generated_reports 
                SET created_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;
            const result = await client.query(updateQuery, [reportId]);

            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Update report status
     * @param {string} reportId - Report ID
     * @param {string} status - New status
     * @param {string} userId - User ID for access control
     * @returns {Object|null} Updated report
     */
    async updateReportStatus(reportId, status, userId) {
        const client = await this.pool.connect();
        try {
            const query = `
                UPDATE generated_reports 
                SET status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND generated_by = $3
                RETURNING *
            `;
            const result = await client.query(query, [status, reportId, userId]);

            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }
}

module.exports = GeneratedReportService;
