// Analytics Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Set current year as default
    const currentYear = 2025; // Updated to 2025
    const yearFilter = document.getElementById('yearFilter');
    yearFilter.value = currentYear;
    
    // Initialize all charts
    initializeCharts();
    
    // Set up month filter event listeners
    setupMonthFilters();
    
    // Update datetime display
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

// Update date and time display
function updateDateTime() {
    const now = new Date();
    const dateDisplay = document.getElementById('currentDate');
    const timeDisplay = document.getElementById('currentTime');
    
    if (dateDisplay) {
        dateDisplay.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    if (timeDisplay) {
        timeDisplay.textContent = now.toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// Setup month filter functionality
function setupMonthFilters() {
    const monthFilters = document.querySelectorAll('.month-filter');
    
    monthFilters.forEach(filter => {
        filter.addEventListener('click', function() {
            // Remove active class from all filters in the same group
            const filterGroup = this.closest('.chart-section');
            filterGroup.querySelectorAll('.month-filter').forEach(f => f.classList.remove('active'));
            
            // Add active class to clicked filter
            this.classList.add('active');
            
            // Get the month value
            const month = this.dataset.month;
            
            // Update the corresponding chart based on month selection
            updateChartByMonth(month, filterGroup);
        });
    });
}

// Update chart based on month selection
function updateChartByMonth(month, filterGroup) {
    // This function would update the specific chart in the filter group
    // For now, we'll just log the selection
    console.log(`Month selected: ${month} for chart in:`, filterGroup);
    
    // In a real implementation, you would:
    // 1. Fetch data for the selected month
    // 2. Update the chart with new data
    // 3. Re-render the chart
}

// Initialize all charts
function initializeCharts() {
    // Monthly Trends Chart for IBAAN
    createMonthlyTrendsChart();
    
    // Monthly Savings Chart - All Branches
    createMonthlySavingsChart();
    
    // IBAAN Savings Chart
    createIbaansSavingsChart();
    
    // Disbursement Chart - All Branches
    createDisbursementChart();
    
    // IBAAN Disbursement Chart
    createIbaansDisbursementChart();
    
    // Member Growth Chart - All Branches
    createMemberGrowthChart();
    
    // IBAAN Member Growth Chart
    createIbaansMemberGrowthChart();
}

// Monthly Trends Chart for IBAAN Branch - Enhanced Line Chart
function createMonthlyTrendsChart() {
    const ctx = document.getElementById('monthlyTrendsChart');
    if (!ctx) return;
    
    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                label: 'Savings',
                data: [125000, 138000, 142000, 156000, 168000, 175000, 182000, 189000, 195000, 208000, 215000, 225000],
                borderColor: '#0D5B11',
                backgroundColor: 'rgba(13, 91, 17, 0.1)',
                borderWidth: 4,
                fill: true,
                tension: 0.6,
                pointBackgroundColor: '#0D5B11',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointHoverBorderWidth: 4
            },
            {
                label: 'Disbursements',
                data: [98000, 105000, 112000, 118000, 125000, 132000, 138000, 145000, 152000, 158000, 165000, 172000],
                borderColor: '#69B41E',
                backgroundColor: 'rgba(105, 180, 30, 0.1)',
                borderWidth: 4,
                fill: true,
                tension: 0.6,
                pointBackgroundColor: '#69B41E',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointHoverBorderWidth: 4
            }
        ]
    };
    
    new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 25,
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        color: '#0B5E1C'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '₱' + value.toLocaleString();
                        },
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#6B7280'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#6B7280'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                point: {
                    hoverBackgroundColor: '#ffffff'
                }
            }
        }
    });
}

