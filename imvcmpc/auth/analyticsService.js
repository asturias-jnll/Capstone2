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
            
            // Format dates for PostgreSQL - using DATE type for timezone-independent comparison
            // This ensures queries work consistently across different server timezone settings
            const startDateFormatted = startDate; // YYYY-MM-DD format
            const endDateFormatted = endDate; // YYYY-MM-DD format
            
            // Check if user is Finance Officer to calculate net_interest_income instead of net_growth
            const isFinanceOfficer = userRole === 'Finance Officer';
            
            if (isMainBranch) {
                // Main branch users see data from all branches
                if (isFinanceOfficer) {
                    query = `
                        SELECT 
                            COALESCE(SUM(savings_deposits), 0) as total_savings,
                            COALESCE(SUM(loan_receivables), 0) as total_disbursements,
                            COALESCE(SUM(interest_income), 0) as net_interest_income,
                            COUNT(DISTINCT payee) as active_members
                        FROM ibaan_transactions 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    `;
                } else {
                    query = `
                        SELECT 
                            COALESCE(SUM(savings_deposits), 0) as total_savings,
                            COALESCE(SUM(loan_receivables), 0) as total_disbursements,
                            COALESCE(SUM(savings_deposits) - SUM(loan_receivables), 0) as net_growth,
                            COUNT(DISTINCT payee) as active_members
                        FROM ibaan_transactions 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    `;
                }
                params = [startDateFormatted, endDateFormatted];
            } else {
                // Non-main branch users see data from their specific branch
                const branchTable = this.getBranchTableName(branchId);
                if (isFinanceOfficer) {
                    query = `
                        SELECT 
                            COALESCE(SUM(savings_deposits), 0) as total_savings,
                            COALESCE(SUM(loan_receivables), 0) as total_disbursements,
                            COALESCE(SUM(interest_income), 0) as net_interest_income,
                            COUNT(DISTINCT payee) as active_members
                        FROM ${branchTable} 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    `;
                } else {
                    query = `
                        SELECT 
                            COALESCE(SUM(savings_deposits), 0) as total_savings,
                            COALESCE(SUM(loan_receivables), 0) as total_disbursements,
                            COALESCE(SUM(savings_deposits) - SUM(loan_receivables), 0) as net_growth,
                            COUNT(DISTINCT payee) as active_members
                        FROM ${branchTable} 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    `;
                }
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.pool.query(query, params);
            const defaultResult = {
                total_savings: 0,
                total_disbursements: 0,
                active_members: 0
            };
            
            if (isFinanceOfficer) {
                defaultResult.net_interest_income = 0;
            } else {
                defaultResult.net_growth = 0;
            }
            
            return result.rows[0] || defaultResult;
        } catch (error) {
            console.error('Error fetching analytics summary:', error);
            const errorResult = {
                total_savings: 0,
                total_disbursements: 0,
                active_members: 0
            };
            
            if (userRole === 'Finance Officer') {
                errorResult.net_interest_income = 0;
            } else {
                errorResult.net_growth = 0;
            }
            
            return errorResult;
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
            
            // Format dates for PostgreSQL - using DATE type for timezone-independent comparison
            const startDateFormatted = startDate; // YYYY-MM-DD format
            const endDateFormatted = endDate; // YYYY-MM-DD format
            
            if (isMainBranch) {
                // Main branch users see data from all branches
                query = `
                    SELECT 
                        DATE_TRUNC('day', transaction_date) as date,
                        SUM(savings_deposits) as total_savings
                    FROM ibaan_transactions 
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
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
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
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
            
            // Format dates for PostgreSQL - using DATE type for timezone-independent comparison
            const startDateFormatted = startDate; // YYYY-MM-DD format
            const endDateFormatted = endDate; // YYYY-MM-DD format
            
            if (isMainBranch) {
                // Main branch users see data from all branches
                query = `
                    SELECT 
                        DATE_TRUNC('day', transaction_date) as date,
                        SUM(loan_receivables) as total_disbursements
                    FROM ibaan_transactions 
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
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
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
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

    // Get interest income trend data for charts
    async getInterestIncomeTrend(filters = {}, userRole = null, isMainBranch = false, branchId = '1') {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            // Format dates for PostgreSQL - using DATE type for timezone-independent comparison
            const startDateFormatted = startDate; // YYYY-MM-DD format
            const endDateFormatted = endDate; // YYYY-MM-DD format
            
            if (isMainBranch) {
                // Main branch users see data from all branches
                query = `
                    SELECT 
                        DATE_TRUNC('day', transaction_date) as date,
                        SUM(interest_income) as interest_income
                    FROM ibaan_transactions 
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
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
                        SUM(interest_income) as interest_income
                    FROM ${branchTable} 
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    GROUP BY DATE_TRUNC('day', transaction_date)
                    ORDER BY date
                `;
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching interest income trend:', error);
            return [];
        }
    }

    // Get branch performance data - time series for charts
    async getBranchPerformance(filters = {}, userRole = null, isMainBranch = false, branchId = '1') {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            // Format dates for PostgreSQL - using DATE type for timezone-independent comparison
            const startDateFormatted = startDate; // YYYY-MM-DD format
            const endDateFormatted = endDate; // YYYY-MM-DD format
            
            // Check if user is Finance Officer to include interest_income
            const isFinanceOfficer = userRole === 'Finance Officer';
            
            if (isMainBranch) {
                // Main branch users see data from all branches
                if (isFinanceOfficer) {
                    query = `
                        SELECT 
                            DATE_TRUNC('day', transaction_date) as date,
                            SUM(savings_deposits) as total_savings,
                            SUM(loan_receivables) as total_disbursements,
                            SUM(interest_income) as interest_income
                        FROM ibaan_transactions 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                        GROUP BY DATE_TRUNC('day', transaction_date)
                        ORDER BY date
                    `;
                } else {
                    query = `
                        SELECT 
                            DATE_TRUNC('day', transaction_date) as date,
                            SUM(savings_deposits) as total_savings,
                            SUM(loan_receivables) as total_disbursements
                        FROM ibaan_transactions 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                        GROUP BY DATE_TRUNC('day', transaction_date)
                        ORDER BY date
                    `;
                }
                params = [startDateFormatted, endDateFormatted];
            } else {
                // Non-main branch users see data from their specific branch
                const branchTable = this.getBranchTableName(branchId);
                if (isFinanceOfficer) {
                    query = `
                        SELECT 
                            DATE_TRUNC('day', transaction_date) as date,
                            SUM(savings_deposits) as total_savings,
                            SUM(loan_receivables) as total_disbursements,
                            SUM(interest_income) as interest_income
                        FROM ${branchTable} 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                        GROUP BY DATE_TRUNC('day', transaction_date)
                        ORDER BY date
                    `;
                } else {
                    query = `
                        SELECT 
                            DATE_TRUNC('day', transaction_date) as date,
                            SUM(savings_deposits) as total_savings,
                            SUM(loan_receivables) as total_disbursements
                        FROM ${branchTable} 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                        GROUP BY DATE_TRUNC('day', transaction_date)
                        ORDER BY date
                    `;
                }
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
            
            // Format dates for PostgreSQL - using DATE type for timezone-independent comparison
            const startDateFormatted = startDate; // YYYY-MM-DD format
            const endDateFormatted = endDate; // YYYY-MM-DD format
            
            if (isMainBranch) {
                // Main branch users see data from all branches
                query = `
                    SELECT 
                        payee as member_name,
                        COUNT(*) as transaction_count
                    FROM ibaan_transactions 
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
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
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
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
            
            // Format dates for PostgreSQL - using DATE type for timezone-independent comparison
            const startDateFormatted = startDate; // YYYY-MM-DD format
            const endDateFormatted = endDate; // YYYY-MM-DD format
            
            // Check if user is Finance Officer to order by total_savings instead of net_position
            const isFinanceOfficer = userRole === 'Finance Officer';
            
            if (isMainBranch) {
                // Main branch users see top members from all branches
                if (isFinanceOfficer) {
                    query = `
                        SELECT 
                            payee as member_name,
                            payee as member_id,
                            SUM(savings_deposits) as total_savings,
                            SUM(loan_receivables) as total_disbursements,
                            SUM(savings_deposits - loan_receivables) as net_position,
                            COUNT(*) as transaction_count
                        FROM ibaan_transactions 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                        GROUP BY payee
                        ORDER BY total_savings DESC
                        LIMIT 10
                    `;
                } else {
                    query = `
                        SELECT 
                            payee as member_name,
                            payee as member_id,
                            SUM(savings_deposits) as total_savings,
                            SUM(loan_receivables) as total_disbursements,
                            SUM(savings_deposits - loan_receivables) as net_position,
                            COUNT(*) as transaction_count
                        FROM ibaan_transactions 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                        GROUP BY payee
                        HAVING SUM(savings_deposits - loan_receivables) > 0
                        ORDER BY net_position DESC
                        LIMIT 10
                    `;
                }
                params = [startDateFormatted, endDateFormatted];
            } else {
                // Non-main branch users see top members from their specific branch
                const branchTable = this.getBranchTableName(branchId);
                if (isFinanceOfficer) {
                    query = `
                        SELECT 
                            payee as member_name,
                            payee as member_id,
                            SUM(savings_deposits) as total_savings,
                            SUM(loan_receivables) as total_disbursements,
                            SUM(savings_deposits - loan_receivables) as net_position,
                            COUNT(*) as transaction_count
                        FROM ${branchTable} 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                        GROUP BY payee
                        ORDER BY total_savings DESC
                        LIMIT 10
                    `;
                } else {
                    query = `
                        SELECT 
                            payee as member_name,
                            payee as member_id,
                            SUM(savings_deposits) as total_savings,
                            SUM(loan_receivables) as total_disbursements,
                            SUM(savings_deposits - loan_receivables) as net_position,
                            COUNT(*) as transaction_count
                        FROM ${branchTable} 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                        GROUP BY payee
                        HAVING SUM(savings_deposits - loan_receivables) > 0
                        ORDER BY net_position DESC
                        LIMIT 10
                    `;
                }
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching top members:', error);
            return [];
        }
    }

    // Get top patrons by total loan receivables
    async getTopPatrons(filters = {}, userRole = null, isMainBranch = false, branchId = '1', limit = 5) {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            // Format dates for PostgreSQL - using DATE type for timezone-independent comparison
            const startDateFormatted = startDate; // YYYY-MM-DD format
            const endDateFormatted = endDate; // YYYY-MM-DD format
            const limitValue = parseInt(limit) || 5; // Default to 5 if not provided
            
            if (isMainBranch) {
                // Main branch users see top patrons from all branches
                query = `
                    SELECT 
                        payee as member_name,
                        SUM(loan_receivables) as total_disbursements
                    FROM ibaan_transactions 
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    GROUP BY payee
                    HAVING SUM(loan_receivables) > 0
                    ORDER BY total_disbursements DESC
                    LIMIT ${limitValue}
                `;
                params = [startDateFormatted, endDateFormatted];
            } else {
                // Non-main branch users see top patrons from their specific branch
                const branchTable = this.getBranchTableName(branchId);
                query = `
                    SELECT 
                        payee as member_name,
                        SUM(loan_receivables) as total_disbursements
                    FROM ${branchTable} 
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    GROUP BY payee
                    HAVING SUM(loan_receivables) > 0
                    ORDER BY total_disbursements DESC
                    LIMIT ${limitValue}
                `;
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching top patrons:', error);
            return [];
        }
    }

    // Get all branches performance data for IMVCMPC Branches Performance section
    async getAllBranchesPerformance(filters = {}, userRole = null) {
        try {
            const { startDate, endDate } = filters;
            
            // Format dates for PostgreSQL - using DATE type for timezone-independent comparison
            const startDateFormatted = startDate; // YYYY-MM-DD format
            const endDateFormatted = endDate; // YYYY-MM-DD format
            
            // Check if user is Finance Officer to calculate net_interest_income instead of net_position
            const isFinanceOfficer = userRole === 'Finance Officer';
            
            // Get all branch data using UNION ALL to combine all branch tables
            const branchQueries = [];
            const allParams = [startDateFormatted, endDateFormatted];
            let paramIndex = 3; // Start from $3 since $1 and $2 are used for dates
            
            // Define all 13 branches with their details
            const branches = [
                { id: '1', name: 'Main Branch', location: 'IBAAN', table: 'ibaan_transactions' },
                { id: '2', name: 'Bauan Branch', location: 'BAUAN', table: 'bauan_transactions' },
                { id: '3', name: 'San Jose Branch', location: 'SAN JOSE', table: 'sanjose_transactions' },
                { id: '4', name: 'Rosario Branch', location: 'ROSARIO', table: 'rosario_transactions' },
                { id: '5', name: 'San Juan Branch', location: 'SAN JUAN', table: 'sanjuan_transactions' },
                { id: '6', name: 'Padre Garcia Branch', location: 'PADRE GARCIA', table: 'padregarcia_transactions' },
                { id: '7', name: 'Lipa City Branch', location: 'LIPA CITY', table: 'lipacity_transactions' },
                { id: '8', name: 'Batangas City Branch', location: 'BATANGAS CITY', table: 'batangascity_transactions' },
                { id: '9', name: 'Mabini Lipa Branch', location: 'MABINI LIPA', table: 'mabinilipa_transactions' },
                { id: '10', name: 'Calamias Branch', location: 'CALAMIAS', table: 'calamias_transactions' },
                { id: '11', name: 'Lemery Branch', location: 'LEMERY', table: 'lemery_transactions' },
                { id: '12', name: 'Mataas Na Kahoy Branch', location: 'MATAAS NA KAHOY', table: 'mataasnakahoy_transactions' },
                { id: '13', name: 'Tanauan Branch', location: 'TANAUAN', table: 'tanauan_transactions' }
            ];
            
            // Build UNION query for all branches
            branches.forEach((branch, index) => {
                let branchQuery;
                if (isFinanceOfficer) {
                    branchQuery = `
                        SELECT 
                            '${branch.id}' as branch_id,
                            '${branch.name}' as branch_name,
                            '${branch.location}' as branch_location,
                            COALESCE(SUM(savings_deposits), 0) as total_savings,
                            COALESCE(SUM(loan_receivables), 0) as total_disbursements,
                            COALESCE(SUM(interest_income), 0) as net_interest_income,
                            COUNT(DISTINCT payee) as active_members,
                            COUNT(*) as total_transactions
                        FROM ${branch.table} 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    `;
                } else {
                    branchQuery = `
                        SELECT 
                            '${branch.id}' as branch_id,
                            '${branch.name}' as branch_name,
                            '${branch.location}' as branch_location,
                            COALESCE(SUM(savings_deposits), 0) as total_savings,
                            COALESCE(SUM(loan_receivables), 0) as total_disbursements,
                            COALESCE(SUM(savings_deposits) - SUM(loan_receivables), 0) as net_position,
                            COUNT(DISTINCT payee) as active_members,
                            COUNT(*) as total_transactions
                        FROM ${branch.table} 
                        WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    `;
                }
                branchQueries.push(branchQuery);
            });
            
            // Combine all branch queries with UNION ALL
            const finalQuery = branchQueries.join(' UNION ALL ');
            
            const result = await this.pool.query(finalQuery, allParams);
            
            // Sort branches by net position or net_interest_income (highest first)
            const sortedBranches = result.rows.sort((a, b) => {
                if (isFinanceOfficer) {
                    const netA = parseFloat(a.net_interest_income) || 0;
                    const netB = parseFloat(b.net_interest_income) || 0;
                    return netB - netA;
                } else {
                    const netA = parseFloat(a.net_position) || 0;
                    const netB = parseFloat(b.net_position) || 0;
                    return netB - netA;
                }
            });
            
            return sortedBranches;
        } catch (error) {
            console.error('Error fetching all branches performance:', error);
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
