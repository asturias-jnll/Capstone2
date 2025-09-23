// Dashboard JavaScript
let chartInstances = {};
let authToken = null;

// API base URL
const API_BASE_URL = 'http://localhost:3001/api/auth';

// Initialize Dashboard
function initializeDashboard() {
    initializeCharts();
    loadDashboardData();
    console.log('Dashboard initialized');
}

// Get authentication token from localStorage
function getAuthToken() {
    if (!authToken) {
        authToken = localStorage.getItem('access_token');
    }
    return authToken;
}

// Automatic login function for dashboard page
async function autoLogin() {
    try {
        console.log('🔐 Attempting automatic login for dashboard...');
        
        // Try to login with the test analytics user
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'test.analytics',
                password: 'Test12345!'
            })
        });

        if (!response.ok) {
            throw new Error(`Login failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && result.tokens && result.tokens.access_token) {
            // Store the token in localStorage
            localStorage.setItem('access_token', result.tokens.access_token);
            authToken = result.tokens.access_token; // Update the global variable
            console.log('✅ Automatic login successful!');
            return result.tokens.access_token;
        } else {
            throw new Error('Invalid login response');
        }
    } catch (error) {
        console.error('❌ Automatic login failed:', error.message);
        return null;
    }
}

// Enhanced function to get or create auth token
async function ensureAuthToken() {
    let token = getAuthToken();
    
    if (!token) {
        console.log('🔑 No auth token found, attempting automatic login...');
        token = await autoLogin();
    }
    
    if (!token) {
        throw new Error('Unable to authenticate. Please check your login credentials.');
    }
    
    return token;
}

// Initialize empty charts
function initializeCharts() {
    // Initialize preview charts with empty data
    const chartConfigs = {
        savingsPreviewChart: {
            type: 'line',
            title: 'Savings Trend Preview',
            data: { labels: [], datasets: [] }
        },
        branchPreviewChart: {
            type: 'bar',
            title: 'Branch Performance Preview',
            data: { labels: [], datasets: [] }
        }
    };
    
    Object.keys(chartConfigs).forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas) {
            chartInstances[chartId] = new Chart(canvas, {
                type: chartConfigs[chartId].type,
                data: chartConfigs[chartId].data,
                options: getChartOptions(chartConfigs[chartId].type)
            });
        }
    });
}

// Get chart options based on type
function getChartOptions(type) {
    const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
            },
            tooltip: {
                enabled: false
            }
        },
        scales: type !== 'doughnut' ? {
            x: {
                display: false
            },
            y: {
                    display: false
            }
        } : {}
    };
    
    return baseOptions;
}

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoadingState();
        console.log('Loading dashboard data...');
        
        // Get user branch information for branch-specific data access
        const userBranchId = localStorage.getItem('user_branch_id') || '1';
        const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
        
        console.log('🏢 User branch info:', {
            userBranchId,
            isMainBranchUser
        });
        
        // Fetch all dashboard data in parallel
        const [summary, savingsTrend, branchPerformance, topMembers] = await Promise.all([
            fetchDashboardSummary(userBranchId, isMainBranchUser),
            fetchSavingsTrend(userBranchId, isMainBranchUser),
            fetchBranchPerformance(userBranchId, isMainBranchUser),
            fetchTopMembers(userBranchId, isMainBranchUser)
        ]);
        
        // Update dashboard with real data
        updateSummaryCards(summary);
        updateSavingsPreviewChart(savingsTrend);
        updateBranchPreviewChart(branchPerformance);
        updateTopMembersInsight(topMembers);
        
        hideLoadingState();
        console.log('Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        hideLoadingState();
        showNotification('Failed to load dashboard data', 'error');
    }
}

// Fetch dashboard summary data (cumulative from oldest transaction to today)
async function fetchDashboardSummary(userBranchId = '1', isMainBranchUser = true) {
    const token = await ensureAuthToken();
    
    // Use custom date range from oldest transaction (2024-01-15) to today
    const startDate = '2024-01-15';
    const endDate = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`${API_BASE_URL}/analytics/summary?filter=custom&startDate=${startDate}&endDate=${endDate}&branchId=${userBranchId}&isMainBranch=${isMainBranchUser}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch summary: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
}

// Fetch savings trend data for preview (cumulative from oldest transaction to today)
async function fetchSavingsTrend(userBranchId = '1', isMainBranchUser = true) {
    const token = await ensureAuthToken();
    
    // Use custom date range from oldest transaction (2024-01-15) to today
    const startDate = '2024-01-15';
    const endDate = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`${API_BASE_URL}/analytics/savings-trend?filter=custom&startDate=${startDate}&endDate=${endDate}&branchId=${userBranchId}&isMainBranch=${isMainBranchUser}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch savings trend: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
}

// Fetch branch performance data for preview (cumulative from oldest transaction to today)
async function fetchBranchPerformance(userBranchId = '1', isMainBranchUser = true) {
    const token = await ensureAuthToken();
    
    // Use custom date range from oldest transaction (2024-01-15) to today
    const startDate = '2024-01-15';
    const endDate = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`${API_BASE_URL}/analytics/branch-performance?filter=custom&startDate=${startDate}&endDate=${endDate}&branchId=${userBranchId}&isMainBranch=${isMainBranchUser}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch branch performance: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
}

// Fetch top members data for insights (cumulative from oldest transaction to today)
async function fetchTopMembers(userBranchId = '1', isMainBranchUser = true) {
    const token = await ensureAuthToken();
    
    // Use custom date range from oldest transaction (2024-01-15) to today
    const startDate = '2024-01-15';
    const endDate = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`${API_BASE_URL}/analytics/top-members?filter=custom&startDate=${startDate}&endDate=${endDate}&branchId=${userBranchId}&isMainBranch=${isMainBranchUser}&limit=5`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch top members: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
}

// Update summary cards with real data
function updateSummaryCards(data) {
    if (!data) return;
    
    // Update Total Savings (cumulative)
    const savingsCard = document.querySelector('.summary-card:nth-child(1) .card-value');
    const savingsChange = document.querySelector('.summary-card:nth-child(1) .card-change');
    if (savingsCard) {
        savingsCard.textContent = formatCurrency(data.total_savings || 0);
        savingsChange.innerHTML = `
            <span class="change-indicator positive">+</span>
            <span class="change-text">All-time total</span>
        `;
    }
    
    // Update Total Disbursements (cumulative)
    const disbursementCard = document.querySelector('.summary-card:nth-child(2) .card-value');
    const disbursementChange = document.querySelector('.summary-card:nth-child(2) .card-change');
    if (disbursementCard) {
        disbursementCard.textContent = formatCurrency(data.total_disbursements || 0);
        disbursementChange.innerHTML = `
            <span class="change-indicator negative">-</span>
            <span class="change-text">All-time total</span>
        `;
    }
    
    // Update Net Growth (cumulative)
    const growthCard = document.querySelector('.summary-card:nth-child(3) .card-value');
    const growthChange = document.querySelector('.summary-card:nth-child(3) .card-change');
    if (growthCard) {
        const netGrowth = data.net_growth || 0;
        growthCard.textContent = formatCurrency(netGrowth);
        const indicator = netGrowth >= 0 ? 'positive' : 'negative';
        const symbol = netGrowth >= 0 ? '+' : '';
        growthChange.innerHTML = `
            <span class="change-indicator ${indicator}">${symbol}</span>
            <span class="change-text">All-time position</span>
        `;
    }
    
    // Update Active Members (cumulative)
    const membersCard = document.querySelector('.summary-card:nth-child(4) .card-value');
    const membersChange = document.querySelector('.summary-card:nth-child(4) .card-change');
    if (membersCard) {
        membersCard.textContent = data.active_members || 0;
        membersChange.innerHTML = `
            <span class="change-indicator positive">+</span>
            <span class="change-text">All-time unique</span>
        `;
    }
}

// Update savings preview chart
function updateSavingsPreviewChart(data) {
    const canvas = document.getElementById('savingsPreviewChart');
    const noDataMessage = canvas.closest('.chart-content').querySelector('.no-data-message');
    
    if (!data || data.length === 0) {
        canvas.style.display = 'none';
        noDataMessage.style.display = 'block';
        return;
    }
    
    canvas.style.display = 'block';
    noDataMessage.style.display = 'none';
    
    const labels = data.map(item => new Date(item.date).toLocaleDateString());
    const values = data.map(item => parseFloat(item.total_savings) || 0);
    
    if (chartInstances.savingsPreviewChart) {
        chartInstances.savingsPreviewChart.destroy();
    }
    
    chartInstances.savingsPreviewChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Daily Savings Trend',
                data: values,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: getChartOptions('line')
    });
}

