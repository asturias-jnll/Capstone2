const { Pool } = require('pg');
const config = require('./config');

// Singleton pool instance to prevent connection exhaustion
let poolInstance = null;

class AnalyticsService {
    constructor() {
        // Use singleton pool to prevent multiple connections
        if (!poolInstance) {
            poolInstance = new Pool({
                ...config.database,
                max: 10, // Reduced from default 20
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
                statement_timeout: 25000, // 25 second query timeout
            });
            console.log('📊 Analytics pool created with max 10 connections');
        }
        this.pool = poolInstance;
    }

    // Helper method to execute queries with timeout and error handling
    async executeQuery(query, params = []) {
        const startTime = Date.now();
        try {
            const result = await this.pool.query(query, params);
            const duration = Date.now() - startTime;
            if (duration > 10000) {
                console.warn(`⚠️ Slow query detected (${duration}ms):`, query.substring(0, 100));
            }
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ Query error (${duration}ms):`, error.message);
            throw error;
        }
    }

    // Get transaction count data for charts
    async getTransactionCount(filters = {}, userRole = null, isMainBranch = false, branchId = '1') {
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
                        COUNT(*) as transaction_count
                    FROM ibaan_transactions 
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    GROUP BY DATE_TRUNC('day', transaction_date)
                    ORDER BY date
                `;
                params = [startDateFormatted, endDateFormatted];
            } else {
                // Non-main branch users see data from their specific branch
                const branchTable = await this.getBranchTableName(branchId);
                query = `
                    SELECT 
                        DATE_TRUNC('day', transaction_date) as date,
                        COUNT(*) as transaction_count
                    FROM ${branchTable} 
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    GROUP BY DATE_TRUNC('day', transaction_date)
                    ORDER BY date
                `;
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.executeQuery(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching transaction count:', error);
            return [];
        }
    }

    // Get average transaction value data for charts
    async getAverageTransactionValue(filters = {}, userRole = null, isMainBranch = false, branchId = '1') {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            const startDateFormatted = startDate;
            const endDateFormatted = endDate;
            
            if (isMainBranch) {
                query = `
                    SELECT 
                        DATE_TRUNC('day', transaction_date) as date,
                        COALESCE(SUM(savings_deposits), 0) as total_savings,
                        COALESCE(SUM(loan_receivables), 0) as total_loans,
                        COUNT(*) as transaction_count,
                        COALESCE(SUM(savings_deposits) / NULLIF(COUNT(*), 0), 0) as average_savings_per_transaction,
                        COALESCE(SUM(loan_receivables) / NULLIF(COUNT(*), 0), 0) as average_loans_per_transaction
                    FROM ibaan_transactions 
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    GROUP BY DATE_TRUNC('day', transaction_date)
                    ORDER BY date
                `;
                params = [startDateFormatted, endDateFormatted];
            } else {
                const branchTable = await this.getBranchTableName(branchId);
                query = `
                    SELECT 
                        DATE_TRUNC('day', transaction_date) as date,
                        COALESCE(SUM(savings_deposits), 0) as total_savings,
                        COALESCE(SUM(loan_receivables), 0) as total_loans,
                        COUNT(*) as transaction_count,
                        COALESCE(SUM(savings_deposits) / NULLIF(COUNT(*), 0), 0) as average_savings_per_transaction,
                        COALESCE(SUM(loan_receivables) / NULLIF(COUNT(*), 0), 0) as average_loans_per_transaction
                    FROM ${branchTable} 
                    WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                    GROUP BY DATE_TRUNC('day', transaction_date)
                    ORDER BY date
                `;
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.executeQuery(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching average transaction value:', error);
            return [];
        }
    }

    // Get analytics summary data for the 4 main cards
    async getAnalyticsSummary(filters = {}, userRole = null, isMainBranch = false, branchId = '1') {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            const startDateFormatted = startDate;
            const endDateFormatted = endDate;
            
            const isFinanceOfficer = userRole === 'Finance Officer' || userRole === 'IT Head';
            
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
                const branchTable = await this.getBranchTableName(branchId);
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
            
            const result = await this.executeQuery(query, params);
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
            
            if (userRole === 'Finance Officer' || userRole === 'IT Head') {
                errorResult.net_interest_income = 0;
            } else {
                errorResult.net_growth = 0;
            }
            
            return errorResult;
        }
    }

    // Get branch table name based on branch ID (dynamically from database)
    async getBranchTableName(branchId) {
        let client;
        try {
            client = await this.pool.connect();
            const result = await client.query(`
                SELECT location FROM branches WHERE id = $1
            `, [branchId]);

            if (result.rows.length === 0) {
                return 'ibaan_transactions';
            }

            const location = result.rows[0].location;
            const tableName = `${location.toLowerCase().replace(/[^a-z0-9]/g, '')}_transactions`;
            
            return tableName;
        } catch (error) {
            console.error('Error getting branch table name:', error);
            return 'ibaan_transactions';
        } finally {
            if (client) client.release();
        }
    }

    async getBranchDisplayName(branchId) {
        let client;
        try {
            client = await this.pool.connect();
            const result = await client.query(`
                SELECT name, location FROM branches WHERE id = $1
            `, [branchId]);

            if (result.rows.length === 0) {
                return 'Main Branch';
            }

            return result.rows[0].name || result.rows[0].location;
        } catch (error) {
            console.error('Error getting branch display name:', error);
            return 'Main Branch';
        } finally {
            if (client) client.release();
        }
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
                const branchTable = await this.getBranchTableName(branchId);
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
            
            const result = await this.executeQuery(query, params);
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
                const branchTable = await this.getBranchTableName(branchId);
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
            
            const result = await this.executeQuery(query, params);
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
                const branchTable = await this.getBranchTableName(branchId);
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
            
            const result = await this.executeQuery(query, params);
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
            
            const startDateFormatted = startDate;
            const endDateFormatted = endDate;
            
            const isFinanceOfficer = userRole === 'Finance Officer' || userRole === 'IT Head';
            
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
                const branchTable = await this.getBranchTableName(branchId);
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
            
            const result = await this.executeQuery(query, params);
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
                const branchTable = await this.getBranchTableName(branchId);
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
            
            const result = await this.executeQuery(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching member activity:', error);
            return [];
        }
    }

    // Get top members by net position
    async getTopMembers(filters = {}, userRole = null, isMainBranch = false, branchId = '1', limit = 10) {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            const startDateFormatted = startDate;
            const endDateFormatted = endDate;
            const limitValue = parseInt(limit) || 10;
            
            const isFinanceOfficer = userRole === 'Finance Officer' || userRole === 'IT Head';
            
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
                        LIMIT ${limitValue}
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
                        LIMIT ${limitValue}
                    `;
                }
                params = [startDateFormatted, endDateFormatted];
            } else {
                // Non-main branch users see top members from their specific branch
                const branchTable = await this.getBranchTableName(branchId);
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
                        LIMIT ${limitValue}
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
                        LIMIT ${limitValue}
                    `;
                }
                params = [startDateFormatted, endDateFormatted];
            }
            
