// Marketing Clerk Reports System (Swapped - now uses Finance Officer functionality)
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize shared utilities (includes user header)
    if (typeof SharedUtils !== 'undefined') {
        const sharedUtils = new SharedUtils();
        sharedUtils.init();
    }
    
    await initializeFOReports();
    initializeMemberSearchAutocomplete();
});

// Initialize Marketing Clerk reports system
async function initializeFOReports() {
    setupReportTypeDropdown();
    
    // Populate branch checkboxes dynamically before setting up branch selection
    await populateBranchCheckboxes();
    
    setupBranchSelection();
    setupTransactionTypeButtons();
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 1000);
    
    // Initialize branch-specific reports
    initializeBranchSpecificReports();
    
    // Initialize report histories
    initializeReportHistories();
    
    // Load received reports from Finance Officer
    loadReceivedReports();
    
    // Show received reports section by default (main page)
    showReceivedReportsSection();
    
    // Check for report highlighting from notification
    checkForReportHighlight();
    
    // Initialize date range filter
    setupDateRangeFilter();
    
    // Clear any saved selection on initial load to ensure no auto-check
    localStorage.removeItem('currentReportType');
}

// Member Search Autocomplete Functionality
let memberSearchInitialized = false;
let isProgrammaticSelection = false; // Flag to track programmatic value setting
function initializeMemberSearchAutocomplete() {
    if (memberSearchInitialized) return; // Prevent duplicate initialization
    memberSearchInitialized = true;
    
    const memberSearchInput = document.getElementById('memberSearch');
    if (!memberSearchInput) return;
    
    // Create autocomplete container
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.id = 'memberAutocompleteContainer';
    autocompleteContainer.className = 'member-autocomplete-container';
    memberSearchInput.parentNode.appendChild(autocompleteContainer);
    
    // Debounced search function
    const debouncedSearch = debounce(async (searchTerm) => {
        // Don't show suggestions if we just programmatically selected a member
        if (isProgrammaticSelection) {
            isProgrammaticSelection = false;
            return;
        }

        if (!searchTerm || searchTerm.trim().length < 2) {
            hideMemberSuggestions();
                return;
        }
        
        try {
            const members = await searchMembers(searchTerm);
            // Check if there's an exact match with the current input value
            const inputValue = memberSearchInput.value.trim().toLowerCase();
            const exactMatch = members.find(m => m.toLowerCase() === inputValue);
            
            // If there's only one result and it exactly matches what's in the input field, don't show suggestions
            // This prevents showing dropdown when user has already selected/typed the exact member name
            if (exactMatch && members.length === 1 && inputValue === exactMatch.toLowerCase()) {
                hideMemberSuggestions();
                return;
            }
            
            showMemberSuggestions(members);
    } catch (error) {
            console.error('Error searching members:', error);
            hideMemberSuggestions();
        }
    }, 300);
    
    // Handle input changes
    memberSearchInput.addEventListener('input', function(e) {
        // Skip if this was a programmatic selection
        if (isProgrammaticSelection) {
            isProgrammaticSelection = false;
            return;
        }
        const searchTerm = e.target.value.trim();
        debouncedSearch(searchTerm);
    });
    
    // Handle focus - show recent suggestions if any
    memberSearchInput.addEventListener('focus', function(e) {
        // Don't show suggestions if we just programmatically selected a member
        if (isProgrammaticSelection) {
            isProgrammaticSelection = false;
            return;
        }
        const searchTerm = e.target.value.trim();
        if (searchTerm.length >= 2) {
            debouncedSearch(searchTerm);
        }
    });
    
    // Close autocomplete when clicking outside
    document.addEventListener('click', function(e) {
        if (!memberSearchInput.contains(e.target) && 
            !autocompleteContainer.contains(e.target)) {
            hideMemberSuggestions();
        }
    });
    
    // Handle escape key to close suggestions
    memberSearchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideMemberSuggestions();
        }
    });
}

