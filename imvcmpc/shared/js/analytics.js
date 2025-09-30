// Analytics Dashboard JavaScript
let currentFilter = 'yesterday'; // Default filter set to yesterday
let customType = 'week'; // Default custom type set to week
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
        return;
    }
    
    setupFilterButtons();
    setupCustomTypeButtons();
    setupDateInputs();
    updateFilterDisplay();
    
    // Check if user is from Ibaan branch and show/hide branches performance section
    const userBranchId = localStorage.getItem('user_branch_id');
    const isIbaanBranch = userBranchId === '1'; // Ibaan/Main Branch has ID 1
    if (!isIbaanBranch) {
        hideBranchesPerformanceSection();
    }
    
    // Initialize custom inputs and date hints
    toggleCustomInputs(customType);
    updateDateHints(customType);
    
    // Add a small delay to ensure DOM is fully rendered
    setTimeout(() => {
        initializeCharts();
        // Load real data only
        loadAnalyticsData();
        console.log('✅ Analytics dashboard initialized successfully');
    }, 200);
}

// Get authentication token from localStorage
function getAuthToken() {
    if (!authToken) {
        authToken = localStorage.getItem('access_token');
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
                // Auto-set date range based on current custom type
                if (customType === 'month') {
                    setMonthRange();
                } else if (customType === 'year') {
                    setYearRange();
                } else {
                    setCustomDateRange(customType);
                }
            } else {
                customRange.style.display = 'none';
                // Remove auto-calculated styling when not in custom mode
                const endDateInput = document.getElementById('endDate');
                if (endDateInput) {
                    endDateInput.classList.remove('auto-calculated');
                }
            }
            
            // Auto-apply filters
            applyFilters();
        });
    });
}

// Setup custom type button event listeners
function setupCustomTypeButtons() {
    const customTypeButtons = document.querySelectorAll('.custom-type-btn');
    
    customTypeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all custom type buttons
            customTypeButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update current custom type
            customType = this.dataset.type;
            
            // Show/hide appropriate input controls
            toggleCustomInputs(customType);
            
            // Auto-set date ranges based on custom type
            if (customType === 'month') {
                setMonthRange();
            } else if (customType === 'year') {
                setYearRange();
            } else {
                setCustomDateRange(customType);
            }
            
            // Auto-apply filters if custom is selected
            if (currentFilter === 'custom') {
                applyFilters();
            }
        });
    });
}

// Toggle between date inputs and month/year selector
function toggleCustomInputs(type) {
    const dateInputs = document.getElementById('dateInputs');
    const weekPicker = document.getElementById('weekPicker');
    const monthYearSelector = document.getElementById('monthYearSelector');
    const yearSelector = document.getElementById('yearSelector');
    
    if (type === 'week') {
        dateInputs.style.display = 'none';
        weekPicker.style.display = 'flex';
        monthYearSelector.style.display = 'none';
        yearSelector.style.display = 'none';
    } else if (type === 'month') {
        dateInputs.style.display = 'none';
        weekPicker.style.display = 'none';
        monthYearSelector.style.display = 'flex';
        yearSelector.style.display = 'none';
        // Populate year options if not already done
        populateYearOptions();
    } else if (type === 'year') {
        dateInputs.style.display = 'none';
        weekPicker.style.display = 'none';
        monthYearSelector.style.display = 'none';
        yearSelector.style.display = 'flex';
        // Populate year options for year selector
        populateYearOptions('yearSelectOnly');
    } else {
        dateInputs.style.display = 'flex';
        weekPicker.style.display = 'none';
        monthYearSelector.style.display = 'none';
        yearSelector.style.display = 'none';
    }
}

// Populate year options for month/year selector
function populateYearOptions(selectorId = 'yearSelect') {
    const yearSelect = document.getElementById(selectorId);
    if (!yearSelect || yearSelect.children.length > 1) return; // Already populated
    
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 5; // 5 years back
    const endYear = currentYear + 1; // 1 year forward
    
    for (let year = endYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    // Set current year as default
    yearSelect.value = currentYear;
}

// Setup date input event listeners
function setupDateInputs() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    // Set default dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    endDateInput.value = today.toISOString().split('T')[0];
    startDateInput.value = yesterday.toISOString().split('T')[0];
    
    // Add change listeners for date inputs
    startDateInput.addEventListener('change', function() {
        // Auto-set end date based on custom type when start date changes
        if (currentFilter === 'custom' && customType) {
            if (customType === 'week') {
                setWeekRangeFromStart(this.value);
            } else {
                setCustomDateRange(customType, this.value);
            }
        }
        applyFilters();
    });
    
    endDateInput.addEventListener('change', function() {
        // Auto-set start date based on custom type when end date changes
        if (currentFilter === 'custom' && customType) {
            if (customType === 'week') {
                setWeekRangeFromEnd(this.value);
            }
        }
        applyFilters();
    });
    
    // Add change listeners for month/year selectors
    if (monthSelect) {
        monthSelect.addEventListener('change', function() {
            if (currentFilter === 'custom' && customType === 'month') {
                setMonthRange();
            }
        });
    }
    
    if (yearSelect) {
        yearSelect.addEventListener('change', function() {
            if (currentFilter === 'custom' && customType === 'month') {
                setMonthRange();
            }
        });
    }
    
    const yearSelectOnly = document.getElementById('yearSelectOnly');
    if (yearSelectOnly) {
        yearSelectOnly.addEventListener('change', function() {
            if (currentFilter === 'custom' && customType === 'year') {
                setYearRange();
            }
        });
    }
    
    const weekDate = document.getElementById('weekDate');
    if (weekDate) {
        weekDate.addEventListener('change', function() {
            if (currentFilter === 'custom' && customType === 'week') {
                setWeekRangeFromSingleDate(this.value);
            }
        });
    }
}

// Set custom date range based on type
function setCustomDateRange(type, startDate = null) {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (!startDateInput || !endDateInput) return;
    
    let start, end;
    
    if (startDate) {
        // Use provided start date
        start = new Date(startDate);
    } else {
        // Use current start date or default to today
        const currentStart = startDateInput.value;
        start = currentStart ? new Date(currentStart) : new Date();
    }
    
    switch (type) {
        case 'week':
            // Set end date to 7 days after start date
            end = new Date(start);
            end.setDate(end.getDate() + 6); // 7 days total (start + 6 more days)
            break;
            
        case 'month':
            // Set end date to last day of the month
            end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            // Set start date to first day of the month
            start = new Date(start.getFullYear(), start.getMonth(), 1);
            break;
            
        case 'year':
            // Set end date to last day of the year
            end = new Date(start.getFullYear(), 11, 31);
            // Set start date to first day of the year
            start = new Date(start.getFullYear(), 0, 1);
            break;
            
        default:
            return; // No change for other types
    }
    
    // Update the input fields
    startDateInput.value = start.toISOString().split('T')[0];
    endDateInput.value = end.toISOString().split('T')[0];
    
    // Add visual feedback for auto-calculation
    endDateInput.style.backgroundColor = '#f0f9ff';
    endDateInput.classList.add('auto-calculated');
    setTimeout(() => {
        endDateInput.style.backgroundColor = '';
    }, 1000);
    
    // Update hint text
    updateDateHints(type);
}

