// IT Head Analytics JavaScript

let analyticsData = {
    totalLogins: 0,
    activeUsers: 0,
    totalUsers: 0,
    avgSessionDuration: 0,
    peakTime: '10:00 AM',
    peakUsers: 0,
    activeBranches: 0,
    totalOperations: 0
};

document.addEventListener('DOMContentLoaded', function() {
    initializeAnalytics();
    loadAnalyticsData();
    setupFilterButtons();
});

function initializeAnalytics() {
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
        window.location.href = '/login';
        return;
    }
    
    try {
        window.currentUser = JSON.parse(user);
        if (window.currentUser.role !== 'it_head') {
            logout();
            return;
        }
    } catch (error) {
        logout();
        return;
    }
}

async function loadAnalyticsData() {
    try {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
            console.error('No access token found');
            loadMockAnalyticsData();
            return;
        }
        
        // Fetch main dashboard analytics
        const dashboardResponse = await fetch('http://localhost:3001/api/auth/it-analytics/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Dashboard API Response Status:', dashboardResponse.status);
        
        if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            console.log('Dashboard API Data:', dashboardData);
            
            if (dashboardData.success && dashboardData.data) {
                analyticsData.totalLogins = dashboardData.data.totalLogins || 0;
                analyticsData.activeUsers = dashboardData.data.activeUsers || 0;
                analyticsData.totalUsers = dashboardData.data.totalUsers || 0;
                analyticsData.avgSessionDuration = dashboardData.data.avgSessionDuration || 45;
                analyticsData.peakTime = dashboardData.data.peakTime || '10:00 AM';
                analyticsData.peakUsers = dashboardData.data.peakUsers || 0;
                analyticsData.activeBranches = dashboardData.data.activeBranches || 0;
                analyticsData.totalOperations = dashboardData.data.totalOperations || 0;
                console.log('Analytics data loaded from API:', analyticsData);
            } else {
                console.warn('Invalid response structure:', dashboardData);
                loadMockAnalyticsData();
                return;
            }
        } else {
            console.warn('Dashboard analytics API returned:', dashboardResponse.status);
            const errorText = await dashboardResponse.text();
            console.error('Error response:', errorText);
            loadMockAnalyticsData();
            return;
        }
        
        displayAnalyticsMetrics();
        generateCharts();
        
    } catch (error) {
        console.error('Error loading analytics data:', error);
        loadMockAnalyticsData();
    }
}

function loadMockAnalyticsData() {
    console.log('Loading mock analytics data...');
    analyticsData.totalLogins = 4521;
    analyticsData.totalUsers = 150;
    analyticsData.activeUsers = 89;
    analyticsData.avgSessionDuration = 45;
    analyticsData.peakUsers = 54;
    analyticsData.activeBranches = 3;
    analyticsData.totalOperations = 8932;
    
    displayAnalyticsMetrics();
    generateCharts();
}

function displayAnalyticsMetrics() {
    // Total Logins
    document.getElementById('totalLoginsMetric').textContent = analyticsData.totalLogins.toLocaleString();
    document.getElementById('loginsChange').textContent = `+${Math.floor(Math.random() * 30)}%`;
    
    // Active Users
    document.getElementById('activeUsersMetric').textContent = analyticsData.activeUsers;
    document.getElementById('totalUsersCount').textContent = analyticsData.totalUsers;
    
    // Avg Session Duration
    document.getElementById('avgSessionMetric').textContent = analyticsData.avgSessionDuration + ' min';
    
    // Peak Time
    document.getElementById('peakTimeMetric').textContent = analyticsData.peakTime;
    document.getElementById('peakUsersCount').textContent = analyticsData.peakUsers;
    
    // Active Branches
    document.getElementById('activeBranchesMetric').textContent = analyticsData.activeBranches;
    
    // Total Operations
    document.getElementById('totalOpsMetric').textContent = analyticsData.totalOperations.toLocaleString();
    document.getElementById('opsChange').textContent = `+${Math.floor(Math.random() * 25)}%`;
}