            const result = await this.executeQuery(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching top members:', error);
            return [];
        }
    }

    // Get top patrons by total loan receivables
    async getTopPatrons(filters = {}, userRole = null, isMainBranch = false, branchId = '1', limit = 10) {
        try {
            const { startDate, endDate } = filters;
            let query, params;
            
            const startDateFormatted = startDate;
            const endDateFormatted = endDate;
            const limitValue = parseInt(limit) || 10;
            
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
                const branchTable = await this.getBranchTableName(branchId);
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
            
            const result = await this.executeQuery(query, params);
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
            
            const startDateFormatted = startDate;
            const endDateFormatted = endDate;
            
            const isFinanceOfficer = userRole === 'Finance Officer' || userRole === 'IT Head';
            const branchesResult = await this.pool.query(`
                SELECT id, name, location, is_main_branch
                FROM branches
                ORDER BY id
            `);
            
            if (branchesResult.rows.length === 0) {
                console.log('No branches found in database');
                return [];
            }
            
            // Get all branch data using UNION ALL to combine all branch tables
            const branchQueries = [];
            const allParams = [startDateFormatted, endDateFormatted];
            
            // Build UNION query for all branches dynamically
            for (const branch of branchesResult.rows) {
                try {
                    // Get transaction table name for this branch
                    const tableName = await this.getBranchTableName(branch.id.toString());
                    
                    // Check if table exists before adding to query
                    const tableExists = await this.pool.query(`
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = $1
                        )
                    `, [tableName]);
                    
                    if (!tableExists.rows[0].exists) {
                        console.log(`Transaction table ${tableName} does not exist for branch ${branch.id}, skipping`);
                        continue;
                    }
                    
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
                            FROM ${tableName}
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
                            FROM ${tableName}
                            WHERE transaction_date::date >= $1::date AND transaction_date::date <= $2::date
                        `;
                    }
                    branchQueries.push(branchQuery);
                } catch (error) {
                    console.error(`Error processing branch ${branch.id} (${branch.name}):`, error.message);
                    // Continue with other branches even if one fails
                    continue;
                }
            }
            
            // If no valid branch queries, return empty array
            if (branchQueries.length === 0) {
                console.log('No valid branch transaction tables found');
                return [];
            }
            
            // Combine all branch queries with UNION ALL
            const finalQuery = branchQueries.join(' UNION ALL ');
            
            const result = await this.executeQuery(finalQuery, allParams);
            
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