// Debounce function for search optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Fetch member suggestions from API
async function searchMembers(searchTerm) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        throw new Error('Authentication required');
    }
    
    try {
        const response = await fetch(`/api/auth/transactions/search/payee/${encodeURIComponent(searchTerm)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to search members');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            // Extract unique member names from transactions
            const uniqueMembers = [...new Set(result.data.map(t => t.payee))];
            return uniqueMembers.slice(0, 10); // Limit to 10 suggestions
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching member suggestions:', error);
        return [];
    }
}

// Display autocomplete dropdown
function showMemberSuggestions(members) {
    const container = document.getElementById('memberAutocompleteContainer');
    if (!container) return;
    
    if (members.length === 0) {
        container.innerHTML = `
            <div class="autocomplete-suggestion no-results">
                <i class="fas fa-search"></i>
                <span>No members found</span>
            </div>
        `;
        container.style.display = 'block';
        return;
    }
    
    container.innerHTML = members.map(member => `
        <div class="autocomplete-suggestion" onclick="selectMember('${member.replace(/'/g, "\\'")}')">
            <i class="fas fa-user"></i>
            <span>${member}</span>
        </div>
    `).join('');
    
    container.style.display = 'block';
}

// Hide autocomplete suggestions
function hideMemberSuggestions() {
    const container = document.getElementById('memberAutocompleteContainer');
    if (container) {
        container.style.display = 'none';
    }
}

// Handle member selection
function selectMember(memberName) {
    const memberSearchInput = document.getElementById('memberSearch');
    if (memberSearchInput) {
        // Set flag to prevent showing suggestions after programmatic selection
        isProgrammaticSelection = true;
        memberSearchInput.value = memberName;
        hideMemberSuggestions();
        // Trigger input event to validate (but suggestions won't show due to flag)
        memberSearchInput.dispatchEvent(new Event('input'));
    }
}

// Validate member exists before report request
async function validateMemberExists(memberName) {
    if (!memberName || memberName.trim().length < 2) {
        return false;
    }
    
    try {
        const members = await searchMembers(memberName.trim());
        // Check if exact match exists
        return members.some(member => 
            member.toLowerCase() === memberName.trim().toLowerCase()
        );
    } catch (error) {
        console.error('Error validating member:', error);
        return false;
    }
}

// Initialize branch-specific reports
function initializeBranchSpecificReports() {
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    const userBranchLocation = localStorage.getItem('user_branch_location');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Update reports header based on branch
    updateReportsHeader(userBranchName, isMainBranchUser);
    
    // Show branch indicators for ALL users
    showBranchIndicators();
    
    // For non-main branch users, hide branch-related options
    if (!isMainBranchUser && userBranchName) {
        // Hide branch selection for branch-specific users
        hideBranchSelection();
        
        // Hide branch reports option for non-main branch users
            hideBranchReportsOption();
        
        // Filter reports data based on user's branch
        filterReportsForBranch(userBranchId, userBranchName);
    }
}

// Update reports header based on branch
function updateReportsHeader(branchName, isMainBranch) {
    const headerTitle = document.querySelector('.reports-header h1');
    if (headerTitle) {
        headerTitle.textContent = 'Financial Reports';
    }
}

// Filter reports for specific branch
function filterReportsForBranch(branchId, branchName) {
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
    // Hide the branch reports option from dropdown
    const branchOption = document.querySelector('#reportTypeDropdown option[value="branch"]');
    if (branchOption) {
        branchOption.style.display = 'none';
    }
    
    // Hide the branch filter button in received reports section
    const branchFilterBtn = document.querySelector('.filter-btn[data-filter="branch"]');
    if (branchFilterBtn) {
        branchFilterBtn.style.display = 'none';
    }
}

// Setup report type dropdown selector
function setupReportTypeDropdown() {
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('reportTypeMenu');
        const btn = document.getElementById('reportTypeBtn');
        
        if (menu && btn && !menu.contains(event.target) && !btn.contains(event.target)) {
            menu.classList.remove('show');
        }
    });
}

// Toggle report type menu
function toggleReportTypeMenu() {
    const menu = document.getElementById('reportTypeMenu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

// Select report type
function selectReportType(type) {
    const menu = document.getElementById('reportTypeMenu');
    const btnText = document.getElementById('reportTypeText');
    
    if (menu) menu.classList.remove('show');
    
    // Save selection to localStorage
    localStorage.setItem('currentReportType', type);
    
    // Hide all checkmarks first
    const allOptions = document.querySelectorAll('.menu-option');
    allOptions.forEach(option => {
        const checkIcon = option.querySelector('.check-icon');
        if (checkIcon) checkIcon.style.display = 'none';
    });
    
    // Show checkmark only if it's NOT Request Report (empty type)
    if (type !== '') {
        const selectedOption = document.querySelector(`[data-type="${type}"]`);
        if (selectedOption) {
            const checkIcon = selectedOption.querySelector('.check-icon');
            if (checkIcon) checkIcon.style.display = 'block';
        }
    }
    
    // Update button text
    const types = {
        '': 'Request Report',
        'savings': 'Savings Report',
        'disbursement': 'Disbursement Report',
        'member': 'Member Report',
        'branch': 'Branch Report'
    };
    
    if (btnText) btnText.textContent = types[type] || 'Request Report';
    
    if (type === '') {
        // Show initial state
        showInitialState();
        hideAllConfigurations();
        hideAllReportHistories();
            hideSendFinanceSection();
        
        // Show received reports section when on main page
        showReceivedReportsSection();
    } else {
        // Show corresponding configuration section
        showConfigurationSection(type);
        
        // Hide send finance section (not applicable for MC request flow)
        hideSendFinanceSection();
    }
}

// Make functions globally available
window.toggleReportTypeMenu = toggleReportTypeMenu;
window.selectReportType = selectReportType;

// Show initial state
function showInitialState() {
    const initialState = document.getElementById('initialState');
    if (initialState) {
        initialState.style.display = 'flex';
    }
    
    // Show date range picker on main page
    showDateRangeFilter();
}

// Hide all configuration sections
function hideAllConfigurations() {
    const configSections = document.querySelectorAll('.config-section');
    configSections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Also remove any existing generate sections
    const existingSections = document.querySelectorAll('.generate-section');
    existingSections.forEach(section => section.remove());
}

// Show configuration section based on report type
function showConfigurationSection(reportType) {
    // Hide initial state
    const initialState = document.getElementById('initialState');
    if (initialState) {
        initialState.style.display = 'none';
    }
    
    // Hide all configuration sections
    hideAllConfigurations();
    
    // Show selected configuration section
    const selectedSection = document.getElementById(reportType + 'Config');
    if (selectedSection) {
        selectedSection.classList.add('active');
        
        // Add request button after the configuration (only if not already exists)
        addReportCanvas();
    }
    
    // Hide date range picker when in configuration mode
    hideDateRangeFilter();
    
    // Hide received reports section when in configuration mode
    hideReceivedReportsSection();
}

// Add request button (no canvas)
function addReportCanvas() {
    // Remove any existing generate sections first
    const existingSections = document.querySelectorAll('.generate-section');
    existingSections.forEach(section => section.remove());
    
        const reportConfig = document.querySelector('.report-config');
    if (reportConfig) {
        // Create request section
        const requestSection = document.createElement('div');
        requestSection.className = 'generate-section';
        requestSection.innerHTML = `
            <button class="generate-btn" onclick="requestReport()">
                <i class="fas fa-paper-plane"></i>
                <span>Request Report from Finance Officer</span>
                </button>
        `;

        // Append after configuration block
        if (reportConfig.parentNode) {
            reportConfig.parentNode.insertBefore(requestSection, reportConfig.nextSibling);
        }
    }
}

// Populate branch checkboxes dynamically from database
async function populateBranchCheckboxes() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('No access token found for populating branch checkboxes');
            return;
        }

        // Fetch branches from API
        const response = await fetch('/api/auth/branches', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch branches:', response.status);
            return;
        }

        const result = await response.json();
        if (!result.success || !result.branches || result.branches.length === 0) {
            console.log('No branches found');
            return;
        }

        // Find all branch-grid containers (there may be multiple in different config sections)
        const branchGrids = document.querySelectorAll('.branch-grid');
        
        if (branchGrids.length === 0) {
            console.log('No branch-grid containers found');
            return;
        }

        // Generate checkbox HTML for each branch
        const branchCheckboxesHTML = result.branches.map(branch => {
            // Determine display name: Main Branch for id=1, otherwise Branch [id]
            const displayName = branch.id === 1 ? 'Main Branch' : `Branch ${branch.id}`;
            const branchValue = `branch${branch.id}`;
            
            return `
                <label class="branch-checkbox">
                    <input type="checkbox" name="branchSelection" value="${branchValue}">
                    <span class="checkmark">
                        <span class="branch-name">${displayName}</span>
                        <span class="branch-location">${branch.location}</span>
                    </span>
                </label>
            `;
        }).join('');

        // Populate all branch-grid containers
        branchGrids.forEach(grid => {
            grid.innerHTML = branchCheckboxesHTML;
        });

        console.log(`Populated ${result.branches.length} branch checkboxes`);
    } catch (error) {
        console.error('Error populating branch checkboxes:', error);
    }
}

// Setup branch selection functionality (only for main branch users)
function setupBranchSelection() {
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Only setup branch selection for main branch users
    if (isMainBranchUser) {
        // Use event delegation since checkboxes are dynamically populated
        document.addEventListener('change', function(e) {
            if (e.target && e.target.name === 'branchSelection' && e.target.type === 'checkbox') {
                console.log('Branch selection changed for main branch user');
            }
        });
    }
}

// Setup transaction type buttons
function setupTransactionTypeButtons() {
    const typeButtons = document.querySelectorAll('.type-btn');
    
    typeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
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

// Generate report based on current configuration
function generateReport() {
    try {
        const reportTypeDropdown = document.getElementById('reportTypeDropdown');
        if (!reportTypeDropdown || !reportTypeDropdown.value) {
            showReportTypeDialog();
            return;
        }

        const reportType = reportTypeDropdown.value;

        // Validate configuration
        if (!validateConfiguration(reportType)) {
            return;
        }

        // Generate report data
        const reportData = generateReportData(reportType);
        if (!reportData) {
            showMessage('Failed to generate report data.', 'error');
            return;
        }

        // Display report
        displayReport(reportData);
        
        // Log report generation
        if (typeof AuditLogger !== 'undefined') {
            const reportConfig = collectReportConfig(reportType);
            AuditLogger.logReportGeneration(reportType, reportConfig);
        }

        // Show send to finance section
        showSendFinanceSection();
        
        showSuccessDialog('Report generated successfully!');
    } catch (error) {
        console.error('Error generating report:', error);
        showMessage('An error occurred while generating the report.', 'error');
    }
}

// Validate configuration based on report type
async function validateConfiguration(reportType) {
    switch (reportType) {
        case 'savings':
        case 'disbursement':
            return validateSavingsDisbursementConfig(reportType);
        case 'member':
            return await validateMemberConfig();
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
async function validateMemberConfig() {
    const memberSearch = document.getElementById('memberSearch').value.trim();
    if (!memberSearch) {
        showValidationDialog('Please enter a member name or ID.');
        return false;
    }
    
    // Validate that member exists in the database
    const memberExists = await validateMemberExists(memberSearch);
    if (!memberExists) {
        showValidationDialog('The member name you entered does not exist. Please search for a valid member name.');
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
        showValidationDialog('Please select at least one branch.');
        return false;
    }
    
    const activeTypeBtns = document.querySelectorAll('#branchConfig .type-btn.active');
    if (activeTypeBtns.length === 0) {
        showValidationDialog('Please select at least one transaction type (Savings or Disbursement).');
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
    const activeTypeBtn = document.querySelector('#memberConfig .type-btn.active');
    const transactionType = activeTypeBtn ? activeTypeBtn.getAttribute('data-type') : 'savings';
    
    return {
        type: 'Member Report',
        member: memberSearch,
        transactionType: transactionType,
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
                    <div class="stat-value">0</div>
                    <div class="stat-label">Branches</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${getMonthName(reportData.period.split(' ')[0])}</div>
                    <div class="stat-label">Month</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">₱0</div>
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
        
    // Show empty data since no database is connected
    html += `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: #9ca3af;">
                        <i class="fas fa-database" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        No data available - Database not connected
                    </td>
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
    
    let html = `
        <div class="report-content">
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${reportData.member}</div>
                    <div class="stat-label">Member</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">0</div>
                    <div class="stat-label">Total Transactions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">₱0</div>
                    <div class="stat-label">Total Amount</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${reportData.transactionType}</div>
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
                            <th>Reference</th>
                            <th>Amount</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
    // Show empty data since no database is connected
        html += `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 40px; color: #9ca3af;">
                        <i class="fas fa-database" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        No data available - Database not connected
                    </td>
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
                    <div class="stat-value">${reportData.branch}</div>
                    <div class="stat-label">Branch</div>
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
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 40px; color: #9ca3af;">
                                    <i class="fas fa-database" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                                No data available - Database not connected
                                </td>
                            </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    return html;
}