// Monthly Savings Chart - All Branches - Enhanced Bar Chart
function createMonthlySavingsChart() {
    const ctx = document.getElementById('monthlySavingsChart');
    if (!ctx) return;
    
    const data = {
        labels: ['IBAAN', 'BAUAN', 'SAN JOSE', 'ROSARIO', 'SAN JUAN', 'PADRE GARCIA', 'LIPA CITY', 'BATANGAS CITY', 'MABINI LIPA', 'CALAMIAS', 'LEMERY', 'MATAAS NA KAHOY'],
        datasets: [{
            label: 'Monthly Savings',
            data: [225000, 198000, 185000, 172000, 165000, 158000, 152000, 145000, 138000, 132000, 125000, 118000],
            backgroundColor: [
                '#0D5B11', '#187C19', '#69B41E', '#8DC71E', '#B8D53D',
                '#0D5B11', '#187C19', '#69B41E', '#8DC71E', '#B8D53D',
                '#0D5B11', '#187C19'
            ],
            borderColor: '#ffffff',
            borderWidth: 3,
            borderRadius: 12,
            borderSkipped: false,
            hoverBackgroundColor: [
                '#0D5B11', '#187C19', '#69B41E', '#8DC71E', '#B8D53D',
                '#0D5B11', '#187C19', '#69B41E', '#8DC71E', '#B8D53D',
                '#0D5B11', '#187C19'
            ],
            hoverBorderColor: '#0D5B11',
            hoverBorderWidth: 4
        }]
    };
    
    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '₱' + value.toLocaleString();
                        },
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#6B7280'
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        color: '#6B7280'
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

