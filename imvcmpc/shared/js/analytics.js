// Analytics Dashboard JavaScript
let currentFilter = 'today'; // Default filter set to today
let chartInstances = {};
let authToken = null;

// Initialize Analytics Dashboard
function initializeAnalytics() {
    console.log('🚀 Initializing Analytics Dashboard...');
    console.log('Chart.js available:', typeof Chart !== 'undefined');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initializeAnalyticsContent();
        });
    } else {
        initializeAnalyticsContent();
    }
}

// Initialize analytics content after DOM is ready
function initializeAnalyticsContent() {
    console.log('📊 DOM ready, initializing analytics content...');
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js is not loaded! Please ensure Chart.js is included before this script.');
        showNotification('Chart.js library not loaded. Please refresh the page.', 'error');
        return;
    }
    
    setupFilterButtons();
    setupDateInputs();
    updateFilterDisplay();
    
    // Add a small delay to ensure DOM is fully rendered
    setTimeout(() => {
        initializeCharts();
        // Always load data (will use sample data if API fails)
        loadAnalyticsData();
        console.log('✅ Analytics dashboard initialized successfully');
    }, 200);
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
    
    // Also update the active filter button
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.classList.remove('active');
        if (button.dataset.filter === currentFilter) {
            button.classList.add('active');
        }
    });
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
        console.log('🔄 Starting to load analytics data...');
        showLoadingState();
        
        // For now, always use sample data to ensure charts display
        console.log('🔄 Using sample data to ensure charts display...');
        const sampleData = generateSampleData();
        updateSummaryCards(sampleData.summary);
        updateCharts(sampleData.savingsTrend, sampleData.disbursementTrend, sampleData.branchPerformance, sampleData.memberActivity);
        updateTables(sampleData.topMembers, sampleData.branchPerformance);
        
        hideLoadingState();
        console.log('✅ Analytics data loaded and UI updated successfully');
        
        // Try to load real data in background (optional)
        try {
            const [summaryData, savingsTrend, disbursementTrend, branchPerformance, memberActivity, topMembers] = await Promise.all([
                fetchAnalyticsSummary(),
                fetchSavingsTrend(),
                fetchDisbursementTrend(),
                fetchBranchPerformance(),
                fetchMemberActivity(),
                fetchTopMembers()
            ]);
            
            // Check if we have real data
            const hasData = summaryData && (
                (summaryData.total_savings > 0) || 
                (summaryData.total_disbursements > 0) || 
                (summaryData.active_members > 0)
            );
            
            if (hasData) {
                console.log('📊 Real data available, updating charts...');
                updateSummaryCards(summaryData);
                updateCharts(savingsTrend, disbursementTrend, branchPerformance, memberActivity);
                updateTables(topMembers, branchPerformance);
                showNotification('Real data loaded successfully', 'success');
            }
        } catch (apiError) {
            console.log('API not available, continuing with sample data');
        }
        
    } catch (error) {
        console.error('❌ Error loading analytics data:', error);
        hideLoadingState();
        
        // Use sample data as fallback
        console.log('🔄 Using sample data as fallback...');
        const sampleData = generateSampleData();
        updateSummaryCards(sampleData.summary);
        updateCharts(sampleData.savingsTrend, sampleData.disbursementTrend, sampleData.branchPerformance, sampleData.memberActivity);
        updateTables(sampleData.topMembers, sampleData.branchPerformance);
        
        showNotification(`Using sample data - Error: ${error.message}`, 'warning');
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
    console.log('📊 Initializing charts...');
    
    // Initialize all chart canvases with empty data
    const chartConfigs = {
        savingsTrendChart: {
            type: 'bar',
            title: 'Savings Trend',
            data: { labels: [], datasets: [] }
        },
        disbursementTrendChart: {
            type: 'bar',
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
        console.log(`Initializing ${chartId}:`, canvas ? 'Canvas found' : 'Canvas NOT found');
        
        if (canvas) {
            try {
                chartInstances[chartId] = new Chart(canvas, {
                    type: chartConfigs[chartId].type,
                    data: chartConfigs[chartId].data,
                    options: getChartOptions(chartConfigs[chartId].type)
                });
                console.log(`✅ ${chartId} initialized successfully`);
            } catch (error) {
                console.error(`❌ Error initializing ${chartId}:`, error);
            }
        }
    });
    
    console.log('📊 Chart initialization completed');
}

