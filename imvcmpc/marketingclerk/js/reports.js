// Reports System - Marketing Clerk (Shared Implementation)
// Global lock flag to prevent editing when prefilled from FO
window.isPrefillLocked = false;
document.addEventListener('DOMContentLoaded', function() {
    // Initialize shared utilities (includes user header)
    if (typeof SharedUtils !== 'undefined') {
        const sharedUtils = new SharedUtils();
        sharedUtils.init();
    }
    
    initializeReports();
    prefillFromReportRequest();
});

// Normalize and set a <select> value, tolerating zero-padded and numeric forms
function setSelectValueByNormalized(select, value) {
    try {
        if (!select || value == null) return;
        const options = Array.from(select.options || []);
        const valStr = String(value);

        // 1) Exact match
        if (options.some(o => o.value === valStr)) {
            select.value = valStr;
            return;
        }

        // 2) Zero-padded 2-digit
        const pad2 = valStr.padStart(2, '0');
        if (options.some(o => o.value === pad2)) {
            select.value = pad2;
            return;
        }

        // 3) Numeric compare (e.g., "1" == 1, matches option with value "1" or "01")
        const num = parseInt(valStr, 10);
        if (!Number.isNaN(num)) {
            const byNum = options.find(o => parseInt(o.value, 10) === num);
            if (byNum) {
                select.value = byNum.value;
                return;
            }
        }
    } catch (_) {}
}

// Initialize reports system
function initializeReports() {
    setupReportTypeSelector();
    setupBranchSelection();
    setupTransactionTypeButtons();
    setupDateRangeFilter();
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 1000);
    
    // Initialize branch-specific reports
    initializeBranchSpecificReports();
    
    // Initialize report histories
    initializeReportHistories().catch(error => {
        console.error('Error initializing report histories:', error);
    });
    
    // Set default filter to show all reports
    filterSentReports('all');
    
    // Hide generate report section by default (only show history)
    hideGenerateReportSection();
}

