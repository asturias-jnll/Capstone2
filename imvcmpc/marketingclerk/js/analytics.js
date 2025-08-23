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
    
    // Initialize branch-specific analytics
    initializeBranchSpecificAnalytics();
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

// Initialize branch-specific analytics
function initializeBranchSpecificAnalytics() {
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Update analytics header based on branch
    updateAnalyticsHeader(userBranchName, isMainBranchUser);
    
    // Filter analytics data based on user's branch
    if (!isMainBranchUser && userBranchName) {
        filterAnalyticsForBranch(userBranchId, userBranchName);
        
        // Hide branch filter for branch-specific users
        hideBranchFilter();
        
        // Reinitialize charts with branch-specific data
        setTimeout(() => {
            initializeBranchSpecificCharts(userBranchId, userBranchName);
        }, 100);
    }
}

// Update analytics header based on branch
function updateAnalyticsHeader(branchName, isMainBranch) {
    const headerTitle = document.querySelector('.analytics-header h1');
    if (headerTitle && branchName) {
        if (isMainBranch) {
            headerTitle.textContent = 'Analytics Dashboard';
        } else {
            headerTitle.textContent = `${branchName} Branch Analytics`;
        }
    }
}

// Filter analytics for specific branch
function filterAnalyticsForBranch(branchId, branchName) {
    // Update AI recommendation for specific branch
    updateAIRecommendationForBranch(branchName);
    
    // Update branch summary for specific branch
    updateBranchSummaryForBranch(branchId, branchName);
}

// Hide branch filter for branch-specific users
function hideBranchFilter() {
    const branchFilter = document.getElementById('analyticsBranch');
    if (branchFilter) {
        branchFilter.style.display = 'none';
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

// Initialize branch-specific charts
function initializeBranchSpecificCharts(branchId, branchName) {
    // Destroy existing charts first
    const chartIds = ['monthlyTrendsChart', 'branchRankingsChart'];
    chartIds.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const chart = Chart.getChart(canvas);
            if (chart) {
                chart.destroy();
            }
        }
    });
    
    // Initialize branch-specific monthly trends chart
    initializeBranchMonthlyTrendsChart(branchId, branchName);
    
    // Initialize branch-specific performance chart
    initializeBranchPerformanceChart(branchId, branchName);
}

// Initialize branch-specific Monthly Trends Chart
function initializeBranchMonthlyTrendsChart(branchId, branchName) {
    const ctx = document.getElementById('monthlyTrendsChart');
    if (!ctx) return;
    
    // Generate branch-specific monthly data
    const monthlyData = generateBranchMonthlyAnalytics(branchId);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: `${branchName} Savings`,
                data: monthlyData.savings,
                borderColor: getCSSVariable('--chart-trends-savings'),
                backgroundColor: getCSSVariable('--chart-trends-savings-bg'),
                borderWidth: 2,
                fill: false,
                tension: 0.4
            }, {
                label: `${branchName} Disbursements`,
                data: monthlyData.disbursements,
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

// Initialize branch-specific Performance Chart
function initializeBranchPerformanceChart(branchId, branchName) {
    const ctx = document.getElementById('branchRankingsChart');
    if (!ctx) return;
    
    // Generate branch-specific performance data by category
    const performanceData = generateBranchPerformanceData(branchId);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Regular Savings', 'Time Deposits', 'Special Accounts', 'Emergency Funds', 'Business Loans', 'Personal Loans'],
            datasets: [{
                label: `${branchName} Performance`,
                data: performanceData,
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

// Generate branch-specific monthly analytics data
function generateBranchMonthlyAnalytics(branchId) {
    const baseAmounts = {
        2: { savings: 116, disbursements: 105 }, // Bauan
        3: { savings: 125, disbursements: 115 }, // San Jose
        4: { savings: 98, disbursements: 88 },   // Rosario
        5: { savings: 87, disbursements: 78 },   // San Juan
        6: { savings: 92, disbursements: 82 },   // Taysan
        7: { savings: 85, disbursements: 75 },   // Lobo
        8: { savings: 95, disbursements: 85 },   // Calaca
        9: { savings: 78, disbursements: 68 },   // Lemery
        10: { savings: 82, disbursements: 72 },  // Agoncillo
        11: { savings: 88, disbursements: 78 },  // San Nicolas
        12: { savings: 90, disbursements: 80 }   // Taal
    };
    
    const baseData = baseAmounts[branchId] || { savings: 100, disbursements: 90 };
    const monthlySavings = [];
    const monthlyDisbursements = [];
    
    for (let i = 0; i < 12; i++) {
        // Add realistic variations
        const savingsVariation = (Math.random() - 0.5) * 0.3; // ±15% variation
        const disbursementVariation = (Math.random() - 0.5) * 0.25; // ±12.5% variation
        
        const savings = Math.round(baseData.savings * (1 + savingsVariation));
        const disbursements = Math.round(baseData.disbursements * (1 + disbursementVariation));
        
        monthlySavings.push(savings);
        monthlyDisbursements.push(disbursements);
    }
    
    return { savings: monthlySavings, disbursements: monthlyDisbursements };
}

// Generate branch-specific performance data by category
function generateBranchPerformanceData(branchId) {
    const baseAmounts = {
        2: 116, // Bauan
        3: 125, // San Jose
        4: 98,  // Rosario
        5: 87,  // San Juan
        6: 92,  // Taysan
        7: 85,  // Lobo
        8: 95,  // Calaca
        9: 78,  // Lemery
        10: 82, // Agoncillo
        11: 88, // San Nicolas
        12: 90  // Taal
    };
    
    const baseAmount = baseAmounts[branchId] || 100;
    
    // Distribute performance across different categories
    const regularSavings = Math.round(baseAmount * 0.25);      // 25%
    const timeDeposits = Math.round(baseAmount * 0.20);        // 20%
    const specialAccounts = Math.round(baseAmount * 0.15);     // 15%
    const emergencyFunds = Math.round(baseAmount * 0.10);      // 10%
    const businessLoans = Math.round(baseAmount * 0.20);       // 20%
    const personalLoans = Math.round(baseAmount * 0.10);       // 10%
    
    return [regularSavings, timeDeposits, specialAccounts, emergencyFunds, businessLoans, personalLoans];
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

// Update AI recommendation for specific branch
function updateAIRecommendationForBranch(branchName) {
    const aiContent = document.querySelector('.ai-content p');
    if (aiContent) {
        const recommendations = [
            `Based on ${branchName} branch performance, focus on member engagement and savings promotion to increase monthly contributions.`,
            `${branchName} branch shows potential for growth. Consider implementing targeted marketing campaigns for local businesses.`,
            `The ${branchName} branch has stable performance. Focus on member retention and introduce new financial products.`,
            `${branchName} branch members respond well to community events. Organize financial literacy workshops.`,
            `For ${branchName} branch, consider offering competitive interest rates to attract new members.`
        ];
        
        const randomRecommendation = recommendations[Math.floor(Math.random() * recommendations.length)];
        aiContent.textContent = randomRecommendation;
    }
}

// Update branch summary for specific branch
function updateBranchSummaryForBranch(branchId, branchName) {
    const savingsValue = document.querySelector('.stat-item:first-child .stat-value');
    const disbursementValue = document.querySelector('.stat-item:last-child .stat-value');
    
    if (savingsValue && disbursementValue) {
        // Generate branch-specific mock data
        const savings = 80000 + (parseInt(branchId) * 5000);
        const disbursement = 60000 + (parseInt(branchId) * 3000);
        
        savingsValue.textContent = formatCurrency(savings);
        disbursementValue.textContent = formatCurrency(disbursement);
    }
}
