// Analytics Dashboard JavaScript
let currentFilter = 'today';
let chartInstances = {};
let authToken = null;

// Initialize Analytics Dashboard
function initializeAnalytics() {
    setupFilterButtons();
    setupDateInputs();
    initializeCharts();
    updateFilterDisplay();
    loadAnalyticsData();
    console.log('Analytics dashboard initialized');
}

// Get authentication token from localStorage
function getAuthToken() {
    if (!authToken) {
        authToken = localStorage.getItem('authToken');
    }
    return authToken;
}

// Automatic login function for analytics page
async function autoLogin() {
    try {
        console.log('🔐 Attempting automatic login for analytics...');
        
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
            localStorage.setItem('authToken', result.tokens.access_token);
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

// API base URL
const API_BASE_URL = 'http://localhost:3001/api/auth';

// Setup filter button event listeners
function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update current filter
            currentFilter = this.dataset.filter;
            
            // Show/hide custom range inputs
            const customRange = document.getElementById('customRange');
            if (currentFilter === 'custom') {
                customRange.style.display = 'block';
            } else {
                customRange.style.display = 'none';
            }
            
            // Auto-apply filters
            applyFilters();
        });
    });
}

// Setup date input event listeners
function setupDateInputs() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    // Set default dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    endDateInput.value = today.toISOString().split('T')[0];
    startDateInput.value = yesterday.toISOString().split('T')[0];
    
    // Add change listeners
    startDateInput.addEventListener('change', applyFilters);
    endDateInput.addEventListener('change', applyFilters);
}

// Update filter display based on current selection
function updateFilterDisplay() {
    const filterDisplay = document.querySelector('.filter-display');
    let displayText = '';
    
    switch (currentFilter) {
        case 'today':
            displayText = 'Today\'s Data';
            break;
        case 'yesterday':
            displayText = 'Yesterday\'s Data';
            break;
        case 'last-month':
            displayText = 'Last Month\'s Data';
            break;
        case 'custom':
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            if (startDate && endDate) {
                displayText = `Custom Range: ${formatDate(startDate)} - ${formatDate(endDate)}`;
            } else {
                displayText = 'Custom Range (Select Dates)';
            }
            break;
    }
    
    // Update any filter display element if it exists
    if (filterDisplay) {
        filterDisplay.textContent = displayText;
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// Auto-apply filters when selection changes
function applyFilters() {
    console.log('Applying filters:', currentFilter);
    
    // Load fresh data with current filters
    loadAnalyticsData();
}

// Load all analytics data
async function loadAnalyticsData() {
    try {
        showLoadingState();
        
        // Load all data in parallel
        const [summaryData, savingsTrend, disbursementTrend, branchPerformance, memberActivity, topMembers] = await Promise.all([
            fetchAnalyticsSummary(),
            fetchSavingsTrend(),
            fetchDisbursementTrend(),
            fetchBranchPerformance(),
            fetchMemberActivity(),
            fetchTopMembers()
        ]);
        
        // Update UI with real data
        updateSummaryCards(summaryData);
        updateCharts(savingsTrend, disbursementTrend, branchPerformance, memberActivity);
        updateTables(topMembers, branchPerformance);
        
        hideLoadingState();
    } catch (error) {
        console.error('Error loading analytics data:', error);
        hideLoadingState();
        showNotification('Failed to load analytics data', 'error');
    }
}

// Fetch analytics summary data
async function fetchAnalyticsSummary() {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter
    });
    
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
    }
    
    const response = await fetch(`${API_BASE_URL}/analytics/summary?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
}

// Fetch savings trend data
async function fetchSavingsTrend() {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter
    });
    
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
    }
    
    const response = await fetch(`${API_BASE_URL}/analytics/savings-trend?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
}

// Fetch disbursement trend data
async function fetchDisbursementTrend() {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter
    });
    
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
    }
    
    const response = await fetch(`${API_BASE_URL}/analytics/disbursement-trend?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
}

// Fetch branch performance data
async function fetchBranchPerformance() {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter
    });
    
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
    }
    
    const response = await fetch(`${API_BASE_URL}/analytics/branch-performance?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
}