// Clear report canvas
// No report canvas for Finance Officer page

// Show send finance section
// No-op placeholders retained for compatibility
function showSendFinanceSection() {}
function hideSendFinanceSection() {}

// New: Request report handler
async function requestReport() {
    const reportType = localStorage.getItem('currentReportType');
    
    if (!reportType || reportType === '') {
        showReportTypeDialog();
        return;
    }

    if (!(await validateConfiguration(reportType))) {
        return;
    }

    // Build request payload
    const branchId = localStorage.getItem('user_branch_id');
    const payload = {
        report_type: reportType,
        report_config: collectReportConfig(reportType),
        fo_notes: null,
        priority: 'normal',
        due_at: null
    };

        const token = localStorage.getItem('access_token');
        if (!token) {
            showMessage('You are not authenticated.', 'error');
            return;
        }

    fetch('/api/auth/report-requests', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        body: JSON.stringify(payload)
    }).then(async (res) => {
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Failed to send report request');
        }
        const result = await res.json();
        
        // Backend already logs request_report via auditLog middleware, so no need to log here
        
        return result;
    }).then(() => {
        showSuccessDialog('Report request sent to Finance Officer!');
        
        // Clear report configuration and return to history view
        // 1. Clear the specific report type configuration
        try {
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
            }
        } catch (error) {
            console.error('Error clearing configuration:', error);
        }
        
        // 2. Hide all configuration sections
        hideAllConfigurations();
        
        // 3. Reset report type selection to default (Request Report)
        localStorage.setItem('currentReportType', '');
        const btnText = document.getElementById('reportTypeText');
        if (btnText) btnText.textContent = 'Request Report';
        
        // Hide all checkmarks
        const allOptions = document.querySelectorAll('.menu-option');
        allOptions.forEach(option => {
            const checkIcon = option.querySelector('.check-icon');
            if (checkIcon) checkIcon.style.display = 'none';
        });
        
        // 4. Show initial state
        showInitialState();
        
        // 5. Show received reports section (history view)
        showReceivedReportsSection();
        
        // 6. Reload received reports to show updated history
        loadReceivedReports();
        
    }).catch((err) => {
        console.error('Report request error:', err);
        showMessage('Failed to send report request.', 'error');
    });
}

