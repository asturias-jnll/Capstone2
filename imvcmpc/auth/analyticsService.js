const { Pool } = require('pg');
const config = require('./config');

class AnalyticsService {
    constructor() {
        this.pool = new Pool(config.database);
    }

    // Get analytics summary data for the 4 main cards
    async getAnalyticsSummary(filters = {}, userRole = null, isMainBranch = false, branchId = '1') {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            // Ensure dates are properly formatted for PostgreSQL with timezone handling
            const startDateFormatted = new Date(startDate + 'T00:00:00.000Z').toISOString();
            const endDateFormatted = new Date(endDate + 'T23:59:59.999Z').toISOString();
            
            if (isMainBranch) {
                // Main branch users see data from all branches
                query = `
                    SELECT 
                        COALESCE(SUM(savings_deposits), 0) as total_savings,
                        COALESCE(SUM(loan_receivables), 0) as total_disbursements,
                        COALESCE(SUM(savings_deposits) - SUM(loan_receivables), 0) as net_growth,
                        COUNT(DISTINCT payee) as active_members
                    FROM ibaan_transactions 
                    WHERE transaction_date >= $1::timestamp AND transaction_date <= $2::timestamp
                `;
                params = [startDateFormatted, endDateFormatted];
            } else {
                // Non-main branch users see data from their specific branch
                const branchTable = this.getBranchTableName(branchId);
                query = `
                    SELECT 
                        COALESCE(SUM(savings_deposits), 0) as total_savings,
                        COALESCE(SUM(loan_receivables), 0) as total_disbursements,
                        COALESCE(SUM(savings_deposits) - SUM(loan_receivables), 0) as net_growth,
                        COUNT(DISTINCT payee) as active_members
                    FROM ${branchTable} 
                    WHERE transaction_date >= $1::timestamp AND transaction_date <= $2::timestamp
                `;
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.pool.query(query, params);
            return result.rows[0] || {
                total_savings: 0,
                total_disbursements: 0,
                net_growth: 0,
                active_members: 0
            };
        } catch (error) {
            console.error('Error fetching analytics summary:', error);
            return {
                total_savings: 0,
                total_disbursements: 0,
                net_growth: 0,
                active_members: 0
            };
        }
    }

    // Get branch table name based on branch ID
    getBranchTableName(branchId) {
        const branchTables = {
            '1': 'ibaan_transactions', // Main branch (IBAAN)
            '2': 'bauan_transactions',
            '3': 'sanjose_transactions',
            '4': 'rosario_transactions',
            '5': 'sanjuan_transactions',
            '6': 'padregarcia_transactions',
            '7': 'lipacity_transactions',
            '8': 'batangascity_transactions',
            '9': 'mabinilipa_transactions',
            '10': 'calamias_transactions',
            '11': 'lemery_transactions',
            '12': 'mataasnakahoy_transactions',
            '13': 'tanauan_transactions'
        };
        return branchTables[branchId] || 'ibaan_transactions';
    }

    getBranchDisplayName(branchId) {
        const branchNames = {
            '1': 'Main Branch',
            '2': 'Bauan Branch',
            '3': 'San Jose Branch',
            '4': 'Rosario Branch',
            '5': 'San Juan Branch',
            '6': 'Padre Garcia Branch',
            '7': 'Lipa City Branch',
            '8': 'Batangas City Branch',
            '9': 'Mabini Lipa Branch',
            '10': 'Calamias Branch',
            '11': 'Lemery Branch',
            '12': 'Mataas Na Kahoy Branch',
            '13': 'Tanauan Branch'
        };
        return branchNames[branchId] || 'Main Branch';
    }

    // Get savings trend data for charts
    async getSavingsTrend(filters = {}, userRole = null, isMainBranch = false, branchId = '1') {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            // Ensure dates are properly formatted for PostgreSQL with timezone handling
            const startDateFormatted = new Date(startDate + 'T00:00:00.000Z').toISOString();
            const endDateFormatted = new Date(endDate + 'T23:59:59.999Z').toISOString();
            
            if (isMainBranch) {
                // Main branch users see data from all branches
                query = `
                    SELECT 
                        DATE_TRUNC('day', transaction_date) as date,
                        SUM(savings_deposits) as total_savings
                    FROM ibaan_transactions 
                    WHERE transaction_date >= $1::timestamp AND transaction_date <= $2::timestamp
                    GROUP BY DATE_TRUNC('day', transaction_date)
                    ORDER BY date
                `;
                params = [startDateFormatted, endDateFormatted];
            } else {
                // Non-main branch users see data from their specific branch
                const branchTable = this.getBranchTableName(branchId);
                query = `
                    SELECT 
                        DATE_TRUNC('day', transaction_date) as date,
                        SUM(savings_deposits) as total_savings
                    FROM ${branchTable} 
                    WHERE transaction_date >= $1::timestamp AND transaction_date <= $2::timestamp
                    GROUP BY DATE_TRUNC('day', transaction_date)
                    ORDER BY date
                `;
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching savings trend:', error);
            return [];
        }
    }