// Prefill the UI when arriving from a report_request notification
function prefillFromReportRequest() {
    try {
        // Accept either sessionStorage or URL param as the entry point
        const urlParams = new URLSearchParams(window.location.search);
        const urlRequestId = urlParams.get('requestId');
        const raw = sessionStorage.getItem('report_request_prefill');
        let requestId = null;
        let metadata = null;
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                requestId = parsed.requestId || urlRequestId;
                metadata = parsed.metadata || null;
            } catch (_) {
                requestId = urlRequestId;
            }
            sessionStorage.removeItem('report_request_prefill');
        } else {
            requestId = urlRequestId;
        }

        // If we don't have anything to prefill, stop
        if (!requestId && !metadata) return;

        // Always hydrate from API when we have a requestId; merge with any metadata
        const token = localStorage.getItem('access_token');
        const hydrate = async () => {
            const shouldFetch = !!requestId && !!token;
            if (shouldFetch) {
                try {
                    const res = await fetch(`/api/auth/report-requests/${requestId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.success && data.data) {
                        metadata = metadata || {};
                        // API is source of truth; metadata values provide fallbacks only
                        metadata.report_type = data.data.report_type || metadata.report_type;
                        metadata.config = data.data.report_config || metadata.config || {};
                        }
                    }
                } catch (_) {}
            }
        };

        // Hydrate metadata if necessary before applying
        // Note: using async IIFE to keep function signature unchanged
        (async () => {
            await hydrate();

            if (!metadata || !metadata.report_type) return;

            const reportType = metadata.report_type;

            // Show the report configuration section and hide history
            showReportConfiguration();

            // Activate report type UI
            const btn = document.querySelector(`.report-type-btn[data-type="${reportType}"]`);
            if (btn) btn.click();

            const cfg = metadata.config || {};
            switch (reportType) {
                case 'savings':
                case 'disbursement': {
                    const yearEl = document.getElementById(reportType + 'Year');
                    const monthEl = document.getElementById(reportType + 'Month');
                    if (yearEl && cfg.year != null) setSelectValueByNormalized(yearEl, cfg.year);
                    if (monthEl && cfg.month != null) setSelectValueByNormalized(monthEl, cfg.month);
                    break;
                }
                case 'member': {
                    if (document.getElementById('memberSearch')) document.getElementById('memberSearch').value = cfg.member || '';
                    // Member reports always include both transaction types (savings and disbursement)
                    // No need to set transaction type buttons since they're always both active
                    // Prefill year and month for member reports
                    const yearEl = document.getElementById('memberYear');
                    const monthEl = document.getElementById('memberMonth');
                    if (yearEl && cfg.year != null) setSelectValueByNormalized(yearEl, cfg.year);
                    if (monthEl && cfg.month != null) setSelectValueByNormalized(monthEl, cfg.month);
                    break;
                }
                case 'branch': {
                    if (Array.isArray(cfg.branches)) {
                        cfg.branches.forEach(val => {
                            const cb = document.querySelector(`input[name="branchSelection"][value="${val}"]`);
                            if (cb) cb.checked = true;
                        });
                    }
                    const byEl = document.getElementById('branchYear');
                    const bmEl = document.getElementById('branchMonth');
                    if (byEl && cfg.year != null) setSelectValueByNormalized(byEl, cfg.year);
                    if (bmEl && cfg.month != null) setSelectValueByNormalized(bmEl, cfg.month);
                    if (Array.isArray(cfg.transactionTypes)) {
                        cfg.transactionTypes.forEach(t => {
                            const tbtn = document.querySelector(`#branchConfig .type-btn[data-type="${t}"]`);
                            if (tbtn) tbtn.classList.add('active');
                        });
                    }
                    break;
                }
            }

            // Lock the prefilled configuration so MC cannot change it
            lockPrefilledConfiguration(reportType);

            // Optionally mark the request as in_progress
            if (token && requestId) {
                fetch(`/api/auth/report-requests/${requestId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: 'in_progress' })
                }).catch(() => {});
            }
        })();
    } catch (e) {
        console.error('Prefill from report request failed:', e);
    }
}

// Initialize branch-specific reports
function initializeBranchSpecificReports() {
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    console.log('🔍 Branch-specific reports initialization:', {
        userBranchId,
        userBranchName,
        isMainBranchUser
    });
    
    // Update reports header based on branch
    updateReportsHeader(userBranchName, isMainBranchUser);
    
    // Show branch indicators for ALL users
    showBranchIndicators();
    
    // For non-main branch users, hide branch-related options
    if (!isMainBranchUser && userBranchName) {
        console.log('🔍 Hiding branch-related options for non-main branch user');
        
        // Hide branch selection for branch-specific users
        hideBranchSelection();
        
        // Hide branch reports option for non-main branch users
        // Add a small delay to ensure DOM elements are loaded
        setTimeout(() => {
            hideBranchReportsOption();
        }, 100);
        
        // Filter reports data based on user's branch
        filterReportsForBranch(userBranchId, userBranchName);
    } else {
        console.log('🔍 User is main branch user or no branch name, not hiding branch options');
    }
}

// Update reports header based on branch
function updateReportsHeader(branchName, isMainBranch) {
    const headerTitle = document.querySelector('.reports-header h1');
    if (headerTitle) {
        // Always show "Financial Reports" regardless of branch
        headerTitle.textContent = 'Financial Reports';
    }
}

// Filter reports for specific branch
function filterReportsForBranch(branchId, branchName) {
    // For non-main branch users, we just hide the branch selection
    // The branch is already determined by their user data
    console.log(`Filtering reports for ${branchName} (Branch ${branchId})`);
}

// Hide branch selection for branch-specific users
function hideBranchSelection() {
    // Hide branch selection sections in savings and disbursement configs
    const savingsBranchSelection = document.querySelector('#savingsConfig .branch-selection');
    const disbursementBranchSelection = document.querySelector('#disbursementConfig .branch-selection');
    
    if (savingsBranchSelection) {
        savingsBranchSelection.style.display = 'none';
    }
    if (disbursementBranchSelection) {
        disbursementBranchSelection.style.display = 'none';
    }
}

// Show branch indicators for all users
function showBranchIndicators() {
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    const userBranchLocation = localStorage.getItem('user_branch_location');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    let branchDisplayName = '';
    
    // Determine branch display name for all users
    if (isMainBranchUser) {
        branchDisplayName = `Main Branch - ${userBranchLocation || 'IBAAN'}`;
    } else if (userBranchId && userBranchName && userBranchLocation) {
        branchDisplayName = `${userBranchName} - ${userBranchLocation}`;
    }
    
    if (branchDisplayName) {
        // Show savings branch indicator
        const savingsIndicator = document.getElementById('savingsBranchIndicator');
        const savingsBranchName = document.getElementById('savingsBranchName');
        if (savingsIndicator && savingsBranchName) {
            savingsBranchName.textContent = branchDisplayName;
            savingsIndicator.style.display = 'flex';
        }
        
        // Show disbursement branch indicator
        const disbursementIndicator = document.getElementById('disbursementBranchIndicator');
        const disbursementBranchName = document.getElementById('disbursementBranchName');
        if (disbursementIndicator && disbursementBranchName) {
            disbursementBranchName.textContent = branchDisplayName;
            disbursementIndicator.style.display = 'flex';
        }
    }
}

// Hide branch reports option for non-main branch users
function hideBranchReportsOption() {
    console.log('🔍 Hiding branch reports for non-main branch user');
    
    // Hide the branch reports button
    const branchReportsBtn = document.querySelector('.report-type-btn[data-type="branch"]');
    if (branchReportsBtn) {
        branchReportsBtn.style.display = 'none';
        console.log('✅ Hidden branch reports button');
    } else {
        console.log('❌ Branch reports button not found');
    }
    
    // Hide the branch reports option from dropdown
    const branchOption = document.querySelector('#reportHistoryFilter option[value="branch"]');
    if (branchOption) {
        branchOption.style.display = 'none';
        console.log('✅ Hidden branch option from dropdown');
    } else {
        console.log('❌ Branch option not found in dropdown');
    }
    
    // Hide the branch report history section
    const branchReportHistory = document.getElementById('branchReportHistory');
    if (branchReportHistory) {
        branchReportHistory.style.display = 'none';
        console.log('✅ Hidden branch report history section');
    } else {
        console.log('❌ Branch report history section not found');
    }
    
    // Hide the branch configuration section
    const branchConfig = document.getElementById('branchConfig');
    if (branchConfig) {
        branchConfig.style.display = 'none';
        console.log('✅ Hidden branch configuration section');
    } else {
        console.log('❌ Branch configuration section not found');
    }
}


// Setup report type selector
function setupReportTypeSelector() {
    const reportTypeBtns = document.querySelectorAll('.report-type-btn');
    
    reportTypeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (window.isPrefillLocked) return; // prevent switching types when locked
            
            // Clear all configurations before switching
            clearAllConfigurations();
            
            // Remove active class from all buttons
            reportTypeBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding configuration section
            showConfigurationSection(this.getAttribute('data-type'));
            
            // Show corresponding history section
            showReportHistory(this.getAttribute('data-type'));
            
            // Clear report canvas
            clearReportCanvas();
            
            // Hide send finance section
            hideSendFinanceSection();
        });
    });
}

// Store all sent reports for filtering
let allSentReports = [];
let currentSentFilterType = 'all';
let currentSentDateRange = { start: null, end: null };

// Filter sent reports by type
function filterSentReports(filterType) {
    currentSentFilterType = filterType;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const filterButton = document.querySelector(`[data-filter="${filterType}"]`);
    if (filterButton) {
        filterButton.classList.add('active');
    }
    
    // Apply filter
    applySentReportsFilter();
}

// Apply filter to sent reports (type filter only)
function applySentReportsFilter() {
    // Apply all filters (type + date)
    applyAllSentFilters();
}

// Display sent reports in unified container
function displaySentReports(reports) {
    const container = document.getElementById('sentReportsContainer');
    if (!container) {
        console.error('sentReportsContainer not found');
        return;
    }
    
    if (!reports || reports.length === 0) {
        container.innerHTML = '<div class="empty-state">No reports sent yet</div>';
        return;
    }
    
    container.innerHTML = reports.map(report => `
        <div class="history-item" data-report-id="${report.id}" data-report-date="${report.date}">
            <div class="history-info">
                <div class="history-title">${report.title}</div>
                <div class="history-details">${report.details}</div>
            </div>
            <div class="history-status-time">
                <div class="history-status sent">SENT</div>
                <div class="history-timestamp">${formatSmartTimestamp(report.date)}</div>
            </div>
        </div>
    `).join('');
}

// Clear all report configurations
function clearAllConfigurations() {
    // Savings
    const savingsYear = document.getElementById('savingsYear');
    const savingsMonth = document.getElementById('savingsMonth');
    if (savingsYear) savingsYear.value = '2025';
    if (savingsMonth) savingsMonth.value = '1';
    
    // Disbursement
    const disbursementYear = document.getElementById('disbursementYear');
    const disbursementMonth = document.getElementById('disbursementMonth');
    if (disbursementYear) disbursementYear.value = '2025';
    if (disbursementMonth) disbursementMonth.value = '1';
    
    // Member
    const memberSearch = document.getElementById('memberSearch');
    const memberYear = document.getElementById('memberYear');
    const memberMonth = document.getElementById('memberMonth');
    if (memberSearch) memberSearch.value = '';
    if (memberYear) memberYear.value = '2025';
    if (memberMonth) memberMonth.value = '1';
    document.querySelectorAll('#memberConfig .type-btn').forEach(btn => btn.classList.remove('active'));
    
    // Branch
    document.querySelectorAll('input[name="branchSelection"]').forEach(cb => cb.checked = false);
    const branchYear = document.getElementById('branchYear');
    const branchMonth = document.getElementById('branchMonth');
    if (branchYear) branchYear.value = '2025';
    if (branchMonth) branchMonth.value = '1';
    document.querySelectorAll('#branchConfig .type-btn').forEach(btn => btn.classList.remove('active'));
}

// Show configuration section based on report type
function showConfigurationSection(reportType) {
    // Hide initial state
    const initialState = document.getElementById('initialState');
    if (initialState) {
        initialState.style.display = 'none';
    }
    
    // Hide all configuration sections
    const configSections = document.querySelectorAll('.config-section');
    configSections.forEach(section => section.classList.remove('active'));
    
    // Don't hide all histories - let each report type show its own history
    
    // Show selected configuration section
    const selectedSection = document.getElementById(reportType + 'Config');
    if (selectedSection) {
        selectedSection.classList.add('active');
        
        // Add report canvas and generate button after the configuration
        addReportCanvas();
    }
}

// Add report canvas and generate button
function addReportCanvas() {
    const reportConfig = document.querySelector('.report-config');
    const sendFinanceSection = document.getElementById('sendFinanceSection');
    
    // Check if report canvas already exists
    if (!document.getElementById('reportCanvas')) {
        // Create report canvas
        const reportCanvas = document.createElement('div');
        reportCanvas.className = 'report-canvas';
        reportCanvas.id = 'reportCanvas';
        reportCanvas.innerHTML = `
            <div class="canvas-placeholder">
                <i class="fas fa-chart-bar"></i>
                <h3>Report Canvas</h3>
                <p>Configure your report settings above and click "Generate Report" to display data here.</p>
            </div>
        `;
        
        // Create generate section
        const generateSection = document.createElement('div');
        generateSection.className = 'generate-section';
        generateSection.innerHTML = `
            <button class="generate-btn" onclick="generateReport()">
                <i class="fas fa-chart-line"></i>
                <span>Generate Report</span>
            </button>
        `;
        
        // Insert before send finance section
        sendFinanceSection.parentNode.insertBefore(generateSection, sendFinanceSection);
        sendFinanceSection.parentNode.insertBefore(reportCanvas, sendFinanceSection);
    }
}

// Show generate button
function showGenerateButton() {
    const generateSection = document.querySelector('.generate-section');
    if (!generateSection) {
        // Create generate section if it doesn't exist
        const reportConfig = document.querySelector('.report-config');
        const generateSectionHTML = `
            <div class="generate-section">
                <button class="generate-btn" onclick="generateReport()">
                    <i class="fas fa-chart-line"></i>
                    <span>Generate Report</span>
                </button>
            </div>
        `;
        reportConfig.insertAdjacentHTML('afterend', generateSectionHTML);
    } else {
        generateSection.style.display = 'block';
    }
}

// Setup branch selection functionality (only for main branch users)
function setupBranchSelection() {
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Only setup branch selection for main branch users
    if (isMainBranchUser) {
        const branchCheckboxes = document.querySelectorAll('.branch-checkbox input[type="checkbox"]');
        branchCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                console.log('Branch selection changed for main branch user');
            });
        });
    }
}

// Setup transaction type buttons
function setupTransactionTypeButtons() {
    const typeButtons = document.querySelectorAll('.type-btn');
    
    typeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (window.isPrefillLocked) return; // prevent changing transaction types when locked
            const configSection = this.closest('.config-section');
            const configId = configSection.id;
            
            if (configId === 'branchConfig') {
                // For branch config, toggle the clicked button (both can be selected)
                this.classList.toggle('active');
            } else {
                // For other configs, only one can be selected
                const typeButtons = configSection.querySelectorAll('.type-btn');
                typeButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
}

// Setup date range filter
function setupDateRangeFilter() {
    // Set default date range (last 30 days) but don't apply filter automatically
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput && endDateInput) {
        startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        endDateInput.value = today.toISOString().split('T')[0];
    }
}

// Apply date range filter
function applyDateFilter() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        // Clear date filter
        currentSentDateRange = { start: null, end: null };
        applyAllSentFilters();
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        // Invalid date range - swap dates silently
        document.getElementById('startDate').value = endDate;
        document.getElementById('endDate').value = startDate;
        currentSentDateRange = { start: endDate, end: startDate };
    } else {
        currentSentDateRange = { start: startDate, end: endDate };
    }
    
    // Apply all filters (type + date)
    applyAllSentFilters();
}

// Apply all active filters (type + date) for sent reports
function applyAllSentFilters() {
    const container = document.getElementById('sentReportsContainer');
    if (!container) return;
    
    let filteredReports = [...allSentReports];
    
    // Apply type filter
    if (currentSentFilterType !== 'all') {
        filteredReports = filteredReports.filter(report => 
            report.type && report.type.toLowerCase() === currentSentFilterType.toLowerCase()
        );
    }
    
    // Apply date filter
    if (currentSentDateRange.start && currentSentDateRange.end) {
        const startDate = new Date(currentSentDateRange.start);
        const endDate = new Date(currentSentDateRange.end);
        
        filteredReports = filteredReports.filter(report => {
            // Parse report date properly to avoid timezone shift
            let localDateString = report.date;
            if (report.date.includes('T')) {
                localDateString = report.date.split('T')[0];
            }
            const [year, month, day] = localDateString.split('-').map(Number);
            const reportDate = new Date(year, month - 1, day);
            return reportDate >= startDate && reportDate <= endDate;
        });
    }
    
    // Display filtered results
    if (filteredReports.length === 0) {
        let emptyMessage = 'No reports found';
        if (currentSentFilterType !== 'all') {
            emptyMessage = `No ${currentSentFilterType} reports found`;
        }
        if (currentSentDateRange.start && currentSentDateRange.end) {
            emptyMessage += ' in the selected date range';
        }
        container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    } else {
        displaySentReports(filteredReports);
    }
}

// Clear date range filter
function clearDateFilter() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    
    // Clear date filter and apply all filters
    currentSentDateRange = { start: null, end: null };
    applyAllSentFilters();
}

// Generate report based on current configuration (fetch from backend and render chart when applicable)
async function generateReport() {
    try {
        const activeReportType = document.querySelector('.report-type-btn.active');
        if (!activeReportType) {
            showMessage('Please select a report type first.', 'error');
            return;
        }

        const reportType = activeReportType.getAttribute('data-type');
        if (!reportType) {
            showMessage('Invalid report type selected.', 'error');
            return;
        }

        // Validate configuration
        if (!validateConfiguration(reportType)) {
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) {
            showMessage('You are not authenticated.', 'error');
            return;
        }

        // Build common params
        const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
        const userBranchId = localStorage.getItem('user_branch_id') || '1';

        // Compute date range from year/month selectors
        const { startDate, endDate, periodLabel } = computeDateRangeForReport(reportType);

        let reportData = null;
        if (reportType === 'savings' || reportType === 'disbursement') {
            const endpoint = reportType === 'savings' ? '/api/auth/analytics/savings-trend' : '/api/auth/analytics/disbursement-trend';
            // Always scope to the logged-in user's branch for Savings/Disbursement
            const url = `${endpoint}?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&branchId=${encodeURIComponent(userBranchId)}&isMainBranch=false`;

            // Loading state
            const reportCanvas = document.getElementById('reportCanvas');
            if (reportCanvas) {
                reportCanvas.innerHTML = '<div class="canvas-placeholder"><i class="fas fa-spinner fa-spin"></i><h3>Generating report...</h3></div>';
            }

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to fetch analytics data');
            }
            const payload = await res.json();
            const rows = (payload && payload.data) || [];

            // Create analytics-like custom-by-month weekly labels and aligned values
            const monthNum = parseInt(periodLabel.split(' ')[0], 10);
            const yearNum = parseInt(periodLabel.split(' ')[1], 10);
            const labels = generateCustomMonthWeeklyLabels(yearNum, monthNum);
            const values = alignDataWithCustomMonthWeekly(rows, reportType === 'savings' ? 'total_savings' : 'total_disbursements', yearNum, monthNum);
            const total = values.reduce((a, b) => a + (parseFloat(b) || 0), 0);

            // Also fetch active members via analytics summary for the same scope
            let activeMembers = 0;
            try {
                const summaryUrl = `/api/auth/analytics/summary?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&branchId=${encodeURIComponent(userBranchId)}&isMainBranch=false`;
                const sres = await fetch(summaryUrl, { headers: { 'Authorization': `Bearer ${token}` } });
                if (sres.ok) {
                    const sjson = await sres.json();
                    activeMembers = (sjson && sjson.data && (parseInt(sjson.data.active_members, 10) || 0)) || 0;
                }
            } catch (_) {}

            reportData = {
                type: reportType === 'savings' ? 'Savings Report' : 'Disbursement Report',
                period: periodLabel,
                total,
                activeMembers,
                chartType: 'bar',
                chart: {
                    labels,
                    datasets: [
                        {
                            label: reportType === 'savings' ? 'Monthly Savings (Bar)' : 'Monthly Disbursements (Bar)',
                            data: values,
                            backgroundColor: reportType === 'savings' ? 'rgba(0, 117, 66, 0.7)' : 'rgba(88, 187, 67, 0.6)',
                            borderColor: reportType === 'savings' ? '#007542' : '#58BB43',
                            borderWidth: 2,
                            type: 'bar'
                        },
                        {
                            label: reportType === 'savings' ? 'Savings Trend (Line)' : 'Disbursement Trend (Line)',
                            data: values,
                            borderColor: reportType === 'savings' ? '#58BB43' : '#1E8C45',
                            backgroundColor: 'transparent',
                            borderWidth: 3,
                            fill: false,
                            tension: 0.4,
                            type: 'line',
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            pointBackgroundColor: reportType === 'savings' ? '#007542' : '#58BB43',
                            pointBorderColor: reportType === 'savings' ? '#58BB43' : '#1E8C45'
                        }
                    ]
                }
            };
        } else if (reportType === 'member') {
            // Fetch member transactions data
            const memberName = document.getElementById('memberSearch').value.trim();
            const year = document.getElementById('memberYear').value;
            const month = document.getElementById('memberMonth').value;
            
            // Compute date range for the selected month
            const { startDate, endDate } = computeDateRangeForReport('member');
            
            // Fetch all transactions for this member in the date range
            // Note: Using date_from and date_to parameters as expected by the backend
            const transactionsEndpoint = `/api/auth/transactions?payee=${encodeURIComponent(memberName)}&date_from=${encodeURIComponent(startDate)}&date_to=${encodeURIComponent(endDate)}`;
            
            console.log('Fetching member transactions:', {
                member: memberName,
                startDate,
                endDate,
                endpoint: transactionsEndpoint
            });
            
            const loading = document.getElementById('reportCanvas');
            if (loading) loading.innerHTML = '<div class="canvas-placeholder"><i class="fas fa-spinner fa-spin"></i><h3>Generating member report...</h3></div>';
            
            const res = await fetch(transactionsEndpoint, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to fetch member transactions');
            }
            const payload = await res.json();
            let transactions = (payload && payload.data) || [];
            
            console.log('Fetched transactions:', transactions);
            
            // Client-side filtering to ensure only transactions within the selected month are included
            // This is an extra safeguard in case the API returns transactions outside the date range
            transactions = transactions.filter(transaction => {
                const transactionDate = new Date(transaction.transaction_date);
                const transactionYear = transactionDate.getFullYear();
                const transactionMonth = transactionDate.getMonth() + 1;
                
                return transactionYear === parseInt(year, 10) && transactionMonth === parseInt(month, 10);
            });
            
            console.log('Filtered transactions (client-side):', transactions);
            
            // Generate report data with fetched transactions
            reportData = {
                type: 'Member Report',
                member: memberName,
                year: year,
                month: month,
                transactionTypes: ['savings', 'disbursement'],
                data: transactions
            };
        } else if (reportType === 'branch') {
            // Fetch all branches performance, then filter/shape rows
            const { startDate: s, endDate: e } = computeDateRangeForReport('branch');
            const endpoint = `/api/auth/analytics/all-branches-performance?startDate=${encodeURIComponent(s)}&endDate=${encodeURIComponent(e)}`;

            const loading = document.getElementById('reportCanvas');
            if (loading) loading.innerHTML = '<div class="canvas-placeholder"><i class="fas fa-spinner fa-spin"></i><h3>Generating report...</h3></div>';

            const res = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to fetch branch performance');
            }
            const payload = await res.json();
            const allRows = (payload && payload.data) || [];

            // Determine branch filter
            let allowedIds = [];
            const isMain = isMainBranchUser;
            if (isMain) {
                const selected = Array.from(document.querySelectorAll('input[name="branchSelection"]:checked')).map(cb => String(cb.value).replace('branch', ''));
                allowedIds = selected.length ? selected : [];
            } else {
                allowedIds = [String(userBranchId || '1')];
            }

            const filtered = allRows.filter(r => (allowedIds.length ? allowedIds.includes(String(r.branch_id)) : true));

            // Build rows and chart series
            const rows = filtered.map(r => {
                const totalSavings = parseFloat(r.total_savings || 0) || 0;
                const totalDisb = parseFloat(r.total_disbursements || 0) || 0;
                const net = parseFloat(r.net_position || (totalSavings - totalDisb)) || 0;
                const perfPct = (totalDisb !== 0) ? (net / Math.abs(totalDisb)) * 100 : (net >= 0 ? 100 : -100);
                return {
                    branch_name: r.branch_name || r.branch_location || `Branch ${r.branch_id}`,
                    active_members: parseInt(r.active_members || 0, 10) || 0,
                    total_savings: totalSavings,
                    total_disbursements: totalDisb,
                    performancePct: perfPct,
                    net_position: net
                };
            });

            // If user selected none and is main, show all
            const finalRows = rows;

            // Determine which transaction types are selected for branch report
            const activeTypeBtns = Array.from(document.querySelectorAll('#branchConfig .type-btn.active'));
            const showSavings = activeTypeBtns.length === 0 || activeTypeBtns.some(b => b.getAttribute('data-type') === 'savings');
            const showDisb = activeTypeBtns.length === 0 || activeTypeBtns.some(b => b.getAttribute('data-type') === 'disbursement');

            reportData = {
                type: 'Branch Performance Report',
                period: `${document.getElementById('branchMonth').value} ${document.getElementById('branchYear').value}`,
                rows: finalRows,
                charts: {
                    savings: showSavings ? {
                        labels: finalRows.map(x => x.branch_name),
                        datasets: [
                            {
                                label: 'Total Savings (Bar)',
                                data: finalRows.map(x => x.total_savings),
                                backgroundColor: 'rgba(0, 117, 66, 0.7)',
                                borderColor: '#007542',
                                borderWidth: 2,
                                type: 'bar'
                            },
                            {
                                label: 'Savings Trend (Line)',
                                data: finalRows.map(x => x.total_savings),
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
                            }
                        ]
                    } : null,
                    disbursement: showDisb ? {
                        labels: finalRows.map(x => x.branch_name),
                        datasets: [
                            {
                                label: 'Total Disbursements (Bar)',
                                data: finalRows.map(x => x.total_disbursements),
                                backgroundColor: 'rgba(88, 187, 67, 0.6)',
                                borderColor: '#58BB43',
                                borderWidth: 2,
                                type: 'bar'
                            },
                            {
                                label: 'Disbursement Trend (Line)',
                                data: finalRows.map(x => x.total_disbursements),
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
                            }
                        ]
                    } : null
                }
            };
        }

        if (!reportData) {
            showMessage('Failed to generate report data.', 'error');
            return;
        }

        // Display report (will render chart if present)
        displayReport(reportData);

        // Expose current report data/type for AI generation
        window.currentReportData = reportData;
        window.currentReportType = reportType;

        // Show AI controls (optional step by user)
        showAIRecommendationControls();

        // Optionally mark the linked report request as completed
        tryMarkRequestCompleted();

        // Show send to finance section
        showSendFinanceSection();
    } catch (error) {
        console.error('Error generating report:', error);
        showMessage('An error occurred while generating the report.', 'error');
    }
}

function computeDateRangeForReport(reportType) {
    let year = '2025';
    let month = '1';
    if (reportType === 'savings') {
        const y = document.getElementById('savingsYear');
        const m = document.getElementById('savingsMonth');
        if (y) year = y.value || year;
        if (m) month = m.value || month;
    } else if (reportType === 'disbursement') {
        const y = document.getElementById('disbursementYear');
        const m = document.getElementById('disbursementMonth');
        if (y) year = y.value || year;
        if (m) month = m.value || month;
    } else if (reportType === 'member') {
        const y = document.getElementById('memberYear');
        const m = document.getElementById('memberMonth');
        if (y) year = y.value || year;
        if (m) month = m.value || month;
    } else if (reportType === 'branch') {
        const y = document.getElementById('branchYear');
        const m = document.getElementById('branchMonth');
        if (y) year = y.value || year;
        if (m) month = m.value || month;
    }
    const start = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const end = new Date(parseInt(year, 10), parseInt(month, 10), 0); // Last day of the selected month
    
    // Format dates properly
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    
    // Debug: Log to verify date calculation
    console.log(`Date range for ${month}/${year}:`, startDate, 'to', endDate);
    
    return { startDate, endDate, periodLabel: `${month} ${year}` };
}

function tryMarkRequestCompleted() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const requestId = urlParams.get('requestId');
        const token = localStorage.getItem('access_token');
        if (requestId && token) {
            fetch(`/api/auth/report-requests/${requestId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'completed' })
            }).catch(() => {});
        }
    } catch (_) {}
}

