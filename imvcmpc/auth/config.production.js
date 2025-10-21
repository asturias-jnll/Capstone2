// Production Configuration (Render PostgreSQL)
const config = {
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: '24h',
        refreshExpiresIn: '7d',
        issuer: 'IMVCMPC-FMS',
        audience: 'IMVCMPC-Users'
    },

    // Database Configuration - Render PostgreSQL
    database: {
        connectionString: 'postgresql://imvcmpc_fms_bq79_user:jJAJxkwXBsqrl1hYhZY6WVchRLtZ18ph@dpg-d3l3qk3uibrs73ccg540-a.singapore-postgres.render.com/imvcmpc_fms_bq79',
        ssl: {
            rejectUnauthorized: false // Required for Render
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000, // Higher timeout for cloud
    },

    // Security Configuration
    security: {
        bcryptRounds: 12,
        maxLoginAttempts: 5,
        lockoutDuration: 15, // minutes
        sessionTimeout: 30, // minutes
        passwordMinLength: 8,
        requireSpecialChars: true,
        requireNumbers: true,
        requireUppercase: true
    },

    // Branch Configuration
    branches: [
        { id: 1, name: 'Main Branch', location: 'IBAAN', isMain: true },
        { id: 2, name: 'Branch 2', location: 'BAUAN', isMain: false },
        { id: 3, name: 'Branch 3', location: 'SAN JOSE', isMain: false },
        { id: 4, name: 'Branch 4', location: 'ROSARIO', isMain: false },
        { id: 5, name: 'Branch 5', location: 'SAN JUAN', isMain: false },
        { id: 6, name: 'Branch 6', location: 'PADRE GARCIA', isMain: false },
        { id: 7, name: 'Branch 7', location: 'LIPA CITY', isMain: false },
        { id: 8, name: 'Branch 8', location: 'BATANGAS CITY', isMain: false },
        { id: 9, name: 'Branch 9', location: 'MABINI LIPA', isMain: false },
        { id: 10, name: 'Branch 10', location: 'CALAMIAS', isMain: false },
        { id: 11, name: 'Branch 11', location: 'LEMERY', isMain: false },
        { id: 12, name: 'Branch 12', location: 'MATAAS NA KAHOY', isMain: false },
        { id: 13, name: 'Branch 13', location: 'TANAUAN', isMain: false }
    ],

    // Role Configuration
    roles: {
        marketing_clerk: {
            name: 'Marketing Clerk',
            permissions: [
                'read:member_data',
                'write:member_data',
                'read:basic_reports',
                'read:notifications',
                'write:notifications'
            ]
        },
        finance_officer: {
            name: 'Finance Officer',
            permissions: [
                'read:member_data',
                'read:financial_data',
                'write:financial_data',
                'read:advanced_reports',
                'write:reports',
                'read:mcda_analysis',
                'write:mcda_analysis',
                'read:budget_data',
                'write:budget_data',
                'transactions:read',
                'transactions:create',
                'transactions:update',
                'transactions:delete'
            ]
        },
        it_head: {
            name: 'IT Head',
            permissions: [
                '*:*' // Full access to all resources
            ]
        }
    },

    // AI Configuration
    ai: {
        enabled: process.env.AI_ENABLED === 'true',
        provider: process.env.AI_PROVIDER || 'openai',
        apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '',
        model: process.env.AI_MODEL || 'gpt-4-turbo-preview',
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000', 10),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7')
    }
};

module.exports = config;
