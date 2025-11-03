const db = require('./database');

/**
 * Seed script to populate audit_logs table with test data
 * Run this script manually to populate the database with test audit logs
 * Usage: node seedAuditLogs.js
 */

async function seedAuditLogs() {
    try {
        // Sample audit log entries
        const auditLogs = [
            {
                username: 'admin_user',
                event_type: 'login',
                resource: 'authentication',
                action: 'user_login',
                status: 'success',
                ip_address: '192.168.1.100',
                details: 'Successful login attempt',
                created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
            },
            {
                username: 'john_doe',
                event_type: 'login',
                resource: 'authentication',
                action: 'user_login',
                status: 'success',
                ip_address: '192.168.1.101',
                details: 'Successful login attempt',
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
            },
            {
                username: 'jane_smith',
                event_type: 'login',
                resource: 'authentication',
                action: 'user_login',
                status: 'success',
                ip_address: '192.168.1.102',
                details: 'Successful login attempt',
                created_at: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
            },
            {
                username: 'invalid_user',
                event_type: 'login',
                resource: 'authentication',
                action: 'user_login',
                status: 'failed',
                ip_address: '192.168.1.103',
                details: 'Invalid credentials provided',
                created_at: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
            },
            {
                username: 'admin_user',
                event_type: 'logout',
                resource: 'authentication',
                action: 'user_logout',
                status: 'success',
                ip_address: '192.168.1.100',
                details: 'User logged out successfully',
                created_at: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
            },
            {
                username: 'john_doe',
                event_type: 'password_change',
                resource: 'user_account',
                action: 'password_updated',
                status: 'success',
                ip_address: '192.168.1.101',
                details: 'Password changed successfully',
                created_at: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
            },
            {
                username: 'jane_smith',
                event_type: 'login',
                resource: 'authentication',
                action: 'user_login',
                status: 'success',
                ip_address: '192.168.1.102',
                details: 'Successful login attempt',
                created_at: new Date(Date.now() - 7 * 60 * 60 * 1000) // 7 hours ago
            },
            {
                username: 'admin_user',
                event_type: 'login',
                resource: 'authentication',
                action: 'user_login',
                status: 'success',
                ip_address: '192.168.1.100',
                details: 'Successful login attempt',
                created_at: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
            },
            {
                username: 'john_doe',
                event_type: 'logout',
                resource: 'authentication',
                action: 'user_logout',
                status: 'success',
                ip_address: '192.168.1.101',
                details: 'User logged out successfully',
                created_at: new Date(Date.now() - 9 * 60 * 60 * 1000) // 9 hours ago
            },
            {
                username: 'jane_smith',
                event_type: 'logout',
                resource: 'authentication',
                action: 'user_logout',
                status: 'success',
                ip_address: '192.168.1.102',
                details: 'User logged out successfully',
                created_at: new Date(Date.now() - 10 * 60 * 60 * 1000) // 10 hours ago
            },
            {
                username: 'test_user',
                event_type: 'login',
                resource: 'authentication',
                action: 'user_login',
                status: 'failed',
                ip_address: '192.168.1.104',
                details: 'Account locked due to multiple failed attempts',
                created_at: new Date(Date.now() - 11 * 60 * 60 * 1000) // 11 hours ago
            },
            {
                username: 'admin_user',
                event_type: 'password_change',
                resource: 'user_account',
                action: 'password_updated',
                status: 'success',
                ip_address: '192.168.1.100',
                details: 'Password changed successfully',
                created_at: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
            },
            {
                username: 'john_doe',
                event_type: 'login',
                resource: 'authentication',
                action: 'user_login',
                status: 'success',
                ip_address: '192.168.1.101',
                details: 'Successful login attempt',
                created_at: new Date(Date.now() - 13 * 60 * 60 * 1000) // 13 hours ago
            },
            {
                username: 'jane_smith',
                event_type: 'password_change',
                resource: 'user_account',
                action: 'password_updated',
                status: 'success',
                ip_address: '192.168.1.102',
                details: 'Password changed successfully',
                created_at: new Date(Date.now() - 14 * 60 * 60 * 1000) // 14 hours ago
            },
            {
                username: 'admin_user',
                event_type: 'logout',
                resource: 'authentication',
                action: 'user_logout',
                status: 'success',
                ip_address: '192.168.1.100',
                details: 'User logged out successfully',
                created_at: new Date(Date.now() - 15 * 60 * 60 * 1000) // 15 hours ago
            }
        ];

        console.log(`🌱 Seeding ${auditLogs.length} audit log entries...`);

        for (const log of auditLogs) {
            const query = `
                INSERT INTO audit_logs 
                (username, event_type, resource, action, status, ip_address, details, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT DO NOTHING
            `;

            try {
                await db.query(query, [
                    log.username,
                    log.event_type,
                    log.resource,
                    log.action,
                    log.status,
                    log.ip_address,
                    log.details,
                    log.created_at
                ]);
                console.log(`✓ Added: ${log.event_type} by ${log.username}`);
            } catch (error) {
                console.error(`✗ Error adding log: ${error.message}`);
            }
        }

        console.log('✅ Seeding completed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

// Run seeding
seedAuditLogs();