// --- Chart helpers to mimic Analytics custom-by-month ---
function generateCustomMonthWeeklyLabels(year, month) {
    // month: 1-12
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    // Build 4 weekly buckets: 1-7, 8-15, 16-23, 24-end
    const weekStarts = [1, 8, 16, 24];
    const weekEnds = [7, 15, 23, end.getDate()];
    const labelFor = (s, e) => {
        const sd = new Date(year, month - 1, s);
        const ed = new Date(year, month - 1, e);
        const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${fmt(sd)} - ${fmt(ed)}, ${year}`;
    };
    return weekStarts.map((s, i) => labelFor(s, weekEnds[i]));
}

function alignDataWithCustomMonthWeekly(rows, valueKey, year, month) {
    const buckets = [0, 0, 0, 0];
    const toBucketIndex = (day) => {
        if (day <= 7) return 0;
        if (day <= 15) return 1;
        if (day <= 23) return 2;
        return 3;
    };
    (rows || []).forEach(r => {
        const d = new Date(r.date);
        if (d.getFullYear() === year && (d.getMonth() + 1) === month) {
            const idx = toBucketIndex(d.getDate());
            const raw = r[valueKey];
            const val = typeof raw === 'string' ? parseFloat(raw) : (raw || 0);
            buckets[idx] += (parseFloat(val) || 0);
        }
    });
    return buckets;
}

// Validate configuration based on report type
function validateConfiguration(reportType) {
    switch (reportType) {
        case 'savings':
        case 'disbursement':
            return validateSavingsDisbursementConfig(reportType);
        case 'member':
            return validateMemberConfig();
        case 'branch':
            return validateBranchConfig();
        default:
            return false;
    }
}

// Validate savings/disbursement configuration
function validateSavingsDisbursementConfig(reportType) {
    // Check if form elements exist
    const yearElement = document.getElementById(reportType + 'Year');
    const monthElement = document.getElementById(reportType + 'Month');
    
    if (!yearElement || !monthElement) {
        showMessage('Report configuration form not found.', 'error');
        return false;
    }
    
    return true;
}

// Validate member configuration
function validateMemberConfig() {
    const memberSearch = document.getElementById('memberSearch').value.trim();
    if (!memberSearch) {
        showMessage('Please enter a member name or ID.', 'error');
        return false;
    }
    
    // Validate year and month
    const yearElement = document.getElementById('memberYear');
    const monthElement = document.getElementById('memberMonth');
    
    if (!yearElement || !monthElement) {
        showMessage('Report configuration form not found.', 'error');
        return false;
    }
    
    // Transaction type is always both (no validation needed)
    return true;
}

// Validate branch configuration
function validateBranchConfig() {
    const selectedBranches = Array.from(document.querySelectorAll('input[name="branchSelection"]:checked'));
    if (selectedBranches.length === 0) {
        showMessage('Please select at least one branch.', 'error');
        return false;
    }
    
    const activeTypeBtns = document.querySelectorAll('#branchConfig .type-btn.active');
    if (activeTypeBtns.length === 0) {
        showMessage('Please select at least one transaction type (Savings or Disbursement).', 'error');
        return false;
    }
    
    return true;
}

// Generate report data based on type
function generateReportData(reportType) {
    switch (reportType) {
        case 'savings':
            return generateSavingsReportData();
        case 'disbursement':
            return generateDisbursementReportData();
        case 'member':
            return generateMemberReportData();
        case 'branch':
            return generateBranchReportData();
        default:
            return null;
    }
}

// Generate savings report data
function generateSavingsReportData() {
    const yearElement = document.getElementById('savingsYear');
    const monthElement = document.getElementById('savingsMonth');
    
    if (!yearElement || !monthElement) {
        console.error('Savings report form elements not found');
        return {
            type: 'Savings Report',
            period: 'Unknown',
            data: []
        };
    }
    
    const year = yearElement.value || '2025';
    const month = monthElement.value || '1';
    
    return {
        type: 'Savings Report',
        period: `${month} ${year}`,
        data: []
    };
}

// Generate disbursement report data
function generateDisbursementReportData() {
    const yearElement = document.getElementById('disbursementYear');
    const monthElement = document.getElementById('disbursementMonth');
    
    if (!yearElement || !monthElement) {
        console.error('Disbursement report form elements not found');
        return {
            type: 'Disbursement Report',
            period: 'Unknown',
            data: []
        };
    }
    
    const year = yearElement.value || '2025';
    const month = monthElement.value || '1';
    
    return {
        type: 'Disbursement Report',
        period: `${month} ${year}`,
        data: []
    };
}

// Generate member report data
function generateMemberReportData() {
    const memberSearch = document.getElementById('memberSearch').value.trim();
    // Member reports always include both transaction types
    const transactionTypes = ['savings', 'disbursement'];
    
    return {
        type: 'Member Report',
        member: memberSearch,
        transactionTypes: transactionTypes,
        data: []
    };
}

// Generate branch report data
function generateBranchReportData() {
    const selectedBranches = Array.from(document.querySelectorAll('input[name="branchSelection"]:checked')).map(cb => cb.value);
    const year = document.getElementById('branchYear').value;
    const month = document.getElementById('branchMonth').value;
    
    return {
        type: 'Branch Performance Report',
        branches: selectedBranches,
        period: `${month} ${year}`,
        data: {}
    };
}




// Display report in canvas
function displayReport(reportData) {
    try {
        if (!reportData || !reportData.type) {
            console.error('Invalid report data provided');
            return;
        }
        
        const reportCanvas = document.getElementById('reportCanvas');
        if (!reportCanvas) {
            console.error('Report canvas element not found');
            return;
        }
        
        let html = '';
        
        switch (reportData.type) {
            case 'Savings Report':
            case 'Disbursement Report':
                html = generateSavingsDisbursementHTML(reportData);
                break;
            case 'Member Report':
                html = generateMemberReportHTML(reportData);
                break;
            case 'Branch Performance Report':
                html = generateBranchReportHTML(reportData);
                break;
            default:
                console.error('Unknown report type:', reportData.type);
                html = '<div class="error-message">Unknown report type</div>';
        }
        
        if (html) {
            reportCanvas.innerHTML = html;
        }

        // Render charts
        // 1) Single chart path (savings/disbursement)
        if (reportData.chart && Array.isArray(reportData.chart.labels)) {
            // Inject chart container if not present
            const chartContainerId = 'reportChartContainer';
            const chartCanvasId = 'reportChart';
            const container = document.createElement('div');
            container.id = chartContainerId;
            container.style.marginTop = '16px';
            container.style.width = '100%';
            container.style.boxSizing = 'border-box';
            container.innerHTML = `<canvas id="${chartCanvasId}" width="400" height="200"></canvas>`;
            reportCanvas.appendChild(container);

            if (window.Chart) {
                // Destroy previous instance if exists
                if (window.__currentReportChart) {
                    try { window.__currentReportChart.destroy(); } catch (_) {}
                }
                const ctx = document.getElementById(chartCanvasId).getContext('2d');
                window.__currentReportChart = new Chart(ctx, {
                    type: reportData.chartType || 'bar',
                    data: {
                        labels: reportData.chart.labels,
                        datasets: reportData.chart.datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            } else {
                // Fallback note if Chart.js not loaded
                const note = document.createElement('div');
                note.style.color = '#6b7280';
                note.style.marginTop = '8px';
                note.textContent = 'Chart preview unavailable (Chart.js not loaded).';
                reportCanvas.appendChild(note);
            }
        }

        // 2) Two chart path for branch report
        if (reportData.type === 'Branch Performance Report' && reportData.charts && window.Chart) {
            // Savings chart
            const activeTypeBtns = Array.from(document.querySelectorAll('#branchConfig .type-btn.active'));
            const showSavings = reportData.charts.savings && (activeTypeBtns.length === 0 || activeTypeBtns.some(b => b.getAttribute('data-type') === 'savings'));
            const showDisb = reportData.charts.disbursement && (activeTypeBtns.length === 0 || activeTypeBtns.some(b => b.getAttribute('data-type') === 'disbursement'));

            if (showSavings) {
                const savingsWrap = document.createElement('div');
                savingsWrap.style.marginTop = '16px';
                savingsWrap.style.width = '100%';
                savingsWrap.style.boxSizing = 'border-box';
                savingsWrap.style.minHeight = '260px';
                savingsWrap.innerHTML = `<h4>Savings by Branch</h4><canvas id=\"branchSavingsChart\" width=\"400\" height=\"200\"></canvas>`;
                reportCanvas.appendChild(savingsWrap);
            }

            if (showDisb) {
                const disbWrap = document.createElement('div');
                disbWrap.style.marginTop = '20px';
                disbWrap.style.width = '100%';
                disbWrap.style.boxSizing = 'border-box';
                disbWrap.style.minHeight = '260px';
                disbWrap.innerHTML = `<h4>Disbursements by Branch</h4><canvas id=\"branchDisbChart\" width=\"400\" height=\"200\"></canvas>`;
                reportCanvas.appendChild(disbWrap);
            }

            try {
                if (window.__branchSavingsChart) { try { window.__branchSavingsChart.destroy(); } catch(_){} }
                if (window.__branchDisbChart) { try { window.__branchDisbChart.destroy(); } catch(_){} }

                if (showSavings) {
                    const sctx = document.getElementById('branchSavingsChart').getContext('2d');
                    window.__branchSavingsChart = new Chart(sctx, {
                        type: 'bar',
                        data: {
                            labels: reportData.charts.savings.labels,
                            datasets: reportData.charts.savings.datasets
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: true } },
                            scales: { y: { beginAtZero: true } }
                        }
                    });
                }

                if (showDisb) {
                    const dctx = document.getElementById('branchDisbChart').getContext('2d');
                    window.__branchDisbChart = new Chart(dctx, {
                        type: 'bar',
                        data: {
                            labels: reportData.charts.disbursement.labels,
                            datasets: reportData.charts.disbursement.datasets
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: true } },
                            scales: { y: { beginAtZero: true } }
                        }
                    });
                }
            } catch (e) {
                console.error('Failed to render branch charts', e);
            }
        }
    } catch (error) {
        console.error('Error displaying report:', error);
        const reportCanvas = document.getElementById('reportCanvas');
        if (reportCanvas) {
            reportCanvas.innerHTML = '<div class="error-message">Error displaying report</div>';
        }
    }
}