// Update branch preview chart
function updateBranchPreviewChart(data) {
    const canvas = document.getElementById('branchPreviewChart');
    const noDataMessage = canvas.closest('.chart-content').querySelector('.no-data-message');
    
    if (!data || data.length === 0) {
        canvas.style.display = 'none';
        noDataMessage.style.display = 'block';
        return;
    }
    
    canvas.style.display = 'block';
    noDataMessage.style.display = 'none';
    
    // Handle different data structures for main branch vs non-main branch users
    const userBranchId = localStorage.getItem('user_branch_id') || '1';
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    let labels, savingsData;
    
    if (isMainBranchUser) {
        // Main branch users see branch names
        labels = data.map(item => item.branch_name);
        savingsData = data.map(item => parseFloat(item.total_savings) || 0);
    } else {
        // Non-main branch users see monthly data
        labels = data.map(item => {
            const date = new Date(item.month);
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });
        savingsData = data.map(item => parseFloat(item.total_savings) || 0);
    }
    
    if (chartInstances.branchPreviewChart) {
        chartInstances.branchPreviewChart.destroy();
    }
    
    chartInstances.branchPreviewChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
        datasets: [{
            label: isMainBranchUser ? 'Total Savings by Branch' : 'Monthly Savings Trend',
            data: savingsData,
            backgroundColor: '#3b82f6',
            borderColor: '#2563eb',
            borderWidth: 1
        }]
        },
        options: getChartOptions('bar')
    });
}