// Set week range from start date (7 days forward)
function setWeekRangeFromStart(startDate) {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (!startDateInput || !endDateInput) return;
    
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // 7 days total (including start date)
    
    startDateInput.value = start.toISOString().split('T')[0];
    endDateInput.value = end.toISOString().split('T')[0];
    
    // Add visual feedback
    endDateInput.style.backgroundColor = '#f0f9ff';
    setTimeout(() => {
        endDateInput.style.backgroundColor = '';
    }, 1000);
    
    updateDateHints('week');
}

// Set week range from end date (7 days backward)
function setWeekRangeFromEnd(endDate) {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (!startDateInput || !endDateInput) return;
    
    const end = new Date(endDate);
    const start = new Date(end);
    start.setDate(start.getDate() - 6); // 7 days total (including end date)
    
    startDateInput.value = start.toISOString().split('T')[0];
    endDateInput.value = end.toISOString().split('T')[0];
    
    // Add visual feedback
    startDateInput.style.backgroundColor = '#f0f9ff';
    setTimeout(() => {
        startDateInput.style.backgroundColor = '';
    }, 1000);
    
    updateDateHints('week');
}

// Set month range from month/year selectors
function setMonthRange() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (!monthSelect || !yearSelect || !startDateInput || !endDateInput) return;
    
    const month = monthSelect.value;
    const year = yearSelect.value;
    
    if (!month || !year) return;
    
    // Set start date to first day of the month
    const start = new Date(year, month - 1, 1);
    
    // Set end date to last day of the month
    const end = new Date(year, month, 0);
    
    startDateInput.value = start.toISOString().split('T')[0];
    endDateInput.value = end.toISOString().split('T')[0];
    
    // Add visual feedback
    startDateInput.style.backgroundColor = '#f0f9ff';
    endDateInput.style.backgroundColor = '#f0f9ff';
    setTimeout(() => {
        startDateInput.style.backgroundColor = '';
        endDateInput.style.backgroundColor = '';
    }, 1000);
    
    updateDateHints('month');
    
    // Auto-apply filters
    console.log('📅 Month range set, auto-applying filters...');
    applyFilters();
}

// Set year range (full year)
function setYearRange() {
    const yearSelectOnly = document.getElementById('yearSelectOnly');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (!yearSelectOnly || !startDateInput || !endDateInput) return;
    
    const selectedYear = parseInt(yearSelectOnly.value);
    if (!selectedYear) return;
    
    // Set start date to January 1st of selected year
    const startDate = new Date(selectedYear, 0, 1);
    // Set end date to December 31st of selected year
    const endDate = new Date(selectedYear, 11, 31);
    
    startDateInput.value = startDate.toISOString().split('T')[0];
    endDateInput.value = endDate.toISOString().split('T')[0];
    
    // Add visual feedback
    endDateInput.style.backgroundColor = '#f0f9ff';
    setTimeout(() => {
        endDateInput.style.backgroundColor = '';
    }, 1000);
    
    // Update hint text
    updateDateHints('year');
    
    // Auto-apply filters
    console.log('📅 Year range set, auto-applying filters...');
    applyFilters();
}

// Set week range from single date selection
function setWeekRangeFromSingleDate(selectedDate) {
    const weekDate = document.getElementById('weekDate');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (!weekDate || !startDateInput || !endDateInput) return;
    
    if (!selectedDate) return;
    
    const selected = new Date(selectedDate);
    const startOfWeek = new Date(selected);
    
    // Set end date to 7 days after start date
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // 7 days total (start + 6 more days)
    
    // Update the hidden date inputs
    startDateInput.value = startOfWeek.toISOString().split('T')[0];
    endDateInput.value = endOfWeek.toISOString().split('T')[0];
    
    // Update week preview
    updateWeekPreview(startOfWeek, endOfWeek, selected);
    
    // Add visual feedback
    endDateInput.style.backgroundColor = '#f0f9ff';
    setTimeout(() => {
        endDateInput.style.backgroundColor = '';
    }, 1000);
    
    // Apply filters
    applyFilters();
}