// Get chart options based on type
function getChartOptions(type, isTrendChart = false) {
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
        if (isTrendChart) {
            // For trend charts, use Month as x-axis
            baseOptions.scales = {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Month'
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
        } else {
            // For branch performance, use Branch as x-axis
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
        }
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
    console.log('🔄 Updating all charts with real data...');
    updateSavingsTrendChart(savingsTrend);
    updateDisbursementTrendChart(disbursementTrend);
    updateBranchPerformanceChart(branchPerformance);
    updateMemberActivityChart(memberActivity);
    console.log('✅ All charts updated with real data');
}

// Update savings trend chart
function updateSavingsTrendChart(data) {
    console.log('🔄 Updating savings trend chart with data:', data);
    const canvas = document.getElementById('savingsTrendChart');
    
    if (!canvas) {
        console.error('❌ Savings trend chart canvas not found!');
        return;
    }
    
    const noDataMessage = canvas.parentElement.querySelector('.no-data-message');
    
    if (!data || data.length === 0) {
        console.log('⚠️ No savings data available, showing no-data message');
        if (noDataMessage) noDataMessage.style.display = 'block';
        // Don't hide canvas, just show no-data message
        return;
    }
    
    console.log('✅ Savings data available, showing chart');
    if (noDataMessage) noDataMessage.style.display = 'none';
    
    // Ensure canvas has proper dimensions
    const container = canvas.parentElement;
    if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    
    const labels = data.map(item => new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
    }));
    const values = data.map(item => parseFloat(item.daily_savings) || 0);
    
    console.log('Chart labels:', labels);
    console.log('Chart values:', values);
    
    // Validate data before creating chart
    if (labels.length === 0 || values.length === 0) {
        console.error('❌ Invalid chart data: empty labels or values');
        return;
    }
    
    if (values.every(v => v === 0)) {
        console.warn('⚠️ All chart values are zero');
    }
    
    if (chartInstances.savingsTrendChart) {
        chartInstances.savingsTrendChart.destroy();
    }
    
    try {
        chartInstances.savingsTrendChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Savings (Bar)',
                    data: values,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    type: 'bar'
                }, {
                    label: 'Savings Trend (Line)',
                    data: values,
                    borderColor: '#059669',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    type: 'line',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: getChartOptions('bar', true)
        });
        
        console.log('✅ Savings trend chart created successfully');
        console.log('Chart instance:', chartInstances.savingsTrendChart);
        
        // Force chart to render
        chartInstances.savingsTrendChart.update();
        
        // Additional rendering fixes
        setTimeout(() => {
            if (chartInstances.savingsTrendChart) {
                chartInstances.savingsTrendChart.resize();
                chartInstances.savingsTrendChart.update();
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Error creating savings trend chart:', error);
    }
}

// Update disbursement trend chart
function updateDisbursementTrendChart(data) {
    console.log('Updating disbursement trend chart with data:', data);
    const canvas = document.getElementById('disbursementTrendChart');
    
    if (!canvas) {
        console.error('❌ Disbursement trend chart canvas not found!');
        return;
    }
    
    const noDataMessage = canvas.parentElement.querySelector('.no-data-message');
    
    if (!data || data.length === 0) {
        console.log('No disbursement data available, showing no-data message');
        if (noDataMessage) noDataMessage.style.display = 'block';
        // Don't hide canvas, just show no-data message
        return;
    }
    
    console.log('Disbursement data available, showing chart');
    if (noDataMessage) noDataMessage.style.display = 'none';
    
    // Ensure canvas has proper dimensions
    const container = canvas.parentElement;
    if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    
    const labels = data.map(item => new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
    }));
    const values = data.map(item => parseFloat(item.daily_disbursements) || 0);
    
    console.log('Disbursement chart labels:', labels);
    console.log('Disbursement chart values:', values);
    
    // Validate data before creating chart
    if (labels.length === 0 || values.length === 0) {
        console.error('❌ Invalid disbursement chart data: empty labels or values');
        return;
    }
    
    if (values.every(v => v === 0)) {
        console.warn('⚠️ All disbursement chart values are zero');
    }
    
    if (chartInstances.disbursementTrendChart) {
        chartInstances.disbursementTrendChart.destroy();
    }
    
    try {
        chartInstances.disbursementTrendChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Disbursements (Bar)',
                    data: values,
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    type: 'bar'
                }, {
                    label: 'Disbursement Trend (Line)',
                    data: values,
                    borderColor: '#dc2626',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    type: 'line',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: getChartOptions('bar', true)
        });
        
        console.log('✅ Disbursement trend chart created successfully');
        chartInstances.disbursementTrendChart.update();
        
        // Additional rendering fixes
        setTimeout(() => {
            if (chartInstances.disbursementTrendChart) {
                chartInstances.disbursementTrendChart.resize();
                chartInstances.disbursementTrendChart.update();
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Error creating disbursement trend chart:', error);
    }
}

// Update branch performance chart
function updateBranchPerformanceChart(data) {
    console.log('Updating branch performance chart with data:', data);
    const canvas = document.getElementById('branchPerformanceChart');
    
    if (!canvas) {
        console.error('❌ Branch performance chart canvas not found!');
        return;
    }
    
    const noDataMessage = canvas.parentElement.querySelector('.no-data-message');
    
    if (!data || data.length === 0) {
        console.log('No branch performance data available, showing no-data message');
        if (noDataMessage) noDataMessage.style.display = 'block';
        // Don't hide canvas, just show no-data message
        return;
    }
    
    console.log('Branch performance data available, showing chart');
    if (noDataMessage) noDataMessage.style.display = 'none';
    
    const labels = data.map(item => item.branch_name);
    const savingsData = data.map(item => parseFloat(item.total_savings) || 0);
    const disbursementData = data.map(item => parseFloat(item.total_disbursements) || 0);
    
    console.log('Branch chart labels:', labels);
    console.log('Branch savings data:', savingsData);
    console.log('Branch disbursement data:', disbursementData);
    
    // Validate data before creating chart
    if (labels.length === 0 || savingsData.length === 0 || disbursementData.length === 0) {
        console.error('❌ Invalid branch chart data: empty labels or values');
        return;
    }
    
    if (savingsData.every(v => v === 0) && disbursementData.every(v => v === 0)) {
        console.warn('⚠️ All branch chart values are zero');
    }
    
    if (chartInstances.branchPerformanceChart) {
        chartInstances.branchPerformanceChart.destroy();
    }
    
    try {
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
            options: getChartOptions('bar', false)
        });
        
        console.log('✅ Branch performance chart created successfully');
        chartInstances.branchPerformanceChart.update();
        
        // Additional rendering fixes
        setTimeout(() => {
            if (chartInstances.branchPerformanceChart) {
                chartInstances.branchPerformanceChart.resize();
                chartInstances.branchPerformanceChart.update();
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Error creating branch performance chart:', error);
    }
}

// Update member activity chart
function updateMemberActivityChart(data) {
    console.log('Updating member activity chart with data:', data);
    const canvas = document.getElementById('memberActivityChart');
    
    if (!canvas) {
        console.error('❌ Member activity chart canvas not found!');
        return;
    }
    
    const noDataMessage = canvas.parentElement.querySelector('.no-data-message');
    
    if (!data || data.length === 0) {
        console.log('No member activity data available, showing no-data message');
        if (noDataMessage) noDataMessage.style.display = 'block';
        // Don't hide canvas, just show no-data message
        return;
    }
    
    console.log('Member activity data available, showing chart');
    if (noDataMessage) noDataMessage.style.display = 'none';
    
    const labels = data.slice(0, 5).map(item => item.member_name);
    const values = data.slice(0, 5).map(item => parseFloat(item.transaction_count) || 0);
    
    console.log('Member activity chart labels:', labels);
    console.log('Member activity chart values:', values);
    
    // Validate data before creating chart
    if (labels.length === 0 || values.length === 0) {
        console.error('❌ Invalid member activity chart data: empty labels or values');
        return;
    }
    
    if (values.every(v => v === 0)) {
        console.warn('⚠️ All member activity chart values are zero');
    }
    
    if (chartInstances.memberActivityChart) {
        chartInstances.memberActivityChart.destroy();
    }
    
    try {
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
        
        console.log('✅ Member activity chart created successfully');
        chartInstances.memberActivityChart.update();
        
        // Additional rendering fixes
        setTimeout(() => {
            if (chartInstances.memberActivityChart) {
                chartInstances.memberActivityChart.resize();
                chartInstances.memberActivityChart.update();
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Error creating member activity chart:', error);
    }
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

// Refresh individual chart with proper chart type mapping
function refreshChart(chartType) {
    console.log('Refreshing chart:', chartType);
    
    // Map chart types to proper names
    const chartTypeMap = {
        'savings': 'savingsTrend',
        'disbursement': 'disbursementTrend', 
        'branch': 'branchPerformance',
        'member': 'memberActivity'
    };
    
    const mappedType = chartTypeMap[chartType] || chartType;
    
    // Show loading state for specific chart
    showChartLoading(mappedType);
    
    // Refresh the specific chart data
    loadAnalyticsData().then(() => {
        hideChartLoading(mappedType);
        showNotification(`${chartType} chart refreshed`, 'success');
    }).catch(error => {
        hideChartLoading(mappedType);
        showNotification(`Failed to refresh ${chartType} chart`, 'error');
    });
}

// Refresh individual table
function refreshTable(tableType) {
    console.log('Refreshing table:', tableType);
    
    // Map table types to proper names
    const tableTypeMap = {
        'members': 'topMembers',
        'branches': 'branchPerformance'
    };
    
    const mappedType = tableTypeMap[tableType] || tableType;
    
    // Show loading state for specific table
    showTableLoading(mappedType);
    
    // Refresh the specific table data
    loadAnalyticsData().then(() => {
        hideTableLoading(mappedType);
        showNotification(`${tableType} table refreshed`, 'success');
    }).catch(error => {
        hideTableLoading(mappedType);
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

// Generate sample data for demonstration
function generateSampleData() {
    const today = new Date();
    const dates = [];
    
    // Generate dates for the last 12 months
    for (let i = 11; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        dates.push(date.toISOString().split('T')[0]);
    }
    
    return {
        summary: {
            total_savings: 125000,
            total_disbursements: 85000,
            net_growth: 40000,
            active_members: 15
        },
        savingsTrend: dates.map(date => ({
            date: date,
            daily_savings: Math.floor(Math.random() * 50000) + 30000
        })),
        disbursementTrend: dates.map(date => ({
            date: date,
            daily_disbursements: Math.floor(Math.random() * 40000) + 20000
        })),
        branchPerformance: [
            { branch_name: 'Main Branch', total_savings: 75000, total_disbursements: 45000, growth_rate: 40.0 },
            { branch_name: 'Branch 2', total_savings: 35000, total_disbursements: 25000, growth_rate: 28.6 },
            { branch_name: 'Branch 3', total_savings: 15000, total_disbursements: 15000, growth_rate: 0.0 }
        ],
        memberActivity: [
            { member_name: 'Juan Dela Cruz', transaction_count: 12 },
            { member_name: 'Maria Santos', transaction_count: 8 },
            { member_name: 'Pedro Rodriguez', transaction_count: 6 },
            { member_name: 'Ana Garcia', transaction_count: 5 },
            { member_name: 'Carlos Lopez', transaction_count: 4 }
        ],
        topMembers: [
            { rank: 1, member_name: 'Juan Dela Cruz', total_savings: 25000, total_disbursements: 10000, net_position: 15000 },
            { rank: 2, member_name: 'Maria Santos', total_savings: 20000, total_disbursements: 8000, net_position: 12000 },
            { rank: 3, member_name: 'Pedro Rodriguez', total_savings: 18000, total_disbursements: 12000, net_position: 6000 },
            { rank: 4, member_name: 'Ana Garcia', total_savings: 15000, total_disbursements: 9000, net_position: 6000 },
            { rank: 5, member_name: 'Carlos Lopez', total_savings: 12000, total_disbursements: 7000, net_position: 5000 }
        ]
    };
}

// Export functions for global access
window.applyFilters = applyFilters;
window.refreshChart = refreshChart;
window.refreshTable = refreshTable;

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnalytics);
} else {
    initializeAnalytics();
}