// Update top members insight
function updateTopMembersInsight(data) {
    const insightContent = document.querySelector('.insight-card:nth-child(1) .insight-content');
    
    if (!data || data.length === 0) {
        insightContent.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-users"></i>
                <p>No member data available</p>
                <small>Member data will appear here once they start transactions</small>
            </div>
        `;
        return;
    }
    
    const membersList = data.slice(0, 5).map((member, index) => `
        <div class="member-item">
            <div class="member-rank">${index + 1}</div>
            <div class="member-info">
                <div class="member-name">${member.member_name}</div>
                <div class="member-transactions">${member.transaction_count} transactions</div>
            </div>
            <div class="member-amount">${formatCurrency(member.total_amount || 0)}</div>
        </div>
    `).join('');
    
    insightContent.innerHTML = `
        <div class="members-list">
            ${membersList}
        </div>
    `;
}

// Refresh individual chart
function refreshChart(chartType) {
    console.log('Refreshing chart:', chartType);
    
    // Show loading state for specific chart
    showChartLoading(chartType);
    
    // Reload dashboard data
    loadDashboardData().then(() => {
        hideChartLoading(chartType);
        showNotification(`${chartType} chart refreshed`, 'info');
    }).catch(() => {
        hideChartLoading(chartType);
        showNotification(`Failed to refresh ${chartType} chart`, 'error');
    });
}


// Show loading state
function showLoadingState() {
    // Add loading class to main content
    document.querySelector('.dashboard-content').classList.add('loading');
    
    // Disable action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
    });
}

// Hide loading state
function hideLoadingState() {
    // Remove loading class
    document.querySelector('.dashboard-content').classList.remove('loading');
    
    // Enable action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
    });
}

// Show chart loading
function showChartLoading(chartType) {
    const chartContainer = document.querySelector(`#${chartType}PreviewChart`).closest('.preview-chart');
    if (chartContainer) {
        chartContainer.classList.add('loading');
    }
}

// Hide chart loading
function hideChartLoading(chartType) {
    const chartContainer = document.querySelector(`#${chartType}PreviewChart`).closest('.preview-chart');
    if (chartContainer) {
        chartContainer.classList.remove('loading');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove any existing notifications to prevent stacking
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 48px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Get notification icon
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Get notification color
function getNotificationColor(type) {
    const colors = {
        success: '#22C55E', // Green for success
        error: '#EF4444',   // Red for error
        warning: '#F59E0B', // Orange for warning
        info: '#3B82F6'     // Blue for info
    };
    return colors[type] || '#3B82F6';
}

// Utility function to format currency
function formatCurrency(amount) {
    // Convert to number and handle null/undefined values
    const numAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(numAmount);
}

// Utility function to format percentage
function formatPercentage(value) {
    // Convert to number and handle null/undefined values
    const numValue = parseFloat(value) || 0;
    return `${numValue.toFixed(1)}%`;
}

// Export functions for global access
window.refreshChart = refreshChart;