function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            if (filter === 'custom') {
                document.getElementById('customRange').style.display = 'block';
            } else {
                document.getElementById('customRange').style.display = 'none';
            }
            
            // Log filter usage to audit logs
            logAnalyticsFilterUsage(filter);
            
            updateAnalytics();
        });
    });
}

// Log analytics filter usage to audit logs
async function logAnalyticsFilterUsage(filterType) {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        // Make a request to log the filter usage
        // We'll use a special endpoint or add it to the summary endpoint
        // For now, we'll make a simple POST request to log it
        await fetch('/api/auth/analytics/filter-log', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filter_type: filterType
            })
        }).catch(err => {
            // Silently fail - don't interrupt user experience
            console.log('Filter audit log failed:', err);
        });
    } catch (error) {
        // Silently fail - don't interrupt user experience
        console.log('Filter audit log error:', error);
    }
}

function updateAnalytics() {
    loadAnalyticsData();
}

function generateCharts() {
    generateActivityChart();
    generateBranchChart();
    generateRoleChart();
    generateOperationsChart();
}

function generateActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    
    const token = localStorage.getItem('access_token');
    
    // Fetch activity timeline data
    fetch('http://localhost:3001/api/auth/it-analytics/activity-timeline', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Failed to fetch activity data');
    })
    .then(data => {
        let labels = [];
        let chartData = [];
        
        if (data.success && data.data && Array.isArray(data.data)) {
            labels = data.data.map(d => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }));
            chartData = data.data.map(d => d.login_count);
        } else {
            // Fallback to mock data
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            chartData = labels.map(() => Math.floor(Math.random() * 500) + 300);
        }
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Logins',
                    data: chartData,
                    borderColor: '#0D5B11',
                    backgroundColor: 'rgba(13, 91, 17, 0.05)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#0D5B11',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#6b7280',
                            font: { size: 13, weight: '500' },
                            padding: 15
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(229, 231, 235, 0.5)'
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 12 }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    })
    .catch(error => {
        console.error('Error fetching activity chart data:', error);
        
        // Fallback to mock data
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const chartData = labels.map(() => Math.floor(Math.random() * 500) + 300);
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Logins',
                    data: chartData,
                    borderColor: '#0D5B11',
                    backgroundColor: 'rgba(13, 91, 17, 0.05)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#0D5B11',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#6b7280',
                            font: { size: 13, weight: '500' },
                            padding: 15
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(229, 231, 235, 0.5)'
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 12 }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    });
}

function generateBranchChart() {
    const ctx = document.getElementById('branchChart');
    if (!ctx) return;
    
    const token = localStorage.getItem('access_token');
    
    fetch('http://localhost:3001/api/auth/it-analytics/branch-distribution', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Failed to fetch branch data');
    })
    .then(data => {
        let labels = [];
        let chartData = [];
        
        if (data.success && data.data && Array.isArray(data.data)) {
            labels = data.data.map(d => d.label);
            chartData = data.data.map(d => d.value);
        } else {
            labels = ['IBAAN Branch', 'BAUAN Branch', 'SAN JOSE Branch'];
            chartData = [35, 25, 40];
        }
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: chartData,
                    backgroundColor: [
                        '#0D5B11',
                        '#187C19',
                        '#69B41E'
                    ],
                    borderColor: '#fff',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#6b7280',
                            font: { size: 13, weight: '500' },
                            padding: 15
                        }
                    }
                }
            }
        });
    })
    .catch(error => {
        console.error('Error fetching branch chart data:', error);
        
        // Fallback to mock data
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['IBAAN Branch', 'BAUAN Branch', 'SAN JOSE Branch'],
                datasets: [{
                    data: [35, 25, 40],
                    backgroundColor: [
                        '#0D5B11',
                        '#187C19',
                        '#69B41E'
                    ],
                    borderColor: '#fff',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#6b7280',
                            font: { size: 13, weight: '500' },
                            padding: 15
                        }
                    }
                }
            }
        });
    });
}

