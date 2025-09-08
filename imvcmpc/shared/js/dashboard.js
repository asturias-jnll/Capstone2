// Dashboard JavaScript
let chartInstances = {};

// Initialize Dashboard
function initializeDashboard() {
    initializeCharts();
    console.log('Dashboard initialized');
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

// Export functions for global access
window.refreshChart = refreshChart;