// Fetch member activity data
async function fetchMemberActivity() {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter
    });
    
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
    }
    
    const response = await fetch(`${API_BASE_URL}/analytics/member-activity?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
}

// Fetch top members data
async function fetchTopMembers() {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter
    });
    
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
    }
    
    const response = await fetch(`${API_BASE_URL}/analytics/top-members?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
}

// Update summary cards with real data
function updateSummaryCards(data) {
    if (!data) {
        console.log('No summary data available');
        return;
    }
    
    // Update Total Savings card
    const totalSavingsElement = document.querySelector('.summary-card:nth-child(1) .card-value');
    const totalSavingsChange = document.querySelector('.summary-card:nth-child(1) .change-text');
    if (totalSavingsElement) {
        totalSavingsElement.textContent = formatCurrency(data.total_savings || 0);
    }
    if (totalSavingsChange) {
        totalSavingsChange.textContent = data.total_savings > 0 ? 'Data available' : 'No data available';
    }
    
    // Update Total Disbursements card
    const totalDisbursementsElement = document.querySelector('.summary-card:nth-child(2) .card-value');
    const totalDisbursementsChange = document.querySelector('.summary-card:nth-child(2) .change-text');
    if (totalDisbursementsElement) {
        totalDisbursementsElement.textContent = formatCurrency(data.total_disbursements || 0);
    }
    if (totalDisbursementsChange) {
        totalDisbursementsChange.textContent = data.total_disbursements > 0 ? 'Data available' : 'No data available';
    }
    
    // Update Net Growth card
    const netGrowthElement = document.querySelector('.summary-card:nth-child(3) .card-value');
    const netGrowthChange = document.querySelector('.summary-card:nth-child(3) .change-text');
    if (netGrowthElement) {
        netGrowthElement.textContent = formatCurrency(data.net_growth || 0);
    }
    if (netGrowthChange) {
        const changeIndicator = document.querySelector('.summary-card:nth-child(3) .change-indicator');
        if (data.net_growth > 0) {
            netGrowthChange.textContent = 'Positive growth';
            if (changeIndicator) changeIndicator.textContent = '+';
        } else if (data.net_growth < 0) {
            netGrowthChange.textContent = 'Negative growth';
            if (changeIndicator) changeIndicator.textContent = '-';
        } else {
            netGrowthChange.textContent = 'No change';
            if (changeIndicator) changeIndicator.textContent = '--';
        }
    }
    
    // Update Active Members card
    const activeMembersElement = document.querySelector('.summary-card:nth-child(4) .card-value');
    const activeMembersChange = document.querySelector('.summary-card:nth-child(4) .change-text');
    if (activeMembersElement) {
        activeMembersElement.textContent = data.active_members || 0;
    }
    if (activeMembersChange) {
        activeMembersChange.textContent = data.active_members > 0 ? 'Active members' : 'No data available';
    }
    
    console.log('Summary cards updated with real data');
}

// Initialize empty charts
function initializeCharts() {
    // Initialize all chart canvases with empty data
    const chartConfigs = {
        savingsTrendChart: {
            type: 'line',
            title: 'Savings Trend',
            data: { labels: [], datasets: [] }
        },
        disbursementTrendChart: {
            type: 'line',
            title: 'Disbursement Trend',
            data: { labels: [], datasets: [] }
        },
        branchPerformanceChart: {
            type: 'bar',
            title: 'Branch Performance',
            data: { labels: [], datasets: [] }
        },
        memberActivityChart: {
            type: 'doughnut',
            title: 'Member Activity',
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
                display: type === 'bar' || type === 'doughnut',
                position: 'top'
            },
            tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false
            }
        }
    };
    
    if (type === 'line') {
        baseOptions.scales = {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Date'
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Amount (₱)'
                },
                ticks: {
                    callback: function(value) {
                        return '₱' + value.toLocaleString();
                    }
                }
            }
        };
    } else if (type === 'bar') {
        baseOptions.scales = {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Branch'
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Amount (₱)'
                },
                ticks: {
                    callback: function(value) {
                        return '₱' + value.toLocaleString();
                    }
                }
            }
        };
    } else if (type === 'doughnut') {
        baseOptions.plugins.legend = {
            display: true,
            position: 'right'
        };
    }
    
    return baseOptions;
}