    // Get disbursement trend data for charts
    async getDisbursementTrend(filters = {}, userRole = null, isMainBranch = false, branchId = '1') {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            // Ensure dates are properly formatted for PostgreSQL with timezone handling
            const startDateFormatted = new Date(startDate + 'T00:00:00.000Z').toISOString();
            const endDateFormatted = new Date(endDate + 'T23:59:59.999Z').toISOString();
            
            if (isMainBranch) {
                // Main branch users see data from all branches
                query = `
                    SELECT 
                        DATE_TRUNC('day', transaction_date) as date,
                        SUM(loan_receivables) as total_disbursements
                    FROM ibaan_transactions 
                    WHERE transaction_date >= $1::timestamp AND transaction_date <= $2::timestamp
                    GROUP BY DATE_TRUNC('day', transaction_date)
                    ORDER BY date
                `;
                params = [startDateFormatted, endDateFormatted];
            } else {
                // Non-main branch users see data from their specific branch
                const branchTable = this.getBranchTableName(branchId);
                query = `
                    SELECT 
                        DATE_TRUNC('day', transaction_date) as date,
                        SUM(loan_receivables) as total_disbursements
                    FROM ${branchTable} 
                    WHERE transaction_date >= $1::timestamp AND transaction_date <= $2::timestamp
                    GROUP BY DATE_TRUNC('day', transaction_date)
                    ORDER BY date
                `;
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching disbursement trend:', error);
            return [];
        }
    }

    // Get branch performance data
    async getBranchPerformance(filters = {}, userRole = null, isMainBranch = false, branchId = '1') {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            // Ensure dates are properly formatted for PostgreSQL with timezone handling
            const startDateFormatted = new Date(startDate + 'T00:00:00.000Z').toISOString();
            const endDateFormatted = new Date(endDate + 'T23:59:59.999Z').toISOString();
            
            if (isMainBranch) {
                // Main branch users see all branches performance
                query = `
                    SELECT 
                        b.name as branch_name,
                        SUM(t.savings_deposits) as total_savings,
                        SUM(t.loan_receivables) as total_disbursements
                    FROM ibaan_transactions t
                    JOIN branches b ON t.branch_id = b.id
                    WHERE t.transaction_date >= $1::timestamp AND t.transaction_date <= $2::timestamp
                    GROUP BY b.name
                    ORDER BY total_savings DESC
                `;
                params = [startDateFormatted, endDateFormatted];
            } else {
                // Non-main branch users see their branch performance summary
                const branchTable = this.getBranchTableName(branchId);
                const branchName = this.getBranchDisplayName(branchId);
                query = `
                    SELECT 
                        '${branchName}' as branch_name,
                        SUM(savings_deposits) as total_savings,
                        SUM(loan_receivables) as total_disbursements
                    FROM ${branchTable} 
                    WHERE transaction_date >= $1::timestamp AND transaction_date <= $2::timestamp
                `;
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching branch performance:', error);
            return [];
        }
    }

    // Get member activity data
    async getMemberActivity(filters = {}, userRole = null, isMainBranch = false, branchId = '1') {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            // Ensure dates are properly formatted for PostgreSQL with timezone handling
            const startDateFormatted = new Date(startDate + 'T00:00:00.000Z').toISOString();
            const endDateFormatted = new Date(endDate + 'T23:59:59.999Z').toISOString();
            
            if (isMainBranch) {
                // Main branch users see data from all branches
                query = `
                    SELECT 
                        payee as member_name,
                        COUNT(*) as transaction_count
                    FROM ibaan_transactions 
                    WHERE transaction_date >= $1::timestamp AND transaction_date <= $2::timestamp
                    GROUP BY payee
                    ORDER BY transaction_count DESC
                    LIMIT 5
                `;
                params = [startDateFormatted, endDateFormatted];
            } else {
                // Non-main branch users see data from their specific branch
                const branchTable = this.getBranchTableName(branchId);
                query = `
                    SELECT 
                        payee as member_name,
                        COUNT(*) as transaction_count
                    FROM ${branchTable} 
                    WHERE transaction_date >= $1::timestamp AND transaction_date <= $2::timestamp
                    GROUP BY payee
                    ORDER BY transaction_count DESC
                    LIMIT 5
                `;
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching member activity:', error);
            return [];
        }
    }

    // Get top members by net position
    async getTopMembers(filters = {}, userRole = null, isMainBranch = false, branchId = '1') {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            // Ensure dates are properly formatted for PostgreSQL with timezone handling
            const startDateFormatted = new Date(startDate + 'T00:00:00.000Z').toISOString();
            const endDateFormatted = new Date(endDate + 'T23:59:59.999Z').toISOString();
            
            if (isMainBranch) {
                // Main branch users see top members from all branches
                query = `
                    SELECT 
                        payee as member_name,
                        payee as member_id,
                        SUM(savings_deposits) as total_savings,
                        SUM(loan_receivables) as total_disbursements,
                        SUM(savings_deposits - loan_receivables) as net_position,
                        COUNT(*) as transaction_count
                    FROM ibaan_transactions 
                    WHERE transaction_date >= $1::timestamp AND transaction_date <= $2::timestamp
                    GROUP BY payee
                    HAVING SUM(savings_deposits - loan_receivables) > 0
                    ORDER BY net_position DESC
                    LIMIT 10
                `;
                params = [startDateFormatted, endDateFormatted];
            } else {
                // Non-main branch users see top members from their specific branch
                const branchTable = this.getBranchTableName(branchId);
                query = `
                    SELECT 
                        payee as member_name,
                        payee as member_id,
                        SUM(savings_deposits) as total_savings,
                        SUM(loan_receivables) as total_disbursements,
                        SUM(savings_deposits - loan_receivables) as net_position,
                        COUNT(*) as transaction_count
                    FROM ${branchTable} 
                    WHERE transaction_date >= $1::timestamp AND transaction_date <= $2::timestamp
                    GROUP BY payee
                    HAVING SUM(savings_deposits - loan_receivables) > 0
                    ORDER BY net_position DESC
                    LIMIT 10
                `;
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching top members:', error);
            return [];
        }
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