// Collect the current configuration for selected report type
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

// Clear configuration based on report type
function clearConfiguration(reportType) {
    try {
        if (!reportType) {
            showMessage('Invalid report type for clearing.', 'error');
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
        
        // Clear report canvas and hide send finance section
        clearReportCanvas();
    hideSendFinanceSection();
        
        showSuccessDialog('Configuration cleared successfully!');
    } catch (error) {
        console.error('Error clearing configuration:', error);
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
function sendToFinanceOfficer() {
    const reportTypeDropdown = document.getElementById('reportTypeDropdown');
    if (!reportTypeDropdown || !reportTypeDropdown.value) {
        showMessage('Please generate a report first.', 'error');
        return;
    }
    
    const reportType = reportTypeDropdown.value;
    const reportData = generateReportData(reportType);
    
    if (!reportData) {
        showMessage('No report data available to send.', 'error');
        return;
    }
    
    // MC uses request flow, not send flow - this function should not be called
    // Keeping for compatibility but it does nothing
    console.warn('sendToFinanceOfficer called but MC uses request flow');
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

// Format smart timestamp - shows time if same day, date if different day
// Properly handles UTC timestamps from database and converts to local time
function formatSmartTimestamp(dateString) {
    if (!dateString) return 'N/A';
    
    // Parse the UTC timestamp from database
    // Ensure it's treated as UTC by appending 'Z' if not present
    let utcDateString = dateString;
    if (!utcDateString.endsWith('Z') && !utcDateString.includes('+') && !utcDateString.includes('-', 10)) {
        // If no timezone info, assume it's UTC and append 'Z'
        if (utcDateString.includes('T')) {
            utcDateString = utcDateString.split('.')[0] + 'Z'; // Remove milliseconds if present
        }
    }
    
    // Create date object - JavaScript will automatically convert UTC to local time
    const fullDate = new Date(utcDateString);
    
    // Check if date is valid
    if (isNaN(fullDate.getTime())) {
        console.error('Invalid date string:', dateString);
        return 'N/A';
    }
    
    // Get local date components for comparison
    const today = new Date();
    const reportDate = new Date(fullDate.getFullYear(), fullDate.getMonth(), fullDate.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Check if same day (using local dates)
    const isSameDay = reportDate.getTime() === todayDate.getTime();
    
    if (isSameDay) {
        // For same day, show local time (not UTC)
        // Use local time methods to get the correct time in user's timezone
        const hours = fullDate.getHours(); // Local hours, not UTC
        const minutes = fullDate.getMinutes(); // Local minutes, not UTC
        
        // Convert to 12-hour format
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = String(minutes).padStart(2, '0');
        
        return `${String(displayHours).padStart(2, '0')}:${displayMinutes} ${period}`;
    } else {
        // Show date for different day (using local date)
        return fullDate.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    }
}

// Generate report details in format "Month: January • Year: 2025"
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

// Generate clean filename from report title (for downloads)
function generateReportFileName(reportType, config, createdAt) {
    // Parse date string and handle timezone properly to avoid day shift
    let localDateString = createdAt;
    if (createdAt && createdAt.includes('T')) {
        localDateString = createdAt.split('T')[0];
    }
    
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
    
    let fileName = '';
    
    switch (reportType) {
        case 'savings': {
            const month = parsedConfig.month || new Date().getMonth() + 1;
            const year = parsedConfig.year || new Date().getFullYear();
            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
            fileName = `Savings Report – ${monthName} ${year}`;
            break;
        }
        case 'disbursement': {
            const month = parsedConfig.month || new Date().getMonth() + 1;
            const year = parsedConfig.year || new Date().getFullYear();
            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
            fileName = `Disbursement Report – ${monthName} ${year}`;
            break;
        }
        case 'member': {
            let memberName = parsedConfig.member || 
                           parsedConfig.payee ||
                           parsedConfig.memberName ||
                           parsedConfig.name ||
                           'Member';
            fileName = `Member Report - ${memberName}`;
            break;
        }
        case 'branch': {
            let branchCount = 0;
            if (parsedConfig && parsedConfig.branches) {
                branchCount = parsedConfig.branches.length;
            } else if (parsedConfig && parsedConfig.transactionTypes) {
                branchCount = parsedConfig.transactionTypes.length;
            } else {
                branchCount = 1;
            }
            const branchText = branchCount === 1 ? '1 Branch' : `${branchCount} Branches`;
            fileName = `Branch Report – ${branchText}`;
            break;
        }
        default:
            fileName = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
    }
    
    // Sanitize filename: remove invalid characters and replace with underscores
    fileName = fileName.replace(/[<>:"/\\|?*]/g, '_');
    // Replace multiple spaces with single space and trim
    fileName = fileName.replace(/\s+/g, ' ').trim();
    // Remove multiple consecutive underscores
    fileName = fileName.replace(/_+/g, '_');
    
    return fileName + '.pdf';
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
                // Fallback to transaction types count
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
function initializeReportHistories() {
    // Load existing report histories from localStorage
    loadReportHistories();
}

// Load report histories for all report types
function loadReportHistories() {
    const reportTypes = ['savings', 'disbursement', 'member', 'branch'];
    
    reportTypes.forEach(type => {
        const history = getReportHistory(type);
        displayReportHistory(type, history);
    });
}

// Get report history for a specific type
function getReportHistory(reportType) {
    const key = `reportHistory_${reportType}`;
    const history = localStorage.getItem(key);
    return history ? JSON.parse(history) : [];
}

// Save report history for a specific type
function saveReportHistory(reportType, reportData) {
    const key = `reportHistory_${reportType}`;
    const history = getReportHistory(reportType);
    
    const newReport = {
        id: Date.now(),
        title: generateReportTitle(reportType, reportData),
        details: generateReportDetails(reportType, reportData),
        date: new Date().toISOString(),
        status: 'sent',
        type: reportType
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
                    <div class="history-date">${formatReportDate(report.date)}</div>
                    <div class="history-status ${report.status}">${report.status}</div>
                </div>
            </div>
        `).join('');
    }
}


// Generate report details based on type and data
function generateReportDetails(reportType, data) {
    const details = [];
    
    switch (reportType) {
        case 'savings':
        case 'disbursement':
            if (data.branches && data.branches.length > 0) {
                details.push(`${data.branches.length} branch(es) selected`);
            }
            if (data.month) {
                details.push(`Month: ${getMonthName(data.month)}`);
            }
            if (data.year) {
                details.push(`Year: ${data.year}`);
            }
            break;
        case 'member':
            if (data.transactionType) {
                details.push(`Transaction Type: ${data.transactionType}`);
            }
            if (data.memberName) {
                details.push(`Member: ${data.memberName}`);
            }
            break;
        case 'branch':
            if (data.branchName) {
                details.push(`Branch: ${data.branchName}`);
            }
            if (data.transactionTypes && data.transactionTypes.length > 0) {
                details.push(`Types: ${data.transactionTypes.join(', ')}`);
            }
            break;
    }
    
    return details.join(' • ') || 'Report generated';
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

// Show report history for a specific type (not used in MC request flow, but kept for compatibility)
function showReportHistory(reportType) {
    // MC's page doesn't have report history sections (it uses request flow, not send flow)
    // This function is kept for compatibility but does nothing
    const historySection = document.getElementById(`${reportType}ReportHistory`);
    if (historySection) {
        historySection.style.display = 'block';
    }
    // Silently ignore if not found (expected for MC's request-based page)
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
    const reportTypes = ['savings', 'disbursement', 'member', 'branch'];
    console.log('Hiding all report histories');
    reportTypes.forEach(type => {
        console.log('Hiding history for:', type);
        hideReportHistory(type);
    });
}

// Show received reports section
function showReceivedReportsSection() {
    const receivedReportsSection = document.querySelector('.received-reports-section');
    if (receivedReportsSection) {
        receivedReportsSection.style.display = 'block';
        console.log('Showing received reports section');
    }
}

// Hide received reports section
function hideReceivedReportsSection() {
    const receivedReportsSection = document.querySelector('.received-reports-section');
    if (receivedReportsSection) {
        receivedReportsSection.style.display = 'none';
        console.log('Hiding received reports section');
    }
}

// Show date range filter
function showDateRangeFilter() {
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    if (dateRangeFilter) {
        dateRangeFilter.style.display = 'flex';
        console.log('Showing date range filter');
    }
    }
    
    // Hide date range filter
function hideDateRangeFilter() {
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    if (dateRangeFilter) {
        dateRangeFilter.style.display = 'none';
        console.log('Hiding date range filter');
    }
}

// Show minimalist dialog for report type selection
function showReportTypeDialog() {
    // Remove existing dialog if any
    const existingDialog = document.getElementById('reportTypeDialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    // Create dialog
    const dialog = document.createElement('div');
    dialog.id = 'reportTypeDialog';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    dialog.innerHTML = `
        <div style="
            background: white;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            max-width: 320px;
            width: 90%;
            transform: scale(0.95);
            opacity: 0;
            transition: all 0.2s ease;
        ">
            <div style="
                width: 40px;
                height: 40px;
                background: #fef3c7;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 12px;
            ">
                <i class="fas fa-exclamation-triangle" style="color: #f59e0b; font-size: 16px;"></i>
            </div>
            <h3 style="
                font-size: 16px;
                font-weight: 600;
                color: #111827;
                margin: 0 0 8px 0;
            ">Select Report Type</h3>
            <p style="
                font-size: 13px;
                color: #6b7280;
                margin: 0 0 20px 0;
                line-height: 1.4;
            ">Please select a report type first.</p>
            <button onclick="closeReportTypeDialog()" style="
                background: #0D5B11;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 20px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='#0a4a0e'" onmouseout="this.style.background='#0D5B11'">
                OK
            </button>
        </div>
    `;

    document.body.appendChild(dialog);

    // Animate in
    setTimeout(() => {
        const content = dialog.querySelector('div');
        content.style.transform = 'scale(1)';
        content.style.opacity = '1';
    }, 10);
}

// Close report type dialog
function closeReportTypeDialog() {
    const dialog = document.getElementById('reportTypeDialog');
    if (dialog) {
        const content = dialog.querySelector('div');
        content.style.transform = 'scale(0.95)';
        content.style.opacity = '0';
        
        setTimeout(() => {
            dialog.remove();
        }, 300);
    }
}

// Show minimalist validation dialog
function showValidationDialog(message) {
    // Remove existing dialog if any
    const existingDialog = document.getElementById('validationDialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    // Create dialog
    const dialog = document.createElement('div');
    dialog.id = 'validationDialog';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    dialog.innerHTML = `
        <div style="
            background: white;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            max-width: 320px;
            width: 90%;
            transform: scale(0.95);
            opacity: 0;
            transition: all 0.2s ease;
        ">
            <div style="
                width: 40px;
                height: 40px;
                background: #fef2f2;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 12px;
            ">
                <i class="fas fa-exclamation-circle" style="color: #ef4444; font-size: 16px;"></i>
            </div>
            <h3 style="
                font-size: 16px;
                font-weight: 600;
                color: #111827;
                margin: 0 0 8px 0;
            ">Validation Required</h3>
            <p style="
                font-size: 13px;
                color: #6b7280;
                margin: 0 0 20px 0;
                line-height: 1.4;
            ">${message}</p>
            <button onclick="closeValidationDialog()" style="
                background: #0D5B11;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 20px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='#0a4a0e'" onmouseout="this.style.background='#0D5B11'">
                OK
            </button>
        </div>
    `;

    document.body.appendChild(dialog);

    // Animate in
    setTimeout(() => {
        const content = dialog.querySelector('div');
        content.style.transform = 'scale(1)';
        content.style.opacity = '1';
    }, 10);
}

// Close validation dialog
function closeValidationDialog() {
    const dialog = document.getElementById('validationDialog');
    if (dialog) {
        const content = dialog.querySelector('div');
        content.style.transform = 'scale(0.95)';
        content.style.opacity = '0';
        
        setTimeout(() => {
            dialog.remove();
        }, 300);
    }
}

// Show minimalist success dialog
function showSuccessDialog(message) {
    // Remove existing dialog if any
    const existingDialog = document.getElementById('successDialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    // Create dialog
    const dialog = document.createElement('div');
    dialog.id = 'successDialog';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    dialog.innerHTML = `
        <div style="
            background: white;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            max-width: 320px;
            width: 90%;
            transform: scale(0.95);
            opacity: 0;
            transition: all 0.2s ease;
        ">
            <div style="
                width: 40px;
                height: 40px;
                background: #f0fdf4;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 12px;
            ">
                <i class="fas fa-check-circle" style="color: #0D5B11; font-size: 16px;"></i>
            </div>
            <h3 style="
                font-size: 16px;
                font-weight: 600;
                color: #111827;
                margin: 0 0 8px 0;
            ">Success</h3>
            <p style="
                font-size: 13px;
                color: #6b7280;
                margin: 0 0 20px 0;
                line-height: 1.4;
            ">${message}</p>
            <button onclick="closeSuccessDialog()" style="
                background: #0D5B11;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 20px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='#0a4a0e'" onmouseout="this.style.background='#0D5B11'">
                OK
            </button>
        </div>
    `;

    document.body.appendChild(dialog);

    // Animate in
    setTimeout(() => {
        const content = dialog.querySelector('div');
        content.style.transform = 'scale(1)';
        content.style.opacity = '1';
    }, 10);
}

// Close success dialog
function closeSuccessDialog() {
    const dialog = document.getElementById('successDialog');
    if (dialog) {
        const content = dialog.querySelector('div');
        content.style.transform = 'scale(0.95)';
        content.style.opacity = '0';
        
        setTimeout(() => {
            dialog.remove();
        }, 300);
    }
}

// Load received reports from backend
async function loadReceivedReports() {
    try {
        const token = localStorage.getItem('access_token');
        
    const response = await fetch('/api/auth/generated-reports?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load reports: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
        
        if (result.data && result.data.reports) {
        displayReceivedReports(result.data.reports);
        } else {
            console.log('⚠️ No reports data in response');
            displayReceivedReports([]);
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        showMessage('Failed to load reports: ' + error.message, 'error');
    }
}

// Store all reports for filtering
let allReceivedReports = [];

// Display list of reports
function displayReceivedReports(reports) {
    const container = document.getElementById('receivedReportsContainer');
    if (!container) return;
    
    // Store all reports for filtering
    allReceivedReports = reports;
    
    // Always run through filter pipeline to ensure count updates before paint
    filterReceivedReports('all');
}

// Store current filter state
let currentFilterType = 'all';
let currentDateRange = { start: null, end: null };

// Filter received reports by type
function filterReceivedReports(filterType) {
    currentFilterType = filterType;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const filterButton = document.querySelector(`[data-filter="${filterType}"]`);
    if (filterButton) {
        filterButton.classList.add('active');
    }
    
    // Apply both type and date filters
    applyAllFilters();
}

// Apply all active filters (type + date)
function applyAllFilters() {
    const container = document.getElementById('receivedReportsContainer');
    if (!container) return;
    
    let filteredReports = [...allReceivedReports];
    
    // Apply type filter
    if (currentFilterType !== 'all') {
        filteredReports = filteredReports.filter(report => 
            report.report_type.toLowerCase() === currentFilterType.toLowerCase()
        );
    }
    
    // Apply date filter
    if (currentDateRange.start && currentDateRange.end) {
        const startDate = new Date(currentDateRange.start);
        const endDate = new Date(currentDateRange.end);
        
        filteredReports = filteredReports.filter(report => {
            // Parse report date properly to avoid timezone shift
            let localDateString = report.created_at;
            if (report.created_at.includes('T')) {
                localDateString = report.created_at.split('T')[0];
            }
            const [year, month, day] = localDateString.split('-').map(Number);
            const reportDate = new Date(year, month - 1, day);
            return reportDate >= startDate && reportDate <= endDate;
        });
    }
    
    // Display filtered results
    displayFilteredReports(filteredReports);
}

// Display filtered reports
function displayFilteredReports(reports) {
    const container = document.getElementById('receivedReportsContainer');
    if (!container) return;
    
    // Update count to match what is displayed
    const countEl = document.getElementById('reportCount');
    if (countEl) {
        const count = Array.isArray(reports) ? reports.length : 0;
        countEl.textContent = `${count} ${count === 1 ? 'Report' : 'Reports'}`;
        countEl.style.visibility = 'visible';
    }
    
    if (reports.length === 0) {
        let emptyMessage = 'No reports found';
        if (currentFilterType !== 'all') {
            emptyMessage = `No ${currentFilterType} reports found`;
        }
        if (currentDateRange.start && currentDateRange.end) {
            emptyMessage += ' in the selected date range';
        }
        
        container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
        return;
    }
    
    container.innerHTML = reports.map(report => {
        // Debug logging with detailed config inspection
        console.log('Generating title for report:', {
            id: report.id,
            type: report.report_type,
            configType: typeof report.config,
            configString: JSON.stringify(report.config),
            configKeys: report.config ? Object.keys(report.config) : []
        });
        
        // Generate dynamic report title
        const reportTitle = generateReportTitle(report.report_type, report.config, report.created_at);
        
        // Generate report details in format "Month: January • Year: 2025"
        const reportDetails = generateReportDetails(report.report_type, report.config);
        
        // Format smart timestamp
        const smartTimestamp = formatSmartTimestamp(report.created_at);
        
        return `
        <div class="history-item" data-report-id="${report.id}" data-report-date="${report.created_at}">
            <div class="report-actions">
                <button onclick="viewGeneratedReport('${report.id}')" class="btn-view">
                    <i class="fas fa-eye"></i> View
                </button>
                <button onclick="downloadReportPDF('${report.id}')" class="btn-download">
                    <i class="fas fa-download"></i> Download PDF
                </button>
            </div>
            <div class="history-item-content">
                <div class="history-info">
                    <div class="history-title">${reportTitle}</div>
                    <div class="history-details">${reportDetails}</div>
                </div>
                <div class="history-status-time">
                    <div class="history-status received">RECEIVED</div>
                    <div class="history-timestamp">${smartTimestamp}</div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// (Backend count fetch removed) Count now strictly reflects displayed items

// View specific report - make globally accessible
window.viewGeneratedReport = async function viewGeneratedReport(reportId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/auth/generated-reports/${reportId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load report');
        
        const result = await response.json();
        const report = result.data;
        
        // Log report view
        if (typeof AuditLogger !== 'undefined') {
            const source = report.status === 'sent' ? 'sent' : 'saved';
            AuditLogger.logReportView(reportId, report.report_type || 'unknown', source);
        }
        
        // Display report data
        displayReportContent(report);
        
        // Mark as viewed
        markReportAsViewed(reportId);
    } catch (error) {
        console.error('Error viewing report:', error);
        showMessage('Failed to load report', 'error');
    }
};

// Display report content in a modal (render PDF inline)
// Requirement: Must be in PDF format when viewed
let currentPdfObjectUrl = null;
async function displayReportContent(report) {
    // Create or update a modal to display the report PDF
    let modal = document.getElementById('reportViewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reportViewModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="reportModalTitle">Report</h2>
                    <span class="close" onclick="closeReportModal()">&times;</span>
                </div>
                <div class="modal-body" id="reportModalBody">
                    <iframe id="reportPdfFrame" title="Report PDF" style="width: 100%; height: calc(100vh - 200px); border: none;" src="about:blank"></iframe>
                </div>
                <div class="modal-footer">
                    <button id="openPdfNewTabBtn" class="btn-download">
                        <i class="fas fa-external-link-alt"></i> Open in New Tab
                    </button>
                    <button id="downloadPdfBtn" class="btn-download">
                        <i class="fas fa-download"></i> Download PDF
                    </button>
                    <button onclick="closeReportModal()" class="btn-close">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Update title
    const titleEl = document.getElementById('reportModalTitle');
    if (titleEl) {
        titleEl.textContent = `${report.report_type} Report`;
    }

    // Fetch PDF blob and display in iframe regardless of Content-Disposition
    try {
        const token = localStorage.getItem('access_token');
        const pdfRes = await fetch(`/api/auth/generated-reports/${report.id}/pdf`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!pdfRes.ok) throw new Error('Failed to load PDF');

        const pdfBlob = await pdfRes.blob();
        // Revoke prior object URL if any
        if (currentPdfObjectUrl) {
            try { URL.revokeObjectURL(currentPdfObjectUrl); } catch (_) {}
            currentPdfObjectUrl = null;
        }
        currentPdfObjectUrl = URL.createObjectURL(pdfBlob);
        const iframe = document.getElementById('reportPdfFrame');
        if (iframe) iframe.src = currentPdfObjectUrl;

        // Wire "Open in New Tab"
        const openBtn = document.getElementById('openPdfNewTabBtn');
        if (openBtn) {
            openBtn.onclick = () => {
                if (currentPdfObjectUrl) {
                    window.open(currentPdfObjectUrl, '_blank');
                }
            };
        }
        
        // Wire "Download PDF" button
        const downloadBtn = document.getElementById('downloadPdfBtn');
        if (downloadBtn) {
            downloadBtn.onclick = () => {
                if (window.downloadReportPDF) {
                    window.downloadReportPDF(report.id);
                } else {
                    downloadReportPDF(report.id);
                }
            };
        }
    } catch (err) {
        console.error('Error loading PDF for inline view:', err);
        const modalBody = document.getElementById('reportModalBody');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="padding: 16px;">
                    <p style="color: #b91c1c; font-weight: 600;">Failed to load PDF preview.</p>
                    <p>You can try downloading the report instead.</p>
                </div>
            `;
        }
    }

    modal.style.display = 'block';
}

// Close report modal - make globally accessible
window.closeReportModal = function closeReportModal() {
    const modal = document.getElementById('reportViewModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Revoke object URL to avoid memory leaks
    if (currentPdfObjectUrl) {
        try { URL.revokeObjectURL(currentPdfObjectUrl); } catch (_) {}
        currentPdfObjectUrl = null;
    }
};

// Download PDF - make globally accessible
window.downloadReportPDF = async function downloadReportPDF(reportId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/auth/generated-reports/${reportId}/pdf`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to download PDF');
        
        const blob = await response.blob();
        
        // Fetch report details for filename and logging
        let fileName = `report_${reportId}.pdf`; // Default fallback
        try {
            const reportRes = await fetch(`/api/auth/generated-reports/${reportId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (reportRes.ok) {
                const reportData = await reportRes.json();
                const reportInfo = reportData.data;
                if (reportInfo) {
                    const reportType = reportInfo.report_type || 'unknown';
                    const config = reportInfo.config || {};
                    const createdAt = reportInfo.created_at || new Date().toISOString();
                    
                    // Generate filename based on report title
                    fileName = generateReportFileName(reportType, config, createdAt);
                    
                    // Log report download
                    if (typeof AuditLogger !== 'undefined') {
                        AuditLogger.logReportDownload(reportId, reportType);
                    }
                }
            }
        } catch (err) {
            console.warn('Could not fetch report details for filename:', err);
            // Still try to log if AuditLogger is available
            if (typeof AuditLogger !== 'undefined') {
                try {
                    const reportRes = await fetch(`/api/auth/generated-reports/${reportId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (reportRes.ok) {
                        const reportData = await reportRes.json();
                        const reportType = reportData.data?.report_type || 'unknown';
                        AuditLogger.logReportDownload(reportId, reportType);
                    }
                } catch (logErr) {
                    console.warn('Could not fetch report type for logging:', logErr);
                }
            }
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading PDF:', error);
        showMessage('Failed to download PDF', 'error');
    }
};

// Mark report as viewed
async function markReportAsViewed(reportId) {
    try {
        const token = localStorage.getItem('access_token');
        await fetch(`/api/auth/generated-reports/${reportId}/viewed`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (error) {
        console.error('Error marking report as viewed:', error);
    }
}

// Check for report highlighting from notification
function checkForReportHighlight() {
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('reportId');
    
    if (reportId) {
        console.log('📌 Highlighting report:', reportId);
        
        // Wait for reports to load, then highlight
        setTimeout(() => {
            highlightReport(reportId);
            
            // Clear the URL parameter to prevent re-highlighting on refresh
            window.history.replaceState({}, document.title, 'reports.html');
        }, 1000);
    }
}

// Highlight a specific report in the received reports list
function highlightReport(reportId) {
    const reportItem = document.querySelector(`[data-report-id="${reportId}"]`);
    
    if (reportItem) {
        console.log('🎯 Found report item, highlighting...');
        
        // Scroll to the report item
        reportItem.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Add highlight effect
        reportItem.style.transition = 'all 0.3s ease';
        reportItem.style.backgroundColor = '#FEF3C7'; // Light yellow
        reportItem.style.border = '2px solid #F59E0B'; // Orange border
        reportItem.style.borderRadius = '8px';
        reportItem.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
        
        // Remove highlight after 5 seconds
        setTimeout(() => {
            reportItem.style.backgroundColor = '';
            reportItem.style.border = '';
            reportItem.style.borderRadius = '';
            reportItem.style.boxShadow = '';
        }, 5000);
        
        // Add a subtle pulse animation
        reportItem.style.animation = 'pulse 1s ease-in-out 3';
        
        // Add CSS for pulse animation if not already present
        if (!document.getElementById('highlight-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'highlight-animation-styles';
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        console.log('⚠️ Report item not found for ID:', reportId);
    }
}

// Date Range Filter Functions
function setupDateRangeFilter() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput && endDateInput) {
        // Set default date range (last 30 days) but don't apply filter automatically
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        endDateInput.value = today.toISOString().split('T')[0];
        
        // Don't apply initial filter - let all reports show by default
        // applyDateFilter();
    }
}

function applyDateFilter() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        // Clear date filter
        currentDateRange = { start: null, end: null };
        applyAllFilters();
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        // Invalid date range - swap dates silently
        document.getElementById('startDate').value = endDate;
        document.getElementById('endDate').value = startDate;
        currentDateRange = { start: endDate, end: startDate };
    } else {
        currentDateRange = { start: startDate, end: endDate };
    }
    
    // Apply all filters (type + date)
    applyAllFilters();
}

function clearDateFilter() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    
    // Clear date filter and apply all filters
    currentDateRange = { start: null, end: null };
    applyAllFilters();
}

// Old date filtering functions removed - now using integrated filtering system

// Old empty state functions removed - now handled in displayFilteredReports function
