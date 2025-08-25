// Dashboard functionality and charts
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts when dashboard is loaded
    initializeCharts();
    
    // Initialize branch-specific data filtering
    initializeBranchDataFiltering();
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

// Initialize branch-specific data filtering
function initializeBranchDataFiltering() {
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Update dashboard title and description based on branch
    updateDashboardHeader(userBranchName, isMainBranchUser);
    
    // Filter dashboard data based on user's branch
    if (!isMainBranchUser && userBranchId) {
        filterDashboardDataForBranch(userBranchId, userBranchName);
        // Reinitialize charts with branch-specific data
        setTimeout(() => {
            initializeBranchSpecificCharts(userBranchId, userBranchName);
        }, 100);
    }
}

// Update dashboard header based on branch
function updateDashboardHeader(branchName, isMainBranch) {
    const headerTitle = document.querySelector('.header-left h1');
    const headerDescription = document.querySelector('.header-left p');
    
    if (headerTitle && branchName) {
        if (isMainBranch) {
            headerTitle.textContent = 'Marketing Clerk Dashboard';
        } else {
            headerTitle.textContent = `${branchName} Branch Dashboard`;
        }
    }
    
    if (headerDescription && branchName) {
        if (isMainBranch) {
            headerDescription.textContent = 'Welcome back!';
        } else {
            headerDescription.textContent = `Welcome to ${branchName} branch!`;
        }
    }
    
    // Update user display name and role
    updateUserDisplay(branchName, isMainBranch);
}

// Update user display with branch-specific information
function updateUserDisplay(branchName, isMainBranch) {
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    
    if (userNameElement && userRoleElement) {
        if (isMainBranch) {
            userNameElement.textContent = 'IBAAN Marketing Clerk';
            userRoleElement.textContent = 'IMVCMPC - Main Branch';
        } else {
            userNameElement.textContent = `${branchName} Marketing Clerk`;
            userRoleElement.textContent = `IMVCMPC - ${branchName} Branch`;
        }
    }
}

// Filter dashboard data for specific branch
function filterDashboardDataForBranch(branchId, branchName) {
    // Update contributors list to show only branch-specific data
    updateContributorsForBranch(branchId, branchName);
    
    // Update branches list to show only current branch
    updateBranchesListForBranch(branchId, branchName);
    
    // Update AI recommendation for specific branch
    updateAIRecommendationForBranch(branchId, branchName);
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

// Initialize branch-specific charts
function initializeBranchSpecificCharts(branchId, branchName) {
    // Destroy existing charts first
    const chartIds = ['savingsChart', 'disbursementsChart', 'annualSavingsChart'];
    chartIds.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const chart = Chart.getChart(canvas);
            if (chart) {
                chart.destroy();
            }
        }
    });
    
    // Initialize branch-specific savings chart
    initializeBranchSavingsChart(branchId, branchName);
    
    // Initialize branch-specific disbursements chart
    initializeBranchDisbursementsChart(branchId, branchName);
    
    // Initialize branch-specific annual savings chart
    initializeBranchAnnualSavingsChart(branchId, branchName);
}