// Generate savings/disbursement report HTML
function generateSavingsDisbursementHTML(reportData) {
    const isSavings = reportData.type === 'Savings Report';
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    let html = `
        <div class="report-content">
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${(reportData.chart && reportData.chart.labels ? 1 : 0)}</div>
                    <div class="stat-label">Branches</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${getMonthName(reportData.period.split(' ')[0])}</div>
                    <div class="stat-label">Month</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">₱${Number(reportData.total || 0).toLocaleString('en-PH')}</div>
                    <div class="stat-label">Total ${isSavings ? 'Savings' : 'Disbursements'}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${currentDate}</div>
                    <div class="stat-label">Generated</div>
                </div>
            </div>
    
            <div class="report-table">
                <table>
                    <thead>
                        <tr>
                            <th>Branch</th>
                            <th>${isSavings ? 'Total Savings Deposits' : 'Total Disbursements'}</th>
                            <th>Total Members</th>
                            <th>Year</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
    // Minimal single-row summary using the logged-in user's branch only
    const userBranchName = localStorage.getItem('user_branch_name');
    const userBranchLocation = localStorage.getItem('user_branch_location');
    const branchDisplay = (userBranchName && userBranchLocation) ? `${userBranchName} - ${userBranchLocation}` : (userBranchName || 'Branch');
    html += `
                <tr>
                    <td>${branchDisplay}</td>
                    <td>₱${Number(reportData.total || 0).toLocaleString('en-PH')}</td>
                    <td>${Number(reportData.activeMembers || 0).toLocaleString('en-PH')}</td>
                    <td>${reportData.period.split(' ')[1]}</td>
                </tr>
            `;
        
        html += `
                    </tbody>
                </table>
            </div>
        </div>
        `;
    
    return html;
}

// Generate member report HTML
function generateMemberReportHTML(reportData) {
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Calculate totals from fetched transactions
    const transactions = reportData.data || [];
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => {
        const debit = parseFloat(t.debit_amount || 0);
        const credit = parseFloat(t.credit_amount || 0);
        return sum + Math.max(debit, credit);
    }, 0);
    
    let html = `
        <div class="report-content">
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${reportData.member}</div>
                    <div class="stat-label">Member</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalTransactions}</div>
                    <div class="stat-label">Total Transactions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div class="stat-label">Total Amount</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Array.isArray(reportData.transactionTypes) ? reportData.transactionTypes.join(', ').replace(/\b\w/g, l => l.toUpperCase()) : 'Both'}</div>
                    <div class="stat-label">Transaction Type</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${currentDate}</div>
                    <div class="stat-label">Generated</div>
                </div>
            </div>
    
            <div class="report-table">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Payee</th>
                            <th>Particulars</th>
                            <th>Reference</th>
                            <th>Debit</th>
                            <th>Credit</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
    // Display transactions or show "no data" message
    if (totalTransactions === 0) {
        html += `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #9ca3af;">
                        <i class="fas fa-database" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        No transactions found for this member in ${new Date(reportData.year || new Date().getFullYear(), (reportData.month || 1) - 1).toLocaleString('default', { month: 'long' })} ${reportData.year || new Date().getFullYear()}
                    </td>
                </tr>
            `;
    } else {
        transactions.forEach(transaction => {
            const date = new Date(transaction.transaction_date).toLocaleDateString('en-US');
            const debit = parseFloat(transaction.debit_amount || 0);
            const credit = parseFloat(transaction.credit_amount || 0);
            
            html += `
                <tr>
                    <td>${date}</td>
                    <td>${transaction.payee || ''}</td>
                    <td>${transaction.particulars || ''}</td>
                    <td>${transaction.reference || ''}</td>
                    <td>${debit > 0 ? '₱' + debit.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                    <td>${credit > 0 ? '₱' + credit.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                </tr>
            `;
        });
    }
        
        html += `
                    </tbody>
                </table>
            </div>
        </div>
        `;
    
    return html;
}

