// IT Head Dashboard JavaScript

let dashboardData = {
    totalUsers: 0,
    activeBranches: 0,
    systemHealth: 'Good',
    pendingAlerts: 0,
    newLogins: 0,
    activeSessions: 0,
    operationCount: 0,
    financeOfficers: 0,
    marketingClerks: 0,
    itHeads: 0
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    loadDashboardData();
    setInterval(loadDashboardData, 60000); // Refresh every minute
});

// Initialize Dashboard
function initializeDashboard() {
    checkAuthentication();
    initializeITHeadNavigation();
    initializeDynamicUserHeader();
    if (typeof initializeMobileDropdown === 'function') {
        initializeMobileDropdown();
    }
}

// Check authentication and redirect
function checkAuthentication() {
    const accessToken = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    
    if (!accessToken || !user) {
        window.location.href = '../../logpage/login.html';
        return;
    }
    
    try {
        window.currentUser = JSON.parse(user);
        
        // Verify user has IT Head role
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

// Load Dashboard Data
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('access_token');
        
        // Fetch user statistics
        const usersResponse = await fetch('http://localhost:3001/api/auth/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            const users = usersData.users || [];
            
            dashboardData.totalUsers = users.length;
            dashboardData.financeOfficers = users.filter(u => u.role_name === 'finance_officer').length;
            dashboardData.marketingClerks = users.filter(u => u.role_name === 'marketing_clerk').length;
            dashboardData.itHeads = users.filter(u => u.role_name === 'it_head').length;
            
            updateMetrics();
        }
        
        // Fetch branches
        const branchesResponse = await fetch('http://localhost:3001/api/auth/branches', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (branchesResponse.ok) {
            const branchesData = await branchesResponse.json();
            dashboardData.activeBranches = branchesData.branches ? branchesData.branches.length : 0;
            updateMetrics();
        }
        
        // Simulate system status data (would come from actual monitoring service)
        updateSystemStatus();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update Metrics Display
function updateMetrics() {
    document.getElementById('totalUsers').textContent = dashboardData.totalUsers;
    document.getElementById('activeBranches').textContent = dashboardData.activeBranches;
    document.getElementById('systemHealth').textContent = dashboardData.systemHealth;
    document.getElementById('pendingAlerts').textContent = dashboardData.pendingAlerts;
    
    document.getElementById('newLogins').textContent = Math.floor(Math.random() * 50);
    document.getElementById('activeSessions').textContent = Math.floor(Math.random() * 30);
    document.getElementById('operationCount').textContent = Math.floor(Math.random() * 1000);
    
    document.getElementById('financeOfficerCount').textContent = dashboardData.financeOfficers;
    document.getElementById('marketingClerkCount').textContent = dashboardData.marketingClerks;
    document.getElementById('itHeadCount').textContent = dashboardData.itHeads;
}

// Update System Status
function updateSystemStatus() {
    const statusList = document.getElementById('systemStatusList');
    const statuses = [
        { service: 'Database', status: 'operational', icon: 'fa-database' },
        { service: 'Authentication', status: 'operational', icon: 'fa-lock' },
        { service: 'API Gateway', status: 'operational', icon: 'fa-network-wired' },
        { service: 'File Storage', status: 'operational', icon: 'fa-folder' }
    ];
    
    let statusHTML = '';
    statuses.forEach(item => {
        const statusClass = item.status === 'operational' ? 'status-good' : 'status-warning';
        const statusText = item.status.charAt(0).toUpperCase() + item.status.slice(1);
        statusHTML += `
            <div class="status-item ${statusClass}">
                <i class="fas ${item.icon}"></i>
                <span>${item.service}: ${statusText}</span>
            </div>
        `;
    });
    
    statusList.innerHTML = statusHTML;
}

// Initialize IT Head navigation
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

// Set active navigation item
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

// Initialize dynamic user header
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

// Close Alert
function closeAlert() {
    document.getElementById('alertBanner').style.display = 'none';
}
