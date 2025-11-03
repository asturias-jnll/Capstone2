// IT Head Audit Logs JavaScript

let auditLogs = [];
let filteredLogs = [];
let currentPage = 1;
const logsPerPage = 20;

document.addEventListener('DOMContentLoaded', function() {
    initializeAuditLogs();
    loadAuditLogs();
    setInterval(loadAuditLogs, 120000); // Refresh every 2 minutes
});

function initializeAuditLogs() {
    checkAuthentication();
    initializeITHeadNavigation();
    initializeDynamicUserHeader();
    if (typeof initializeMobileDropdown === 'function') {
        initializeMobileDropdown();
    }
}

function checkAuthentication() {
    const accessToken = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    
    if (!accessToken || !user) {
        window.location.href = '../../logpage/login.html';
        return;
    }
    
    try {
        window.currentUser = JSON.parse(user);
        if (window.currentUser.role !== 'it_head') {
            console.error('Access denied: User is not an IT Head');
            logout();
            return;
        }
    } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
        return;
    }
}

async function loadAuditLogs() {
    try {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
            console.error('No access token found');
            auditLogs = generateMockAuditLogs();
            filteredLogs = [...auditLogs];
            displayAuditLogs();
            return;
        }
        
        console.log('Fetching audit logs from API...');
        const response = await fetch('http://localhost:3001/api/auth/audit-logs?limit=100&offset=0', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Audit Logs API Response Status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Audit Logs API Data:', data);
            
            auditLogs = data.logs || [];
            filteredLogs = [...auditLogs];
            
            if (auditLogs.length === 0) {
                console.warn('No audit logs returned from API, using mock data');
                auditLogs = generateMockAuditLogs();
                filteredLogs = [...auditLogs];
            } else {
                console.log('Loaded', auditLogs.length, 'audit logs from API');
            }
            
            displayAuditLogs();
        } else {
            console.error('Error loading audit logs from API', response.status);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            
            // Fallback to mock data
            auditLogs = generateMockAuditLogs();
            filteredLogs = [...auditLogs];
            displayAuditLogs();
        }
    } catch (error) {
        console.error('Error loading audit logs:', error);
        // Use mock data for demonstration
        auditLogs = generateMockAuditLogs();
        filteredLogs = [...auditLogs];
        displayAuditLogs();
    }
}

function generateMockAuditLogs() {
    const events = ['login', 'logout', 'password_change'];
    const statuses = ['success', 'failed'];
    const logs = [];
    
    for (let i = 0; i < 100; i++) {
        const date = new Date();
        date.setHours(date.getHours() - Math.floor(Math.random() * 72));
        
        logs.push({
            id: i + 1,
            timestamp: date.toISOString(),
            user: `user${Math.floor(Math.random() * 50)}`,
            event_type: events[Math.floor(Math.random() * events.length)],
            resource: 'auth',
            action: 'Modified',
            status: statuses[Math.floor(Math.random() * statuses.length)],
            ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
            details: 'System operation'
        });
    }
    
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function displayAuditLogs() {
    const tbody = document.getElementById('auditLogsBody');
    const start = (currentPage - 1) * logsPerPage;
    const end = start + logsPerPage;
    const paginatedLogs = filteredLogs.slice(start, end);
    
    if (paginatedLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No audit logs found</td></tr>';
        updatePaginationButtons();
        return;
    }
    
    let html = '';
    paginatedLogs.forEach(log => {
        const date = new Date(log.timestamp);
        const timeStr = date.toLocaleString();
        const statusClass = log.status === 'success' ? 'status-success' : 'status-failed';
        const statusIcon = log.status === 'success' ? '✓' : '✗';
        
        html += `
            <tr>
                <td>${timeStr}</td>
                <td>${escapeHtml(log.user)}</td>
                <td><span class="event-type">${log.event_type.replace(/_/g, ' ')}</span></td>
                <td>${escapeHtml(log.resource)}</td>
                <td>${escapeHtml(log.action)}</td>
                <td><span class="status-badge ${statusClass}">${statusIcon} ${log.status}</span></td>
                <td><code>${escapeHtml(log.ip_address)}</code></td>
                <td>${escapeHtml(log.details)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    updatePaginationButtons();
}

function filterAuditLogs() {
    const searchTerm = document.getElementById('auditSearch').value.toLowerCase();
    const eventType = document.getElementById('eventTypeFilter').value;
    const status = document.getElementById('statusFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    filteredLogs = auditLogs.filter(log => {
        const matchesSearch = !searchTerm || 
            log.user.toLowerCase().includes(searchTerm) ||
            log.event_type.toLowerCase().includes(searchTerm) ||
            log.resource.toLowerCase().includes(searchTerm);
        
        const matchesEvent = !eventType || log.event_type === eventType;
        const matchesStatus = !status || log.status === status;
        
        let matchesDate = true;
        if (dateFrom || dateTo) {
            const logDate = new Date(log.timestamp).toDateString();
            if (dateFrom) {
                matchesDate = matchesDate && new Date(log.timestamp) >= new Date(dateFrom);
            }
            if (dateTo) {
                matchesDate = matchesDate && new Date(log.timestamp) <= new Date(dateTo);
            }
        }
        
        return matchesSearch && matchesEvent && matchesStatus && matchesDate;
    });
    
    currentPage = 1;
    displayAuditLogs();
}

function resetFilters() {
    document.getElementById('auditSearch').value = '';
    document.getElementById('eventTypeFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    
    filteredLogs = [...auditLogs];
    currentPage = 1;
    displayAuditLogs();
}

function exportAuditLogs() {
    let csv = 'Timestamp,User,Event Type,Resource,Action,Status,IP Address,Details\n';
    
    filteredLogs.forEach(log => {
        csv += `"${log.timestamp}","${log.user}","${log.event_type}","${log.resource}","${log.action}","${log.status}","${log.ip_address}","${log.details}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function updatePaginationButtons() {
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    document.getElementById('pageNumber').textContent = `Page ${currentPage} of ${totalPages}`;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayAuditLogs();
        window.scrollTo(0, 0);
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayAuditLogs();
        window.scrollTo(0, 0);
    }
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
        { href: 'analytics.html', icon: 'fas fa-chart-line', text: 'Analytics' }
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
    
    const accountLink = document.querySelector('a[href="account.html"]');
    if (accountLink) {
        if (currentPage === 'account.html') {
            accountLink.classList.add('active');
        } else {
            accountLink.classList.remove('active');
        }
    }
}

function initializeDynamicUserHeader() {
    const userRole = localStorage.getItem('user_role') || 'IT Head';
    const userBranchName = localStorage.getItem('user_branch_name') || 'Main Branch';
    const userBranchLocation = localStorage.getItem('user_branch_location') || 'IBAAN';
    
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = userRole;
    }
    
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement) {
        if (userBranchLocation) {
            userRoleElement.textContent = `IMVCMPC - ${userBranchName} ${userBranchLocation}`;
        } else {
            userRoleElement.textContent = `IMVCMPC - ${userBranchName}`;
        }
    }
    
    const dropdownUserName = document.getElementById('dropdownUserName');
    if (dropdownUserName) {
        dropdownUserName.textContent = userRole;
    }
    
    const dropdownUserRole = document.getElementById('dropdownUserRole');
    if (dropdownUserRole) {
        if (userBranchLocation) {
            dropdownUserRole.textContent = `IMVCMPC - ${userBranchName} ${userBranchLocation}`;
        } else {
            dropdownUserRole.textContent = `IMVCMPC - ${userBranchName}`;
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
