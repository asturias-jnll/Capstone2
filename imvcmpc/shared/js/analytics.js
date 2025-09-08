// Analytics Dashboard JavaScript
let currentFilter = 'today';
let chartInstances = {};

// Initialize Analytics Dashboard
function initializeAnalytics() {
    setupFilterButtons();
    setupDateInputs();
    initializeCharts();
    updateFilterDisplay();
    console.log('Analytics dashboard initialized');
}

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
    
    // Update summary cards
    updateSummaryCards();
    
    // Update charts
    updateCharts();
    
    // Update tables
    updateTables();
}

// Update summary cards with placeholder data
function updateSummaryCards() {
    // Since there's no real data, we'll keep the placeholder values
    // In a real implementation, this would fetch data from the API
    console.log('Summary cards updated (placeholder data)');
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

// Update charts with new data
function updateCharts() {
    // Since there's no real data, charts remain empty
    // In a real implementation, this would update with actual data
    console.log('Charts updated (no data available)');
}

// Update tables with new data
function updateTables() {
    // Since there's no real data, tables remain empty
    // In a real implementation, this would update with actual data
    console.log('Tables updated (no data available)');
}

// Refresh individual chart
function refreshChart(chartType) {
    console.log('Refreshing chart:', chartType);
    
    // Show loading state for specific chart
    showChartLoading(chartType);
    
    // Simulate refresh
    setTimeout(() => {
        hideChartLoading(chartType);
        showNotification(`${chartType} chart refreshed`, 'info');
    }, 800);
}

// Refresh individual table
function refreshTable(tableType) {
    console.log('Refreshing table:', tableType);
    
    // Show loading state for specific table
    showTableLoading(tableType);
    
    // Simulate refresh
    setTimeout(() => {
        hideTableLoading(tableType);
        showNotification(`${tableType} table refreshed`, 'info');
    }, 800);
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
        top: 100px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
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
    }, 3000);
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
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || '#3b82f6';
}

// Utility function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
}

// Utility function to format percentage
function formatPercentage(value) {
    return `${value.toFixed(1)}%`;
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