// Initialize branch-specific Monthly Savings chart
function initializeBranchSavingsChart(branchId, branchName) {
    const ctx = document.getElementById('savingsChart');
    if (!ctx) return;
    
    // Generate branch-specific monthly data
    const monthlyData = generateBranchMonthlyData(branchId);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: `${branchName} Monthly Savings`,
                data: monthlyData,
                backgroundColor: getCSSVariable('--chart-bar-1'),
                borderColor: getCSSVariable('--chart-bar-border-1'),
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

// Initialize branch-specific Monthly Disbursements chart
function initializeBranchDisbursementsChart(branchId, branchName) {
    const ctx = document.getElementById('disbursementsChart');
    if (!ctx) return;
    
    // Generate branch-specific disbursement data
    const disbursementData = generateBranchDisbursementData(branchId);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: `${branchName} Monthly Disbursements`,
                data: disbursementData,
                borderColor: getCSSVariable('--chart-line-branch1'),
                backgroundColor: getCSSVariable('--chart-line-bg-branch1'),
                tension: 0.4,
                fill: true
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

// Initialize branch-specific Annual Savings chart
function initializeBranchAnnualSavingsChart(branchId, branchName) {
    const ctx = document.getElementById('annualSavingsChart');
    if (!ctx) return;
    
    // Generate branch-specific annual data by category
    const annualData = generateBranchAnnualData(branchId);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Regular Savings', 'Time Deposits', 'Special Accounts', 'Emergency Funds'],
            datasets: [{
                data: annualData,
                backgroundColor: [
                    getCSSVariable('--chart-doughnut-1'),
                    getCSSVariable('--chart-doughnut-2'),
                    getCSSVariable('--chart-doughnut-3'),
                    getCSSVariable('--chart-doughnut-4')
                ],
                borderColor: [
                    getCSSVariable('--chart-doughnut-border-1'),
                    getCSSVariable('--chart-doughnut-border-2'),
                    getCSSVariable('--chart-doughnut-border-3'),
                    getCSSVariable('--chart-doughnut-border-4')
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });
}

// Generate branch-specific monthly savings data
function generateBranchMonthlyData(branchId) {
    const baseAmounts = {
        2: 116000, // Bauan
        3: 125000, // San Jose
        4: 98000,  // Rosario
        5: 87000,  // San Juan
        6: 92000,  // Taysan
        7: 85000,  // Lobo
        8: 95000,  // Calaca
        9: 78000,  // Lemery
        10: 82000, // Agoncillo
        11: 88000, // San Nicolas
        12: 90000  // Taal
    };
    
    const baseAmount = baseAmounts[branchId] || 100000;
    const monthlyData = [];
    
    for (let i = 0; i < 12; i++) {
        // Add some variation to make it realistic
        const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
        const amount = Math.round(baseAmount * (1 + variation));
        monthlyData.push(amount);
    }
    
    return monthlyData;
}

// Generate branch-specific disbursement data
function generateBranchDisbursementData(branchId) {
    const baseAmounts = {
        2: 105000, // Bauan
        3: 115000, // San Jose
        4: 88000,  // Rosario
        5: 78000,  // San Juan
        6: 82000,  // Taysan
        7: 75000,  // Lobo
        8: 85000,  // Calaca
        9: 68000,  // Lemery
        10: 72000, // Agoncillo
        11: 78000, // San Nicolas
        12: 80000  // Taal
    };
    
    const baseAmount = baseAmounts[branchId] || 90000;
    const disbursementData = [];
    
    for (let i = 0; i < 12; i++) {
        // Add some variation to make it realistic
        const variation = (Math.random() - 0.5) * 0.25; // ±12.5% variation
        const amount = Math.round(baseAmount * (1 + variation));
        disbursementData.push(amount);
    }
    
    return disbursementData;
}

// Generate branch-specific annual data by category
function generateBranchAnnualData(branchId) {
    const baseAmounts = {
        2: 1160000, // Bauan
        3: 1250000, // San Jose
        4: 980000,  // Rosario
        5: 870000,  // San Juan
        6: 920000,  // Taysan
        7: 850000,  // Lobo
        8: 950000,  // Calaca
        9: 780000,  // Lemery
        10: 820000, // Agoncillo
        11: 880000, // San Nicolas
        12: 900000  // Taal
    };
    
    const baseAmount = baseAmounts[branchId] || 1000000;
    
    // Distribute annual amount across categories
    const regularSavings = Math.round(baseAmount * 0.4); // 40%
    const timeDeposits = Math.round(baseAmount * 0.3);   // 30%
    const specialAccounts = Math.round(baseAmount * 0.2); // 20%
    const emergencyFunds = Math.round(baseAmount * 0.1);  // 10%
    
    return [regularSavings, timeDeposits, specialAccounts, emergencyFunds];
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

// Update contributors list for specific branch
function updateContributorsForBranch(branchId, branchName) {
    const contributorsList = document.querySelector('.contributors-list');
    if (contributorsList) {
        // Generate branch-specific contributor data
        const branchContributors = generateBranchContributors(branchId, branchName);
        contributorsList.innerHTML = branchContributors;
    }
}

// Update branches list for specific branch
function updateBranchesListForBranch(branchId, branchName) {
    const branchesList = document.querySelector('.branches-list');
    if (branchesList) {
        // Show only current branch
        branchesList.innerHTML = `
            <div class="branch-item">
                <div class="branch-info">
                    <span class="branch-name">${branchName}</span>
                    <span class="branch-location">Branch ${branchId}</span>
                </div>
                <div class="branch-amount">₱${generateRandomAmount(80000, 150000)}</div>
            </div>
        `;
    }
}

// Update AI recommendation for specific branch
function updateAIRecommendationForBranch(branchId, branchName) {
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

// Generate branch-specific contributor data
function generateBranchContributors(branchId, branchName) {
    const contributors = [];
    const numContributors = Math.floor(Math.random() * 5) + 3; // 3-7 contributors
    
    // Generate realistic names for each branch
    const branchNames = {
        2: ['Maria Santos', 'Juan Dela Cruz', 'Ana Reyes', 'Pedro Mendoza', 'Carmen Garcia', 'Roberto Torres', 'Luz Villanueva'],
        3: ['Jose Rizal', 'Gabriela Silang', 'Andres Bonifacio', 'Melchora Aquino', 'Lapu-Lapu', 'Tandang Sora', 'Gregorio Del Pilar'],
        4: ['Isabela Basa', 'Mariano Ponce', 'Marcelo Del Pilar', 'Graciano Lopez', 'Jose Alejandrino', 'Antonio Luna', 'Jose Ma. Panganiban'],
        5: ['Emilio Aguinaldo', 'Apolinario Mabini', 'Miguel Malvar', 'Artemio Ricarte', 'Macario Sakay', 'Gregoria De Jesus', 'Marina Dizon'],
        6: ['Santiago Alvarez', 'Mariano Alvarez', 'Pio Valenzuela', 'Jose Dizon', 'Josefa Llanes', 'Gregoria De Jesus', 'Marina Dizon'],
        7: ['Emilio Jacinto', 'Andres Bonifacio', 'Gregoria De Jesus', 'Procopio Bonifacio', 'Procorpio Bonifacio', 'Maximino Bonifacio', 'Espiridiona Bonifacio'],
        8: ['Jose Rizal', 'Marcelo Del Pilar', 'Graciano Lopez', 'Mariano Ponce', 'Jose Alejandrino', 'Antonio Luna', 'Jose Ma. Panganiban'],
        9: ['Emilio Aguinaldo', 'Apolinario Mabini', 'Miguel Malvar', 'Artemio Ricarte', 'Macario Sakay', 'Gregoria De Jesus', 'Marina Dizon'],
        10: ['Santiago Alvarez', 'Mariano Alvarez', 'Pio Valenzuela', 'Jose Dizon', 'Josefa Llanes', 'Gregoria De Jesus', 'Marina Dizon'],
        11: ['Emilio Jacinto', 'Andres Bonifacio', 'Gregoria De Jesus', 'Procopio Bonifacio', 'Procorpio Bonifacio', 'Maximino Bonifacio', 'Espiridiona Bonifacio'],
        12: ['Jose Rizal', 'Marcelo Del Pilar', 'Graciano Lopez', 'Mariano Ponce', 'Jose Alejandrino', 'Antonio Luna', 'Jose Ma. Panganiban']
    };
    
    const availableNames = branchNames[branchId] || ['Member 1', 'Member 2', 'Member 3', 'Member 4', 'Member 5', 'Member 6', 'Member 7'];
    
    for (let i = 0; i < numContributors; i++) {
        const name = availableNames[i] || `Member ${i + 1}`;
        const amount = generateRandomAmount(5000, 25000);
        contributors.push(`
            <div class="contributor-item">
                <div class="contributor-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="contributor-info">
                    <span class="contributor-name">${name}</span>
                    <span class="contributor-branch">${branchName}</span>
                </div>
                <div class="contributor-amount">₱${amount.toLocaleString()}</div>
            </div>
        `);
    }
    
    return contributors.join('');
}

// Generate random amount for demo purposes
function generateRandomAmount(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
