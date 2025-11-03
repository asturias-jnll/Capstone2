// IT Head Reports & Analytics JavaScript

let currentUser = null;
let reportData = {};

document.addEventListener('DOMContentLoaded', function() {
    initializeReports();
    loadReportData();
});

function initializeReports() {
    checkAuthentication();
    initializeITHeadNavigation();
    initializeDynamicUserHeader();
    if (typeof initializeMobileDropdown === 'function') {
        initializeMobileDropdown();
    }
    
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('reportStartDate').valueAsDate = startDate;
    document.getElementById('reportEndDate').valueAsDate = endDate;
}

function checkAuthentication() {
    const accessToken = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    
    if (!accessToken || !user) {
        window.location.href = '../../logpage/login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(user);
        if (currentUser.role !== 'it_head') {
            logout();
            return;
        }
    } catch (error) {
        logout();
        return;
    }
}

async function loadReportData() {
    try {
        const token = localStorage.getItem('access_token');
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        // Try to fetch from API
        const response = await fetch(`http://localhost:3001/api/analytics/reports?start_date=${startDate}&end_date=${endDate}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            reportData = await response.json();
        } else {
            reportData = generateMockReportData();
        }
        
        displayReports();
    } catch (error) {
        console.error('Error loading report data:', error);
        reportData = generateMockReportData();
        displayReports();
    }
}

function generateMockReportData() {
    return {
        usage: {
            total_logins: Math.floor(Math.random() * 5000) + 1000,
            active_users: Math.floor(Math.random() * 150) + 50,
            avg_session_duration: Math.floor(Math.random() * 120) + 20,
            peak_usage_time: '10:00 AM - 11:00 AM'
        },
        compliance: {
            password_compliance: 98,
            audit_compliance: 100,
            inactive_accounts: 2,
            last_check: new Date().toLocaleDateString()
        },
        performance: {
            uptime: 99.9,
            avg_response_time: Math.floor(Math.random() * 200) + 50,
            database_size: Math.floor(Math.random() * 1000) + 100,
            error_rate: (Math.random() * 0.5).toFixed(2)
        },
        security: {
            failed_logins: Math.floor(Math.random() * 20),
            blocked_ips: Math.floor(Math.random() * 10),
            privilege_changes: Math.floor(Math.random() * 15),
            security_alerts: Math.floor(Math.random() * 5)
        }
    };
}

function displayReports() {
    // Usage Analytics
    document.getElementById('totalLogins').textContent = reportData.usage.total_logins;
    document.getElementById('activeUsersCount').textContent = reportData.usage.active_users;
    document.getElementById('avgSessionDuration').textContent = reportData.usage.avg_session_duration + ' min';
    document.getElementById('peakUsageTime').textContent = reportData.usage.peak_usage_time;
    
    // Compliance Summary
    document.getElementById('passwordCompliance').textContent = reportData.compliance.password_compliance + '%';
    document.getElementById('auditCompliance').textContent = reportData.compliance.audit_compliance + '%';
    document.getElementById('inactiveAccounts').textContent = reportData.compliance.inactive_accounts;
    document.getElementById('lastComplianceCheck').textContent = reportData.compliance.last_check;
    
    // System Performance
    document.getElementById('uptime').textContent = reportData.performance.uptime + '%';
    document.getElementById('avgResponseTime').textContent = reportData.performance.avg_response_time + ' ms';
    document.getElementById('databaseSize').textContent = reportData.performance.database_size + ' MB';
    document.getElementById('errorRate').textContent = reportData.performance.error_rate + '%';
    
    // Security Report
    document.getElementById('failedLogins').textContent = reportData.security.failed_logins;
    document.getElementById('blockedIps').textContent = reportData.security.blocked_ips;
    document.getElementById('privilegeChanges').textContent = reportData.security.privilege_changes;
    document.getElementById('securityAlerts').textContent = reportData.security.security_alerts;
}

function generateReports() {
    loadReportData();
}

function exportCurrentReport() {
    const reportType = document.getElementById('reportType').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    let csv = `Report Type: ${reportType}\nGenerated: ${new Date().toLocaleString()}\nPeriod: ${startDate} to ${endDate}\n\n`;
    
    if (reportType === 'usage' || reportType === 'usage') {
        csv += `Metric,Value\n`;
        csv += `Total Logins,${reportData.usage.total_logins}\n`;
        csv += `Active Users,${reportData.usage.active_users}\n`;
        csv += `Average Session Duration,${reportData.usage.avg_session_duration} minutes\n`;
        csv += `Peak Usage Time,${reportData.usage.peak_usage_time}\n`;
    } else if (reportType === 'compliance') {
        csv += `Metric,Value\n`;
        csv += `Password Policy Compliance,${reportData.compliance.password_compliance}%\n`;
        csv += `Audit Log Completeness,${reportData.compliance.audit_compliance}%\n`;
        csv += `Inactive Accounts,${reportData.compliance.inactive_accounts}\n`;
        csv += `Last Compliance Check,${reportData.compliance.last_check}\n`;
    } else if (reportType === 'performance') {
        csv += `Metric,Value\n`;
        csv += `Uptime,${reportData.performance.uptime}%\n`;
        csv += `Average Response Time,${reportData.performance.avg_response_time} ms\n`;
        csv += `Database Size,${reportData.performance.database_size} MB\n`;
        csv += `Error Rate,${reportData.performance.error_rate}%\n`;
    } else if (reportType === 'security') {
        csv += `Metric,Value\n`;
        csv += `Failed Login Attempts,${reportData.security.failed_logins}\n`;
        csv += `Blocked IP Addresses,${reportData.security.blocked_ips}\n`;
        csv += `Privilege Changes,${reportData.security.privilege_changes}\n`;
        csv += `Security Alerts,${reportData.security.security_alerts}\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function initializeITHeadNavigation() {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;
    
    if (navMenu.dataset.populated === 'true') {
        setActiveNavigation();
        return;
    }
    
    navMenu.innerHTML = '';
    
    const navItems = [
        { href: 'dashboard.html', icon: 'fas fa-tachometer-alt', text: 'Dashboard' },
        { href: 'usermanagement.html', icon: 'fas fa-users-cog', text: 'User Management' },
        { href: 'auditlogs.html', icon: 'fas fa-history', text: 'Audit Logs' },
        { href: 'systemconfig.html', icon: 'fas fa-sliders-h', text: 'System Config' },
        { href: 'support.html', icon: 'fas fa-ticket-alt', text: 'Support' },
        { href: 'reports.html', icon: 'fas fa-chart-bar', text: 'Reports' },
        { href: 'announcements.html', icon: 'fas fa-bullhorn', text: 'Announcements' }
    ];
    
    navItems.forEach(item => {
        const navItem = document.createElement('a');
        navItem.href = item.href;
        navItem.className = 'nav-item';
        navItem.innerHTML = `
            <i class="${item.icon}"></i>
            <span>${item.text}</span>
        `;
        navMenu.appendChild(navItem);
    });
    
    navMenu.dataset.populated = 'true';
    setActiveNavigation();
    navMenu.style.display = '';
}

function setActiveNavigation() {
    const currentPage = window.location.pathname.split('/').pop();
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href');
        const cleanHref = href.replace(/^\.\//, '').split('/').pop();
        const cleanCurrent = currentPage.replace(/^\.\//, '');
        
        if (cleanHref === cleanCurrent) {
            item.classList.add('active');
        }
    });
}

function initializeDynamicUserHeader() {
    const userRole = localStorage.getItem('user_role') || 'IT Head';
    const userBranchName = localStorage.getItem('user_branch_name') || 'Main Branch';
    const userBranchLocation = localStorage.getItem('user_branch_location') || 'IBAAN';
    
    const userNameElement = document.getElementById('userName');
    if (userNameElement) userNameElement.textContent = userRole;
    
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement) {
        userRoleElement.textContent = `IMVCMPC - ${userBranchName} ${userBranchLocation}`;
    }
}