// Generate branch report HTML
function generateBranchReportHTML(reportData) {
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const month = reportData.period.split(' ')[0];
    const year = reportData.period.split(' ')[1];
    
    let html = `
        <div class="report-content">
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${(reportData.rows && reportData.rows.length) || 0}</div>
                    <div class="stat-label">Branches</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${getMonthName(month)}</div>
                    <div class="stat-label">Month</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${year}</div>
                    <div class="stat-label">Year</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${currentDate}</div>
                    <div class="stat-label">Generated Date</div>
                </div>
            </div>
            
            <div class="report-table">
                <table>
                    <thead>
                        <tr>
                            <th>Branch Name</th>
                            <th>Total Members</th>
                            <th>Total Savings</th>
                            <th>Total Disbursements</th>
                            <th>Performance %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.isArray(reportData.rows) && reportData.rows.length ? reportData.rows.map(r => `
                            <tr>
                                <td>${r.branch_name}</td>
                                <td>${r.active_members}</td>
                                <td>₱${Number(r.total_savings || 0).toLocaleString('en-PH')}</td>
                                <td>₱${Number(r.total_disbursements || 0).toLocaleString('en-PH')}</td>
                                <td>${(r.performancePct || 0).toFixed(2)}%</td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 40px; color: #9ca3af;">
                                    <i class="fas fa-database" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                                    No data available for selected filters
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    return html;
}

// Clear report canvas
function clearReportCanvas() {
    const reportCanvas = document.getElementById('reportCanvas');
    if (reportCanvas) {
        reportCanvas.innerHTML = `
            <div class="canvas-placeholder">
                <i class="fas fa-chart-bar"></i>
                <h3>Report Canvas</h3>
                <p>"Generate Report" to display data here.</p>
            </div>
        `;
    }
}

// Show send finance section
function showSendFinanceSection() {
    const sendFinanceSection = document.getElementById('sendFinanceSection');
    if (sendFinanceSection) {
        sendFinanceSection.style.display = 'block';
    }
}

// Show AI controls when a report is generated
function showAIRecommendationControls() {
    const ctrl = document.getElementById('aiRecommendationControls');
    if (ctrl) ctrl.style.display = 'flex';
}

// Generate AI recommendations via backend
async function generateAIRecommendation() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            showMessage('You are not authenticated.', 'error');
            return;
        }

        const btn = document.getElementById('generateAIButton');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Loading...</span>';
        }

        const body = {
            reportType: window.currentReportType,
            reportData: window.currentReportData
        };

        const res = await fetch('/api/auth/reports/generate-ai-recommendations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Failed to generate AI recommendations');
        }

        const json = await res.json();
        const data = json && json.data ? json.data : null;
        if (!data) throw new Error('Invalid AI response');

        renderAIRecommendations(data);
        window.aiRecommendationsGenerated = true;
    } catch (e) {
        console.error('AI generation failed:', e);
        showMessage('AI recommendation failed.', 'error');
    } finally {
        const btn = document.getElementById('generateAIButton');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-brain"></i><span>Generate AI Recommendation</span>';
        }
    }
}

function renderAIRecommendations(payload) {
    const section = document.getElementById('aiRecommendationSection');
    if (!section) return;
    section.style.display = 'block';

    // Strategic text
    const strategicEl = document.getElementById('aiStrategicText');
    const strategic = (payload.ai && payload.ai.recommendations && payload.ai.recommendations.strategic) ||
                      (payload.mcda && payload.mcda.recommendations && payload.mcda.recommendations.strategic) ||
                      'No strategic recommendations available.';
    if (strategicEl) strategicEl.textContent = strategic;

    // Branch list
    const branchList = document.getElementById('aiBranchList');
    const branchRecs = (payload.ai && payload.ai.recommendations && payload.ai.recommendations.branchLevel) || [];
    if (branchList) {
        branchList.innerHTML = branchRecs.map(item => `
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin-bottom:8px;background:#fff">
                <div style="font-weight:600;color:#111827">${item.branchName || 'Branch'}</div>
                <div style="font-size:12px;color:#374151;margin:4px 0">Priority: ${item.priority || 'Medium'}</div>
                <ul style="margin:0;padding-left:18px">${(item.recommendations || []).map(r => `<li>${r}</li>`).join('')}</ul>
                ${item.rationale ? `<div style="font-size:12px;color:#6b7280;margin-top:6px">Reason: ${item.rationale}</div>` : ''}
            </div>
        `).join('');
    }

    // Ranking table
    const tbody = document.querySelector('#aiRankingTable tbody');
    const ranked = (payload.mcda && payload.mcda.rankedBranches) || [];
    if (tbody) {
        tbody.innerHTML = ranked.map(r => `
            <tr>
                <td>${r.rank}</td>
                <td>${r.branch_name || 'Branch'}</td>
                <td>${(r.topsisScore * 100).toFixed(1)}%</td>
                <td>${r.category}</td>
            </tr>
        `).join('');
    }
}

// Hide send finance section
function hideSendFinanceSection() {
    const sendFinanceSection = document.getElementById('sendFinanceSection');
    if (sendFinanceSection) {
        sendFinanceSection.style.display = 'none';
    }
}

// Clear configuration based on report type
function clearConfiguration(reportType) {
    try {
        if (!reportType) {
            showMessage('Invalid report type for clearing.', 'error');
            return;
        }
        if (window.isPrefillLocked) {
            showMessage('Configuration is locked by Finance Officer.', 'warning');
            return;
        }
        
        switch (reportType) {
            case 'savings':
                clearSavingsConfig();
                break;
            case 'disbursement':
                clearDisbursementConfig();
                break;
            case 'member':
                clearMemberConfig();
                break;
            case 'branch':
                clearBranchConfig();
                break;
            default:
                showMessage('Unknown report type.', 'error');
                return;
        }
        
    // Hide send finance section
    hideSendFinanceSection();
        
        showMessage('Configuration cleared successfully!', 'success');
    } catch (error) {
        console.error('Error clearing configuration:', error);
        showMessage('An error occurred while clearing the configuration.', 'error');
    }
}

// Disable editing for prefilled configuration
function lockPrefilledConfiguration(reportType) {
    try {
        window.isPrefillLocked = true;

        // Disable report type buttons
        document.querySelectorAll('.report-type-btn').forEach(b => {
            b.disabled = true;
            b.style.opacity = '0.6';
            b.style.cursor = 'not-allowed';
        });

        // Helper to disable all buttons inside a config section
        const disableButtons = (section) => {
            if (!section) return;
            section.querySelectorAll('button').forEach(btn => {
                if (btn.classList.contains('generate-btn')) return; // keep generate active elsewhere
                btn.disabled = true;
                btn.style.opacity = '0.6';
                btn.style.cursor = 'not-allowed';
            });
        };

        // Disable clear button only for the active locked section
        const activeSection = document.getElementById(reportType + 'Config');
        if (activeSection) {
            const clearBtn = activeSection.querySelector('.clear-config-btn');
            if (clearBtn) {
                clearBtn.disabled = true;
                clearBtn.style.opacity = '0.6';
                clearBtn.style.cursor = 'not-allowed';
            }
        }

        // Disable inputs per report type
        switch (reportType) {
            case 'savings':
            case 'disbursement': {
                const yearEl = document.getElementById(reportType + 'Year');
                const monthEl = document.getElementById(reportType + 'Month');
                if (yearEl) yearEl.disabled = true;
                if (monthEl) monthEl.disabled = true;
                break;
            }
            case 'member': {
                const memberSearch = document.getElementById('memberSearch');
                const yearEl = document.getElementById('memberYear');
                const monthEl = document.getElementById('memberMonth');
                if (memberSearch) memberSearch.disabled = true;
                if (yearEl) yearEl.disabled = true;
                if (monthEl) monthEl.disabled = true;
                // Disable any type buttons within member config
                document.querySelectorAll('#memberConfig .type-btn').forEach(b => {
                    b.disabled = true;
                    b.style.opacity = '0.6';
                    b.style.cursor = 'not-allowed';
                });
                break;
            }
            case 'branch': {
                document.querySelectorAll('input[name="branchSelection"]').forEach(cb => cb.disabled = true);
                const byEl = document.getElementById('branchYear');
                const bmEl = document.getElementById('branchMonth');
                if (byEl) byEl.disabled = true;
                if (bmEl) bmEl.disabled = true;
                document.querySelectorAll('#branchConfig .type-btn').forEach(b => {
                    b.disabled = true;
                    b.style.opacity = '0.6';
                    b.style.cursor = 'not-allowed';
                });
                break;
            }
        }

        // Add a subtle note to ALL configuration headers
        const reportTypes = ['savings', 'disbursement', 'member', 'branch'];
        reportTypes.forEach(type => {
            const configSection = document.getElementById(type + 'Config');
            if (configSection) {
                const header = configSection.querySelector('.config-header h3');
                if (header && !header.querySelector('.locked-note')) {
                    const note = document.createElement('small');
                    note.className = 'locked-note';
                    note.textContent = ' (Locked by Finance Officer request)';
                    header.appendChild(note);
                }
            }
        });

        // Also dim and disable type buttons within the active section
        disableButtons(activeSection);
    } catch (_) {
        // no-op
    }
}