// Update week preview display
function updateWeekPreview(startDate, endDate, selectedDate) {
    const weekDates = document.getElementById('weekDates');
    if (!weekDates) return;
    
    // Clear existing content
    weekDates.innerHTML = '';
    
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
        const dateItem = document.createElement('div');
        dateItem.className = 'week-date-item';
        
        const dayNumber = currentDate.getDate();
        const dayName = dayNames[i];
        
        dateItem.innerHTML = `
            <span class="date-day">${dayNumber}</span>
            <span class="date-name">${dayName}</span>
        `;
        
        // Check if this is the selected date
        if (currentDate.toDateString() === selectedDate.toDateString()) {
            dateItem.classList.add('selected');
        } else {
            dateItem.classList.add('range');
        }
        
        weekDates.appendChild(dateItem);
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// Update date input hints based on custom type
function updateDateHints(type) {
    const startDateHint = document.getElementById('startDateHint');
    const endDateHint = document.getElementById('endDateHint');
    const weekDateHint = document.getElementById('weekDateHint');
    
    if (type === 'week' && weekDateHint) {
        weekDateHint.textContent = 'Select any day of the week (7-day range will be calculated)';
    }
    
    if (!startDateHint || !endDateHint) return;
    
    switch (type) {
        case 'week':
            startDateHint.textContent = 'Select any day of the week';
            endDateHint.textContent = 'Auto-calculated (7 days)';
            break;
        case 'month':
            startDateHint.textContent = 'Use month/year selectors below';
            endDateHint.textContent = 'Auto-calculated (full month)';
            break;
        case 'year':
            startDateHint.textContent = 'Use year selector below';
            endDateHint.textContent = 'Auto-calculated (full year)';
            break;
        default:
            startDateHint.textContent = 'Select start date';
            endDateHint.textContent = 'Auto-calculated';
    }
}

// Update filter display based on current selection
function updateFilterDisplay() {
    const filterDisplay = document.querySelector('.filter-display');
    let displayText = '';
    
    switch (currentFilter) {
        case 'yesterday':
            displayText = 'Yesterday\'s Data';
            break;
        case 'last-7-days':
            displayText = 'Last 7 Days Data';
            break;
        case 'last-30-days':
            displayText = 'Last 30 Days Data';
            break;
        case 'custom':
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            if (startDate && endDate) {
                displayText = `Custom Range (${customType}): ${formatDate(startDate)} - ${formatDate(endDate)}`;
            } else {
                displayText = `Custom Range (${customType}) - Select Dates`;
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
    console.log('🔄 Applying filters:', currentFilter);
    
    // Log date range for debugging
    if (currentFilter !== 'custom') {
        const dateRange = getDateRange(currentFilter);
        console.log('📅 Date range:', {
            start: dateRange.start.toISOString().split('T')[0],
            end: dateRange.end.toISOString().split('T')[0],
            startTime: dateRange.start.toISOString(),
            endTime: dateRange.end.toISOString()
        });
    } else {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        console.log('📅 Custom date range:', { startDate, endDate, customType });
    }
    
    // Load fresh data with current filters
    loadAnalyticsData();
}

// Load all analytics data
async function loadAnalyticsData() {
    try {
        console.log('🔄 Starting to load analytics data...');
        console.log('🔍 Current filter:', currentFilter);
        showLoadingState();
        
        // Get user branch information for branch-specific data access
        const userBranchId = localStorage.getItem('user_branch_id') || '1';
        const userBranchName = localStorage.getItem('user_branch_name') || 'Main Branch';
        const userBranchLocation = localStorage.getItem('user_branch_location') || 'IBAAN';
        const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
        
        console.log('🏢 User branch info:', {
            userBranchId,
            userBranchName,
            userBranchLocation,
            isMainBranchUser
        });
        
        // Try to load real data first
        try {
            console.log('📡 Fetching analytics data from API...');
            const [summaryData, savingsTrend, disbursementTrend, branchPerformance, memberActivity, topMembers, allBranchesPerformance] = await Promise.all([
                fetchAnalyticsSummary(userBranchId, isMainBranchUser),
                fetchSavingsTrend(userBranchId, isMainBranchUser),
                fetchDisbursementTrend(userBranchId, isMainBranchUser),
                fetchBranchPerformance(userBranchId, isMainBranchUser),
                fetchMemberActivity(userBranchId, isMainBranchUser),
                fetchTopMembers(userBranchId, isMainBranchUser),
                fetchAllBranchesPerformance()
            ]);
            
            console.log('📊 Fetched data:', {
                summaryData,
                savingsTrend: savingsTrend?.length || 0,
                disbursementTrend: disbursementTrend?.length || 0,
                branchPerformance: branchPerformance?.length || 0,
                memberActivity: memberActivity?.length || 0,
                topMembers: topMembers?.length || 0,
                allBranchesPerformance: allBranchesPerformance?.length || 0
            });
            
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
                
                // Only show branches performance for Ibaan branch users
                const userBranchId = localStorage.getItem('user_branch_id');
                const isIbaanBranch = userBranchId === '1'; // Ibaan/Main Branch has ID 1
                if (isIbaanBranch) {
                    updateBranchesPerformance(allBranchesPerformance);
                } else {
                    hideBranchesPerformanceSection();
                }
                
            } else {
                console.log('📊 No real data available, showing empty state');
                // Show empty state when no real data
                showEmptyState();
            }
            
            hideLoadingState();
            console.log('✅ Analytics data loading completed');
            
        } catch (apiError) {
            console.log('API not available, showing empty state');
            showEmptyState();
            hideLoadingState();
        }
        
    } catch (error) {
        console.error('❌ Error loading analytics data:', error);
        hideLoadingState();
        showEmptyState();
    }
}

// Fetch analytics summary data
async function fetchAnalyticsSummary(userBranchId = '1', isMainBranchUser = true) {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter,
        branchId: userBranchId,
        isMainBranch: isMainBranchUser.toString()
    });
    
    // Add date range parameters for all filters
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('customType', customType);
    } else {
        // For non-custom filters, calculate and add date range
        const dateRange = getDateRange(currentFilter);
        // Format dates as YYYY-MM-DD for consistent timezone handling
        params.append('startDate', dateRange.start.toISOString().split('T')[0]);
        params.append('endDate', dateRange.end.toISOString().split('T')[0]);
    }
    
    console.log('📊 Fetching analytics summary with params:', params.toString());
    
    const response = await fetch(`${API_BASE_URL}/analytics/summary?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    console.log('📊 Analytics summary response status:', response.status);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Analytics summary API error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('📊 Analytics summary result:', result);
    return result.data;
}

// Fetch savings trend data
async function fetchSavingsTrend(userBranchId = '1', isMainBranchUser = true) {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter,
        branchId: userBranchId,
        isMainBranch: isMainBranchUser.toString()
    });
    
    // Add date range parameters for all filters
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('customType', customType);
    } else {
        // For non-custom filters, calculate and add date range
        const dateRange = getDateRange(currentFilter);
        // Format dates as YYYY-MM-DD for consistent timezone handling
        params.append('startDate', dateRange.start.toISOString().split('T')[0]);
        params.append('endDate', dateRange.end.toISOString().split('T')[0]);
    }
    
    console.log('📈 Fetching savings trend with params:', params.toString());
    
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
async function fetchDisbursementTrend(userBranchId = '1', isMainBranchUser = true) {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter,
        branchId: userBranchId,
        isMainBranch: isMainBranchUser.toString()
    });
    
    // Add date range parameters for all filters
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('customType', customType);
    } else {
        // For non-custom filters, calculate and add date range
        const dateRange = getDateRange(currentFilter);
        // Format dates as YYYY-MM-DD for consistent timezone handling
        params.append('startDate', dateRange.start.toISOString().split('T')[0]);
        params.append('endDate', dateRange.end.toISOString().split('T')[0]);
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
async function fetchBranchPerformance(userBranchId = '1', isMainBranchUser = true) {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter,
        branchId: userBranchId,
        isMainBranch: isMainBranchUser.toString()
    });
    
    // Add date range parameters for all filters
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('customType', customType);
    } else {
        // For non-custom filters, calculate and add date range
        const dateRange = getDateRange(currentFilter);
        // Format dates as YYYY-MM-DD for consistent timezone handling
        params.append('startDate', dateRange.start.toISOString().split('T')[0]);
        params.append('endDate', dateRange.end.toISOString().split('T')[0]);
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
async function fetchMemberActivity(userBranchId = '1', isMainBranchUser = true) {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter,
        branchId: userBranchId,
        isMainBranch: isMainBranchUser.toString()
    });
    
    // Add date range parameters for all filters
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('customType', customType);
    } else {
        // For non-custom filters, calculate and add date range
        const dateRange = getDateRange(currentFilter);
        // Format dates as YYYY-MM-DD for consistent timezone handling
        params.append('startDate', dateRange.start.toISOString().split('T')[0]);
        params.append('endDate', dateRange.end.toISOString().split('T')[0]);
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
async function fetchTopMembers(userBranchId = '1', isMainBranchUser = true) {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter,
        branchId: userBranchId,
        isMainBranch: isMainBranchUser.toString()
    });
    
    // Add date range parameters for all filters
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('customType', customType);
    } else {
        // For non-custom filters, calculate and add date range
        const dateRange = getDateRange(currentFilter);
        // Format dates as YYYY-MM-DD for consistent timezone handling
        params.append('startDate', dateRange.start.toISOString().split('T')[0]);
        params.append('endDate', dateRange.end.toISOString().split('T')[0]);
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

// Fetch all branches performance data
async function fetchAllBranchesPerformance() {
    const token = await ensureAuthToken();
    
    const params = new URLSearchParams({
        filter: currentFilter
    });
    
    // Add date range parameters for all filters
    if (currentFilter === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('customType', customType);
    } else {
        // For non-custom filters, calculate and add date range
        const dateRange = getDateRange(currentFilter);
        // Format dates as YYYY-MM-DD for consistent timezone handling
        params.append('startDate', dateRange.start.toISOString().split('T')[0]);
        params.append('endDate', dateRange.end.toISOString().split('T')[0]);
    }
    
    console.log('🏢 Fetching all branches performance with params:', params.toString());
    
    const response = await fetch(`${API_BASE_URL}/analytics/all-branches-performance?${params}`, {
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
                // Destroy existing chart if it exists
                if (chartInstances[chartId]) {
                    chartInstances[chartId].destroy();
                }
                
                // Show canvas by default, hide no-data message initially
                canvas.style.display = 'block';
                const noDataMessage = canvas.parentElement.querySelector('.no-data-message');
                if (noDataMessage) {
                    noDataMessage.style.display = 'none';
                }
                
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

// Get chart options based on type and current filter
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
    
    // Determine time granularity based on current filter
    let timeGranularity = 'day';
    if (currentFilter === 'yesterday') {
        timeGranularity = 'hour';
    } else if (currentFilter === 'last-7-days') {
        timeGranularity = 'day';
    } else if (currentFilter === 'last-30-days') {
        timeGranularity = 'week';
    } else if (currentFilter === 'custom') {
        if (customType === 'week') {
            timeGranularity = 'day';
        } else if (customType === 'month') {
            timeGranularity = 'week';
        } else if (customType === 'year') {
            timeGranularity = 'month';
        } else {
            timeGranularity = 'day';
        }
    }
    
    if (type === 'line') {
        baseOptions.scales = {
            x: {
                display: true,
                title: {
                    display: true,
                    text: getTimeAxisLabel(timeGranularity)
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
            // For trend charts, use dynamic x-axis based on filter
            baseOptions.scales = {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: getTimeAxisLabel(timeGranularity)
                    },
                    ticks: {
                        maxTicksLimit: getMaxTicksLimit(timeGranularity)
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

// Get time axis label based on granularity and current filter
function getTimeAxisLabel(granularity) {
    if (currentFilter === 'last-30-days') {
        return 'Weekly Periods';
    }
    
    if (currentFilter === 'custom' && customType === 'year') {
        return 'Month';
    }
    
    switch (granularity) {
        case 'hour':
            return 'Time (Hours)';
        case 'day':
            return 'Date';
        case 'week':
            return 'Week';
        case 'month':
            return 'Month';
        case 'year':
            return 'Year';
        default:
            return 'Date';
    }
}

// Get max ticks limit based on granularity
function getMaxTicksLimit(granularity) {
    switch (granularity) {
        case 'hour':
            return 12; // 12 hours max
        case 'day':
            return 7; // 7 days max
        case 'week':
            return 8; // 8 weeks max
        case 'month':
            return 12; // 12 months max
        case 'year':
            return 10; // 10 years max
        default:
            return 8;
    }
}

// Generate date labels for Last 7 Days filter (7 days ending yesterday)
function generateLast7DaysLabels() {
    const labels = [];
    
    // Generate 7 days ending yesterday (not including today)
    for (let i = 7; i >= 1; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateLabel = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
        labels.push(dateLabel);
    }
    
    return labels;
}

// Generate 6-day periods for Last 30 Days filter (5 periods of 6 days each)
function generateLast30DaysWeeklyLabels() {
    const labels = [];
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    // Generate 5 periods of 6 days each (30 days total, ending yesterday)
    for (let period = 4; period >= 0; period--) {
        const endDate = new Date(yesterday);
        endDate.setDate(yesterday.getDate() - (period * 6)); // End of period
        
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 5); // Start of period (6 days total)
        
        // Format as "Aug 20-25, 2025" or "Aug 26-Sep 01, 2025"
        const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
        const startDay = startDate.getDate();
        const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
        const endDay = endDate.getDate();
        const year = endDate.getFullYear();
        
        let periodLabel;
        if (startMonth === endMonth) {
            // Same month: "Aug 20-25, 2025"
            periodLabel = `${startMonth} ${startDay}-${endDay}, ${year}`;
        } else {
            // Different months: "Aug 26-Sep 01, 2025"
            periodLabel = `${startMonth} ${startDay}-${endMonth} ${endDay}, ${year}`;
        }
        
        labels.push(periodLabel);
    }
    
    return labels;
}

// Generate custom week labels based on selected start date
function generateCustomWeekLabels() {
    const labels = [];
    const startDate = new Date(document.getElementById('startDate').value);
    
    if (!startDate || isNaN(startDate.getTime())) {
        return generateLast7DaysLabels(); // Fallback to default
    }
    
    // Generate 7 days starting from selected start date
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateLabel = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
        labels.push(dateLabel);
    }
    
    return labels;
}

// Generate weekly labels for custom month (4 weeks within the month)
function generateCustomMonthWeeklyLabels() {
    const labels = [];
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (!monthSelect || !yearSelect || !monthSelect.value || !yearSelect.value) {
        return generateLast30DaysWeeklyLabels(); // Fallback to default
    }
    
    const selectedMonth = parseInt(monthSelect.value);
    const selectedYear = parseInt(yearSelect.value);
    
    // Get first and last day of the month
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDay = new Date(selectedYear, selectedMonth, 0);
    const totalDays = lastDay.getDate();
    
    // Calculate days per week (distribute evenly)
    const daysPerWeek = Math.ceil(totalDays / 4);
    
    // Generate 4 weekly periods within the month
    for (let week = 0; week < 4; week++) {
        const startDayNum = (week * daysPerWeek) + 1;
        const endDayNum = Math.min((week + 1) * daysPerWeek, totalDays);
        
        // Skip if start day is beyond the month
        if (startDayNum > totalDays) {
            break;
        }
        
        const startDate = new Date(selectedYear, selectedMonth - 1, startDayNum);
        const endDate = new Date(selectedYear, selectedMonth - 1, endDayNum);
        
        // Format as "Aug 1-7, 2025" or "Aug 8-14, 2025"
        const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
        const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
        const year = endDate.getFullYear();
        
        let weekLabel;
        if (startMonth === endMonth) {
            // Same month: "Aug 1-7, 2025"
            weekLabel = `${startMonth} ${startDayNum}-${endDayNum}, ${year}`;
        } else {
            // Different months: "Aug 29-Sep 4, 2025"
            weekLabel = `${startMonth} ${startDayNum}-${endMonth} ${endDayNum}, ${year}`;
        }
        
        labels.push(weekLabel);
    }
    
    return labels;
}

// Generate monthly labels for custom year (12 months)
function generateCustomYearMonthlyLabels() {
    const labels = [];
    const yearSelect = document.getElementById('yearSelectOnly');
    
    if (!yearSelect || !yearSelect.value) {
        // Fallback to current year if no year selected
        const currentYear = new Date().getFullYear();
        for (let month = 1; month <= 12; month++) {
            const date = new Date(currentYear, month - 1, 1);
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            labels.push(monthName);
        }
        return labels;
    }
    
    const selectedYear = parseInt(yearSelect.value);
    
    // Generate 12 months for the selected year
    for (let month = 1; month <= 12; month++) {
        const date = new Date(selectedYear, month - 1, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        labels.push(monthName);
    }
    
    return labels;
}

// Generate past 12 months labels with year indication for branch performance
function generatePast12MonthsLabels() {
    const labels = [];
    const today = new Date();
    
    // Generate past 12 months starting from the oldest month (left to right for chart)
    for (let i = 12; i >= 1; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        
        // Add year indication for clarity
        labels.push(`${monthName} ${year}`);
    }
    
    return labels;
}

// Generate labels based on current filter
function generateChartLabels(data, filter) {
    if (filter === 'last-7-days') {
        return generateLast7DaysLabels();
    } else if (filter === 'yesterday') {
        return ['Yesterday'];
    } else if (filter === 'last-30-days') {
        return generateLast30DaysWeeklyLabels();
    } else if (filter === 'custom') {
        if (customType === 'week') {
            return generateCustomWeekLabels(); // Use custom week labels
        } else if (customType === 'month') {
            return generateCustomMonthWeeklyLabels(); // Use custom month weekly labels
        } else if (customType === 'year') {
            return generateCustomYearMonthlyLabels();
        }
    }
    
    // Default fallback
    return data.map(item => new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    }));
}

// Align data with date labels for Last 7 Days filter (7 days ending yesterday)
function alignDataWithLast7Days(data, valueKey) {
    const alignedData = new Array(7).fill(0);
    
    // Create a map of dates to their index (7 days ending yesterday)
    const dateIndexMap = {};
    for (let i = 7; i >= 1; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // Ensure we get the date in local timezone for proper alignment
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`; // YYYY-MM-DD format
        dateIndexMap[dateString] = 7 - i; // Index for proper order
    }
    
    // Align data with date labels
    data.forEach(item => {
        const itemDate = new Date(item.date);
        // Ensure we get the date in local timezone for proper alignment
        const year = itemDate.getFullYear();
        const month = String(itemDate.getMonth() + 1).padStart(2, '0');
        const day = String(itemDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`; // YYYY-MM-DD format
        const index = dateIndexMap[dateString];
        
        if (index !== undefined) {
            alignedData[index] = parseFloat(item[valueKey]) || 0;
        }
    });
    
    return alignedData;
}

// Align data with 6-day periods for Last 30 Days filter (5 periods of 6 days each)
function alignDataWithLast30DaysWeekly(data, valueKey) {
    const alignedData = new Array(5).fill(0);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    // Group data by 6-day periods
    data.forEach(item => {
        const itemDate = new Date(item.date);
        const daysDiff = Math.floor((yesterday - itemDate) / (1000 * 60 * 60 * 24));
        
        // Determine which 6-day period this data belongs to
        let periodIndex;
        if (daysDiff >= 0 && daysDiff <= 5) {
            periodIndex = 4; // Most recent period (6 days)
        } else if (daysDiff >= 6 && daysDiff <= 11) {
            periodIndex = 3; // Second period
        } else if (daysDiff >= 12 && daysDiff <= 17) {
            periodIndex = 2; // Third period
        } else if (daysDiff >= 18 && daysDiff <= 23) {
            periodIndex = 1; // Fourth period
        } else if (daysDiff >= 24 && daysDiff <= 29) {
            periodIndex = 0; // Fifth period (oldest)
        }
        
        if (periodIndex !== undefined) {
            alignedData[periodIndex] += parseFloat(item[valueKey]) || 0;
        }
    });
    
    return alignedData;
}

// Align data with custom week dates (7 days from selected start date)
function alignDataWithCustomWeek(data, valueKey) {
    const alignedData = new Array(7).fill(0);
    const startDate = new Date(document.getElementById('startDate').value);
    
    if (!startDate || isNaN(startDate.getTime())) {
        return alignedData;
    }
    
    // Create a map of dates to their index for the selected week
    const dateIndexMap = {};
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        // Ensure we get the date in local timezone for proper alignment
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`; // YYYY-MM-DD format
        dateIndexMap[dateString] = i;
    }
    
    // Align data with date labels
    data.forEach(item => {
        const itemDate = new Date(item.date);
        // Ensure we get the date in local timezone for proper alignment
        const year = itemDate.getFullYear();
        const month = String(itemDate.getMonth() + 1).padStart(2, '0');
        const day = String(itemDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`; // YYYY-MM-DD format
        const index = dateIndexMap[dateString];
        
        if (index !== undefined) {
            alignedData[index] = parseFloat(item[valueKey]) || 0;
        }
    });
    
    return alignedData;
}

// Align data with custom month weekly periods (4 weeks within the month)
function alignDataWithCustomMonthWeekly(data, valueKey) {
    const alignedData = new Array(4).fill(0);
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (!monthSelect || !yearSelect || !monthSelect.value || !yearSelect.value) {
        return alignedData;
    }
    
    const selectedMonth = parseInt(monthSelect.value);
    const selectedYear = parseInt(yearSelect.value);
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate(); // Get actual last day of month
    const totalDays = lastDay;
    
    // Calculate days per week (distribute evenly)
    const daysPerWeek = Math.ceil(totalDays / 4);
    
    // Group data by weekly periods within the month
    data.forEach(item => {
        const itemDate = new Date(item.date);
        
        // Check if the item date is within the selected month
        if (itemDate.getMonth() === selectedMonth - 1 && itemDate.getFullYear() === selectedYear) {
            const dayOfMonth = itemDate.getDate();
            
            // Determine which week this data belongs to (0-3)
            // Use the same distribution as the label generation
            let weekIndex;
            for (let week = 0; week < 4; week++) {
                const startDayNum = (week * daysPerWeek) + 1;
                const endDayNum = Math.min((week + 1) * daysPerWeek, totalDays);
                
                if (dayOfMonth >= startDayNum && dayOfMonth <= endDayNum) {
                    weekIndex = week;
                    break;
                }
            }
            
            if (weekIndex !== undefined) {
                alignedData[weekIndex] += parseFloat(item[valueKey]) || 0;
            }
        }
    });
    
    return alignedData;
}

// Align data with custom year monthly periods (12 months)
function alignDataWithCustomYearMonthly(data, valueKey) {
    const alignedData = new Array(12).fill(0);
    const yearSelect = document.getElementById('yearSelectOnly');
    
    if (!yearSelect || !yearSelect.value) {
        return alignedData;
    }
    
    const selectedYear = parseInt(yearSelect.value);
    
    // Group data by months within the selected year
    data.forEach(item => {
        const itemDate = new Date(item.date);
        
        // Check if the item date is within the selected year
        if (itemDate.getFullYear() === selectedYear) {
            const monthIndex = itemDate.getMonth(); // 0-11
            
            if (monthIndex >= 0 && monthIndex < 12) {
                alignedData[monthIndex] += parseFloat(item[valueKey]) || 0;
            }
        }
    });
    
    return alignedData;
}

// Align data with past 12 months for branch performance
function alignDataWithPast12Months(data, valueKey) {
    const alignedData = new Array(12).fill(0);
    const today = new Date();
    
    // Create a map of month-year to index (oldest month = index 0, leftmost on chart)
    const monthIndexMap = {};
    for (let i = 12; i >= 1; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthIndexMap[monthYear] = 12 - i; // Index for proper order (0-11, left to right)
    }
    
    // Align data with month-year labels
    data.forEach(item => {
        const itemDate = new Date(item.date);
        const monthYear = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
        const index = monthIndexMap[monthYear];
        
        if (index !== undefined) {
            alignedData[index] += parseFloat(item[valueKey]) || 0;
        }
    });
    
    return alignedData;
}

// Update charts with real data
function updateCharts(savingsTrend, disbursementTrend, branchPerformance, memberActivity) {
    console.log('🔄 Updating all charts with real data...');
    
    // Destroy existing charts to ensure proper recreation with new options
    destroyExistingCharts();
    
    updateSavingsTrendChart(savingsTrend);
    updateDisbursementTrendChart(disbursementTrend);
    updateBranchPerformanceChart(branchPerformance);
    updateMemberActivityChart(memberActivity);
    console.log('✅ All charts updated with real data');
}

// Destroy existing chart instances
function destroyExistingCharts() {
    Object.keys(chartInstances).forEach(chartId => {
        if (chartInstances[chartId]) {
            chartInstances[chartId].destroy();
            chartInstances[chartId] = null;
        }
    });
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
        if (noDataMessage) noDataMessage.style.display = 'flex';
        if (canvas) canvas.style.display = 'none';
        return;
    }
    
    console.log('✅ Savings data available, showing chart');
    if (noDataMessage) noDataMessage.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    
    const labels = generateChartLabels(data, currentFilter);
    let values;
    if (currentFilter === 'last-7-days') {
        values = alignDataWithLast7Days(data, 'total_savings');
    } else if (currentFilter === 'last-30-days') {
        values = alignDataWithLast30DaysWeekly(data, 'total_savings');
    } else if (currentFilter === 'custom' && customType === 'week') {
        values = alignDataWithCustomWeek(data, 'total_savings');
        } else if (currentFilter === 'custom' && customType === 'month') {
            values = alignDataWithCustomMonthWeekly(data, 'total_savings');
        } else if (currentFilter === 'custom' && customType === 'year') {
            values = alignDataWithCustomYearMonthly(data, 'total_savings');
        } else {
            values = data.map(item => parseFloat(item.total_savings) || 0);
        }
    
    // Validate data
    if (labels.length === 0 || values.length === 0) {
        console.error('❌ Invalid chart data: empty labels or values');
        return;
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
                    backgroundColor: 'rgba(0, 117, 66, 0.7)',
                    borderColor: '#007542',
                    borderWidth: 2,
                    type: 'bar'
                }, {
                    label: 'Savings Trend (Line)',
                    data: values,
                    borderColor: '#58BB43',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    type: 'line',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#007542',
                    pointBorderColor: '#58BB43'
                }]
            },
            options: getChartOptions('bar', true)
        });
        
        console.log('✅ Savings trend chart created successfully');
        chartInstances.savingsTrendChart.update();
        
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
        if (noDataMessage) noDataMessage.style.display = 'flex';
        if (canvas) canvas.style.display = 'none';
        return;
    }
    
    console.log('Disbursement data available, showing chart');
    if (noDataMessage) noDataMessage.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    
    const labels = generateChartLabels(data, currentFilter);
    let values;
    if (currentFilter === 'last-7-days') {
        values = alignDataWithLast7Days(data, 'total_disbursements');
    } else if (currentFilter === 'last-30-days') {
        values = alignDataWithLast30DaysWeekly(data, 'total_disbursements');
    } else if (currentFilter === 'custom' && customType === 'week') {
        values = alignDataWithCustomWeek(data, 'total_disbursements');
    } else if (currentFilter === 'custom' && customType === 'month') {
        values = alignDataWithCustomMonthWeekly(data, 'total_disbursements');
    } else if (currentFilter === 'custom' && customType === 'year') {
        values = alignDataWithCustomYearMonthly(data, 'total_disbursements');
    } else {
        values = data.map(item => parseFloat(item.total_disbursements) || 0);
    }
    
    // Validate data
    if (labels.length === 0 || values.length === 0) {
        console.error('❌ Invalid disbursement chart data: empty labels or values');
        return;
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
                    backgroundColor: 'rgba(88, 187, 67, 0.6)',
                    borderColor: '#58BB43',
                    borderWidth: 2,
                    type: 'bar'
                }, {
                    label: 'Disbursement Trend (Line)',
                    data: values,
                    borderColor: '#1E8C45',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    type: 'line',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#58BB43',
                    pointBorderColor: '#1E8C45'
                }]
            },
            options: getChartOptions('bar', true)
        });
        
        console.log('✅ Disbursement trend chart created successfully');
        chartInstances.disbursementTrendChart.update();
        
    } catch (error) {
        console.error('❌ Error creating disbursement trend chart:', error);
    }
}

// Update branch performance chart - time series with three lines
function updateBranchPerformanceChart(data) {
    console.log('📊 Updating branch performance chart with time series data:', data);
    const canvas = document.getElementById('branchPerformanceChart');
    
    if (!canvas) {
        console.error('❌ Branch performance chart canvas not found!');
        return;
    }
    
    const noDataMessage = canvas.parentElement.querySelector('.no-data-message');
    
    if (!data || data.length === 0) {
        console.log('⚠️ No branch performance data available, showing no-data message');
        if (noDataMessage) noDataMessage.style.display = 'flex';
        if (canvas) canvas.style.display = 'none';
        return;
    }
    
    console.log('✅ Branch performance data available, showing time series chart');
    if (noDataMessage) noDataMessage.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    
    // Generate labels based on current filter
    const labels = generateChartLabels(data, currentFilter);
    
    // Align data based on current filter
    let savingsData, disbursementData;
    if (currentFilter === 'last-7-days') {
        savingsData = alignDataWithLast7Days(data, 'total_savings');
        disbursementData = alignDataWithLast7Days(data, 'total_disbursements');
    } else if (currentFilter === 'last-30-days') {
        savingsData = alignDataWithLast30DaysWeekly(data, 'total_savings');
        disbursementData = alignDataWithLast30DaysWeekly(data, 'total_disbursements');
    } else if (currentFilter === 'custom' && customType === 'week') {
        savingsData = alignDataWithCustomWeek(data, 'total_savings');
        disbursementData = alignDataWithCustomWeek(data, 'total_disbursements');
    } else if (currentFilter === 'custom' && customType === 'month') {
        savingsData = alignDataWithCustomMonthWeekly(data, 'total_savings');
        disbursementData = alignDataWithCustomMonthWeekly(data, 'total_disbursements');
    } else if (currentFilter === 'custom' && customType === 'year') {
        savingsData = alignDataWithCustomYearMonthly(data, 'total_savings');
        disbursementData = alignDataWithCustomYearMonthly(data, 'total_disbursements');
    } else {
        savingsData = data.map(item => parseFloat(item.total_savings) || 0);
        disbursementData = data.map(item => parseFloat(item.total_disbursements) || 0);
    }
    
    // Calculate net difference (savings - disbursements)
    const netDifferenceData = savingsData.map((savings, index) => {
        const disbursements = disbursementData[index] || 0;
        return savings - disbursements;
    });
    
    // Validate data
    if (labels.length === 0 || savingsData.length === 0 || disbursementData.length === 0) {
        console.error('❌ Invalid branch chart data: empty labels or values');
        return;
    }
    
    if (chartInstances.branchPerformanceChart) {
        chartInstances.branchPerformanceChart.destroy();
    }
    
    try {
        // Create line chart with three trend lines
        chartInstances.branchPerformanceChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Savings Trend',
                    data: savingsData,
                    borderColor: '#007542', // Theme green for savings
                    backgroundColor: 'rgba(0, 117, 66, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#007542',
                    pointBorderColor: '#007542'
                }, {
                    label: 'Disbursement Trend',
                    data: disbursementData,
                    borderColor: '#58BB43', // Theme green variant for disbursements
                    backgroundColor: 'rgba(88, 187, 67, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#58BB43',
                    pointBorderColor: '#58BB43'
                }, {
                    label: 'Net Difference',
                    data: netDifferenceData,
                    borderColor: '#F59E0B', // Orange for net difference
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#F59E0B',
                    pointBorderColor: '#F59E0B'
                }]
            },
            options: getChartOptions('line', true)
        });
        
        console.log('✅ Branch performance time series chart created successfully');
        chartInstances.branchPerformanceChart.update();
        
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
        if (noDataMessage) noDataMessage.style.display = 'flex';
        if (canvas) canvas.style.display = 'none';
        return;
    }
    
    console.log('Member activity data available, showing chart');
    if (noDataMessage) noDataMessage.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    
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
                        '#007542',
                        '#1E8C45',
                        '#3AA346',
                        '#58BB43',
                        '#78D23D'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#007542',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return [
                                    `${value} transactions`,
                                    `${percentage}% of total activity`
                                ];
                            }
                        }
                    }
                }
            }
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

// Update branches performance section with real data
function updateBranchesPerformance(data) {
    console.log('🏢 Updating branches performance with data:', data);
    const branchesGrid = document.querySelector('.branches-grid');
    
    if (!branchesGrid) {
        console.error('❌ Branches grid not found!');
        return;
    }
    
    if (!data || data.length === 0) {
        console.log('⚠️ No branches performance data available, showing no-data message');
        branchesGrid.innerHTML = `
            <div class="no-data-message" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #9ca3af; padding: 2rem; position: relative; z-index: 1; grid-column: 1 / -1; min-height: 200px;">
                <i class="fas fa-building" style="font-size: 2.5rem; margin-bottom: 0.8rem; color: #d1d5db;"></i>
                <p style="font-size: 1rem; font-weight: 500; margin-bottom: 0.4rem; color: #6b7280; text-align: center;">No branch performance data available</p>
                <small style="font-size: 0.8rem; color: #9ca3af; text-align: center;">Branch performance data will appear here once branches start operations</small>
            </div>
        `;
        return;
    }
    
    console.log('✅ Branches performance data available, showing branch cards');
    
    // Clear existing content
    branchesGrid.innerHTML = '';
    
    // Create branch cards for each branch
    data.forEach((branch, index) => {
        const branchCard = createBranchCard(branch, index + 1);
        branchesGrid.appendChild(branchCard);
    });
    
    console.log(`✅ Created ${data.length} branch performance cards`);
}

// Create individual branch card
function createBranchCard(branch, rank) {
    const card = document.createElement('div');
    card.className = 'branch-card';
    
    const netPosition = parseFloat(branch.net_position) || 0;
    const netPositionClass = netPosition > 0 ? 'positive' : netPosition < 0 ? 'negative' : 'neutral';
    
    card.innerHTML = `
        <div class="branch-card-header">
            <div>
                <h4 class="branch-name">Branch ${branch.branch_id}</h4>
                <div class="branch-location">${branch.branch_location}</div>
            </div>
            <div class="branch-rank">#${rank}</div>
        </div>
        
                <div class="branch-metrics">
                    <div class="branch-metric">
                        <div class="branch-metric-label">Total<br>Savings</div>
                        <div class="branch-metric-value">${formatCurrency(branch.total_savings)}</div>
                    </div>
                    <div class="branch-metric">
                        <div class="branch-metric-label">Total<br>Disbursements</div>
                        <div class="branch-metric-value">${formatCurrency(branch.total_disbursements)}</div>
                    </div>
                </div>
        
        <div class="branch-net-position ${netPositionClass}">
            <div class="branch-net-label">Net Position</div>
            <div class="branch-net-value ${netPositionClass}">${formatCurrency(netPosition)}</div>
        </div>
        
        <div class="branch-stats">
            <div class="branch-stat">
                <span class="branch-stat-label">Active Members:</span>
                <span class="branch-stat-value">${branch.active_members || 0}</span>
            </div>
            <div class="branch-stat">
                <span class="branch-stat-label">Total Transactions:</span>
                <span class="branch-stat-value">${branch.total_transactions || 0}</span>
            </div>
        </div>
    `;
    
    return card;
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
    
    data.forEach((member, index) => {
        const row = document.createElement('tr');
        
        // Determine color for net position
        const netPosition = parseFloat(member.net_position) || 0;
        const netPositionColor = netPosition >= 0 ? '#007542' : '#ef4444'; // Green for positive, red for negative
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${member.member_name}</td>
            <td>${formatCurrency(member.total_savings)}</td>
            <td>${formatCurrency(member.total_disbursements)}</td>
            <td style="color: ${netPositionColor}; font-weight: 600;">${formatCurrency(member.net_position)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Update branch performance table - Dynamic performance summary based on filter
function updateBranchPerformanceTable(data) {
    const tbody = document.querySelector('.table-container:last-child .data-table tbody');
    if (!tbody) return;
    
    // Update the date header based on current filter
    updateBranchPerformanceDateHeader();
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr class="no-data-row">
                <td colspan="4">
                    <div class="no-data-message">
                        <i class="fas fa-calendar-alt"></i>
                        <p>No performance data available</p>
                        <small>Performance data will appear here once transactions are recorded</small>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Generate labels and align data based on current filter
    const labels = generateChartLabels(data, currentFilter);
    let savingsData, disbursementData;
    
    if (currentFilter === 'last-7-days') {
        savingsData = alignDataWithLast7Days(data, 'total_savings');
        disbursementData = alignDataWithLast7Days(data, 'total_disbursements');
    } else if (currentFilter === 'last-30-days') {
        savingsData = alignDataWithLast30DaysWeekly(data, 'total_savings');
        disbursementData = alignDataWithLast30DaysWeekly(data, 'total_disbursements');
    } else if (currentFilter === 'custom' && customType === 'week') {
        savingsData = alignDataWithCustomWeek(data, 'total_savings');
        disbursementData = alignDataWithCustomWeek(data, 'total_disbursements');
    } else if (currentFilter === 'custom' && customType === 'month') {
        savingsData = alignDataWithCustomMonthWeekly(data, 'total_savings');
        disbursementData = alignDataWithCustomMonthWeekly(data, 'total_disbursements');
    } else if (currentFilter === 'custom' && customType === 'year') {
        savingsData = alignDataWithCustomYearMonthly(data, 'total_savings');
        disbursementData = alignDataWithCustomYearMonthly(data, 'total_disbursements');
    } else {
        savingsData = data.map(item => parseFloat(item.total_savings) || 0);
        disbursementData = data.map(item => parseFloat(item.total_disbursements) || 0);
    }
    
    // Create table rows for each data point
    for (let i = 0; i < labels.length; i++) {
        const row = document.createElement('tr');
        const dateLabel = labels[i];
        const savings = savingsData[i] || 0;
        const disbursements = disbursementData[i] || 0;
        const net = savings - disbursements;
        
        // Color only for net difference: Green for positive, Red for negative
        const netColor = net >= 0 ? '#007542' : '#EF4444';
        
        row.innerHTML = `
            <td style="color: #1f2937;">${dateLabel}</td>
            <td>${formatCurrency(savings)}</td>
            <td>${formatCurrency(disbursements)}</td>
            <td style="color: ${netColor}; font-size: 1.05em; font-weight: bold;">${formatCurrency(net)}</td>
        `;
        tbody.appendChild(row);
    }
    
    // Add total summary row at the bottom
    const totalSavings = savingsData.reduce((sum, val) => sum + val, 0);
    const totalDisbursements = disbursementData.reduce((sum, val) => sum + val, 0);
    const totalNet = totalSavings - totalDisbursements;
    const totalNetColor = totalNet >= 0 ? '#007542' : '#EF4444';
    
    const totalRow = document.createElement('tr');
    totalRow.style.cssText = 'background-color: #f8fafc; border-top: 2px solid #e5e7eb; font-weight: bold;';
    totalRow.innerHTML = `
        <td style="color: #1f2937; font-size: 1.1em; font-weight: bold;">Total</td>
        <td style="font-size: 1.1em; font-weight: bold;">${formatCurrency(totalSavings)}</td>
        <td style="font-size: 1.1em; font-weight: bold;">${formatCurrency(totalDisbursements)}</td>
        <td style="color: ${totalNetColor}; font-size: 1.15em; font-weight: bold;">${formatCurrency(totalNet)}</td>
    `;
    tbody.appendChild(totalRow);
}

// Update the date header based on current filter
function updateBranchPerformanceDateHeader() {
    const headerElement = document.getElementById('branchPerformanceDateHeader');
    if (!headerElement) return;
    
    let headerText = 'Date';
    
    if (currentFilter === 'last-7-days') {
        headerText = 'Date (Last 7 Days)';
    } else if (currentFilter === 'last-30-days') {
        headerText = 'Week (Last 30 Days)';
    } else if (currentFilter === 'custom') {
        if (customType === 'week') {
            headerText = 'Date (Custom Week)';
        } else if (customType === 'month') {
            headerText = 'Week (Custom Month)';
        } else if (customType === 'year') {
            headerText = 'Month (Custom Year)';
        } else {
            headerText = 'Date (Custom Period)';
        }
    } else {
        headerText = 'Date';
    }
    
    headerElement.textContent = headerText;
    console.log(`✅ Updated branch performance table header: "${headerText}"`);
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
    }).catch(error => {
        hideChartLoading(mappedType);
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
    }).catch(error => {
        hideTableLoading(mappedType);
    });
}

// Refresh branches performance section
function refreshBranchesPerformance() {
    console.log('🔄 Refreshing branches performance...');
    
    // Show loading state for branches performance
    showBranchesPerformanceLoading();
    
    // Refresh the branches performance data
    loadAnalyticsData().then(() => {
        hideBranchesPerformanceLoading();
    }).catch(error => {
        hideBranchesPerformanceLoading();
    });
}

// Show loading state
function showLoadingState() {
    // Add loading class to main content
    document.querySelector('.analytics-content').classList.add('loading');
}


// Show empty state when no data is available
function showEmptyState() {
    console.log('📊 Showing empty state for all components');
    
    // Reset summary cards to empty state
    updateSummaryCards({
        total_savings: 0,
        total_disbursements: 0,
        net_growth: 0,
        active_members: 0
    });
    
    // Show no-data messages for all charts
    const chartIds = ['savingsTrendChart', 'disbursementTrendChart', 'branchPerformanceChart', 'memberActivityChart'];
    chartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas) {
            const noDataMessage = canvas.parentElement.querySelector('.no-data-message');
            if (noDataMessage) {
                noDataMessage.style.display = 'flex';
            }
            canvas.style.display = 'none';
        }
    });
    
    // Clear all tables
    updateTables([], []);
    
    // Clear branches performance section (only for Ibaan branch users)
    const userBranchId = localStorage.getItem('user_branch_id');
    const isIbaanBranch = userBranchId === '1'; // Ibaan/Main Branch has ID 1
    if (isIbaanBranch) {
        updateBranchesPerformance([]);
    } else {
        hideBranchesPerformanceSection();
    }
    
    console.log('✅ Empty state displayed successfully');
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

// Show branches performance loading
function showBranchesPerformanceLoading() {
    const branchesContainer = document.querySelector('.branches-performance-container');
    if (branchesContainer) {
        branchesContainer.classList.add('loading');
    }
}

// Hide branches performance loading
function hideBranchesPerformanceLoading() {
    const branchesContainer = document.querySelector('.branches-performance-container');
    if (branchesContainer) {
        branchesContainer.classList.remove('loading');
    }
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
    
    // Helper function to create date at start of day in local timezone
    function getStartOfDay(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    
    // Helper function to create date at end of day in local timezone
    function getEndOfDay(date) {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    }
    
    const ranges = {
        yesterday: {
            start: getStartOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000)),
            end: getEndOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000))
        },
        'last-7-days': {
            start: getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)),
            end: getEndOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000))
        },
        'last-30-days': {
            start: getStartOfDay(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
            end: getEndOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000))
        },
        custom: {
            start: getStartOfDay(new Date(document.getElementById('startDate').value)),
            end: getEndOfDay(new Date(document.getElementById('endDate').value))
        }
    };
    
    return ranges[filter] || ranges.yesterday;
}


// Hide branches performance section for non-Ibaan branch users
function hideBranchesPerformanceSection() {
    const branchesSection = document.querySelector('.branches-performance-section');
    if (branchesSection) {
        branchesSection.style.display = 'none';
        console.log('🏢 Branches performance section hidden for non-Ibaan branch user');
    }
}

// Show branches performance section for Ibaan branch users
function showBranchesPerformanceSection() {
    const branchesSection = document.querySelector('.branches-performance-section');
    if (branchesSection) {
        branchesSection.style.display = 'block';
        console.log('🏢 Branches performance section shown for Ibaan branch user');
    }
}

// Export functions for global access
window.applyFilters = applyFilters;
window.refreshChart = refreshChart;
window.refreshTable = refreshTable;
window.refreshBranchesPerformance = refreshBranchesPerformance;

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnalytics);
} else {
    initializeAnalytics();
}