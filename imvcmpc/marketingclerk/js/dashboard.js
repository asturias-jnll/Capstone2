// Dashboard functionality and charts
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts when dashboard is loaded
    initializeCharts();
});

// Initialize all dashboard charts
function initializeCharts() {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded. Loading from CDN...');
        loadChartJS();
        return;
    }
    
    // Initialize savings chart
    initializeSavingsChart();
    
    // Initialize disbursements chart
    initializeDisbursementsChart();
    
    // Initialize annual savings chart
    initializeAnnualSavingsChart();
}

// Load Chart.js from CDN if not available
function loadChartJS() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = function() {
        setTimeout(initializeCharts, 100);
    };
    document.head.appendChild(script);
}

// Get CSS variable value
function getCSSVariable(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName);
}

// Initialize Monthly Savings per Branch chart
function initializeSavingsChart() {
    const ctx = document.getElementById('savingsChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Branch 1', 'Branch 2', 'Branch 3', 'Branch 4', 'Branch 5', 'Branch 6'],
            datasets: [{
                label: 'Monthly Savings',
                data: [145000, 116000, 125000, 98000, 87000, 92000],
                backgroundColor: [
                    getCSSVariable('--chart-bar-1'),
                    getCSSVariable('--chart-bar-2'),
                    getCSSVariable('--chart-bar-3'),
                    getCSSVariable('--chart-bar-4'),
                    getCSSVariable('--chart-bar-5'),
                    getCSSVariable('--chart-bar-6')
                ],
                borderColor: [
                    getCSSVariable('--chart-bar-border-1'),
                    getCSSVariable('--chart-bar-border-2'),
                    getCSSVariable('--chart-bar-border-3'),
                    getCSSVariable('--chart-bar-border-4'),
                    getCSSVariable('--chart-bar-border-5'),
                    getCSSVariable('--chart-bar-border-6')
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₱' + (value / 1000) + 'K';
                        }
                    }
                }
            }
        }
    });
}

// Initialize Monthly Disbursements per Branch chart
function initializeDisbursementsChart() {
    const ctx = document.getElementById('disbursementsChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Branch 1',
                data: [120000, 135000, 145000, 130000, 150000, 145000],
                borderColor: getCSSVariable('--chart-line-branch1'),
                backgroundColor: getCSSVariable('--chart-line-bg-branch1'),
                tension: 0.4
            }, {
                label: 'Branch 2',
                data: [98000, 105000, 116000, 110000, 120000, 116000],
                borderColor: getCSSVariable('--chart-line-branch2'),
                backgroundColor: getCSSVariable('--chart-line-bg-branch2'),
                tension: 0.4
            }, {
                label: 'Branch 3',
                data: [110000, 118000, 125000, 120000, 130000, 125000],
                borderColor: getCSSVariable('--chart-line-branch3'),
                backgroundColor: getCSSVariable('--chart-line-bg-branch3'),
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₱' + (value / 1000) + 'K';
                        }
                    }
                }
            }
        }
    });
}

// Initialize Annual Savings per Branch chart
function initializeAnnualSavingsChart() {
    const ctx = document.getElementById('annualSavingsChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Branch 1', 'Branch 2', 'Branch 3', 'Branch 4', 'Branch 5', 'Branch 6'],
            datasets: [{
                data: [1450000, 1160000, 1250000, 980000, 870000, 920000],
                backgroundColor: [
                    getCSSVariable('--chart-doughnut-1'),
                    getCSSVariable('--chart-doughnut-2'),
                    getCSSVariable('--chart-doughnut-3'),
                    getCSSVariable('--chart-doughnut-4'),
                    getCSSVariable('--chart-doughnut-5'),
                    getCSSVariable('--chart-doughnut-6')
                ],
                borderColor: [
                    getCSSVariable('--chart-doughnut-border-1'),
                    getCSSVariable('--chart-doughnut-border-2'),
                    getCSSVariable('--chart-doughnut-border-3'),
                    getCSSVariable('--chart-doughnut-border-4'),
                    getCSSVariable('--chart-doughnut-border-5'),
                    getCSSVariable('--chart-doughnut-border-6')
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Refresh dashboard data
function refreshDashboard() {
    console.log('Refreshing dashboard data...');
    
    // Reinitialize charts
    setTimeout(() => {
        initializeCharts();
    }, 100);
}

// Export dashboard data
function exportDashboard() {
    console.log('Exporting dashboard data...');
    alert('Dashboard export functionality will be implemented here.');
}
