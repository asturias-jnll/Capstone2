/**
 * Audit Logger Utility
 * Provides a simple interface for frontend components to log user actions
 */

class AuditLogger {
    /**
     * Log an action to the audit log system
     * @param {string} action - Action name (e.g., 'view_dashboard', 'generate_report')
     * @param {string} resource - Resource type (e.g., 'dashboard', 'analytics', 'transactions', 'reports')
     * @param {string|null} resourceId - Resource ID (optional)
     * @param {Object} details - Additional details object
     * @returns {Promise<void>}
     */
    static async logAction(action, resource = null, resourceId = null, details = {}) {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                console.warn('No access token found, skipping audit log');
                return;
            }

            // Get user context
            const userRole = localStorage.getItem('user_role');
            const userBranchId = localStorage.getItem('user_branch_id');
            const userBranchName = localStorage.getItem('user_branch_name');
            const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';

            // Build details object with user context
            const logDetails = {
                action_type: action,
                resource_info: {
                    resource: resource,
                    resource_id: resourceId
                },
                user_context: {
                    role: userRole,
                    branch_id: userBranchId,
                    branch_name: userBranchName,
                    is_main_branch: isMainBranchUser
                },
                additional_details: details,
                timestamp: new Date().toISOString()
            };

            const response = await fetch('/api/auth/audit-logs', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action,
                    resource,
                    resource_id: resourceId,
                    details: logDetails
                })
            });

            if (!response.ok) {
                console.warn('Failed to create audit log:', response.status);
            }
        } catch (error) {
            // Fail silently to not disrupt user experience
            console.warn('Error creating audit log:', error);
        }
    }

    /**
     * Log dashboard view
     */
    static async logDashboardView() {
        await this.logAction('view_dashboard', 'analytics', null, {
            page: 'dashboard'
        });
    }

    /**
     * Log analytics view
     */
    static async logAnalyticsView() {
        await this.logAction('view_analytics', 'analytics', null, {
            page: 'analytics'
        });
    }

    /**
     * Log analytics filter application
     * @param {Object} filterDetails - Filter details
     */
    static async logAnalyticsFilter(filterDetails) {
        await this.logAction('apply_analytics_filter', 'analytics', null, {
            filter_type: filterDetails.filterType || 'unknown',
            date_range: filterDetails.dateRange || {},
            branch_selection: filterDetails.branchSelection || null,
            ...filterDetails
        });
    }

    /**
     * Log notification view
     */
    static async logNotificationView() {
        await this.logAction('view_notifications', 'notifications', null, {
            page: 'notifications'
        });
    }

    /**
     * Log report generation
     * @param {string} reportType - Type of report (savings, disbursement, member, branch)
     * @param {Object} reportConfig - Report configuration
     */
    static async logReportGeneration(reportType, reportConfig = {}) {
        await this.logAction('generate_report', 'reports', null, {
            report_type: reportType,
            report_config: reportConfig
        });
    }

    /**
     * Log report view
     * @param {string} reportId - Report ID
     * @param {string} reportType - Type of report
     * @param {string} source - Source of report ('saved' or 'sent')
     */
    static async logReportView(reportId, reportType, source) {
        await this.logAction('view_report', 'reports', reportId, {
            report_type: reportType,
            source: source
        });
    }

    /**
     * Log report download
     * @param {string} reportId - Report ID
     * @param {string} reportType - Type of report
     */
    static async logReportDownload(reportId, reportType) {
        await this.logAction('download_report', 'reports', reportId, {
            report_type: reportType
        });
    }

    /**
     * Log report request
     * @param {string} reportType - Type of report requested
     * @param {Object} reportConfig - Report configuration details
     * @param {string} priority - Priority level (optional)
     */
    static async logReportRequest(reportType, reportConfig, priority = 'normal') {
        await this.logAction('request_report', 'reports', null, {
            report_type: reportType,
            report_config: reportConfig,
            priority: priority
        });
    }

    /**
     * Log report save
     * @param {string} reportType - Type of report
     * @param {Object} reportConfig - Report configuration
     */
    static async logReportSave(reportType, reportConfig) {
        await this.logAction('save_report', 'reports', null, {
            report_type: reportType,
            report_config: reportConfig
        });
    }

    /**
     * Log report send
     * @param {string} reportType - Type of report
     * @param {Object} reportConfig - Report configuration
     * @param {string} recipient - Recipient role or identifier
     */
    static async logReportSend(reportType, reportConfig, recipient) {
        await this.logAction('send_report', 'reports', null, {
            report_type: reportType,
            report_config: reportConfig,
            recipient: recipient
        });
    }

    /**
     * Log AI recommendation generation
     * @param {string} reportType - Type of report
     */
    static async logAIGeneration(reportType) {
        await this.logAction('generate_ai_recommendation', 'reports', null, {
            report_type: reportType
        });
    }
}

// Make it globally available
window.AuditLogger = AuditLogger;