function generateRoleChart() {
    const ctx = document.getElementById('roleChart');
    if (!ctx) return;
    
    const token = localStorage.getItem('access_token');
    
    fetch('http://localhost:3001/api/auth/it-analytics/role-distribution', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Failed to fetch role data');
    })
    .then(data => {
        let labels = [];
        let chartData = [];
        
        if (data.success && data.data && Array.isArray(data.data)) {
            labels = data.data.map(d => d.label);
            chartData = data.data.map(d => d.value);
        } else {
            labels = ['Finance Officers', 'Marketing Clerks', 'IT Heads'];
            chartData = [45, 35, 9];
        }
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Active Users',
                    data: chartData,
                    backgroundColor: [
                        '#0D5B11',
                        '#187C19',
                        '#69B41E'
                    ],
                    borderRadius: 8,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#6b7280',
                            font: { size: 13, weight: '500' },
                            padding: 15
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(229, 231, 235, 0.5)'
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 12 }
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    })
    .catch(error => {
        console.error('Error fetching role chart data:', error);
        
        // Fallback to mock data
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Finance Officers', 'Marketing Clerks', 'IT Heads'],
                datasets: [{
                    label: 'Active Users',
                    data: [45, 35, 9],
                    backgroundColor: [
                        '#0D5B11',
                        '#187C19',
                        '#69B41E'
                    ],
                    borderRadius: 8,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#6b7280',
                            font: { size: 13, weight: '500' },
                            padding: 15
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(229, 231, 235, 0.5)'
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 12 }
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    });
}

function generateOperationsChart() {
    const ctx = document.getElementById('operationsChart');
    if (!ctx) return;
    
    const token = localStorage.getItem('access_token');
    
    fetch('http://localhost:3001/api/auth/it-analytics/operations-breakdown', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Failed to fetch operations data');
    })
    .then(data => {
        let labels = [];
        let chartData = [];
        
        if (data.success && data.data && Array.isArray(data.data)) {
            labels = data.data.map(d => d.label);
            chartData = data.data.map(d => d.value);
        } else {
            labels = ['Read', 'Create', 'Update', 'Delete'];
            chartData = [40, 30, 20, 10];
        }
        
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: chartData,
                    backgroundColor: [
                        '#0D5B11',
                        '#187C19',
                        '#69B41E',
                        '#B8D53D'
                    ],
                    borderColor: '#fff',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#6b7280',
                            font: { size: 13, weight: '500' },
                            padding: 15
                        }
                    }
                }
            }
        });
    })
    .catch(error => {
        console.error('Error fetching operations chart data:', error);
        
        // Fallback to mock data
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Read', 'Create', 'Update', 'Delete'],
                datasets: [{
                    data: [40, 30, 20, 10],
                    backgroundColor: [
                        '#0D5B11',
                        '#187C19',
                        '#69B41E',
                        '#B8D53D'
                    ],
                    borderColor: '#fff',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#6b7280',
                            font: { size: 13, weight: '500' },
                            padding: 15
                        }
                    }
                }
            }
        });
    });
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
        { href: '/ithead/usermanagement', icon: 'fas fa-users-cog', text: 'User Management' },
        { href: '/ithead/analytics', icon: 'fas fa-chart-bar', text: 'Analytics' },
        { href: '/ithead/reports', icon: 'fas fa-file-alt', text: 'Reports' },
        { href: '/ithead/auditlogs', icon: 'fas fa-history', text: 'Audit Logs' }
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
        if (!href) return;
        
        // Extract filename from href (handle both relative and absolute paths)
        const cleanHref = href.replace(/^\.\//, '').split('/').pop();
        const cleanCurrent = currentPage.replace(/^\.\//, '');
        
        // Match by filename (works for any path structure)
        if (cleanHref === cleanCurrent) {
            item.classList.add('active');
        }
        // Also check if href ends with the current page filename (for absolute paths like /ithead/html/analytics.html)
        else if (cleanCurrent !== '' && (href.endsWith(cleanCurrent) || href.endsWith('/' + cleanCurrent))) {
            item.classList.add('active');
        }
    });
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