// Update charts with real data
function updateCharts(savingsTrend, disbursementTrend, branchPerformance, memberActivity) {
    updateSavingsTrendChart(savingsTrend);
    updateDisbursementTrendChart(disbursementTrend);
    updateBranchPerformanceChart(branchPerformance);
    updateMemberActivityChart(memberActivity);
    console.log('Charts updated with real data');
}

// Update savings trend chart
function updateSavingsTrendChart(data) {
    const canvas = document.getElementById('savingsTrendChart');
    const noDataMessage = canvas.parentElement.querySelector('.no-data-message');
    
    if (!data || data.length === 0) {
        canvas.style.display = 'none';
        noDataMessage.style.display = 'block';
        return;
    }
    
    canvas.style.display = 'block';
    noDataMessage.style.display = 'none';
    
    const labels = data.map(item => new Date(item.date).toLocaleDateString());
    const values = data.map(item => parseFloat(item.daily_savings) || 0);
    
    if (chartInstances.savingsTrendChart) {
        chartInstances.savingsTrendChart.destroy();
    }
    
    chartInstances.savingsTrendChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Daily Savings',
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

// Update disbursement trend chart
function updateDisbursementTrendChart(data) {
    const canvas = document.getElementById('disbursementTrendChart');
    const noDataMessage = canvas.parentElement.querySelector('.no-data-message');
    
    if (!data || data.length === 0) {
        canvas.style.display = 'none';
        noDataMessage.style.display = 'block';
        return;
    }
    
    canvas.style.display = 'block';
    noDataMessage.style.display = 'none';
    
    const labels = data.map(item => new Date(item.date).toLocaleDateString());
    const values = data.map(item => parseFloat(item.daily_disbursements) || 0);
    
    if (chartInstances.disbursementTrendChart) {
        chartInstances.disbursementTrendChart.destroy();
    }
    
    chartInstances.disbursementTrendChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Daily Disbursements',
                data: values,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: getChartOptions('line')
    });
}

// Update branch performance chart
function updateBranchPerformanceChart(data) {
    const canvas = document.getElementById('branchPerformanceChart');
    const noDataMessage = canvas.parentElement.querySelector('.no-data-message');
    
    if (!data || data.length === 0) {
        canvas.style.display = 'none';
        noDataMessage.style.display = 'block';
        return;
    }
    
    canvas.style.display = 'block';
    noDataMessage.style.display = 'none';
    
    const labels = data.map(item => item.branch_name);
    const savingsData = data.map(item => parseFloat(item.total_savings) || 0);
    const disbursementData = data.map(item => parseFloat(item.total_disbursements) || 0);
    
    if (chartInstances.branchPerformanceChart) {
        chartInstances.branchPerformanceChart.destroy();
    }
    
    chartInstances.branchPerformanceChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Savings',
                data: savingsData,
                backgroundColor: '#10b981',
                borderColor: '#059669',
                borderWidth: 1
            }, {
                label: 'Total Disbursements',
                data: disbursementData,
                backgroundColor: '#ef4444',
                borderColor: '#dc2626',
                borderWidth: 1
            }]
        },
        options: getChartOptions('bar')
    });
}

// Update member activity chart
function updateMemberActivityChart(data) {
    const canvas = document.getElementById('memberActivityChart');
    const noDataMessage = canvas.parentElement.querySelector('.no-data-message');
    
    if (!data || data.length === 0) {
        canvas.style.display = 'none';
        noDataMessage.style.display = 'block';
        return;
    }
    
    canvas.style.display = 'block';
    noDataMessage.style.display = 'none';
    
    const labels = data.slice(0, 5).map(item => item.member_name);
    const values = data.slice(0, 5).map(item => parseFloat(item.transaction_count) || 0);
    
    if (chartInstances.memberActivityChart) {
        chartInstances.memberActivityChart.destroy();
    }
    
    chartInstances.memberActivityChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#10b981',
                    '#3b82f6',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: getChartOptions('doughnut')
    });
}

