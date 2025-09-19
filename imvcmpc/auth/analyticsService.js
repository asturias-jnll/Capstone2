const { Pool } = require('pg');
const config = require('./config');

class AnalyticsService {
    constructor() {
        this.pool = new Pool(config.database);
    }

    // Get analytics summary data for the 4 main cards
    async getAnalyticsSummary(filters = {}, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            // Determine which table to use
            const tableName = this.getTableName(userRole, filters.branch_id, isMainBranch);
            
            let query = `
                SELECT 
                    COALESCE(SUM(savings_deposits), 0) as total_savings,
                    COALESCE(SUM(loan_receivables), 0) as total_disbursements,
                    COALESCE(SUM(savings_deposits) - SUM(loan_receivables), 0) as net_growth,
                    COUNT(DISTINCT payee) as active_members
                FROM ${tableName} t
                WHERE 1=1
            `;
            
            const values = [];
            let paramCount = 0;

            // Add date filters
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

            if (filters.branch_id) {
                paramCount++;
                query += ` AND t.branch_id = $${paramCount}`;
                values.push(filters.branch_id);
            }

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // Get savings trend data for charts
    async getSavingsTrend(filters = {}, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            const tableName = this.getTableName(userRole, filters.branch_id, isMainBranch);
            
            let query = `
                SELECT 
                    DATE_TRUNC('day', transaction_date) as date,
                    SUM(savings_deposits) as daily_savings
                FROM ${tableName} t
                WHERE savings_deposits > 0
            `;
            
            const values = [];
            let paramCount = 0;

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

            if (filters.branch_id) {
                paramCount++;
                query += ` AND t.branch_id = $${paramCount}`;
                values.push(filters.branch_id);
            }

            query += `
                GROUP BY DATE_TRUNC('day', transaction_date)
                ORDER BY date ASC
            `;

            const result = await client.query(query, values);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Get disbursement trend data for charts
    async getDisbursementTrend(filters = {}, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            const tableName = this.getTableName(userRole, filters.branch_id, isMainBranch);
            
            let query = `
                SELECT 
                    DATE_TRUNC('day', transaction_date) as date,
                    SUM(loan_receivables) as daily_disbursements
                FROM ${tableName} t
                WHERE loan_receivables > 0
            `;
            
            const values = [];
            let paramCount = 0;

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

            if (filters.branch_id) {
                paramCount++;
                query += ` AND t.branch_id = $${paramCount}`;
                values.push(filters.branch_id);
            }

            query += `
                GROUP BY DATE_TRUNC('day', transaction_date)
                ORDER BY date ASC
            `;

            const result = await client.query(query, values);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Get branch performance data
    async getBranchPerformance(filters = {}, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            const tableName = this.getTableName(userRole, filters.branch_id, isMainBranch);
            
            let query = `
                SELECT 
                    b.name as branch_name,
                    COALESCE(SUM(t.savings_deposits), 0) as total_savings,
                    COALESCE(SUM(t.loan_receivables), 0) as total_disbursements,
                    CASE 
                        WHEN COALESCE(SUM(t.savings_deposits), 0) > 0 
                        THEN ROUND(((COALESCE(SUM(t.savings_deposits), 0) - COALESCE(SUM(t.loan_receivables), 0)) / COALESCE(SUM(t.savings_deposits), 0)) * 100, 2)
                        ELSE 0 
                    END as growth_rate
                FROM branches b
                LEFT JOIN ${tableName} t ON b.id = t.branch_id
            `;
            
            const values = [];
            let paramCount = 0;

            if (filters.date_from) {
                paramCount++;
                query += ` AND (t.transaction_date >= $${paramCount} OR t.transaction_date IS NULL)`;
                values.push(filters.date_from);
            }

            if (filters.date_to) {
                paramCount++;
                query += ` AND (t.transaction_date <= $${paramCount} OR t.transaction_date IS NULL)`;
                values.push(filters.date_to);
            }

            query += `
                GROUP BY b.id, b.name
                ORDER BY total_savings DESC
            `;

            const result = await client.query(query, values);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Get member activity data
    async getMemberActivity(filters = {}, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            const tableName = this.getTableName(userRole, filters.branch_id, isMainBranch);
            
            let query = `
                SELECT 
                    payee as member_name,
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(savings_deposits), 0) as total_savings,
                    COALESCE(SUM(loan_receivables), 0) as total_disbursements,
                    COALESCE(SUM(savings_deposits) - SUM(loan_receivables), 0) as net_position
                FROM ${tableName} t
                WHERE 1=1
            `;
            
            const values = [];
            let paramCount = 0;

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

            if (filters.branch_id) {
                paramCount++;
                query += ` AND t.branch_id = $${paramCount}`;
                values.push(filters.branch_id);
            }

            query += `
                GROUP BY payee
                ORDER BY net_position DESC
                LIMIT 10
            `;

            const result = await client.query(query, values);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Get top members by net position
    async getTopMembers(filters = {}, userRole = null, isMainBranch = false) {
        const client = await this.pool.connect();
        try {
            const tableName = this.getTableName(userRole, filters.branch_id, isMainBranch);
            
            let query = `
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY (COALESCE(SUM(savings_deposits), 0) - COALESCE(SUM(loan_receivables), 0)) DESC) as rank,
                    payee as member_name,
                    COALESCE(SUM(savings_deposits), 0) as total_savings,
                    COALESCE(SUM(loan_receivables), 0) as total_disbursements,
                    COALESCE(SUM(savings_deposits) - SUM(loan_receivables), 0) as net_position
                FROM ${tableName} t
                WHERE 1=1
            `;
            
            const values = [];
            let paramCount = 0;

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

            if (filters.branch_id) {
                paramCount++;
                query += ` AND t.branch_id = $${paramCount}`;
                values.push(filters.branch_id);
            }

            query += `
                GROUP BY payee
                ORDER BY net_position DESC
                LIMIT 10
            `;

            const result = await client.query(query, values);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Determine which table to use based on user role and branch
    getTableName(userRole, branchId, isMainBranch) {
        // Main branch users (Ibaan) use ibaan_transactions
        if (isMainBranch || userRole === 'admin' || userRole === 'finance_officer') {
            return 'ibaan_transactions';
        }
        // All other users use all_branch_transactions
        return 'all_branch_transactions';
    }

    // Get date range based on filter type
    getDateRange(filter) {
        const today = new Date();
        const ranges = {
            today: {
                start: new Date(today),
                end: new Date(today)
            },
            yesterday: {
                start: new Date(today.getTime() - 24 * 60 * 60 * 1000),
                end: new Date(today.getTime() - 24 * 60 * 60 * 1000)
            },
            'last-month': {
                start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
                end: new Date(today.getFullYear(), today.getMonth(), 0)
            }
        };
        
        return ranges[filter] || ranges.today;
    }

    // Close database connection
    async close() {
        await this.pool.end();
    }
}

module.exports = AnalyticsService;