// Clear savings configuration
function clearSavingsConfig() {
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Clear branch selection for main branch users
    if (isMainBranchUser) {
        const configSection = document.getElementById('savingsConfig');
        if (configSection) {
            const checkboxes = configSection.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    }
    
    // Clear year and month fields
    const yearElement = document.getElementById('savingsYear');
    const monthElement = document.getElementById('savingsMonth');
    
    if (yearElement) yearElement.value = '2025';
    if (monthElement) monthElement.value = '1';
}

// Clear disbursement configuration
function clearDisbursementConfig() {
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Clear branch selection for main branch users
    if (isMainBranchUser) {
        const configSection = document.getElementById('disbursementConfig');
        if (configSection) {
            const checkboxes = configSection.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    }
    
    // Clear year and month fields
    const yearElement = document.getElementById('disbursementYear');
    const monthElement = document.getElementById('disbursementMonth');
    
    if (yearElement) yearElement.value = '2025';
    if (monthElement) monthElement.value = '1';
}

// Clear member configuration
function clearMemberConfig() {
    document.getElementById('memberSearch').value = '';
    document.querySelectorAll('#memberConfig .type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

// Clear branch configuration
function clearBranchConfig() {
    document.querySelectorAll('input[name="branchSelection"]').forEach(radio => {
        radio.checked = false;
    });
    document.getElementById('branchYear').value = '2025';
    document.getElementById('branchMonth').value = '1';
    document.querySelectorAll('#branchConfig .type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

// Send to Finance Officer
async function sendToFinanceOfficer() {
    const activeReportType = document.querySelector('.report-type-btn.active');
    if (!activeReportType) {
        showMessage('Please generate a report first.', 'error');
        return;
    }
    
    const reportType = activeReportType.getAttribute('data-type');
    const reportData = window.currentReportData;
    
    if (!reportData) {
        showMessage('No report data available to send.', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            showMessage('Authentication required.', 'error');
            return;
        }
        
        // Show loading state
        showLoadingDialog('Sending report to Finance Officer...');
        
        // Generate PDF from canvas + AI section
        const canvas = document.getElementById('reportCanvas');
        const aiSection = document.getElementById('aiRecommendationSection');
        const wrapper = document.createElement('div');
        if (canvas) wrapper.appendChild(canvas.cloneNode(true));
        if (aiSection && aiSection.style.display !== 'none') {
            wrapper.appendChild(aiSection.cloneNode(true));
        }
        
        // Add Chart.js library and chart initialization scripts to the HTML
        let fullHTML = wrapper.innerHTML;
        
        // Get all computed styles for the canvas content
        const styleSheets = Array.from(document.styleSheets)
            .map(sheet => {
                try {
                    return Array.from(sheet.cssRules)
                        .map(rule => rule.cssText)
                        .join('\n');
                } catch (e) {
                    return '';
                }
            })
            .join('\n');
        
        // Get report type for header
        const reportTypeMap = {
            'Savings Report': 'Savings Report',
            'Disbursement Report': 'Disbursement Report',
            'Member Report': 'Member Report',
            'Branch Performance Report': 'Branch Performance Report'
        };
        const reportTypeForHeader = reportTypeMap[reportData.type] || 'Financial Report';
        
        // Get branch information
        const branchName = localStorage.getItem('user_branch_name') || 'Unknown Branch';
        
        // Get current date and time
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
        
        // Safely serialize chart data
        let chartDataJSON = 'null';
        let chartTypeStr = 'bar';
        let chartsJSON = 'null';
        
        try {
            if (reportData && reportData.chart) {
                chartDataJSON = JSON.stringify(reportData.chart);
            }
            if (reportData && reportData.chartType) {
                chartTypeStr = reportData.chartType;
            }
            if (reportData && reportData.charts) {
                chartsJSON = JSON.stringify(reportData.charts);
            }
        } catch (e) {
            console.error('Error serializing chart data:', e);
        }
        
        // Wrap with Chart.js library and initialization, including all styles
        fullHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        ${styleSheets}
        
        /* Additional styles for PDF rendering - Smaller text and better spacing */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 15px;
            background: white;
            color: #333;
            font-size: 11px;
        }
        
        /* Report Header Styling */
        .report-header-section {
            margin-bottom: 20px;
            padding: 15px;
            background: #ffffff;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
        }
        .report-main-title {
            font-size: 16px;
            font-weight: 700;
            color: #0D5B11;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .report-type {
            font-size: 14px;
            font-weight: 600;
            color: #187C19;
            margin-bottom: 10px;
            padding-left: 0;
        }
        .report-meta {
            font-size: 12px;
            color: #374151;
            margin-bottom: 4px;
            padding-left: 0;
        }
        .report-meta strong {
            color: #0D5B11;
            font-weight: 600;
        }
        .report-timestamp {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #cbd5e1;
            font-size: 10px;
            color: #6b7280;
            padding-left: 0;
        }
        
        .report-content {
            max-width: 100%;
            margin: 0 auto;
        }
        canvas { 
            max-width: 100%;
            height: 200px !important;
        }
        
        /* Smaller text for tables */
        table { 
            width: 100%; 
            border-collapse: collapse;
            page-break-inside: auto;
            font-size: 9px;
        }
        th, td {
            padding: 6px 8px;
            font-size: 9px;
        }
        th {
            font-size: 10px !important;
            font-weight: 600;
        }
        
        tr { 
            page-break-inside: avoid;
            page-break-after: auto;
        }
        
        /* Smaller stat cards */
        .report-stats { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 8px;
            margin-bottom: 12px;
        }
        .stat-card {
            padding: 8px;
        }
        .stat-card .stat-value {
            font-size: 14px !important;
        }
        .stat-card .stat-label {
            font-size: 8px !important;
        }
        
        /* Smaller headings */
        h4 {
            font-size: 11px !important;
            margin-bottom: 8px !important;
        }
        
        /* Better chart container sizing */
        #reportChartContainer,
        div[style*="height: 260px"],
        div[style*="height: 300px"] {
            width: 100%;
            margin: 10px 0;
        }
        
        /* Chart wrapper adjustments - more compact */
        div[style*="height: 260px"] canvas,
        div[style*="height: 300px"] canvas,
        #reportChart {
            height: 200px !important;
            width: 100% !important;
        }
        
        @media print {
            body { padding: 0; font-size: 9px; }
            .report-content { padding: 8px; }
            .report-header-section {
                padding: 12px;
                margin-bottom: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="report-header-section">
        <div class="report-main-title">IMVCMPC Finance Management System Report</div>
        <div class="report-type">${reportTypeForHeader}</div>
        <div class="report-meta"><strong>Generated by:</strong> Marketing Clerk - ${branchName}</div>
        <div class="report-meta"><strong>Submitted to:</strong> Finance Officer - ${branchName}</div>
        <div class="report-timestamp">Downloaded on: ${dateStr} at ${timeStr}</div>
    </div>
    ${fullHTML}
    <script>
        // Initialize charts after DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            // Wait for Chart.js to load
            if (typeof Chart !== 'undefined') {
                // Get the chart data from the reportData
                const chartData = ${chartDataJSON};
                const chartType = '${chartTypeStr}';
                const charts = ${chartsJSON};
                
                // Initialize single chart (savings/disbursement)
                if (chartData && Array.isArray(chartData.labels)) {
                    const canvas = document.getElementById('reportChart');
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        new Chart(ctx, {
                            type: chartType,
                            data: chartData,
                            options: {
                                responsive: true,
                                maintainAspectRatio: true,
                                aspectRatio: 3,
                                scales: { 
                                    y: { 
                                        beginAtZero: true,
                                        ticks: { font: { size: 8 } }
                                    },
                                    x: {
                                        ticks: { font: { size: 8 } }
                                    }
                                },
                                plugins: {
                                    legend: { 
                                        display: true,
                                        position: 'top',
                                        labels: {
                                            font: { size: 8 },
                                            padding: 6,
                                            boxWidth: 10,
                                            usePointStyle: false
                                        }
                                    },
                                    title: { display: false }
                                }
                            }
                        });
                    }
                }
                
                // Initialize branch report charts
                if (charts) {
                    const savingsCanvas = document.getElementById('branchSavingsChart');
                    if (savingsCanvas && charts.savings) {
                        const ctx = savingsCanvas.getContext('2d');
                        new Chart(ctx, {
                            type: 'bar',
                            data: charts.savings,
                            options: {
                                responsive: true,
                                maintainAspectRatio: true,
                                aspectRatio: 3,
                                scales: { 
                                    y: { 
                                        beginAtZero: true,
                                        ticks: { font: { size: 8 } }
                                    },
                                    x: {
                                        ticks: { font: { size: 8 } }
                                    }
                                },
                                plugins: {
                                    legend: { 
                                        display: true,
                                        position: 'top',
                                        labels: {
                                            font: { size: 8 },
                                            padding: 6,
                                            boxWidth: 10,
                                            usePointStyle: false
                                        }
                                    },
                                    title: { display: false }
                                }
                            }
                        });
                    }
                    
                    const disbursementCanvas = document.getElementById('branchDisbChart');
                    if (disbursementCanvas && charts.disbursement) {
                        const ctx = disbursementCanvas.getContext('2d');
                        new Chart(ctx, {
                            type: 'bar',
                            data: charts.disbursement,
                            options: {
                                responsive: true,
                                maintainAspectRatio: true,
                                aspectRatio: 3,
                                scales: { 
                                    y: { 
                                        beginAtZero: true,
                                        ticks: { font: { size: 8 } }
                                    },
                                    x: {
                                        ticks: { font: { size: 8 } }
                                    }
                                },
                                plugins: {
                                    legend: { 
                                        display: true,
                                        position: 'top',
                                        labels: {
                                            font: { size: 8 },
                                            padding: 6,
                                            boxWidth: 10,
                                            usePointStyle: false
                                        }
                                    },
                                    title: { display: false }
                                }
                            }
                        });
                    }
                }
            }
        });
    </script>
</body>
</html>`;
        
        // Generate PDF
        const pdfRes = await fetch('/api/auth/reports/generate-pdf', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reportHTML: fullHTML,
                title: `${reportType} Report`
            })
        });
        
        if (!pdfRes.ok) {
            throw new Error('PDF generation failed');
        }
        
        const pdfBlob = await pdfRes.blob();
        const pdfBase64 = await blobToBase64(pdfBlob);
        
        // Get report_request_id from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const reportRequestId = urlParams.get('requestId') || null;
        
        // Collect configuration
        const reportConfig = collectReportConfig(reportType);
        
        // Get user info for debugging
        const userRole = localStorage.getItem('user_role');
        const userBranchId = localStorage.getItem('user_branch_id');
        const userBranchName = localStorage.getItem('user_branch_name');
        
        
        // Save to database
        const saveRes = await fetch('/api/auth/generated-reports', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                report_request_id: reportRequestId,
                report_type: reportType,
                config: reportConfig,
                data: reportData,
                pdf_data: pdfBase64,
                file_name: `${reportType}_report_${new Date().getTime()}.pdf`
            })
        });
        
        if (!saveRes.ok) {
            const errorText = await saveRes.text();
            throw new Error(errorText || 'Failed to save report');
        }
        
        const result = await saveRes.json();
        
        // Reload reports from database to show the new report
        await loadReportHistories();
        
        // Hide loading dialog and show success
        hideLoadingDialog();
        const reportDetails = getReportDetailsForMessage(reportType, reportData);
        showSuccessDialog(`${reportDetails} was sent successfully`);
        
    } catch (error) {
        console.error('Error sending report:', error);
        hideLoadingDialog();
        showMessage('Failed to send report. Please try again.', 'error');
    }
}

// Get report details for success message
function getReportDetailsForMessage(reportType, reportData) {
    try {
        const reportTypeCapitalized = reportType.charAt(0).toUpperCase() + reportType.slice(1);
        const details = [];
        
        switch (reportType) {
            case 'savings':
            case 'disbursement': {
                const year = reportData.year || new Date().getFullYear();
                const month = reportData.month || new Date().getMonth() + 1;
                const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
                details.push(`${reportTypeCapitalized} Report for ${monthName} ${year}`);
                break;
            }
            case 'member': {
                const memberName = reportData.memberName || 'Member';
                const year = reportData.year || new Date().getFullYear();
                const month = reportData.month || new Date().getMonth() + 1;
                const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
                details.push(`${reportTypeCapitalized} Report for ${memberName} (${monthName} ${year})`);
                break;
            }
            case 'branch': {
                const selectedBranches = reportData.selectedBranches || [];
                if (selectedBranches.length > 0) {
                    const branchNames = selectedBranches.map(branch => branch.name || branch).join(', ');
                    details.push(`${reportTypeCapitalized} Report for ${branchNames}`);
                } else {
                    details.push(`${reportTypeCapitalized} Report`);
                }
                break;
            }
            default:
                details.push(`${reportTypeCapitalized} Report`);
        }
        
        return details.join(' ');
    } catch (error) {
        console.error('Error generating report details message:', error);
        return `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
    }
}

// Show loading dialog
function showLoadingDialog(message) {
    // Remove existing dialogs
    hideLoadingDialog();
    hideSuccessDialog();
    
    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.id = 'loadingDialog';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
    `;
    
    // Create dialog content
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 300px;
        width: 90%;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transform: scale(0.95);
        transition: all 0.2s ease;
    `;
    
    // Trigger animation after element is added to DOM
    setTimeout(() => {
        dialog.style.opacity = '1';
        dialog.style.transform = 'scale(1)';
    }, 10);
    
    // Create loading spinner
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 32px;
        height: 32px;
        border: 3px solid #f3f4f6;
        border-top: 3px solid #0D5B11;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px;
    `;
    
    // Create message
    const messageEl = document.createElement('p');
    messageEl.style.cssText = `
        color: #374151;
        font-size: 14px;
        font-weight: 500;
        margin: 0;
        line-height: 1.4;
    `;
    messageEl.textContent = message;
    
    // Assemble dialog
    dialog.appendChild(spinner);
    dialog.appendChild(messageEl);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

// Hide loading dialog
function hideLoadingDialog() {
    const existingDialog = document.getElementById('loadingDialog');
    if (existingDialog) {
        existingDialog.remove();
    }
}

// Hide success dialog
function hideSuccessDialog() {
    const existingDialog = document.getElementById('successDialog');
    if (existingDialog) {
        existingDialog.remove();
    }
}

// Show minimalist success dialog
function showSuccessDialog(message) {
    // Remove existing dialogs
    hideLoadingDialog();
    hideSuccessDialog();
    
    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.id = 'successDialog';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
    `;
    
    // Create dialog content
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transform: scale(0.95);
        transition: all 0.2s ease;
    `;
    
    // Trigger animation after element is added to DOM
    setTimeout(() => {
        dialog.style.opacity = '1';
        dialog.style.transform = 'scale(1)';
    }, 10);
    
    // Create success icon
    const icon = document.createElement('div');
    icon.style.cssText = `
        width: 32px;
        height: 32px;
        background: #0D5B11;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        font-size: 14px;
        color: white;
    `;
    icon.innerHTML = '<i class="fas fa-check"></i>';
    
    // Create message
    const messageEl = document.createElement('p');
    messageEl.style.cssText = `
        color: #374151;
        font-size: 14px;
        font-weight: 500;
        margin: 0;
        line-height: 1.4;
    `;
    messageEl.textContent = message;
    
    // Add click outside to close
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
    
    // Add escape key to close
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Assemble dialog
    dialog.appendChild(icon);
    dialog.appendChild(messageEl);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Auto-close after 2.5 seconds
    setTimeout(() => {
        if (document.getElementById('successDialog')) {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    }, 2500);
}

// Create sent report entry
function createSentReportEntry(reportData) {
    const now = new Date();
    const timestamp = now.getTime();
    
    // Generate filename
    const reportTypeName = reportData.type.replace(' Report', '');
    const branchInfo = getBranchInfoForReport(reportData);
    const dateStr = now.toISOString().split('T')[0];
    const filename = `${reportTypeName}_${branchInfo}_${dateStr}.pdf`;
    
    return {
        id: timestamp,
        reportType: reportData.type,
        branch: branchInfo,
        filename: filename,
        sentTime: now.toLocaleTimeString('en-US', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit' 
        }),
        sentDate: now.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        }),
        timestamp: timestamp
    };
}

// Get branch info for report
function getBranchInfoForReport(reportData) {
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    if (isMainBranchUser) {
        if (reportData.branches && reportData.branches.length > 0) {
            if (reportData.branches.length === 1) {
                const branchId = reportData.branches[0].replace('branch', '');
                const branchLocation = getBranchLocation(branchId);
                return `Branch ${branchId} - ${branchLocation}`;
            } else {
                return `Multiple Branches (${reportData.branches.length})`;
            }
        }
        return 'All Branches';
    } else {
        const userBranchId = localStorage.getItem('user_branch_id');
        const userBranchName = localStorage.getItem('user_branch_name');
        const userBranchLocation = localStorage.getItem('user_branch_location');
        return `${userBranchName} - ${userBranchLocation}` || `Branch ${userBranchId}`;
    }
}

// Helper: Convert blob to base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Helper: Collect report configuration
function collectReportConfig(reportType) {
    try {
        switch (reportType) {
            case 'savings':
            case 'disbursement': {
                const year = document.getElementById(reportType + 'Year')?.value;
                const month = document.getElementById(reportType + 'Month')?.value;
                return { year, month };
            }
            case 'member': {
                const member = document.getElementById('memberSearch')?.value?.trim();
                // Member reports always include both savings and disbursement
                const year = document.getElementById('memberYear')?.value;
                const month = document.getElementById('memberMonth')?.value;
                return { member, transactionTypes: ['savings', 'disbursement'], year, month };
            }
            case 'branch': {
                const selected = Array.from(document.querySelectorAll('input[name="branchSelection"]:checked')).map(cb => cb.value);
                const year = document.getElementById('branchYear')?.value;
                const month = document.getElementById('branchMonth')?.value;
                const types = Array.from(document.querySelectorAll('#branchConfig .type-btn.active')).map(b => b.getAttribute('data-type'));
                return { branches: selected, year, month, transactionTypes: types };
            }
            default:
                return {};
        }
    } catch (_) {
        return {};
    }
}




// Get report type display name
function getReportTypeDisplayName(reportType) {
    switch (reportType) {
        case 'savings': return 'Savings Report';
        case 'disbursement': return 'Disbursement Report';
        case 'member': return 'Member Report';
        case 'branch': return 'Branch Performance Report';
        default: return 'Report';
    }
}


// Show message
function showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    messageDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
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
    document.body.appendChild(messageDiv);
    
    // Animate in
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 4000);
}

// Get notification icon
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

// Get notification color
function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#22C55E'; // Green for success
        case 'error': return '#EF4444';   // Red for error
        case 'warning': return '#F59E0B'; // Orange for warning
        case 'info': return '#3B82F6';    // Blue for info
        default: return '#3B82F6';
    }
}

// Helper function to get month name
function getMonthName(monthNumber) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || 'Unknown';
}

// Update current date and time
function updateCurrentDateTime() {
    const now = new Date();
    
    const currentDate = document.getElementById('currentDate');
    if (currentDate) {
        currentDate.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    const currentTime = document.getElementById('currentTime');
    if (currentTime) {
        currentTime.textContent = now.toLocaleTimeString('en-US', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }
}

// Initialize report histories
async function initializeReportHistories() {
    // Load existing report histories from database (with localStorage fallback)
    await loadReportHistories();
}

// Load report histories for all report types
async function loadReportHistories() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('No access token found');
            return;
        }

        // Load reports from database
        const response = await fetch('/api/auth/generated-reports?limit=50', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('Failed to load reports from database:', response.status);
            // Fallback to localStorage if database fails
            loadReportHistoriesFromLocalStorage();
            return;
        }

        const result = await response.json();
        const reports = result.data?.reports || [];

        // Process all reports into unified format
        const allReports = reports.map(report => {
            return {
                id: report.id,
                title: generateReportTitle(report.report_type, report.config, report.created_at),
                details: generateReportDetails(report.report_type, report.config),
                date: report.created_at,
                status: 'sent',
                type: report.report_type,
                branch_id: report.branch_id,
                branch_name: report.branch_name,
                config: report.config || {}
            };
        });

        // Store all reports for filtering
        allSentReports = allReports;

        // Display all reports in unified container
        displaySentReports(allSentReports);

    } catch (error) {
        console.error('Error loading reports from database:', error);
        // Fallback to localStorage if database fails
        loadReportHistoriesFromLocalStorage();
    }
}

// Make function globally available for manual refresh
window.displaySentReports = displaySentReports;

// Fallback function to load from localStorage
function loadReportHistoriesFromLocalStorage() {
    const reportTypes = ['savings', 'disbursement', 'member', 'branch'];
    const allReports = [];
    
    reportTypes.forEach(type => {
        const history = getReportHistory(type);
        // Filter reports by user's branch
        const filteredHistory = filterReportsByBranch(history);
        
        // Add type to each report
        filteredHistory.forEach(report => {
            allReports.push({
                ...report,
                type: type
            });
        });
    });
    
    // Store all reports for filtering
    allSentReports = allReports;
    
    // Display all reports in unified container
    displaySentReports(allSentReports);
}

// Get report history for a specific type
function getReportHistory(reportType) {
    const key = `reportHistory_${reportType}`;
    const history = localStorage.getItem(key);
    return history ? JSON.parse(history) : [];
}

// Filter reports by user's branch
function filterReportsByBranch(history) {
    const userBranchId = localStorage.getItem('user_branch_id');
    if (!userBranchId) return history;
    
    return history.filter(report => {
        // If report doesn't have branch_id, include it (backward compatibility)
        if (!report.branch_id) return true;
        return report.branch_id === userBranchId;
    });
}

// Save report history for a specific type
function saveReportHistory(reportType, reportData) {
    const key = `reportHistory_${reportType}`;
    const history = getReportHistory(reportType);
    
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    
    const newReport = {
        id: Date.now(),
        title: generateReportTitle(reportType, reportData),
        details: generateReportDetails(reportType, reportData),
        date: new Date().toISOString(),
        status: 'sent',
        type: reportType,
        branch_id: userBranchId,
        branch_name: userBranchName,
        config: reportData.config || {}
    };
    
    history.unshift(newReport); // Add to beginning
    
    // Keep only last 10 reports
    if (history.length > 10) {
        history.splice(10);
    }
    
    localStorage.setItem(key, JSON.stringify(history));
    displayReportHistory(reportType, history);
}

// Display report history for a specific type
function displayReportHistory(reportType, history) {
    const historySection = document.getElementById(`${reportType}ReportHistory`);
    const historyList = document.getElementById(`${reportType}HistoryList`);
    
    if (!historySection || !historyList) return;
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-history"></i>
                <h5>No Reports Sent</h5>
                <p>No ${reportType} reports have been sent yet.</p>
            </div>
        `;
    } else {
        historyList.innerHTML = history.map(report => `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-title">${report.title}</div>
                    <div class="history-details">${report.details}</div>
                </div>
                <div class="history-meta">
                    <div class="history-status ${report.status}">SENT</div>
                    <div class="history-timestamp">${formatSmartTimestamp(report.date)}</div>
                </div>
            </div>
        `).join('');
    }
}

// Generate report title based on type and config
function generateReportTitle(reportType, config, createdAt) {
    // Parse date string and handle timezone properly to avoid day shift
    let localDateString = createdAt;
    if (createdAt.includes('T')) {
        localDateString = createdAt.split('T')[0];
    }
    
    // Create date from YYYY-MM-DD format to avoid timezone issues
    const [year, month, day] = localDateString.split('-').map(Number);
    const reportDate = new Date(year, month - 1, day);
    
    const generationDate = reportDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
    
    // Parse config if it's a string
    let parsedConfig = {};
    try {
        if (config) {
            if (typeof config === 'string') {
                parsedConfig = JSON.parse(config);
            } else if (typeof config === 'object' && config !== null) {
                parsedConfig = config;
            }
        }
    } catch (e) {
        console.warn('Failed to parse config:', e);
        parsedConfig = {};
    }
    
    // Ensure parsedConfig is always an object
    if (!parsedConfig || typeof parsedConfig !== 'object') {
        parsedConfig = {};
    }
    
    switch (reportType) {
        case 'savings': {
            const month = parsedConfig.month || new Date().getMonth() + 1;
            const year = parsedConfig.year || new Date().getFullYear();
            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
            return `Savings Report – ${monthName} ${year} <span style="color: rgba(13, 91, 17, 0.7);">|</span> <span style="color: #6b7280;">Generated on: ${generationDate}</span>`;
        }
        case 'disbursement': {
            const month = parsedConfig.month || new Date().getMonth() + 1;
            const year = parsedConfig.year || new Date().getFullYear();
            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
            return `Disbursement Report – ${monthName} ${year} <span style="color: rgba(13, 91, 17, 0.7);">|</span> <span style="color: #6b7280;">Generated on: ${generationDate}</span>`;
        }
        case 'member': {
            // Get member name from config with multiple fallback options
            console.log('DEBUG: Full parsedConfig object:', parsedConfig);
            console.log('DEBUG: parsedConfig keys:', parsedConfig ? Object.keys(parsedConfig) : 'null');
            console.log('DEBUG: parsedConfig.member:', parsedConfig.member);
            console.log('DEBUG: parsedConfig.payee:', parsedConfig.payee);
            
            let memberName = parsedConfig.member || 
                           parsedConfig.payee ||
                           parsedConfig.memberName ||
                           parsedConfig.name ||
                           '[Member Name]';
            
            console.log('Debug generateReportTitle - parsedConfig:', parsedConfig);
            console.log('Debug generateReportTitle - memberName:', memberName);
            
            // If still showing placeholder, try alternative extraction
            if (memberName === '[Member Name]') {
                console.warn('Warning: Could not extract member name from config');
                console.warn('Full config object:', JSON.stringify(parsedConfig, null, 2));
            }
            
            return `Member Report - ${memberName} <span style="color: rgba(13, 91, 17, 0.7);">|</span> <span style="color: #6b7280;">Generated on: ${generationDate}</span>`;
        }
        case 'branch': {
            // Count selected branches from config
            let branchCount = 0;
            if (parsedConfig && parsedConfig.branches) {
                branchCount = parsedConfig.branches.length;
            } else if (parsedConfig && parsedConfig.transactionTypes) {
                branchCount = parsedConfig.transactionTypes.length;
            } else {
                branchCount = 1; // Default to 1 if no config
            }
            const branchText = branchCount === 1 ? '1 Branch' : `${branchCount} Branches`;
            return `Branch Report – ${branchText} <span style="color: rgba(13, 91, 17, 0.7);">|</span> <span style="color: #6b7280;">Generated on: ${generationDate}</span>`;
        }
        default:
            return `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report <span style="color: rgba(13, 91, 17, 0.7);">|</span> <span style="color: #6b7280;">Generated on: ${generationDate}</span>`;
    }
}

// Generate report details based on type and config
function generateReportDetails(reportType, config) {
    // Parse config if it's a string, default to empty object if null/undefined
    let parsedConfig = {};
    try {
        if (config) {
            if (typeof config === 'string') {
                parsedConfig = JSON.parse(config);
            } else if (typeof config === 'object' && config !== null) {
                parsedConfig = config;
            }
        }
    } catch (e) {
        console.warn('Failed to parse config:', e);
        parsedConfig = {};
    }
    
    // Ensure parsedConfig is always an object
    if (!parsedConfig || typeof parsedConfig !== 'object') {
        parsedConfig = {};
    }
    
    switch (reportType) {
        case 'savings':
        case 'disbursement':
        case 'member':
        case 'branch': {
            const month = parsedConfig.month || new Date().getMonth() + 1;
            const year = parsedConfig.year || new Date().getFullYear();
            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
            return `Month: ${monthName} • Year: ${year}`;
        }
        default:
            const currentDate = new Date();
            const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
            const currentYear = currentDate.getFullYear();
            return `Month: ${currentMonth} • Year: ${currentYear}`;
    }
}

// Format report date for display
function formatReportDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format smart timestamp (time for same day, date for older)
function formatSmartTimestamp(dateString) {
    // Parse date string and handle timezone properly
    // Replace 'Z' or timezone info to treat as local time
    let localDateString = dateString.replace('Z', '').split('+')[0].split('-').slice(0, 3).join('-');
    if (dateString.includes('T')) {
        localDateString = dateString.split('T')[0];
    }
    
    // Create date from YYYY-MM-DD format to avoid timezone issues
    const [year, month, day] = localDateString.split('-').map(Number);
    const reportDate = new Date(year, month - 1, day);
    const today = new Date();
    
    // Check if same day
    const isSameDay = reportDate.getDate() === today.getDate() &&
                     reportDate.getMonth() === today.getMonth() &&
                     reportDate.getFullYear() === today.getFullYear();
    
    if (isSameDay) {
        // For same day, parse the timestamp
        // The database stores UTC, but we want to display it as if it's local time
        const fullDate = new Date(dateString);
        
        // Get the UTC time components
        const hours = fullDate.getUTCHours();
        const minutes = fullDate.getUTCMinutes();
        
        // Convert to 12-hour format
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = String(minutes).padStart(2, '0');
        
        return `${String(displayHours).padStart(2, '0')}:${displayMinutes} ${period}`;
    } else {
        // Show date for different day
        return reportDate.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    }
}

// Show report history for a specific type
function showReportHistory(reportType) {
    console.log('Showing report history for:', reportType);
    
    // Update the filter dropdown to show the selected type
    const filterSelect = document.getElementById('reportHistoryFilter');
    if (filterSelect) {
        filterSelect.value = reportType;
    }
    
    // Filter the history sections
    filterReportHistory(reportType);
}

// Hide report history for a specific type
function hideReportHistory(reportType) {
    const historySection = document.getElementById(`${reportType}ReportHistory`);
    if (historySection) {
        historySection.style.display = 'none';
    }
}

// Hide all report histories
function hideAllReportHistories() {
    // Since all histories are now visible by default, this function is no longer needed
    // but kept for compatibility with existing code
    console.log('All report histories remain visible by default');
}

// Show report configuration section (called when "Take Action" is clicked)
function showReportConfiguration() {
    // Hide sent reports section
    const sentReportsSection = document.querySelector('.sent-reports-section');
    if (sentReportsSection) {
        sentReportsSection.style.display = 'none';
    }
    
    // Hide date range filter
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    if (dateRangeFilter) {
        dateRangeFilter.style.display = 'none';
    }
    
    // Show back button
    const backContainer = document.getElementById('backToHistoryContainer');
    if (backContainer) backContainer.style.display = 'block';
    
    // Show report configuration section
    const reportConfig = document.querySelector('.report-config');
    if (reportConfig) {
        reportConfig.style.display = 'block';
        // Scroll to the top of the page
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Hide report configuration and show history (for returning to history view)
function hideReportConfiguration() {
    // Show sent reports section
    const sentReportsSection = document.querySelector('.sent-reports-section');
    if (sentReportsSection) {
        sentReportsSection.style.display = 'block';
    }
    
    // Show date range filter
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    if (dateRangeFilter) {
        dateRangeFilter.style.display = 'flex';
    }
    
    // Hide back button
    const backContainer = document.getElementById('backToHistoryContainer');
    if (backContainer) backContainer.style.display = 'none';
    
    // Hide report configuration section
    const reportConfig = document.querySelector('.report-config');
    if (reportConfig) {
        reportConfig.style.display = 'none';
    }
    
    // Hide generate report button and canvas
    hideGenerateReportSection();
    
    // Unlock configuration and remove locked notes
    unlockConfiguration();
    
    // Reset filter to show all reports
    filterSentReports('all');
}

// Unlock configuration and remove locked notes
function unlockConfiguration() {
    try {
        // Reset locked state
        window.isPrefillLocked = false;
        
        // Remove locked notes from all configuration headers
        const reportTypes = ['savings', 'disbursement', 'member', 'branch'];
        reportTypes.forEach(type => {
            const configSection = document.getElementById(type + 'Config');
            if (configSection) {
                const header = configSection.querySelector('.config-header h3');
                if (header) {
                    const lockedNote = header.querySelector('.locked-note');
                    if (lockedNote) {
                        lockedNote.remove();
                    }
                }
            }
        });
        
        // Re-enable all form elements
        const allInputs = document.querySelectorAll('input, select, button');
        allInputs.forEach(input => {
            input.disabled = false;
            input.style.opacity = '';
            input.style.cursor = '';
        });
        
        // Re-enable report type buttons
        document.querySelectorAll('.report-type-btn').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.cursor = '';
        });
        
    } catch (error) {
        console.error('Error unlocking configuration:', error);
    }
}

// Hide generate report section (button and canvas)
function hideGenerateReportSection() {
    // Hide generate button
    const generateSection = document.querySelector('.generate-section');
    if (generateSection) {
        generateSection.style.display = 'none';
    }
    
    // Hide report canvas
    const reportCanvas = document.getElementById('reportCanvas');
    if (reportCanvas) {
        reportCanvas.style.display = 'none';
    }
    
    // Hide send finance section
    const sendFinanceSection = document.getElementById('sendFinanceSection');
    if (sendFinanceSection) {
        sendFinanceSection.style.display = 'none';
    }
    
    // Hide AI recommendation section
    const aiRecommendationSection = document.getElementById('aiRecommendationSection');
    if (aiRecommendationSection) {
        aiRecommendationSection.style.display = 'none';
    }
    
    // Hide AI recommendation controls
    const aiRecommendationControls = document.getElementById('aiRecommendationControls');
    if (aiRecommendationControls) {
        aiRecommendationControls.style.display = 'none';
    }
}

// Make function globally available
window.showReportConfiguration = showReportConfiguration;