// Update tables with real data
function updateTables(topMembers, branchPerformance) {
    updateTopMembersTable(topMembers);
    updateBranchPerformanceTable(branchPerformance);
    console.log('Tables updated with real data');
}

// Update top members table
function updateTopMembersTable(data) {
    const tbody = document.querySelector('.table-container:first-child .data-table tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr class="no-data-row">
                <td colspan="5">
                    <div class="no-data-message">
                        <i class="fas fa-users"></i>
                        <p>No member data available</p>
                        <small>Member data will appear here once they start transactions</small>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(member => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.rank}</td>
            <td>${member.member_name}</td>
            <td>${formatCurrency(member.total_savings)}</td>
            <td>${formatCurrency(member.total_disbursements)}</td>
            <td>${formatCurrency(member.net_position)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Update branch performance table
function updateBranchPerformanceTable(data) {
    const tbody = document.querySelector('.table-container:last-child .data-table tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr class="no-data-row">
                <td colspan="4">
                    <div class="no-data-message">
                        <i class="fas fa-building"></i>
                        <p>No branch data available</p>
                        <small>Branch data will appear here once they start operations</small>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(branch => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${branch.branch_name}</td>
            <td>${formatCurrency(branch.total_savings)}</td>
            <td>${formatCurrency(branch.total_disbursements)}</td>
            <td>${formatPercentage(branch.growth_rate)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Refresh individual chart
function refreshChart(chartType) {
    console.log('Refreshing chart:', chartType);
    
    // Show loading state for specific chart
    showChartLoading(chartType);
    
    // Refresh the specific chart data
    loadAnalyticsData().then(() => {
        hideChartLoading(chartType);
        showNotification(`${chartType} chart refreshed`, 'success');
    }).catch(error => {
        hideChartLoading(chartType);
        showNotification(`Failed to refresh ${chartType} chart`, 'error');
    });
}

// Refresh individual table
function refreshTable(tableType) {
    console.log('Refreshing table:', tableType);
    
    // Show loading state for specific table
    showTableLoading(tableType);
    
    // Refresh the specific table data
    loadAnalyticsData().then(() => {
        hideTableLoading(tableType);
        showNotification(`${tableType} table refreshed`, 'success');
    }).catch(error => {
        hideTableLoading(tableType);
        showNotification(`Failed to refresh ${tableType} table`, 'error');
    });
}

// Show loading state
function showLoadingState() {
    // Add loading class to main content
    document.querySelector('.analytics-content').classList.add('loading');
}

// Hide loading state
function hideLoadingState() {
    // Remove loading class
    document.querySelector('.analytics-content').classList.remove('loading');
}

// Show chart loading
function showChartLoading(chartType) {
    const chartContainer = document.querySelector(`#${chartType}Chart`).closest('.chart-container');
    if (chartContainer) {
        chartContainer.classList.add('loading');
    }
}

// Hide chart loading
function hideChartLoading(chartType) {
    const chartContainer = document.querySelector(`#${chartType}Chart`).closest('.chart-container');
    if (chartContainer) {
        chartContainer.classList.remove('loading');
    }
}

// Show table loading
function showTableLoading(tableType) {
    const tableContainer = document.querySelector(`.table-container`);
    if (tableContainer) {
        tableContainer.classList.add('loading');
    }
}

// Hide table loading
function hideTableLoading(tableType) {
    const tableContainer = document.querySelector(`.table-container`);
    if (tableContainer) {
        tableContainer.classList.remove('loading');
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

// Utility function to get date range based on filter
function getDateRange(filter) {
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
        },
        custom: {
            start: new Date(document.getElementById('startDate').value),
            end: new Date(document.getElementById('endDate').value)
        }
    };
    
    return ranges[filter] || ranges.today;
}

// Export functions for global access
window.applyFilters = applyFilters;
window.refreshChart = refreshChart;
window.refreshTable = refreshTable;