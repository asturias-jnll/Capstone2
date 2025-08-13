// Analytics functionality and charts
document.addEventListener('DOMContentLoaded', function() {
    // Initialize analytics when page is loaded
    initializeAnalytics();
});

// Initialize all analytics functionality
function initializeAnalytics() {
    // Initialize charts
    initializeAnalyticsCharts();
    
    // Setup event listeners for filters
    setupFilterEventListeners();
}

// Setup filter event listeners
function setupFilterEventListeners() {
    const branchFilter = document.getElementById('analyticsBranch');
    const monthFilter = document.getElementById('analyticsMonth');
    
    if (branchFilter) {
        branchFilter.addEventListener('change', function() {
            updateAnalytics();
        });
    }
    
    if (monthFilter) {
        monthFilter.addEventListener('change', function() {
            updateAnalytics();
        });
    }
}

// Get CSS variable value
function getCSSVariable(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName);
}

// Initialize analytics charts
function initializeAnalyticsCharts() {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded. Loading from CDN...');
        loadChartJS();
        return;
    }
    
    // Initialize monthly trends chart
    initializeMonthlyTrendsChart();
    
    // Initialize branch rankings chart
    initializeBranchRankingsChart();
}

// Load Chart.js from CDN if not available
function loadChartJS() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = function() {
        setTimeout(initializeAnalyticsCharts, 100);
    };
    document.head.appendChild(script);
}

// Initialize Monthly Trends Chart
function initializeMonthlyTrendsChart() {
    const ctx = document.getElementById('monthlyTrendsChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Savings',
                data: [85, 95, 75, 105, 125, 95, 120, 90, 110, 80, 100, 105],
                borderColor: getCSSVariable('--chart-trends-savings'),
                backgroundColor: getCSSVariable('--chart-trends-savings-bg'),
                borderWidth: 2,
                fill: false,
                tension: 0.4
            }, {
                label: 'Disbursements',
                data: [65, 85, 75, 105, 70, 95, 115, 85, 110, 80, 90, 100],
                borderColor: getCSSVariable('--chart-trends-disbursements'),
                backgroundColor: getCSSVariable('--chart-trends-disbursements-bg'),
                borderWidth: 2,
                fill: false,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '₱' + (value * 1000) + 'K';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Initialize Branch Rankings Chart
function initializeBranchRankingsChart() {
    const ctx = document.getElementById('branchRankingsChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12'],
            datasets: [{
                label: 'Savings',
                data: [145, 116, 125, 108, 110, 139, 121, 118, 120, 116, 120, 130],
                backgroundColor: getCSSVariable('--chart-rankings-bg'),
                borderColor: getCSSVariable('--chart-rankings-border'),
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
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '₱' + (value * 1000) + 'K';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Update analytics based on filter changes
function updateAnalytics() {
    const selectedBranch = document.getElementById('analyticsBranch')?.value;
    const selectedMonth = document.getElementById('analyticsMonth')?.value;
    
    console.log('Updating analytics for:', { branch: selectedBranch, month: selectedMonth });
    
    // Here you would typically make an API call to get filtered data
    // For now, we'll just reinitialize the charts
    setTimeout(() => {
        initializeAnalyticsCharts();
    }, 100);
    
    // Update AI recommendation based on selection
    updateAIRecommendation(selectedBranch, selectedMonth);
    
    // Update branch summary based on selection
    updateBranchSummary(selectedBranch, selectedMonth);
}

// Update AI recommendation based on selected filters
function updateAIRecommendation(branch, month) {
    const aiContent = document.querySelector('.ai-content p');
    if (!aiContent) return;
    
    let recommendation = '';
    
    if (branch && month) {
        recommendation = `Based on current trends for ${month}, consider focusing on Branch ${branch} for increased savings this month.`;
    } else if (branch) {
        recommendation = `Based on current trends, consider focusing on Branch ${branch} for increased savings this month.`;
    } else if (month) {
        recommendation = `Based on current trends for ${month}, consider focusing on Branch 3 for increased savings this month.`;
    } else {
        recommendation = 'Based on current trends, consider focusing on Branch 3 for increased savings this month.';
    }
    
    aiContent.textContent = recommendation;
}

// Update branch summary based on selected filters
function updateBranchSummary(branch, month) {
    const savingsValue = document.querySelector('.stat-item:first-child .stat-value');
    const disbursementValue = document.querySelector('.stat-item:last-child .stat-value');
    
    if (!savingsValue || !disbursementValue) return;
    
    // Mock data update - in real app, this would come from API
    let savings = 125000;
    let disbursement = 98000;
    
    if (branch) {
        // Adjust values based on branch selection
        savings = 125000 + (parseInt(branch) * 5000);
        disbursement = 98000 + (parseInt(branch) * 3000);
    }
    
    if (month) {
        // Adjust values based on month selection
        const monthIndex = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                           'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].indexOf(month);
        savings = savings + (monthIndex * 2000);
        disbursement = disbursement + (monthIndex * 1500);
    }
    
    savingsValue.textContent = formatCurrency(savings);
    disbursementValue.textContent = formatCurrency(disbursement);
}

// Format currency for display
function formatCurrency(amount) {
    return '₱' + amount.toLocaleString();
}

// Refresh analytics data
function refreshAnalytics() {
    console.log('Refreshing analytics data...');
    
    // Reinitialize charts
    setTimeout(() => {
        initializeAnalyticsCharts();
    }, 100);
}

// Export analytics data
function exportAnalytics() {
    console.log('Exporting analytics data...');
    alert('Analytics export functionality will be implemented here.');
}
