const { Pool } = require('pg');
const config = require('./config');
const NotificationService = require('./notificationService');

class ReportRequestService {
    constructor() {
        this.pool = new Pool(config.database);
        this.notificationService = new NotificationService();
        this._reportRequestsCols = null;
    }

    async findSingleActiveFinanceOfficer(branchId) {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT u.id
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.branch_id = $1 AND r.name = 'finance_officer' AND u.is_active = true
                ORDER BY u.created_at
                LIMIT 1
            `;
            const result = await client.query(query, [branchId]);
            return result.rows.length > 0 ? result.rows[0].id : null;
        } finally {
            client.release();
        }
    }

    async createReportRequest({ requestedBy, branchId, reportType, reportConfig, foNotes = null, priority = 'normal', dueAt = null }) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Auto-assign single active Finance Officer in branch (MC requests from FO now)
            const assignedTo = await this.findSingleActiveFinanceOfficer(branchId);

            // Build insert dynamically to avoid failing when optional columns are missing
            const cols = ['requested_by','assigned_to','branch_id','report_type','report_config','status'];
            const vals = [requestedBy, assignedTo, branchId, reportType, JSON.stringify(reportConfig), 'pending'];
            const extras = { fo_notes: foNotes, priority, due_at: dueAt };

            // Check existing columns
            const colRes = await client.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name='report_requests'
            `);
            const existing = new Set(colRes.rows.map(r => r.column_name));
            if (existing.has('fo_notes')) { cols.push('fo_notes'); vals.push(extras.fo_notes); }
            if (existing.has('priority')) { cols.push('priority'); vals.push(extras.priority); }
            if (existing.has('due_at')) { cols.push('due_at'); vals.push(extras.due_at); }

            const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
            const insertQuery = `INSERT INTO report_requests (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`;
            const insertValues = vals;

            const result = await client.query(insertQuery, insertValues);
            const request = result.rows[0];

            // Do NOT create a duplicate notification here; the DB trigger
            // create_report_request_notification is responsible for inserting
            // the RR-numbered notification with metadata/redirect.
            let notification = null;

            // Best-effort de-duplication safeguard: keep only one notification
            if (assignedTo) {
                // Delete all but the earliest by created_at
                // Prefer keeping the metadata-rich row; if multiple, keep the earliest among those.
                // If none has metadata, keep the earliest by created_at.
                await client.query(
                    `
                    DELETE FROM notifications n
                    USING (
                    SELECT id
                    FROM (
                        SELECT
                        id,
                        ROW_NUMBER() OVER (
                            ORDER BY
                            CASE WHEN metadata IS NOT NULL THEN 0 ELSE 1 END,  -- keep metadata first
                            created_at ASC                                     -- then earliest
                        ) AS rn
                        FROM notifications
                        WHERE reference_type = 'report_request'
                        AND reference_id = $1
                        AND user_id = $2
                    ) ranked
                    WHERE ranked.rn > 1
                    ) d
                    WHERE n.id = d.id
                    `,
                    [request.id, assignedTo]
                );
                
                // Load the retained (metadata-rich if present) notification
                const notifRes = await client.query(
                    `
                    SELECT *
                    FROM notifications
                    WHERE reference_type = 'report_request'
                    AND reference_id = $1
                    AND user_id = $2
                    ORDER BY
                    CASE WHEN metadata IS NOT NULL THEN 0 ELSE 1 END,
                    created_at ASC
                    LIMIT 1
                    `,
                    [request.id, assignedTo]
                );
                notification = notifRes.rows[0] || null;
            }

            await client.query('COMMIT');
            return { request, notification };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateStatus(requestId, status, processedBy = null, outcome = null, failureReason = null) {
        const client = await this.pool.connect();
        try {
            // Discover available columns once
            await this._ensureReportRequestsColumns(client);

            const setClauses = [];
            const values = [];
            let p = 0;

            // status is required
            p++; setClauses.push(`status = $${p}`); values.push(status);

            if (this._reportRequestsCols.has('processed_by')) {
                p++; setClauses.push(`processed_by = COALESCE($${p}, processed_by)`); values.push(processedBy);
            }
            if (this._reportRequestsCols.has('processed_at')) {
                // only update processed_at when final states
                setClauses.push(`processed_at = CASE WHEN $1 IN ('completed','cancelled','failed') THEN CURRENT_TIMESTAMP ELSE processed_at END`);
            }
            if (this._reportRequestsCols.has('outcome')) {
                p++; setClauses.push(`outcome = COALESCE($${p}, outcome)`); values.push(outcome);
            }
            if (this._reportRequestsCols.has('failure_reason')) {
                p++; setClauses.push(`failure_reason = COALESCE($${p}, failure_reason)`); values.push(failureReason);
            }
            if (this._reportRequestsCols.has('updated_at')) {
                setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
            }

            p++; values.push(requestId);
            const query = `
                UPDATE report_requests
                SET ${setClauses.join(', ')}
                WHERE id = $${p}
                RETURNING *
            `;

            const result = await client.query(query, values);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

// Below updateStatus(...)
async getById(requestId) {
    const client = await this.pool.connect();
    try {
      await this._ensureReportRequestsColumns(client);
      const baseCols = [
        'id', 'requested_by', 'assigned_to', 'branch_id',
        'report_type', 'report_config', 'status'
      ];
      if (this._reportRequestsCols.has('created_at')) baseCols.push('created_at');
      if (this._reportRequestsCols.has('updated_at')) baseCols.push('updated_at');

      const res = await client.query(
        `SELECT ${baseCols.join(', ')} FROM report_requests WHERE id = $1`,
        [requestId]
      );
      const row = res.rows[0] || null;
      if (!row) return null;
      // Ensure report_config is a parsed object for the frontend prefilling
      if (row.report_config && typeof row.report_config === 'string') {
        try {
          row.report_config = JSON.parse(row.report_config);
        } catch (_) {
          // leave as-is if parsing fails
        }
      }
      return row;
    } finally {
      client.release();
    }
  }

// Cache report_requests columns
async _ensureReportRequestsColumns(client) {
    if (this._reportRequestsCols) return;
    const colRes = await client.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name='report_requests'
    `);
    this._reportRequestsCols = new Set(colRes.rows.map(r => r.column_name));
}
}

module.exports = ReportRequestService;