// IBAAN Savings Chart - 12 Months - Enhanced Bar Chart
function createIbaansSavingsChart() {
    const ctx = document.getElementById('ibaansSavingsChart');
    if (!ctx) return;
    
    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            label: 'IBAAN Savings',
            data: [125000, 138000, 142000, 156000, 168000, 175000, 182000, 189000, 195000, 208000, 215000, 225000],
            backgroundColor: 'rgba(13, 91, 17, 0.9)',
            borderColor: '#0D5B11',
            borderWidth: 3,
            borderRadius: 16,
            borderSkipped: false,
            hoverBackgroundColor: 'rgba(13, 91, 17, 1)',
            hoverBorderColor: '#69B41E',
            hoverBorderWidth: 4
        }]
    };
    
    new Chart(ctx, {
        type: 'bar',
        data: data,
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
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '₱' + value.toLocaleString();
                        },
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#6B7280'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#6B7280'
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

// Disbursement Chart - All Branches - Enhanced Bar Chart
function createDisbursementChart() {
    const ctx = document.getElementById('disbursementChart');
    if (!ctx) return;
    
    const data = {
        labels: ['IBAAN', 'BAUAN', 'SAN JOSE', 'ROSARIO', 'SAN JUAN', 'PADRE GARCIA', 'LIPA CITY', 'BATANGAS CITY', 'MABINI LIPA', 'CALAMIAS', 'LEMERY', 'MATAAS NA KAHOY'],
        datasets: [{
            label: 'Monthly Disbursements',
            data: [172000, 158000, 145000, 138000, 132000, 125000, 118000, 112000, 105000, 98000, 92000, 88000],
            backgroundColor: [
                '#0D5B11', '#187C19', '#69B41E', '#8DC71E', '#B8D53D',
                '#0D5B11', '#187C19', '#69B41E', '#8DC71E', '#B8D53D',
                '#0D5B11', '#187C19'
            ],
            borderColor: '#ffffff',
            borderWidth: 3,
            borderRadius: 12,
            borderSkipped: false,
            hoverBackgroundColor: [
                '#0D5B11', '#187C19', '#69B41E', '#8DC71E', '#B8D53D',
                '#0D5B11', '#187C19', '#69B41E', '#8DC71E', '#B8D53D',
                '#0D5B11', '#187C19'
            ],
            hoverBorderColor: '#0D5B11',
            hoverBorderWidth: 4
        }]
    };
    
    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '₱' + value.toLocaleString();
                        },
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#6B7280'
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        color: '#6B7280'
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

// IBAAN Disbursement Chart - 12 Months - Enhanced Bar Chart
function createIbaansDisbursementChart() {
    const ctx = document.getElementById('ibaansDisbursementChart');
    if (!ctx) return;
    
    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            label: 'IBAAN Disbursements',
            data: [98000, 105000, 112000, 118000, 125000, 132000, 138000, 145000, 152000, 158000, 165000, 172000],
            backgroundColor: 'rgba(24, 124, 25, 0.9)',
            borderColor: '#187C19',
            borderWidth: 3,
            borderRadius: 16,
            borderSkipped: false,
            hoverBackgroundColor: 'rgba(24, 124, 25, 1)',
            hoverBorderColor: '#69B41E',
            hoverBorderWidth: 4
        }]
    };
    
    new Chart(ctx, {
        type: 'bar',
        data: data,
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
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '₱' + value.toLocaleString();
                        },
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#6B7280'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#6B7280'
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

// Member Growth Chart - All Branches - Enhanced Bar Chart
function createMemberGrowthChart() {
    const ctx = document.getElementById('memberGrowthChart');
    if (!ctx) return;
    
    const data = {
        labels: ['IBAAN', 'BAUAN', 'SAN JOSE', 'ROSARIO', 'SAN JUAN', 'PADRE GARCIA', 'LIPA CITY', 'BATANGAS CITY', 'MABINI LIPA', 'CALAMIAS', 'LEMERY', 'MATAAS NA KAHOY'],
        datasets: [{
            label: 'Member Growth',
            data: [1250, 1180, 1120, 1080, 1020, 980, 920, 880, 840, 800, 760, 720],
            backgroundColor: [
                'rgba(105, 180, 30, 0.9)', // IBAAN - Main branch highlighted
                'rgba(141, 199, 30, 0.8)',
                'rgba(184, 213, 61, 0.8)',
                'rgba(13, 91, 17, 0.8)',
                'rgba(24, 124, 25, 0.8)',
                'rgba(141, 199, 30, 0.8)',
                'rgba(184, 213, 61, 0.8)',
                'rgba(13, 91, 17, 0.8)',
                'rgba(24, 124, 25, 0.8)',
                'rgba(141, 199, 30, 0.8)',
                'rgba(184, 213, 61, 0.8)',
                'rgba(13, 91, 17, 0.8)'
            ],
            borderColor: '#ffffff',
            borderWidth: 3,
            borderRadius: 12,
            borderSkipped: false,
            hoverBackgroundColor: 'rgba(105, 180, 30, 1)',
            hoverBorderColor: '#0D5B11',
            hoverBorderWidth: 4
        }]
    };
    
    new Chart(ctx, {
        type: 'bar',
        data: data,
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
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' members';
                        },
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#6B7280'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        color: '#6B7280',
                        maxRotation: 45
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

// IBAAN Member Growth Chart - 12 Months - Enhanced Bar Chart
function createIbaansMemberGrowthChart() {
    const ctx = document.getElementById('ibaansMemberGrowthChart');
    if (!ctx) return;
    
    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            label: 'IBAAN Member Growth',
            data: [1200, 1220, 1240, 1260, 1280, 1300, 1320, 1340, 1360, 1380, 1400, 1420],
            backgroundColor: 'rgba(105, 180, 30, 0.9)',
            borderColor: '#69B41E',
            borderWidth: 3,
            borderRadius: 16,
            borderSkipped: false,
            hoverBackgroundColor: 'rgba(105, 180, 30, 1)',
            hoverBorderColor: '#0D5B11',
            hoverBorderWidth: 4
        }]
    };
    
    new Chart(ctx, {
        type: 'bar',
        data: data,
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
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' members';
                        },
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#6B7280'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#6B7280'
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

// Year filter change handler
document.getElementById('yearFilter')?.addEventListener('change', function() {
    const selectedYear = this.value;
    console.log(`Year changed to: ${selectedYear}`);
    
    // In a real implementation, you would:
    // 1. Fetch data for the selected year
    // 2. Update all charts with new data
    // 3. Re-render all charts
    
    // For now, we'll just log the change
    updateAllChartsForYear(selectedYear);
});

// Update all charts for selected year
function updateAllChartsForYear(year) {
    console.log(`Updating all charts for year: ${year}`);
    
    // This function would:
    // 1. Make API calls to get data for the selected year
    // 2. Update all chart data
    // 3. Re-render all charts
    
    // Placeholder for future implementation
}

// Logout function is handled by main.js
