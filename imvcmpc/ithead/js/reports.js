// IT Head Reports System
// IT Head can generate reports for themselves (no report request handling)
window.inConfigurationMode = false;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize shared utilities (includes user header)
    if (typeof SharedUtils !== 'undefined') {
        const sharedUtils = new SharedUtils();
        sharedUtils.init();
    }
    
    // Initialize reports system
    initializeReports().then(() => {
        // After initialization, initialize member search
        initializeMemberSearchAutocomplete();
    }).catch((error) => {
        console.error('Error initializing reports:', error);
        // Still try to initialize member search even if reports init fails
        initializeMemberSearchAutocomplete();
    });
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
        const previousValue = memberSearchInput.value;
        memberSearchInput.value = memberName;
        hideMemberSuggestions();
        
        // Clear report if member changed
        if (previousValue !== memberName && window.currentReportType === 'member' && window.currentReportData) {
            handleMemberConfigChange();
        }
        
        // Trigger input event to validate (but suggestions won't show due to flag)
        memberSearchInput.dispatchEvent(new Event('input'));
    }
}

// Handle member report configuration changes (year, month, or member)
function handleMemberConfigChange() {
    // Clear report canvas when member report configuration changes
    if (window.currentReportType === 'member' && window.currentReportData) {
        // Clear the report canvas
        clearReportCanvas();
        // Clear AI recommendations from canvas
        const reportCanvas = document.getElementById('reportCanvas');
        if (reportCanvas) {
            const aiContainer = reportCanvas.querySelector('.ai-recommendation-container');
            if (aiContainer) {
                aiContainer.remove();
            }
        }
        // Reset report data
        window.currentReportData = null;
        // Hide AI recommendation controls
        const aiControls = document.getElementById('aiRecommendationControls');
        if (aiControls) {
            aiControls.style.display = 'none';
        }
        // Hide send finance section
        hideSendFinanceSection();
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

// Initialize reports system
async function initializeReports() {
    setupReportTypeDropdown();
    setupReportTypeSelector();
    
    // Populate branch checkboxes dynamically before setting up branch selection
    await populateBranchCheckboxes();
    
    setupBranchSelection();
    setupTransactionTypeButtons();
    setupDateRangeFilter();
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 1000);
    
    // Initialize branch-specific reports
    initializeBranchSpecificReports();
    
    // Initialize month/year toggle system
    initializeMonthYearToggleSystem();
    
    // Setup member report configuration change listeners
    setupMemberConfigListeners();
    
    // Initialize report histories only if not in configuration mode
    // This prevents the history flash when arriving from notification
    if (!window.inConfigurationMode) {
        try {
            await initializeReportHistories();
        } catch (error) {
            console.error('Error initializing report histories:', error);
        }
    } else {
        // Hide sent reports section if in configuration mode
        const sentReportsSection = document.querySelector('.sent-reports-section');
        if (sentReportsSection) {
            sentReportsSection.style.display = 'none';
        }
        const sentReportsContainer = document.getElementById('sentReportsContainer');
        if (sentReportsContainer) {
            sentReportsContainer.style.display = 'none';
        }
    }
    
    // Keep history view by default; generation UI is hidden until configuring a report
    // Only hide if not in configuration mode (e.g., from notification prefill)
    if (!window.inConfigurationMode) {
        hideGenerateReportSection();
    }
    
    // Return a resolved promise for chaining
    return Promise.resolve();
}

// Setup event listeners for member report configuration changes
function setupMemberConfigListeners() {
    // Add listener for member year dropdown
    const memberYearSelect = document.getElementById('memberYear');
    if (memberYearSelect) {
        memberYearSelect.removeEventListener('change', handleMemberConfigChange);
        memberYearSelect.addEventListener('change', handleMemberConfigChange);
        
        // Update month dropdown to disable future months when year changes
        memberYearSelect.addEventListener('change', updateMemberMonthDropdown);
    }
    
    // Add listener for member month dropdown
    const memberMonthSelect = document.getElementById('memberMonth');
    if (memberMonthSelect) {
        memberMonthSelect.removeEventListener('change', handleMemberConfigChange);
        memberMonthSelect.addEventListener('change', handleMemberConfigChange);
        
        // Disable future months in member report
        updateMemberMonthDropdown();
    }
    
    // Add listener for member search input
    const memberSearchInput = document.getElementById('memberSearch');
    if (memberSearchInput) {
        // Use a debounced handler to avoid clearing on every keystroke
        let searchTimeout;
        memberSearchInput.addEventListener('input', function(e) {
            // Clear any existing timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            // Only clear report if member is actually selected (not just typing)
            searchTimeout = setTimeout(() => {
                if (memberSearchInput.value.trim().length >= 2 && window.currentReportType === 'member' && window.currentReportData) {
                    // Check if this is a complete member selection (not just partial typing)
                    // We'll only clear if the value changed significantly
                    handleMemberConfigChange();
                }
            }, 1000); // Wait 1 second after typing stops
        });
    }
}

// Update member month dropdown to disable future months
function updateMemberMonthDropdown() {
    const memberYearSelect = document.getElementById('memberYear');
    const memberMonthSelect = document.getElementById('memberMonth');
    
    if (!memberYearSelect || !memberMonthSelect) return;
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const selectedYear = parseInt(memberYearSelect.value, 10);
    
    // Get all month options
    const monthOptions = memberMonthSelect.querySelectorAll('option');
    
    monthOptions.forEach((option, index) => {
        const monthValue = parseInt(option.value, 10);
        
        // Disable if it's a future month
        if (selectedYear > currentYear || (selectedYear === currentYear && monthValue > currentMonth)) {
            option.disabled = true;
            // If the currently selected month becomes disabled, reset to current month
            if (memberMonthSelect.value === option.value) {
                if (selectedYear === currentYear) {
                    memberMonthSelect.value = String(currentMonth);
                } else {
                    memberMonthSelect.value = '1'; // Default to January for past years
                }
            }
        } else {
            option.disabled = false;
        }
    });
}

// Prefill the UI when arriving from a report_request notification
// Removed: prefillFromReportRequest() - IT Head doesn't receive report requests
// Removed: applyPrefillConfiguration() - No prefilling needed for IT Head

// Initialize month/year toggle system
function initializeMonthYearToggleSystem() {
    const reportTypes = ['savings', 'disbursement']; // Member and Branch reports use old dropdown format
    
    reportTypes.forEach(reportType => {
        // Populate year buttons for both single and multiple selection
        populateYearButtons(reportType);
        
        // Set default mode to 'month' with visual highlight
        const toggle = document.getElementById(reportType + 'Toggle');
        if (toggle) {
            const monthBtn = toggle.querySelector('[data-option="month"]');
            const yearBtn = toggle.querySelector('[data-option="year"]');
            if (monthBtn && yearBtn) {
                // Month button is highlighted by default
                monthBtn.classList.add('active');
                yearBtn.classList.remove('active');
            }
        }
        
        // Show month mode by default, hide year mode
        const monthMode = document.getElementById(reportType + 'MonthMode');
        const yearMode = document.getElementById(reportType + 'YearMode');
        if (monthMode) monthMode.style.display = 'block';
        if (yearMode) yearMode.style.display = 'none';
        
        // Initialize month button states (all enabled initially)
        updateMonthButtonStates(reportType);
    });
}

// Populate year buttons dynamically (2023 to current year)
function populateYearButtons(reportType) {
    const currentYear = new Date().getFullYear();
    const startYear = 2023;
    
    // Populate single selection year buttons (for month mode)
    const singleContainer = document.getElementById(reportType + 'YearButtonsSingle');
    if (singleContainer) {
        singleContainer.innerHTML = '';
        for (let year = startYear; year <= currentYear; year++) {
            const btn = document.createElement('button');
            btn.className = 'selection-btn';
            btn.setAttribute('data-value', year);
            btn.textContent = year;
            btn.onclick = () => toggleYearSelection(reportType, year, true); // true = single selection
            singleContainer.appendChild(btn);
        }
        // Year buttons start with no highlight initially
    }
    
    // Populate multiple selection year buttons (for year mode)
    const multipleContainer = document.getElementById(reportType + 'YearButtonsMultiple');
    if (multipleContainer) {
        multipleContainer.innerHTML = '';
        for (let year = startYear; year <= currentYear; year++) {
            const btn = document.createElement('button');
            btn.className = 'selection-btn';
            btn.setAttribute('data-value', year);
            btn.textContent = year;
            btn.onclick = () => toggleYearSelection(reportType, year, false); // false = multiple selection
            multipleContainer.appendChild(btn);
        }
    }
}

// Toggle between month and year mode
function toggleMonthYear(reportType, mode) {
    const toggle = document.getElementById(reportType + 'Toggle');
    if (!toggle) return;
    
    const monthBtn = toggle.querySelector('[data-option="month"]');
    const yearBtn = toggle.querySelector('[data-option="year"]');
    const monthMode = document.getElementById(reportType + 'MonthMode');
    const yearMode = document.getElementById(reportType + 'YearMode');
    
    // Check if we're switching modes (not just initializing)
    const wasMonthMode = monthBtn && monthBtn.classList.contains('active');
    const isSwitchingMode = (mode === 'month' && !wasMonthMode) || (mode === 'year' && wasMonthMode);
    
    if (mode === 'month') {
        if (monthBtn) monthBtn.classList.add('active');
        if (yearBtn) yearBtn.classList.remove('active');
        if (monthMode) monthMode.style.display = 'block';
        if (yearMode) yearMode.style.display = 'none';
        
        // Clear year mode selections when switching to month mode
        clearYearSelections(reportType, false);
        // Update month button states when switching back to month mode
        updateMonthButtonStates(reportType);
    } else {
        if (monthBtn) monthBtn.classList.remove('active');
        if (yearBtn) yearBtn.classList.add('active');
        if (monthMode) monthMode.style.display = 'none';
        if (yearMode) yearMode.style.display = 'block';
        
        // Clear month mode selections when switching to year mode
        clearMonthSelections(reportType);
        clearYearSelections(reportType, true);
    }
    
    // Clear report canvas when switching modes for savings/disbursement reports
    const isSavingsOrDisbursement = reportType === 'savings' || reportType === 'disbursement';
    if (isSavingsOrDisbursement && isSwitchingMode && window.currentReportType === reportType && window.currentReportData) {
        // Clear the report canvas
        clearReportCanvas();
        // Clear AI recommendations from canvas
        const reportCanvas = document.getElementById('reportCanvas');
        if (reportCanvas) {
            const aiContainer = reportCanvas.querySelector('.ai-recommendation-container');
            if (aiContainer) {
                aiContainer.remove();
            }
        }
        // Reset report data
        window.currentReportData = null;
        // Hide AI recommendation controls
        const aiControls = document.getElementById('aiRecommendationControls');
        if (aiControls) {
            aiControls.style.display = 'none';
        }
        // Hide send finance section
        hideSendFinanceSection();
    }
}

// Toggle month selection (multiple selection, minimum 2, range-based)
function toggleMonthSelection(reportType, month) {
    const container = document.getElementById(reportType + 'MonthButtons');
    if (!container) return;
    
    const btn = container.querySelector(`[data-value="${month}"]`);
    if (!btn) return;
    
    // Check if this is a savings or disbursement report
    const isSavingsOrDisbursement = reportType === 'savings' || reportType === 'disbursement';
    
    // For savings/disbursement reports, check if selecting a future month as end month
    if (isSavingsOrDisbursement && !btn.disabled) {
        const monthValue = parseInt(month, 10);
        const selectedMonths = Array.from(container.querySelectorAll('.selection-btn.selected'))
            .map(b => parseInt(b.getAttribute('data-value'), 10))
            .sort((a, b) => a - b);
        
        // If we're selecting a second month (creating a range), check if it's a future month
        if (selectedMonths.length > 0) {
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
            
            const selectedYears = getSelectedYears(reportType, true);
            const selectedYear = selectedYears.length > 0 ? selectedYears[0] : currentYear;
            
            // If selected year is current year and the month being selected is after current month
            if (selectedYear === currentYear && monthValue > currentMonth) {
                // This would be the end month in a range, prevent it
                showMessage('Cannot select a future month as the end month. Please select a month up to the current month only.', 'error');
                return;
            }
            
            // If selected year is in the future, prevent all selections
            if (selectedYear > currentYear) {
                showMessage('Cannot select months from a future year. Please select a year up to the current year.', 'error');
                return;
            }
        }
    }
    
    // Store previous month selection BEFORE toggle (for clearing canvas)
    let previousSelectedMonths = [];
    if (isSavingsOrDisbursement && window.currentReportType === reportType && window.currentReportData) {
        previousSelectedMonths = Array.from(container.querySelectorAll('.selection-btn.selected'))
            .map(b => parseInt(b.getAttribute('data-value'), 10))
            .sort((a, b) => a - b);
    }
    
    const isSelected = btn.classList.contains('selected');
    const monthValue = parseInt(month, 10);
    
    // Get all month buttons
    const allButtons = Array.from(container.querySelectorAll('.selection-btn'))
        .map(b => ({ btn: b, value: parseInt(b.getAttribute('data-value'), 10) }))
        .sort((a, b) => a.value - b.value);
    
    if (isSelected) {
        // Deselecting: clear all selections and start fresh
        allButtons.forEach(b => b.btn.classList.remove('selected'));
    } else {
        // Selecting: implement range selection
        const selectedMonths = Array.from(container.querySelectorAll('.selection-btn.selected'))
            .map(b => parseInt(b.getAttribute('data-value'), 10))
            .sort((a, b) => a - b);
        
        if (selectedMonths.length === 0) {
            // First selection: just select this month
            btn.classList.add('selected');
        } else {
            // Second or subsequent selection: select range from first to this month
            const firstSelected = selectedMonths[0];
            const startMonth = Math.min(firstSelected, monthValue);
            const endMonth = Math.max(firstSelected, monthValue);
            
            // Clear all selections first
            allButtons.forEach(b => b.btn.classList.remove('selected'));
            
            // Select all months in the range (inclusive)
            allButtons.forEach(b => {
                if (b.value >= startMonth && b.value <= endMonth) {
                    b.btn.classList.add('selected');
                }
            });
        }
    }
    
    // Update disabled states based on range logic
    updateMonthButtonStates(reportType);
    
    // Clear report canvas when month selection changes for savings/disbursement reports
    if (isSavingsOrDisbursement && window.currentReportType === reportType && window.currentReportData) {
        // Get new month selection after the toggle
        const newSelectedMonths = Array.from(container.querySelectorAll('.selection-btn.selected'))
            .map(b => parseInt(b.getAttribute('data-value'), 10))
            .sort((a, b) => a - b);
        
        // Compare if selection changed (different length or different months)
        const monthSelectionChanged = previousSelectedMonths.length !== newSelectedMonths.length ||
            previousSelectedMonths.some((m, i) => m !== newSelectedMonths[i]);
        
        if (monthSelectionChanged) {
            // Clear the report canvas
            clearReportCanvas();
            // Clear AI recommendations from canvas
            const reportCanvas = document.getElementById('reportCanvas');
            if (reportCanvas) {
                const aiContainer = reportCanvas.querySelector('.ai-recommendation-container');
                if (aiContainer) {
                    aiContainer.remove();
                }
            }
            // Reset report data
            window.currentReportData = null;
            // Hide AI recommendation controls
            const aiControls = document.getElementById('aiRecommendationControls');
            if (aiControls) {
                aiControls.style.display = 'none';
            }
            // Hide send finance section
            hideSendFinanceSection();
        }
    }
    
    // Validate minimum 2 months selected
    const selectedMonths = container.querySelectorAll('.selection-btn.selected');
    if (selectedMonths.length < 2) {
        // Show warning or prevent deselection if only 1 remains
        if (selectedMonths.length === 1 && !isSelected) {
            // Allow selection, but warn if they try to deselect
        }
    }
}

// Update month button disabled states based on range logic
function updateMonthButtonStates(reportType) {
    const container = document.getElementById(reportType + 'MonthButtons');
    if (!container) return;
    
    const selectedMonths = Array.from(container.querySelectorAll('.selection-btn.selected'))
        .map(b => parseInt(b.getAttribute('data-value'), 10))
        .sort((a, b) => a - b);
    
    // Get all month buttons
    const allButtons = container.querySelectorAll('.selection-btn');
    
    // Check if this is a savings or disbursement report
    const isSavingsOrDisbursement = reportType === 'savings' || reportType === 'disbursement';
    
    // Get current date for savings/disbursement reports
    let currentYear = null;
    let currentMonth = null;
    if (isSavingsOrDisbursement) {
        const currentDate = new Date();
        currentYear = currentDate.getFullYear();
        currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    }
    
    if (selectedMonths.length === 0) {
        // No selection: enable all buttons (but disable future months for savings/disbursement)
        allButtons.forEach(btn => {
            const monthValue = parseInt(btn.getAttribute('data-value'), 10);
            
            if (isSavingsOrDisbursement) {
                const selectedYears = getSelectedYears(reportType, true);
                const selectedYear = selectedYears.length > 0 ? selectedYears[0] : currentYear;
                
                // Disable future months if selected year is current year
                if (selectedYear === currentYear && monthValue > currentMonth) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                } else if (selectedYear > currentYear) {
                    // Disable all months if selected year is in the future
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                } else {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
                }
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    } else if (selectedMonths.length === 1) {
        // One month selected: disable months before it, enable months after it (but respect future month limit for savings/disbursement)
        const firstSelected = selectedMonths[0];
        allButtons.forEach(btn => {
            const monthValue = parseInt(btn.getAttribute('data-value'), 10);
            const isSelected = btn.classList.contains('selected');
            
            if (monthValue < firstSelected && !isSelected) {
                // Disable months before the first selected month
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                // Enable months from first selected onwards, but check future month limit for savings/disbursement
                if (isSavingsOrDisbursement) {
                    const selectedYears = getSelectedYears(reportType, true);
                    const selectedYear = selectedYears.length > 0 ? selectedYears[0] : currentYear;
                    
                    // Disable future months if selected year is current year
                    if (selectedYear === currentYear && monthValue > currentMonth) {
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                        btn.style.cursor = 'not-allowed';
                    } else if (selectedYear > currentYear) {
                        // Disable all months if selected year is in the future
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                        btn.style.cursor = 'not-allowed';
                    } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                    }
                } else {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                }
            }
        });
    } else {
        // Range selected: disable months before the first selected month, enable rest (but respect future month limit for savings/disbursement)
        const firstSelected = selectedMonths[0];
        allButtons.forEach(btn => {
            const monthValue = parseInt(btn.getAttribute('data-value'), 10);
            const isSelected = btn.classList.contains('selected');
            
            if (monthValue < firstSelected && !isSelected) {
                // Disable months before the first selected month in the range
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                // Enable months from first selected onwards, but check future month limit for savings/disbursement
                if (isSavingsOrDisbursement) {
                    const selectedYears = getSelectedYears(reportType, true);
                    const selectedYear = selectedYears.length > 0 ? selectedYears[0] : currentYear;
                    
                    // Disable future months if selected year is current year
                    if (selectedYear === currentYear && monthValue > currentMonth) {
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                        btn.style.cursor = 'not-allowed';
                    } else if (selectedYear > currentYear) {
                        // Disable all months if selected year is in the future
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                        btn.style.cursor = 'not-allowed';
                    } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                    }
                } else {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                }
            }
        });
    }
}

// Toggle year selection (single for month mode, multiple for year mode)
function toggleYearSelection(reportType, year, isSingleSelection) {
    const containerId = isSingleSelection 
        ? reportType + 'YearButtonsSingle' 
        : reportType + 'YearButtonsMultiple';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const btn = container.querySelector(`[data-value="${year}"]`);
    if (!btn) return;
    
    // Store previous selection state for comparison
    const isSavingsOrDisbursement = reportType === 'savings' || reportType === 'disbursement';
    let previousSelectedYears = null;
    if (isSavingsOrDisbursement && window.currentReportType === reportType && window.currentReportData) {
        previousSelectedYears = getSelectedYears(reportType, isSingleSelection).sort((a, b) => a - b);
    }
    
    if (isSingleSelection) {
        // Single selection: deselect all others, toggle this one
        container.querySelectorAll('.selection-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    } else {
        // Multiple selection: toggle this one
        btn.classList.toggle('selected');
    }
    
    // Update month button states when year changes (important for savings/disbursement reports)
    if (isSavingsOrDisbursement && isSingleSelection) {
        updateMonthButtonStates(reportType);
        
        // Clear report canvas when year changes (if report was already generated)
        if (window.currentReportType === reportType && window.currentReportData) {
            const newSelectedYears = getSelectedYears(reportType, true).sort((a, b) => a - b);
            const yearChanged = previousSelectedYears && (
                previousSelectedYears.length !== newSelectedYears.length ||
                previousSelectedYears.some((y, i) => y !== newSelectedYears[i])
            );
            
            if (yearChanged || !previousSelectedYears) {
                // Clear the report canvas
                clearReportCanvas();
                // Clear AI recommendations from canvas
                const reportCanvas = document.getElementById('reportCanvas');
                if (reportCanvas) {
                    const aiContainer = reportCanvas.querySelector('.ai-recommendation-container');
                    if (aiContainer) {
                        aiContainer.remove();
                    }
                }
                // Reset report data
                window.currentReportData = null;
                // Hide AI recommendation controls
                const aiControls = document.getElementById('aiRecommendationControls');
                if (aiControls) {
                    aiControls.style.display = 'none';
                }
                // Hide send finance section
                hideSendFinanceSection();
                // Update AI recommendation controls visibility based on new year
                showAIRecommendationControls();
            }
        }
    } else if (isSavingsOrDisbursement && !isSingleSelection) {
        // Year mode (multiple selection): clear canvas when selection changes
        if (window.currentReportType === reportType && window.currentReportData) {
            const newSelectedYears = getSelectedYears(reportType, false).sort((a, b) => a - b);
            const yearChanged = previousSelectedYears && (
                previousSelectedYears.length !== newSelectedYears.length ||
                previousSelectedYears.some((y, i) => y !== newSelectedYears[i])
            );
            
            if (yearChanged || !previousSelectedYears) {
                // Clear the report canvas
                clearReportCanvas();
                // Clear AI recommendations from canvas
                const reportCanvas = document.getElementById('reportCanvas');
                if (reportCanvas) {
                    const aiContainer = reportCanvas.querySelector('.ai-recommendation-container');
                    if (aiContainer) {
                        aiContainer.remove();
                    }
                }
                // Reset report data
                window.currentReportData = null;
                // Hide AI recommendation controls
                const aiControls = document.getElementById('aiRecommendationControls');
                if (aiControls) {
                    aiControls.style.display = 'none';
                }
                // Hide send finance section
                hideSendFinanceSection();
            }
        }
    }
}

// Clear month selections
function clearMonthSelections(reportType) {
    const container = document.getElementById(reportType + 'MonthButtons');
    if (container) {
        container.querySelectorAll('.selection-btn').forEach(btn => {
            btn.classList.remove('selected');
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
    }
}

// Clear year selections
function clearYearSelections(reportType, isSingleSelection) {
    const containerId = isSingleSelection 
        ? reportType + 'YearButtonsSingle' 
        : reportType + 'YearButtonsMultiple';
    const container = document.getElementById(containerId);
    if (container) {
        container.querySelectorAll('.selection-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }
}

// Get selected months for a report type
function getSelectedMonths(reportType) {
    const container = document.getElementById(reportType + 'MonthButtons');
    if (!container) return [];
    
    return Array.from(container.querySelectorAll('.selection-btn.selected'))
        .map(btn => parseInt(btn.getAttribute('data-value'), 10))
        .sort((a, b) => a - b);
}

// Get selected years for a report type
function getSelectedYears(reportType, isSingleSelection) {
    const containerId = isSingleSelection 
        ? reportType + 'YearButtonsSingle' 
        : reportType + 'YearButtonsMultiple';
    const container = document.getElementById(containerId);
    if (!container) return [];
    
    return Array.from(container.querySelectorAll('.selection-btn.selected'))
        .map(btn => parseInt(btn.getAttribute('data-value'), 10))
        .sort((a, b) => a - b);
}

// Get current toggle mode (month or year)
function getToggleMode(reportType) {
    const toggle = document.getElementById(reportType + 'Toggle');
    if (!toggle) return 'month';
    
    const activeBtn = toggle.querySelector('.toggle-option.active');
    return activeBtn ? activeBtn.getAttribute('data-option') : 'month';
}

// Initialize branch-specific reports
function initializeBranchSpecificReports() {
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    console.log('ðŸ” Branch-specific reports initialization:', {
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
        console.log('ðŸ” Hiding branch-related options for non-main branch user');
        
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
        console.log('ðŸ” User is main branch user or no branch name, not hiding branch options');
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
    console.log('ðŸ” Hiding branch reports for non-main branch user');
    
    // Hide the branch reports button
    const branchReportsBtn = document.querySelector('.report-type-btn[data-type="branch"]');
    if (branchReportsBtn) {
        branchReportsBtn.style.display = 'none';
        console.log('âœ… Hidden branch reports button');
    } else {
        console.log('âŒ Branch reports button not found');
    }
    
    // Hide the branch reports option from generate report dropdown
    const branchReportOption = document.getElementById('branchReportOption');
    if (branchReportOption) {
        branchReportOption.style.display = 'none';
        console.log('âœ… Hidden branch option from generate report dropdown');
    } else {
        console.log('âŒ Branch option not found in generate report dropdown');
    }
    
    // Hide the branch reports option from history filter dropdown
    const branchOption = document.querySelector('#reportHistoryFilter option[value="branch"]');
    if (branchOption) {
        branchOption.style.display = 'none';
        console.log('âœ… Hidden branch option from history filter dropdown');
    } else {
        console.log('âŒ Branch option not found in history filter dropdown');
    }
    
    // Hide the branch report history section
    const branchReportHistory = document.getElementById('branchReportHistory');
    if (branchReportHistory) {
        branchReportHistory.style.display = 'none';
        console.log('âœ… Hidden branch report history section');
    } else {
        console.log('âŒ Branch report history section not found');
    }
    
    // Hide the branch configuration section
    const branchConfig = document.getElementById('branchConfig');
    if (branchConfig) {
        branchConfig.style.display = 'none';
        console.log('âœ… Hidden branch configuration section');
    } else {
        console.log('âŒ Branch configuration section not found');
    }
}


// Setup report type selector
function setupReportTypeSelector() {
    const reportTypeBtns = document.querySelectorAll('.report-type-btn');
    
    reportTypeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Clear all configurations before switching
            clearAllConfigurations();
            
            // Remove active class from all buttons
            reportTypeBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get the report type
            const reportType = this.getAttribute('data-type');
            
            // Clear canvas and reset data before switching
            clearReportCanvas();
            // Clear AI recommendations from canvas
            const reportCanvas = document.getElementById('reportCanvas');
            if (reportCanvas) {
                const aiContainer = reportCanvas.querySelector('.ai-recommendation-container');
                if (aiContainer) {
                    aiContainer.remove();
                }
            }
            // Reset report data
            window.currentReportData = null;
            window.currentReportType = null;
            // Hide AI recommendation controls
            const aiControls = document.getElementById('aiRecommendationControls');
            if (aiControls) {
                aiControls.style.display = 'none';
            }
            // Hide send finance section
            hideSendFinanceSection();
            
            // Show corresponding configuration section
            showConfigurationSection(reportType);
            
            // Show corresponding history section
            showReportHistory(reportType);
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
    // Also refresh count from backend for accuracy on Branch filter
    updateSentCountFromBackend();
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
        container.innerHTML = '<div class="empty-state">No reports generated yet</div>';
        return;
    }
    
    container.innerHTML = reports.map(report => {
        // Determine status: "SENT" if from request, "SAVED" if independent
        // Check explicitly for null, undefined, empty string, or falsy values
        const hasRequestId = report.report_request_id !== null && 
                            report.report_request_id !== undefined && 
                            report.report_request_id !== '' &&
                            report.report_request_id !== 0;
        const status = hasRequestId ? 'sent' : 'saved';
        const statusText = hasRequestId ? 'SENT' : 'SAVED';
        
        return `
        <div class="history-item" data-report-id="${report.id}" data-report-date="${report.date}">
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
                    <div class="history-title">${report.title}</div>
                    <div class="history-details">${report.details}</div>
                </div>
                <div class="history-status-time">
                    <div class="history-status ${status}">${statusText}</div>
                    <div class="history-timestamp">${formatSmartTimestamp(report.date)}</div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Clear all report configurations
function clearAllConfigurations() {
    // Savings - Clear toggle selections
    if (typeof toggleMonthYear === 'function') {
        toggleMonthYear('savings', 'month');
        clearMonthSelections('savings');
        clearYearSelections('savings', true);
        clearYearSelections('savings', false);
    }
    
    // Disbursement - Clear toggle selections
    if (typeof toggleMonthYear === 'function') {
        toggleMonthYear('disbursement', 'month');
        clearMonthSelections('disbursement');
        clearYearSelections('disbursement', true);
        clearYearSelections('disbursement', false);
    }
    
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
    
    // Clear branch checkboxes for main branch users
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    if (isMainBranchUser) {
        document.querySelectorAll('#savingsConfig input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('#disbursementConfig input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
    
    // Clear the report canvas
    clearReportCanvas();
    // Reset report data
    window.currentReportData = null;
    window.currentReportType = null;
    // Hide AI recommendation controls
    const aiControls = document.getElementById('aiRecommendationControls');
    if (aiControls) {
        aiControls.style.display = 'none';
    }
    // Hide send finance section
    hideSendFinanceSection();
}

// Show configuration section based on report type
function showConfigurationSection(reportType) {
    // Check if we're switching to a different report type
    const previousReportType = window.currentReportType;
    const isSwitchingType = previousReportType && previousReportType !== reportType;
    
    // Hide initial state
    const initialState = document.getElementById('initialState');
    if (initialState) {
        initialState.style.display = 'none';
    }
    
    // Hide all configuration sections
    const configSections = document.querySelectorAll('.config-section');
    configSections.forEach(section => section.classList.remove('active'));
    
    // Don't hide all histories - let each report type show its own history
    
    // Clear canvas and reset data when switching report types
    if (isSwitchingType) {
        // Clear all configurations when switching report types
        clearAllConfigurations();
        
        clearReportCanvas();
        // Clear AI recommendations from canvas
        const reportCanvas = document.getElementById('reportCanvas');
        if (reportCanvas) {
            const aiContainer = reportCanvas.querySelector('.ai-recommendation-container');
            if (aiContainer) {
                aiContainer.remove();
            }
        }
        // Reset report data
        window.currentReportData = null;
        window.currentReportType = null;
        // Hide AI recommendation controls
        const aiControls = document.getElementById('aiRecommendationControls');
        if (aiControls) {
            aiControls.style.display = 'none';
        }
        // Hide send finance section
        hideSendFinanceSection();
    }
    
    // Hide AI recommendation controls for member reports
    const aiControls = document.getElementById('aiRecommendationControls');
    if (aiControls) {
        if (reportType === 'member') {
            aiControls.style.display = 'none';
        } else if (!isSwitchingType) {
            // For other report types, keep current state (will be shown when report is generated)
        }
    }
    
    // Show selected configuration section
    const selectedSection = document.getElementById(reportType + 'Config');
    if (selectedSection) {
        selectedSection.classList.add('active');
        
        // Add report canvas and generate button after the configuration
        addReportCanvas();
    }
    
    // Update month button states for savings/disbursement reports when configuration is shown
    if (reportType === 'savings' || reportType === 'disbursement') {
        updateMonthButtonStates(reportType);
    }
}

// Add report canvas and generate button
function addReportCanvas() {
    const reportConfig = document.querySelector('.report-config');
    const sendFinanceSection = document.getElementById('sendFinanceSection');
    
    // Check if report canvas already exists
    const existingCanvas = document.getElementById('reportCanvas');
    if (!existingCanvas) {
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
        let generateSection = document.querySelector('.generate-section');
        if (!generateSection) {
            generateSection = document.createElement('div');
            generateSection.className = 'generate-section';
            generateSection.innerHTML = `
                <button class="generate-btn" onclick="generateReport()">
                    <i class="fas fa-chart-line"></i>
                    <span>Generate Report</span>
                </button>
            `;
        }
        
        // Insert before send finance section
        if (sendFinanceSection && sendFinanceSection.parentNode) {
            sendFinanceSection.parentNode.insertBefore(generateSection, sendFinanceSection);
            sendFinanceSection.parentNode.insertBefore(reportCanvas, sendFinanceSection);
            
            // Create button container for AI and Send buttons
            let buttonContainer = document.querySelector('.button-container');
            if (!buttonContainer) {
                buttonContainer = document.createElement('div');
                buttonContainer.className = 'button-container';
            }
            
            // Get parent node before removing elements
            const parentNode = sendFinanceSection.parentNode;
            const insertPosition = sendFinanceSection.nextSibling;
            
            // Insert AI recommendation controls and send button into container
            const aiControls = document.getElementById('aiRecommendationControls');
            if (aiControls && aiControls.parentNode) {
                aiControls.parentNode.removeChild(aiControls);
            }
            if (sendFinanceSection && sendFinanceSection.parentNode) {
                sendFinanceSection.parentNode.removeChild(sendFinanceSection);
            }
            
            buttonContainer.appendChild(aiControls);
            buttonContainer.appendChild(sendFinanceSection);
            
            // Insert container at the position where sendFinanceSection was
            if (insertPosition) {
                parentNode.insertBefore(buttonContainer, insertPosition);
            } else {
                parentNode.appendChild(buttonContainer);
            }
        } else if (reportConfig && reportConfig.parentNode) {
            // Fallback: insert after config if sendFinanceSection is not present yet
            reportConfig.parentNode.insertBefore(generateSection, reportConfig.nextSibling);
            reportConfig.parentNode.insertBefore(reportCanvas, reportConfig.nextSibling);
            
            // Create button container for AI and Send buttons
            let buttonContainer = document.querySelector('.button-container');
            if (!buttonContainer) {
                buttonContainer = document.createElement('div');
                buttonContainer.className = 'button-container';
            }
            
            // Insert AI recommendation controls and send button into container
            const aiControls = document.getElementById('aiRecommendationControls');
            const sendFinanceSection = document.getElementById('sendFinanceSection');
            if (aiControls && aiControls.parentNode) {
                aiControls.parentNode.removeChild(aiControls);
            }
            if (sendFinanceSection && sendFinanceSection.parentNode) {
                sendFinanceSection.parentNode.removeChild(sendFinanceSection);
            }
            
            buttonContainer.appendChild(aiControls);
            if (sendFinanceSection) {
                buttonContainer.appendChild(sendFinanceSection);
            }
            reportCanvas.parentNode.insertBefore(buttonContainer, reportCanvas.nextSibling);
        }
        // Ensure send button stays hidden until a report is generated
        if (sendFinanceSection) sendFinanceSection.style.display = 'none';
    } else {
        // Ensure existing canvas and generate section are visible
        existingCanvas.style.display = 'block';
        const existingGenerate = document.querySelector('.generate-section');
        if (existingGenerate) existingGenerate.style.display = 'block';
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
        if (reportConfig) {
            reportConfig.insertAdjacentHTML('afterend', generateSectionHTML);
        }
    } else {
        generateSection.style.display = 'block';
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
                // Clear report when branch selection changes
                handleBranchConfigChange();
            }
        });
    }
    
    // Setup branch year dropdown listener
    const branchYearSelect = document.getElementById('branchYear');
    if (branchYearSelect) {
        branchYearSelect.removeEventListener('change', handleBranchConfigChange);
        branchYearSelect.addEventListener('change', handleBranchConfigChange);
        
        // Update month dropdown to disable future months when year changes
        branchYearSelect.addEventListener('change', updateBranchMonthDropdown);
    }
    
    // Setup branch month dropdown listener and disable future months
    const branchMonthSelect = document.getElementById('branchMonth');
    if (branchMonthSelect) {
        branchMonthSelect.removeEventListener('change', handleBranchConfigChange);
        branchMonthSelect.addEventListener('change', handleBranchConfigChange);
        
        // Disable future months in branch report
        updateBranchMonthDropdown();
    }
}

// Update branch month dropdown to disable future months
function updateBranchMonthDropdown() {
    const branchYearSelect = document.getElementById('branchYear');
    const branchMonthSelect = document.getElementById('branchMonth');
    
    if (!branchYearSelect || !branchMonthSelect) return;
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const selectedYear = parseInt(branchYearSelect.value, 10);
    
    // Get all month options
    const monthOptions = branchMonthSelect.querySelectorAll('option');
    
    monthOptions.forEach((option, index) => {
        const monthValue = parseInt(option.value, 10);
        
        // Disable if it's a future month
        if (selectedYear > currentYear || (selectedYear === currentYear && monthValue > currentMonth)) {
            option.disabled = true;
            // If the currently selected month becomes disabled, reset to current month
            if (branchMonthSelect.value === option.value) {
                if (selectedYear === currentYear) {
                    branchMonthSelect.value = String(currentMonth);
                } else {
                    branchMonthSelect.value = '1'; // Default to January for past years
                }
            }
        } else {
            option.disabled = false;
        }
    });
}

// Handle branch report configuration changes (year, month, branch selection, or transaction type)
function handleBranchConfigChange() {
    // Clear report canvas when branch report configuration changes
    if (window.currentReportType === 'branch' && window.currentReportData) {
        // Clear the report canvas
        clearReportCanvas();
        // Clear AI recommendations from canvas
        const reportCanvas = document.getElementById('reportCanvas');
        if (reportCanvas) {
            const aiContainer = reportCanvas.querySelector('.ai-recommendation-container');
            if (aiContainer) {
                aiContainer.remove();
            }
        }
        // Reset report data
        window.currentReportData = null;
        // Hide AI recommendation controls
        const aiControls = document.getElementById('aiRecommendationControls');
        if (aiControls) {
            aiControls.style.display = 'none';
        }
        // Hide send finance section
        hideSendFinanceSection();
    }
    
    // Update AI recommendation controls visibility when configuration changes
    if (window.currentReportType === 'branch') {
        showAIRecommendationControls();
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
                const isActive = this.classList.toggle('active');
                this.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                // Clear report when transaction type changes for branch reports
                handleBranchConfigChange();
            } else {
                // For other configs, only one can be selected
                const typeButtons = configSection.querySelectorAll('.type-btn');
                typeButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-pressed', 'true');
            }
        });
        
        // Add keyboard support (Enter and Space)
        btn.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                btn.click();
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
    
    // Update count to match what is displayed
    const countEl = document.getElementById('reportCount');
    if (countEl) {
        const count = filteredReports.length;
        countEl.textContent = `${count} ${count === 1 ? 'Report' : 'Reports'}`;
        countEl.style.visibility = 'visible';
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
    // No backend fetch for count; count equals displayed items
}

// Update count using backend totals for current filters (accurate for Branch and others)
async function updateSentCountFromBackend() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const params = new URLSearchParams();
        params.set('limit', '1');
        if (currentSentFilterType && currentSentFilterType !== 'all') {
            params.set('report_type', currentSentFilterType);
        }
        if (currentSentDateRange.start && currentSentDateRange.end) {
            params.set('start_date', currentSentDateRange.start);
            params.set('end_date', currentSentDateRange.end);
        }
        const res = await fetch(`/api/auth/generated-reports?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const total = data && data.data && typeof data.data.total === 'number' ? data.data.total : null;
        const countEl = document.getElementById('reportCount');
        if (countEl && total !== null) {
            countEl.textContent = `${total} ${total === 1 ? 'Report' : 'Reports'}`;
            countEl.style.visibility = 'visible';
        }
    } catch (_) {}
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

            // Get mode and date range info from computeDateRangeForReport
            const mode = getToggleMode(reportType);
            const dateRangeInfo = computeDateRangeForReport(reportType);
            
            // Build chart labels and values based on mode
            let labels = [];
            let values = [];
            let total = 0;
            let yearlyAggregates = [];
            
            if (mode === 'month') {
                // Month mode: show selected months
                const { year, months } = dateRangeInfo;
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                
                labels = months.map(m => monthNames[m - 1]);
                values = months.map(month => {
                    // Aggregate data for this month
                    const monthData = rows.filter(r => {
                        const d = new Date(r.date);
                        return d.getFullYear() === year && (d.getMonth() + 1) === month;
                    });
                    const valueKey = reportType === 'savings' ? 'total_savings' : 'total_disbursements';
                    return monthData.reduce((sum, r) => sum + (parseFloat(r[valueKey]) || 0), 0);
                });
                total = values.reduce((a, b) => a + (parseFloat(b) || 0), 0);
            } else {
                // Year mode
                const { years, isSingleYear } = dateRangeInfo;
                
                if (isSingleYear) {
                    // Single year: show all 12 months
                    const year = years[0];
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    
                    labels = monthNames;
                    values = monthNames.map((_, monthIndex) => {
                        const month = monthIndex + 1;
                        const monthData = rows.filter(r => {
                            const d = new Date(r.date);
                            return d.getFullYear() === year && (d.getMonth() + 1) === month;
                        });
                        const valueKey = reportType === 'savings' ? 'total_savings' : 'total_disbursements';
                        return monthData.reduce((sum, r) => sum + (parseFloat(r[valueKey]) || 0), 0);
                    });
                    total = values.reduce((a, b) => a + (parseFloat(b) || 0), 0);
                } else {
                    // Multiple years: show yearly aggregated data
                    yearlyAggregates = years.map(year => {
                        const yearData = rows.filter(r => {
                            const d = new Date(r.date);
                            return d.getFullYear() === year;
                        });
                        const valueKey = reportType === 'savings' ? 'total_savings' : 'total_disbursements';
                        const yearTotal = yearData.reduce((sum, r) => sum + (parseFloat(r[valueKey]) || 0), 0);
                        return {
                            year,
                            total: yearTotal,
                            transactionCount: yearData.length
                        };
                    });
                    labels = yearlyAggregates.map(item => String(item.year));
                    values = yearlyAggregates.map(item => item.total);
                    total = values.reduce((a, b) => a + (parseFloat(b) || 0), 0);
                }
            }

            // Fetch monthly member counts and totals for month mode
            let monthlyData = [];
            if (mode === 'month') {
                const { year, months } = dateRangeInfo;
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                
                // Fetch data for each selected month
                for (const month of months) {
                    const monthStart = new Date(year, month - 1, 1);
                    const monthEnd = new Date(year, month, 0);
                    const monthStartDate = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-${String(monthStart.getDate()).padStart(2, '0')}`;
                    const monthEndDate = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
                    
                    // Get monthly total
                    const monthData = rows.filter(r => {
                        const d = new Date(r.date);
                        return d.getFullYear() === year && (d.getMonth() + 1) === month;
                    });
                    const valueKey = reportType === 'savings' ? 'total_savings' : 'total_disbursements';
                    const monthTotal = monthData.reduce((sum, r) => sum + (parseFloat(r[valueKey]) || 0), 0);
                    
                    // Fetch member count for this month
                    let monthMembers = 0;
                    try {
                        const summaryUrl = `/api/auth/analytics/summary?startDate=${encodeURIComponent(monthStartDate)}&endDate=${encodeURIComponent(monthEndDate)}&branchId=${encodeURIComponent(userBranchId)}&isMainBranch=false`;
                        const sres = await fetch(summaryUrl, { headers: { 'Authorization': `Bearer ${token}` } });
                        if (sres.ok) {
                            const sjson = await sres.json();
                            monthMembers = (sjson && sjson.data && (parseInt(sjson.data.active_members, 10) || 0)) || 0;
                        }
                    } catch (_) {}
                    
                    monthlyData.push({
                        month: month,
                        monthName: monthNames[month - 1],
                        total: monthTotal,
                        members: monthMembers
                    });
                }
            } else {
                // Year mode
                const { years, isSingleYear } = dateRangeInfo;
                
                if (isSingleYear) {
                    // Single year: fetch member count for each month
                    const year = years[0];
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    
                    for (let monthIndex = 0; monthIndex < monthNames.length; monthIndex++) {
                        const month = monthIndex + 1;
                        const monthStart = new Date(year, month - 1, 1);
                        const monthEnd = new Date(year, month, 0);
                        const monthStartDate = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-${String(monthStart.getDate()).padStart(2, '0')}`;
                        const monthEndDate = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
                        
                        // Get monthly total
                        const monthData = rows.filter(r => {
                            const d = new Date(r.date);
                            return d.getFullYear() === year && (d.getMonth() + 1) === month;
                        });
                        const valueKey = reportType === 'savings' ? 'total_savings' : 'total_disbursements';
                        const monthTotal = monthData.reduce((sum, r) => sum + (parseFloat(r[valueKey]) || 0), 0);
                        
                        // Fetch member count for this month
                        let monthMembers = 0;
                        try {
                            const summaryUrl = `/api/auth/analytics/summary?startDate=${encodeURIComponent(monthStartDate)}&endDate=${encodeURIComponent(monthEndDate)}&branchId=${encodeURIComponent(userBranchId)}&isMainBranch=false`;
                            const sres = await fetch(summaryUrl, { headers: { 'Authorization': `Bearer ${token}` } });
                            if (sres.ok) {
                                const sjson = await sres.json();
                                monthMembers = (sjson && sjson.data && (parseInt(sjson.data.active_members, 10) || 0)) || 0;
                            }
                        } catch (_) {}
                        
                        monthlyData.push({
                            month: month,
                            monthName: monthNames[monthIndex],
                            total: monthTotal,
                            members: monthMembers
                        });
                    }
                } else {
                    // Multiple years: create yearly data (not monthly)
                    if (yearlyAggregates.length > 0) {
                        for (const aggregate of yearlyAggregates) {
                            let yearMembers = 0;
                            if (aggregate.transactionCount > 0) {
                                try {
                                    const yearStartDate = `${aggregate.year}-01-01`;
                                    const yearEndDate = `${aggregate.year}-12-31`;
                                    const summaryUrl = `/api/auth/analytics/summary?startDate=${encodeURIComponent(yearStartDate)}&endDate=${encodeURIComponent(yearEndDate)}&branchId=${encodeURIComponent(userBranchId)}&isMainBranch=false`;
                                    const sres = await fetch(summaryUrl, { headers: { 'Authorization': `Bearer ${token}` } });
                                    if (sres.ok) {
                                        const sjson = await sres.json();
                                        yearMembers = (sjson && sjson.data && (parseInt(sjson.data.active_members, 10) || 0)) || 0;
                                    }
                                } catch (_) {}
                            }
                            
                            monthlyData.push({
                                month: null,
                                monthName: String(aggregate.year), // This will be the year label
                                total: aggregate.total || 0,
                                members: yearMembers
                            });
                        }
                    }
                }
            }

            reportData = {
                type: reportType === 'savings' ? 'Savings Report' : 'Disbursement Report',
                period: periodLabel,
                total,
                activeMembers: mode === 'month' ? monthlyData.reduce((sum, m) => sum + m.members, 0) : (monthlyData[0]?.members || 0),
                monthlyData: monthlyData,
                mode: mode,
                dateRangeInfo: dateRangeInfo,
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
                // Use net_interest_income for IT Head (from analytics service)
                const netInterestIncome = parseFloat(r.net_interest_income || 0) || 0;
                return {
                    branch_id: r.branch_id,
                    branch_location: r.branch_location || r.branch_name || `Branch ${r.branch_id}`,
                    branch_name: `Branch ${r.branch_id} - ${r.branch_location || r.branch_name}`, // For table display
                    branch_location_only: r.branch_location || r.branch_name || `Branch ${r.branch_id}`, // For graphs
                    active_members: parseInt(r.active_members || 0, 10) || 0,
                    total_savings: totalSavings,
                    total_disbursements: totalDisb,
                    net_interest_income: netInterestIncome,
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
                        labels: finalRows.map(x => x.branch_location_only),
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
                        labels: finalRows.map(x => x.branch_location_only),
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
        
        // Log report generation (only when initially generating, not when saving)
        // Note: When saving, the backend will log generate_report, and frontend will log save_report
        if (typeof AuditLogger !== 'undefined') {
            const reportConfig = collectReportConfig(reportType);
            AuditLogger.logReportGeneration(reportType, reportConfig);
        }

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
    // Member report uses old dropdown format
    if (reportType === 'member') {
        const yearElement = document.getElementById('memberYear');
        const monthElement = document.getElementById('memberMonth');
        
        if (!yearElement || !monthElement) {
            const currentYear = new Date().getFullYear();
            const start = new Date(currentYear, 0, 1);
            const end = new Date(currentYear, 0, 0);
            const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            return { startDate, endDate, periodLabel: `${monthNames[0]} ${currentYear}`, year: currentYear, month: 1 };
        }
        
        const year = yearElement.value || String(new Date().getFullYear());
        const month = monthElement.value || '1';
        const start = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        const end = new Date(parseInt(year, 10), parseInt(month, 10), 0);
        const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const periodLabel = `${monthNames[parseInt(month, 10) - 1]} ${year}`;
        return { startDate, endDate, periodLabel, year: parseInt(year, 10), month: parseInt(month, 10) };
    }
    
    // Branch report uses old dropdown format
    if (reportType === 'branch') {
        const yearElement = document.getElementById('branchYear');
        const monthElement = document.getElementById('branchMonth');
        
        if (!yearElement || !monthElement) {
            const currentYear = new Date().getFullYear();
            const start = new Date(currentYear, 0, 1);
            const end = new Date(currentYear, 0, 0);
            const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            return { startDate, endDate, periodLabel: `${monthNames[0]} ${currentYear}` };
        }
        
        const year = yearElement.value || String(new Date().getFullYear());
        const month = monthElement.value || '1';
        const start = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        const end = new Date(parseInt(year, 10), parseInt(month, 10), 0);
        const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return { startDate, endDate, periodLabel: `${monthNames[parseInt(month, 10) - 1]} ${year}` };
    }
    
    // Savings and Disbursement use toggle system
    const mode = getToggleMode(reportType);
    
    if (mode === 'month') {
        // Month mode: single year + multiple months
        const selectedYears = getSelectedYears(reportType, true);
        const selectedMonths = getSelectedMonths(reportType);
        
        if (selectedYears.length === 0 || selectedMonths.length < 2) {
            // Default to current year and first two months if nothing selected
            const currentYear = new Date().getFullYear();
            const start = new Date(currentYear, 0, 1); // January 1
            const end = new Date(currentYear, 1, 0); // Last day of February
            const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
            return { startDate, endDate, periodLabel: `Year ${currentYear} for the Months of January, February`, mode: 'month', year: currentYear, months: [1, 2] };
        }
        
        const year = selectedYears[0];
        const sortedMonths = selectedMonths.sort((a, b) => a - b);
        const firstMonth = sortedMonths[0];
        const lastMonth = sortedMonths[sortedMonths.length - 1];
        
        // Start from first day of first selected month
        const start = new Date(year, firstMonth - 1, 1);
        // End at last day of last selected month
        const end = new Date(year, lastMonth, 0);
        
        const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthLabels = sortedMonths.map(m => monthNames[m - 1]).join(', ');
        const periodLabel = `Year ${year} for the Months of ${monthLabels}`;
        
        return { startDate, endDate, periodLabel, mode: 'month', year, months: sortedMonths };
    } else {
        // Year mode: multiple years
        const selectedYears = getSelectedYears(reportType, false);
        
        if (selectedYears.length === 0) {
            // Default to current year if nothing selected
            const currentYear = new Date().getFullYear();
            const start = new Date(currentYear, 0, 1);
            const end = new Date(currentYear, 11, 31);
            const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
            return { startDate, endDate, periodLabel: `Year ${currentYear} in All Months`, mode: 'year', years: [currentYear], isSingleYear: true };
        }
        
        const sortedYears = selectedYears.sort((a, b) => a - b);
        const firstYear = sortedYears[0];
        const lastYear = sortedYears[sortedYears.length - 1];
        
        if (sortedYears.length === 1) {
            // Single year: all months
            const start = new Date(firstYear, 0, 1);
            const end = new Date(firstYear, 11, 31);
            const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
            return { startDate, endDate, periodLabel: `Year ${firstYear} in All Months`, mode: 'year', years: sortedYears, isSingleYear: true };
        } else {
            // Multiple years: yearly aggregation
            const start = new Date(firstYear, 0, 1);
            const end = new Date(lastYear, 11, 31);
            const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
            const periodLabel = sortedYears.length === 2 
                ? `Year ${firstYear} to ${lastYear}`
                : `Year ${firstYear} to ${lastYear}`;
            return { startDate, endDate, periodLabel, mode: 'year', years: sortedYears, isSingleYear: false };
        }
    }
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
    const mode = getToggleMode(reportType);
    
    if (mode === 'month') {
        // Month mode: need 1 year and at least 2 months
        const selectedYears = getSelectedYears(reportType, true);
        const selectedMonths = getSelectedMonths(reportType);
        
        if (selectedYears.length === 0) {
            showMessage('Please select a year.', 'error');
            return false;
        }
        
        if (selectedMonths.length < 2) {
            showMessage('Please select at least 2 months.', 'error');
            return false;
        }
    } else {
        // Year mode: need at least 1 year
        const selectedYears = getSelectedYears(reportType, false);
        
        if (selectedYears.length === 0) {
            showMessage('Please select at least one year.', 'error');
            return false;
        }
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

        // Wait a bit for DOM to update before rendering charts
        setTimeout(() => {
            // Render charts
            // 1) Single chart path (savings/disbursement)
            if (reportData.chart && Array.isArray(reportData.chart.labels)) {
            // Inject chart container if not present
            const chartContainerId = 'reportChartContainer';
            const chartCanvasId = 'reportChart';
            // Check if container already exists to avoid duplicates
            let container = document.getElementById(chartContainerId);
            if (!container) {
                container = document.createElement('div');
                container.id = chartContainerId;
                container.className = 'chart-with-title';
                container.style.marginTop = '16px';
                container.style.width = '100%';
                container.style.boxSizing = 'border-box';
                reportCanvas.appendChild(container);
            }
            
            // Check if canvas already exists
            let chartCanvas = document.getElementById(chartCanvasId);
            if (!chartCanvas) {
                chartCanvas = document.createElement('canvas');
                chartCanvas.id = chartCanvasId;
                chartCanvas.width = 400;
                chartCanvas.height = 200;
                container.appendChild(chartCanvas);
            }

            if (window.Chart) {
                // Destroy previous instance if exists
                if (window.__currentReportChart) {
                    try { window.__currentReportChart.destroy(); } catch (_) {}
                }
                const ctx = document.getElementById(chartCanvasId).getContext('2d');
                // For mixed charts (bar + line), use 'bar' as base type, datasets specify their own types
                window.__currentReportChart = new Chart(ctx, {
                    type: reportData.chartType || 'bar',
                    data: {
                        labels: reportData.chart.labels,
                        datasets: reportData.chart.datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: {
                            padding: {
                                left: 10,
                                right: 10,
                                top: 10,
                                bottom: 10
                            }
                        },
                        plugins: { 
                            legend: { 
                                display: true,
                                position: 'top',
                                labels: {
                                    padding: 15,
                                    usePointStyle: false,
                                    boxWidth: 12,
                                    boxHeight: 12
                                }
                            } 
                        },
                        scales: { 
                            y: { 
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '₱' + value.toLocaleString('en-PH');
                                    },
                                    padding: 10
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)'
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    padding: 10
                                }
                            }
                        }
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
                savingsWrap.className = 'chart-with-title';
                savingsWrap.style.marginTop = '16px';
                savingsWrap.style.width = '100%';
                savingsWrap.style.boxSizing = 'border-box';
                savingsWrap.style.position = 'relative';
                savingsWrap.style.marginBottom = '0px';
                savingsWrap.style.paddingBottom = '0px';
                savingsWrap.style.display = 'flex';
                savingsWrap.style.flexDirection = 'column';
                savingsWrap.style.alignItems = 'center';
                savingsWrap.innerHTML = `<h4 style="margin-bottom: 12px; margin-left: 60px; font-size: 16px; font-weight: 600; color: #0D5B11; text-align: left; width: 100%;">Savings by Branch</h4><canvas id="branchSavingsChart" width="400" height="200"></canvas>`;
                reportCanvas.appendChild(savingsWrap);
            }

            if (showDisb) {
                const disbWrap = document.createElement('div');
                disbWrap.className = 'chart-with-title';
                disbWrap.style.marginTop = '4px';
                disbWrap.style.width = '100%';
                disbWrap.style.boxSizing = 'border-box';
                disbWrap.style.position = 'relative';
                disbWrap.style.paddingTop = '0px';
                disbWrap.style.display = 'flex';
                disbWrap.style.flexDirection = 'column';
                disbWrap.style.alignItems = 'center';
                disbWrap.innerHTML = `<h4 style="margin-top: 4px; margin-bottom: 12px; margin-left: 60px; font-size: 16px; font-weight: 600; color: #0D5B11; text-align: left; width: 100%;">Disbursements by Branch</h4><canvas id="branchDisbChart" width="400" height="200"></canvas>`;
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
                            layout: {
                                padding: {
                                    left: 10,
                                    right: 10,
                                    top: 10,
                                    bottom: 2
                                }
                            },
                            plugins: { 
                                legend: { 
                                    display: true,
                                    position: 'top',
                                    labels: {
                                        padding: 15,
                                        usePointStyle: false,
                                        boxWidth: 12,
                                        boxHeight: 12
                                    }
                                } 
                            },
                            scales: { 
                                y: { 
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function(value) {
                                            return '₱' + value.toLocaleString('en-PH');
                                        },
                                        padding: 10
                                    },
                                    grid: {
                                        color: 'rgba(0, 0, 0, 0.05)'
                                    }
                                },
                                x: {
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        padding: 10
                                    }
                                }
                            }
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
                            layout: {
                                padding: {
                                    left: 10,
                                    right: 10,
                                    top: 2,
                                    bottom: 10
                                }
                            },
                            plugins: { 
                                legend: { 
                                    display: true,
                                    position: 'top',
                                    labels: {
                                        padding: 15,
                                        usePointStyle: false,
                                        boxWidth: 12,
                                        boxHeight: 12
                                    }
                                } 
                            },
                            scales: { 
                                y: { 
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function(value) {
                                            return '₱' + value.toLocaleString('en-PH');
                                        },
                                        padding: 10
                                    },
                                    grid: {
                                        color: 'rgba(0, 0, 0, 0.05)'
                                    }
                                },
                                x: {
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        padding: 10
                                    }
                                }
                            }
                        }
                    });
                }
            } catch (e) {
                console.error('Failed to render branch charts', e);
            }
        }
        }, 100); // Small delay to ensure DOM is ready for chart rendering
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
    
    // Get branch information
    const userBranchName = localStorage.getItem('user_branch_name');
    const userBranchLocation = localStorage.getItem('user_branch_location');
    const branchDisplay = (userBranchName && userBranchLocation) ? `${userBranchName} - ${userBranchLocation}` : (userBranchName || 'Branch');
    
    // Get number of months/years
    const monthlyData = reportData.monthlyData || [];
    const mode = reportData.mode || 'month';
    let count = 0;
    let countLabel = '';
    let displayValue = '';
    
    if (mode === 'month') {
        count = monthlyData.length;
        countLabel = count === 1 ? 'Month' : 'Months';
        displayValue = String(count);
    } else {
        // Year mode
        if (reportData.dateRangeInfo && reportData.dateRangeInfo.years) {
            count = reportData.dateRangeInfo.years.length;
            if (count === 1) {
                // Single year: display the actual year with "Year" label
                displayValue = String(reportData.dateRangeInfo.years[0]);
                countLabel = 'Year';
            } else {
                // Multiple years: display count with "Years" label
                displayValue = String(count);
                countLabel = 'Years';
            }
        } else {
            count = monthlyData.length;
            countLabel = count === 1 ? 'Month' : 'Months';
            displayValue = String(count);
        }
    }
    
    // Extract year from period label
    let year = '';
    if (mode === 'month' && reportData.dateRangeInfo) {
        year = reportData.dateRangeInfo.year || '';
    } else if (mode === 'year' && reportData.dateRangeInfo && reportData.dateRangeInfo.years) {
        year = reportData.dateRangeInfo.years.length === 1 
            ? String(reportData.dateRangeInfo.years[0])
            : `${reportData.dateRangeInfo.years[0]} - ${reportData.dateRangeInfo.years[reportData.dateRangeInfo.years.length - 1]}`;
    } else {
        // Fallback: try to extract from period label
        const periodParts = reportData.period.split(' ');
        year = periodParts[periodParts.length - 1] || '';
    }
    
    const showYearColumn = mode === 'month';

    let html = `
        <div class="report-content">
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${branchDisplay}</div>
                    <div class="stat-label">Branch</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${displayValue}</div>
                    <div class="stat-label">${countLabel}</div>
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
                            <th>${mode === 'year' && reportData.dateRangeInfo && !reportData.dateRangeInfo.isSingleYear ? 'Year' : 'Month'}</th>
                            <th>${isSavings ? 'Total Savings Deposits' : 'Total Disbursements'}</th>
                            <th>Total Members</th>
                            ${showYearColumn ? '<th>Year</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
    // Generate rows for each month/year
    if (monthlyData.length > 0) {
        monthlyData.forEach((monthData, index) => {
            const rowYear = showYearColumn
                ? (reportData.dateRangeInfo?.year || year || '')
                : '';
            const yearCell = showYearColumn ? `<td>${rowYear}</td>` : '';

            html += `
                <tr>
                    <td>${monthData.monthName}</td>
                    <td>₱${Number(monthData.total || 0).toLocaleString('en-PH')}</td>
                    <td>${Number(monthData.members || 0).toLocaleString('en-PH')}</td>
                    ${yearCell}
                </tr>
            `;
        });
    } else {
        // Fallback if no monthly data
        html += `
                <tr>
                    <td colspan="${showYearColumn ? 4 : 3}" style="text-align: center; padding: 40px; color: #9ca3af;">
                        <i class="fas fa-database" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        No data available
                    </td>
                </tr>
            `;
    }
        
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
        const savingsDeposits = parseFloat(t.savings_deposits || 0);
        const loanReceivables = parseFloat(t.loan_receivables || 0);
        return sum + savingsDeposits + loanReceivables;
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
                            <th>Savings Deposits</th>
                            <th>Loan Receivables</th>
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
            const savingsDeposits = parseFloat(transaction.savings_deposits || 0);
            const loanReceivables = parseFloat(transaction.loan_receivables || 0);
            
            html += `
                <tr>
                    <td>${date}</td>
                    <td>${transaction.payee || ''}</td>
                    <td>${transaction.particulars || ''}</td>
                    <td>${transaction.reference || ''}</td>
                    <td>${savingsDeposits > 0 ? '₱' + savingsDeposits.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                    <td>${loanReceivables > 0 ? '₱' + loanReceivables.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
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
    
    // Determine which columns to show based on selected transaction types
    const showSavings = reportData.charts && reportData.charts.savings;
    const showDisbursements = reportData.charts && reportData.charts.disbursement;
    
    // Build header columns dynamically
    let headerColumns = '<th>Branch Name</th><th>Total Members</th>';
    if (showSavings) {
        headerColumns += '<th>Total Savings</th>';
    }
    if (showDisbursements) {
        headerColumns += '<th>Total Disbursements</th>';
    }
    headerColumns += '<th>Net Interest Income</th>';
    
    // Calculate colspan for "no data" message
    let colspan = 2; // Branch Name + Total Members
    if (showSavings) colspan++;
    if (showDisbursements) colspan++;
    colspan++; // Net Interest Income
    
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
                            ${headerColumns}
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.isArray(reportData.rows) && reportData.rows.length ? reportData.rows.map(r => {
                            let rowColumns = `<td>${r.branch_name}</td><td>${r.active_members}</td>`;
                            if (showSavings) {
                                rowColumns += `<td>₱${Number(r.total_savings || 0).toLocaleString('en-PH')}</td>`;
                            }
                            if (showDisbursements) {
                                rowColumns += `<td>₱${Number(r.total_disbursements || 0).toLocaleString('en-PH')}</td>`;
                            }
                            rowColumns += `<td>₱${Number(r.net_interest_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>`;
                            return `<tr>${rowColumns}</tr>`;
                        }).join('') : `
                            <tr>
                                <td colspan="${colspan}" style="text-align: center; padding: 40px; color: #9ca3af;">
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
        // IT Head version - button is always "SAVE REPORT" (no send to MC functionality)
        const buttonText = document.getElementById('sendButtonText');
        if (buttonText) {
            buttonText.textContent = 'SAVE REPORT';
            sendFinanceSection.querySelector('i').className = 'fas fa-save';
        }
        
        sendFinanceSection.style.display = 'block';
    }
}

// Show AI controls when a report is generated
function showAIRecommendationControls() {
    const ctrl = document.getElementById('aiRecommendationControls');
    if (!ctrl) return;
    
    // Hide AI recommendation button if no report has been generated yet
    if (!window.currentReportData) {
        ctrl.style.display = 'none';
        ctrl.setAttribute('aria-hidden', 'true');
        return;
    }
    
    const reportType = window.currentReportType;
    
    // Hide AI recommendation button for member reports
    if (reportType === 'member') {
        ctrl.style.display = 'none';
        ctrl.setAttribute('aria-hidden', 'true');
        return;
    }
    
    // For savings and disbursement reports, only show AI recommendations for current year
    if (reportType === 'savings' || reportType === 'disbursement') {
        const selectedYears = getSelectedYears(reportType, true);
        const currentYear = new Date().getFullYear();
        const selectedYear = selectedYears.length > 0 ? selectedYears[0] : null;
        
        // Hide AI recommendations if selected year is not current year
        if (selectedYear !== currentYear) {
            ctrl.style.display = 'none';
            ctrl.setAttribute('aria-hidden', 'true');
            return;
        }
    }
    
    // For branch reports, only show AI recommendations for current month
    if (reportType === 'branch') {
        const branchYearSelect = document.getElementById('branchYear');
        const branchMonthSelect = document.getElementById('branchMonth');
        
        if (branchYearSelect && branchMonthSelect) {
            const selectedYear = parseInt(branchYearSelect.value, 10);
            const selectedMonth = parseInt(branchMonthSelect.value, 10);
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
            
            // Hide AI recommendations if selected month/year is not current month
            if (selectedYear !== currentYear || selectedMonth !== currentMonth) {
                ctrl.style.display = 'none';
                ctrl.setAttribute('aria-hidden', 'true');
                return;
            }
        }
    }
    
    // Show for current month branch reports and current year savings/disbursement reports
    ctrl.style.display = 'flex';
    ctrl.setAttribute('aria-hidden', 'false');
    
    // Enable button and restore original text
    const button = ctrl.querySelector('button');
    if (button) {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-brain"></i><span>Generate AI Recommendation</span>';
        button.title = '';
    }
    
    // Focus management: focus the button when it becomes visible
    if (button) {
        setTimeout(() => button.focus(), 100);
    }
}

// Generate AI recommendations via backend
async function generateAIRecommendation() {
    try {
        console.log('ðŸ¤– [Frontend] Starting AI recommendation generation...');
        const token = localStorage.getItem('access_token');
        if (!token) {
            showMessage('You are not authenticated.', 'error');
            return;
        }

        // Validate restrictions for AI recommendations
        const reportType = window.currentReportType;
        
        // For savings/disbursement reports: only current year
        if (reportType === 'savings' || reportType === 'disbursement') {
            const selectedYears = getSelectedYears(reportType, true);
            const currentYear = new Date().getFullYear();
            const selectedYear = selectedYears.length > 0 ? selectedYears[0] : null;
            
            if (selectedYear !== currentYear) {
                showMessage('AI recommendations are only available for the current year to provide actionable, forward-looking insights.', 'error');
                return;
            }
        }
        
        // For branch reports: only current month
        if (reportType === 'branch') {
            const branchYearSelect = document.getElementById('branchYear');
            const branchMonthSelect = document.getElementById('branchMonth');
            
            if (branchYearSelect && branchMonthSelect) {
                const selectedYear = parseInt(branchYearSelect.value, 10);
                const selectedMonth = parseInt(branchMonthSelect.value, 10);
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
                
                if (selectedYear !== currentYear || selectedMonth !== currentMonth) {
                    showMessage('AI recommendations are only available for the current month to provide actionable, forward-looking insights based on the most recent data.', 'error');
                    return;
                }
            }
        }

        const btn = document.getElementById('generateAIButton');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Loading...</span>';
        }
        
        // Disable save/send report button while AI is generating
        const sendFinanceBtn = document.getElementById('sendFinanceSection');
        if (sendFinanceBtn) {
            sendFinanceBtn.disabled = true;
            sendFinanceBtn.style.opacity = '0.6';
            sendFinanceBtn.style.cursor = 'not-allowed';
        }

        const body = {
            reportType: window.currentReportType,
            reportData: window.currentReportData
        };

        console.log('ðŸ¤– [Frontend] Report Type:', body.reportType);
        console.log('ðŸ¤– [Frontend] Sending request to backend...');
        const startTime = Date.now();

        const res = await fetch('/api/auth/reports/generate-ai-recommendations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const duration = Date.now() - startTime;
        console.log('ðŸ¤– [Frontend] Response received in', duration, 'ms');

        if (!res.ok) {
            const text = await res.text();
            console.error('âŒ [Frontend] API error:', text);
            throw new Error(text || 'Failed to generate AI recommendations');
        }

        const json = await res.json();
        const data = json && json.data ? json.data : null;
        if (!data) throw new Error('Invalid AI response');

        // Log AI usage details
        console.log('âœ… [Frontend] AI Response received');
        console.log('âœ… [Frontend] Source:', data.ai?.source);
        console.log('âœ… [Frontend] Provider:', data.ai?.metadata?.provider || 'N/A');
        console.log('âœ… [Frontend] Model:', data.ai?.metadata?.model || 'N/A');
        console.log('âœ… [Frontend] API Duration:', data.ai?.metadata?.apiDuration || 'N/A', 'ms');
        
        if (data.ai?.source === 'ai') {
            console.log('ðŸŽ‰ [Frontend] AI API KEY WAS USED! âœ…');
            console.log('ðŸŽ‰ [Frontend] Recommendations are AI-generated from', data.ai.metadata.provider);
        } else if (data.ai?.source === 'rule-based-fallback') {
            console.warn('âš ï¸ [Frontend] AI API was NOT used - Fallback to rule-based');
            console.warn('âš ï¸ [Frontend] Fallback reason:', data.ai?.metadata?.fallbackReason);
            console.warn('âš ï¸ [Frontend] Error:', data.ai?.error);
        } else {
            console.info('â„¹ï¸ [Frontend] Using rule-based recommendations (AI disabled)');
        }

        renderAIRecommendations(data);
        window.aiRecommendationsGenerated = true;
        
        // Backend already logs generate_ai_recommendation via auditLog middleware, so no need to log here
    } catch (e) {
        console.error('âŒ [Frontend] AI generation failed:', e.message);
        console.error('âŒ [Frontend] Stack:', e.stack);
        showMessage('AI recommendation failed: ' + e.message, 'error');
    } finally {
        const btn = document.getElementById('generateAIButton');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-brain"></i><span>Generate AI Recommendation</span>';
        }
        
        // Re-enable save/send report button after AI generation completes
        const sendFinanceBtn = document.getElementById('sendFinanceSection');
        if (sendFinanceBtn) {
            sendFinanceBtn.disabled = false;
            sendFinanceBtn.style.opacity = '1';
            sendFinanceBtn.style.cursor = 'pointer';
        }
    }
}

function renderAIRecommendations(payload) {
    const reportCanvas = document.getElementById('reportCanvas');
    if (!reportCanvas) return;

    const reportType = window.currentReportType;
    
    // Route to appropriate renderer based on report type
    if (reportType === 'savings' || reportType === 'disbursement') {
        renderTrendAIRecommendations(payload);
        return;
    }
    
    // Existing branch report rendering logic (unchanged)
    // Get strategic recommendations
    const strategic = (payload.ai && payload.ai.recommendations && payload.ai.recommendations.strategic) ||
                      (payload.mcda && payload.mcda.recommendations && payload.mcda.recommendations.strategic) ||
                      'No strategic recommendations available.';

    // Get branch-level recommendations
    const branchRecs = (payload.ai && payload.ai.recommendations && payload.ai.recommendations.branchLevel) || [];

    // Get ranking data
    const ranked = (payload.mcda && payload.mcda.rankedBranches) || [];

    // Create clean, minimalist white container for AI recommendations
    let aiContent = `
        <div class="ai-recommendation-container" style="background: #ffffff; border-radius: 8px; padding: 24px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                <i class="fas fa-brain" style="color: #106F2C; font-size: 20px;"></i>
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">AI-Powered Recommendations</h3>
                <span style="background: #f3f4f6; color: #6b7280; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">BETA</span>
            </div>
    `;

    // Strategic Insights Section
    if (strategic && strategic !== 'No strategic recommendations available.') {
        aiContent += `
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Strategic Insights</h4>
                <p style="margin: 0; color: #111827; line-height: 1.6; font-size: 14px;">${strategic}</p>
            </div>
        `;
    }

    // Branch-Level Recommendations Section
    if (branchRecs.length > 0) {
        aiContent += `
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Branch-Level Recommendations</h4>
        `;
        
        branchRecs.forEach(item => {
            aiContent += `
                <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 12px; background: #f9fafb;">
                    <div style="font-weight: 600; color: #111827; font-size: 15px; margin-bottom: 8px;">${item.branchName || 'Branch'}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">
                        <span style="font-weight: 500;">Priority:</span> ${item.priority || 'Medium'}
                    </div>
                    ${(item.recommendations || []).length > 0 ? `
                        <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                            ${(item.recommendations || []).map(r => `<li style="margin-bottom: 6px;">${r}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${item.rationale ? `
                        <div style="font-size: 12px; color: #6b7280; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                            <span style="font-weight: 500;">Reason:</span> ${item.rationale}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        aiContent += `</div>`;
    }

    // Performance Rankings Table Section
    if (ranked.length > 0) {
        aiContent += `
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Performance Rankings (TOPSIS Score)</h4>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Rank</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Branch</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Score</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Category</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        ranked.forEach(r => {
            aiContent += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px; color: #111827;">${r.rank}</td>
                    <td style="padding: 12px; color: #111827;">${r.branch_name || 'Branch'}</td>
                    <td style="padding: 12px; color: #111827; font-weight: 500;">${(r.topsisScore * 100).toFixed(1)}%</td>
                    <td style="padding: 12px; color: #111827;">${r.category}</td>
                </tr>
            `;
        });
        
        aiContent += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    aiContent += `</div>`;

    // Append AI recommendations to the existing canvas content (don't replace the report)
    const existingContent = reportCanvas.innerHTML;
    // Check if AI recommendations already exist in canvas
    if (reportCanvas.querySelector('.ai-recommendation-container')) {
        // Replace existing AI recommendations
        const existingAI = reportCanvas.querySelector('.ai-recommendation-container');
        existingAI.outerHTML = aiContent;
    } else {
        // Append new AI recommendations
        reportCanvas.insertAdjacentHTML('beforeend', aiContent);
    }

    // Scroll to AI recommendations
    const aiContainer = reportCanvas.querySelector('.ai-recommendation-container');
    if (aiContainer) {
        aiContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Render trend-based AI recommendations for savings/disbursement reports
function renderTrendAIRecommendations(payload) {
    const reportCanvas = document.getElementById('reportCanvas');
    if (!reportCanvas) return;

    const recommendations = payload.ai?.recommendations || {};
    const trendAnalysis = payload.trendAnalysis || payload.ai?.trendAnalysis || null;
    const reportType = window.currentReportType;
    const isSavings = reportType === 'savings';

    // Create clean, minimalist white container for AI recommendations
    let aiContent = `
        <div class="ai-recommendation-container" style="background: #ffffff; border-radius: 8px; padding: 24px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                <i class="fas fa-brain" style="color: #106F2C; font-size: 20px;"></i>
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">AI-Powered Recommendations</h3>
                <span style="background: #f3f4f6; color: #6b7280; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">BETA</span>
            </div>
    `;

    // Strategic Insights Section
    if (recommendations.strategic && recommendations.strategic !== 'No strategic recommendations available.') {
        aiContent += `
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Strategic Insights</h4>
                <p style="margin: 0; color: #111827; line-height: 1.6; font-size: 14px;">${recommendations.strategic}</p>
            </div>
        `;
    }

    // Trend Insights Section
    if (recommendations.trendInsights) {
        const insights = recommendations.trendInsights;
        aiContent += `
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Trend Analysis</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
                    ${insights.overallTrend ? `
                        <div style="background: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Overall Trend</div>
                            <div style="font-size: 16px; font-weight: 600; color: #111827;">${insights.overallTrend}</div>
                        </div>
                    ` : ''}
                </div>
                ${insights.keyPatterns && insights.keyPatterns.length > 0 ? `
                    <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                        ${insights.keyPatterns.map(p => `<li style="margin-bottom: 6px;">${p}</li>`).join('')}
                    </ul>
                ` : ''}
                ${insights.seasonalNotes ? `
                    <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 13px; font-style: italic;">${insights.seasonalNotes}</p>
                ` : ''}
            </div>
        `;
    }

    // Monthly Analysis Section
    if (recommendations.monthlyAnalysis && recommendations.monthlyAnalysis.length > 0) {
        aiContent += `
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Monthly Changes</h4>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Month</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Change</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Insight</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        recommendations.monthlyAnalysis.forEach(item => {
            aiContent += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px; color: #111827;">${item.month || 'N/A'}</td>
                    <td style="padding: 12px; color: #374151; font-weight: 500;">${item.change || 'N/A'}</td>
                    <td style="padding: 12px; color: #111827;">${item.insight || 'N/A'}</td>
                </tr>
            `;
        });
        
        aiContent += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Anomalies Section
    if (recommendations.anomalies && recommendations.anomalies.length > 0) {
        aiContent += `
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Anomalies Detected</h4>
        `;
        
        recommendations.anomalies.forEach(anomaly => {
            const typeIcon = anomaly.type === 'drop' ? 'fa-arrow-down' : 'fa-arrow-up';
            aiContent += `
                <div style="border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 12px; background: #f9fafb; border-radius: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <i class="fas ${typeIcon}" style="color: #6b7280;"></i>
                        <span style="font-weight: 600; color: #111827; font-size: 15px;">${anomaly.month || 'Unknown Month'}</span>
                        <span style="background: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 500;">${anomaly.severity?.toUpperCase() || 'MEDIUM'} SEVERITY</span>
                    </div>
                    <div style="font-size: 13px; color: #374151; margin-bottom: 8px;">${anomaly.explanation || 'Anomaly detected'}</div>
                    <div style="font-size: 12px; color: #6b7280;">
                        <strong>Action:</strong> ${anomaly.recommendation || 'Investigate root causes'}
                    </div>
                </div>
            `;
        });
        
        aiContent += `</div>`;
    }

    // Peak and Low Section
    if (recommendations.peakAndLow && (recommendations.peakAndLow.highestMonth || recommendations.peakAndLow.lowestMonth)) {
        aiContent += `
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Peak and Low Months</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
        `;
        
        if (recommendations.peakAndLow.highestMonth) {
            aiContent += `
                <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; background: #f9fafb;">
                    <div style="font-weight: 600; color: #111827; font-size: 15px; margin-bottom: 8px;">
                        <i class="fas fa-arrow-up" style="color: #6b7280; margin-right: 6px;"></i>Highest: ${recommendations.peakAndLow.highestMonth.month || 'N/A'}
                    </div>
                    <div style="font-size: 13px; color: #374151;">${recommendations.peakAndLow.highestMonth.insight || 'Peak performance month'}</div>
                </div>
            `;
        }
        
        if (recommendations.peakAndLow.lowestMonth) {
            aiContent += `
                <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; background: #f9fafb;">
                    <div style="font-weight: 600; color: #111827; font-size: 15px; margin-bottom: 8px;">
                        <i class="fas fa-arrow-down" style="color: #6b7280; margin-right: 6px;"></i>Lowest: ${recommendations.peakAndLow.lowestMonth.month || 'N/A'}
                    </div>
                    <div style="font-size: 13px; color: #374151;">${recommendations.peakAndLow.lowestMonth.insight || 'Lowest performance month'}</div>
                </div>
            `;
        }
        
        aiContent += `</div>`;
        
        if (recommendations.peakAndLow.recommendations && recommendations.peakAndLow.recommendations.length > 0) {
            aiContent += `
                <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                    ${recommendations.peakAndLow.recommendations.map(r => `<li style="margin-bottom: 6px;">${r}</li>`).join('')}
                </ul>
            `;
        }
        
        aiContent += `</div>`;
    }

    // Forecast Section
    if (recommendations.forecast && recommendations.forecast.nextMonthPrediction) {
        aiContent += `
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Next Month Forecast</h4>
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
                    <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 8px;">
                        Predicted: ${recommendations.forecast.nextMonthPrediction}
                    </div>
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">
                        Confidence: <span style="font-weight: 500; color: #374151;">${recommendations.forecast.confidence || 'medium'}</span>
                    </div>
                    ${recommendations.forecast.preparationStrategies && recommendations.forecast.preparationStrategies.length > 0 ? `
                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                            <div style="font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 8px;">Preparation Strategies:</div>
                            <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 13px; line-height: 1.8;">
                                ${recommendations.forecast.preparationStrategies.map(s => `<li style="margin-bottom: 4px;">${s}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Actionable Recommendations Section
    if (recommendations.actionableRecommendations && recommendations.actionableRecommendations.length > 0) {
        aiContent += `
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Actionable Recommendations</h4>
        `;
        
        recommendations.actionableRecommendations.forEach(rec => {
            aiContent += `
                <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 12px; background: #f9fafb;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="background: #e5e7eb; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${rec.priority || 'MEDIUM'} PRIORITY</span>
                        <span style="background: #e5e7eb; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">${rec.category || 'General'}</span>
                    </div>
                    <div style="font-size: 14px; color: #111827; line-height: 1.6; margin-bottom: 8px;">${rec.recommendation || 'No recommendation provided'}</div>
                    ${rec.rationale ? `
                        <div style="font-size: 12px; color: #6b7280; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                            <span style="font-weight: 500;">Reason:</span> ${rec.rationale}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        aiContent += `</div>`;
    }

    aiContent += `</div>`;

    // Append AI recommendations to the existing canvas content (don't replace the report)
    if (reportCanvas.querySelector('.ai-recommendation-container')) {
        // Replace existing AI recommendations
        const existingAI = reportCanvas.querySelector('.ai-recommendation-container');
        existingAI.outerHTML = aiContent;
    } else {
        // Append new AI recommendations
        reportCanvas.insertAdjacentHTML('beforeend', aiContent);
    }

    // Scroll to AI recommendations
    const aiContainer = reportCanvas.querySelector('.ai-recommendation-container');
    if (aiContainer) {
        aiContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
        
        // Clear the report canvas
        clearReportCanvas();
        // Clear AI recommendations from canvas
        const reportCanvas = document.getElementById('reportCanvas');
        if (reportCanvas) {
            const aiContainer = reportCanvas.querySelector('.ai-recommendation-container');
            if (aiContainer) {
                aiContainer.remove();
            }
        }
        // Reset report data
        window.currentReportData = null;
        window.currentReportType = null;
        // Hide AI recommendation controls
        const aiControls = document.getElementById('aiRecommendationControls');
        if (aiControls) {
            aiControls.style.display = 'none';
        }
        // Hide send finance section
        hideSendFinanceSection();
    } catch (error) {
        console.error('Error clearing configuration:', error);
        showMessage('An error occurred while clearing the configuration.', 'error');
    }
}

// Disable editing for prefilled configuration
// Removed: lockPrefilledConfiguration() - IT Head doesn't receive report requests with locked configs

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
    
    // Reset toggle to month mode
    toggleMonthYear('savings', 'month');
    
    // Clear month and year selections
    clearMonthSelections('savings');
    clearYearSelections('savings', true);
    clearYearSelections('savings', false);
    
    // Year buttons start with no highlight initially
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
    
    // Reset toggle to month mode
    toggleMonthYear('disbursement', 'month');
    
    // Clear month and year selections
    clearMonthSelections('disbursement');
    clearYearSelections('disbursement', true);
    clearYearSelections('disbursement', false);
    
    // Year buttons start with no highlight initially
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

// Removed: sendToMarketingClerk() - IT Head does not send reports to Marketing Clerk

// Save Report function for IT Head
// Make function globally accessible for onclick handler
window.saveReport = async function saveReport() {
    const activeReportType = document.querySelector('.report-type-btn.active');
    if (!activeReportType) {
        showMessage('Please generate a report first.', 'error');
        return;
    }
    
    const reportType = activeReportType.getAttribute('data-type');
    const reportData = window.currentReportData;
    
    if (!reportData) {
        showMessage('No report data available. Please generate a report first.', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            showMessage('Authentication required.', 'error');
            return;
        }
        
        showLoadingDialog('Saving report...');
        
        // Generate PDF from canvas (AI recommendations are now inside the canvas)
        const canvas = document.getElementById('reportCanvas');
        const wrapper = document.createElement('div');
        if (canvas) wrapper.appendChild(canvas.cloneNode(true));
        
        // Add Chart.js library and chart initialization scripts to the HTML
        let fullHTML = wrapper.innerHTML;
        
        // Get all computed styles
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
        
        // Get report metadata
        const reportTypeMap = {
            'Savings Report': 'Savings Report',
            'Disbursement Report': 'Disbursement Report',
            'Member Report': 'Member Report',
            'Branch Performance Report': 'Branch Performance Report'
        };
        const reportTypeForHeader = reportTypeMap[reportData.type] || 'Financial Report';
        const branchName = localStorage.getItem('user_branch_name') || 'Main Branch';
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
        
        // Resolve logo
        let logoSrc = '/assets/logo.png';
        try {
            const logoRes = await fetch('/assets/logo.png');
            if (logoRes.ok) {
                const logoBlob = await logoRes.blob();
                const logoBase64 = await blobToBase64(logoBlob);
                logoSrc = `data:image/png;base64,${logoBase64}`;
            }
        } catch (_) {}

        const branchLocation = localStorage.getItem('user_branch_location') || '';
        const branchDisplay = branchLocation ? `${branchName} ${branchLocation}` : branchName;

        // Safely serialize chart data from reportData (same approach as Finance Officer)
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

        // Wrap with Chart.js library and initialization
        fullHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        ${styleSheets}
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 15px;
            background: white;
            color: #333;
            font-size: 9px;
        }
        .report-header-section {
            margin-bottom: 20px;
            padding: 15px;
            background: #ffffff;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            position: relative;
        }
        .report-logo {
            position: absolute;
            top: 12px;
            right: 12px;
            max-height: 84px;
            width: auto;
            display: block;
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
        }
        .report-meta {
            font-size: 12px;
            color: #374151;
            margin-bottom: 4px;
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
        }
        /* Card layout for PDF - horizontal alignment like canvas */
        .report-stats,
        .summary-cards,
        .metric-cards,
        .cards-container {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: 12px !important;
            margin-bottom: 20px !important;
            align-items: stretch !important;
        }
        .stat-card,
        .summary-card,
        .metric-card {
            flex: 1 1 auto !important;
            min-width: 150px !important;
            display: flex !important;
            flex-direction: column !important;
            margin: 0 !important;
        }
        /* Ensure cards display in a row, not stacked */
        .stat-card + .stat-card,
        .summary-card + .summary-card,
        .metric-card + .metric-card {
            margin-top: 0 !important;
            margin-left: 0 !important;
        }
        /* Prevent cards from taking full width */
        .report-stats .stat-card {
            max-width: calc(25% - 9px) !important;
        }
        .summary-cards .summary-card,
        .metric-cards .metric-card {
            max-width: calc(50% - 6px) !important;
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
        
        /* Smaller stat cards - ensure all cards fit in one line */
        .report-stats { 
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            gap: 8px;
            margin-bottom: 12px;
        }
        .stat-card {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            max-width: 100% !important;
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
        
        /* Chart handling - ensure charts are included */
        .report-content {
            max-width: 100%;
            margin: 0 auto;
        }
        canvas { 
            max-width: 100%;
            height: 200px !important;
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
            .chart-with-title {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-after: auto !important;
                orphans: 3;
                widows: 3;
            }
            .chart-with-title h4 {
                page-break-after: avoid !important;
                break-after: avoid !important;
                margin-bottom: 8px !important;
            }
            .chart-with-title canvas {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-before: avoid !important;
                break-before: avoid !important;
            }
        }
    </style>
</head>
<body>
    <div class="report-header-section">
        <img class="report-logo" src="${logoSrc}" alt="IMVCMPC Logo" />
        <div class="report-main-title">IMVCMPC Finance Management System Report</div>
        <div class="report-type">${reportTypeForHeader}</div>
        <div class="report-meta"><strong>Generated by:</strong> IT Head - ${branchDisplay}</div>
        <div class="report-timestamp">Generated on: ${dateStr} at ${timeStr}</div>
    </div>
    ${fullHTML}
    <script>
        // Initialize charts after DOM is ready (same approach as Finance Officer)
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
        
        // Collect configuration
        const reportConfig = collectReportConfig(reportType);
        
        // Save to database
        const saveRes = await fetch('/api/auth/generated-reports', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                report_request_id: null, // IT Head doesn't have report requests
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
        
        // Get saved report result before reloading
        const savedResult = await saveRes.json();
        
        // Log report save
        if (typeof AuditLogger !== 'undefined') {
            const reportConfig = collectReportConfig(reportType);
            AuditLogger.logReportSave(reportType, reportConfig);
        }
        
        // Reload reports from database
        await loadReportHistories();
        
        hideLoadingDialog();
        const reportDetails = getReportDetailsForMessage(reportType, reportData);
        showSuccessDialog(`${reportDetails} was saved successfully`);
        
        // Clear report configuration and return to history view
        clearReportCanvas();
        window.currentReportData = null;
        window.currentReportType = null;
        
        // Deactivate all report type buttons
        document.querySelectorAll('.report-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Clear the specific report type configuration
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
        
        // Return to history view
        hideReportConfiguration();
        
    } catch (error) {
        console.error('Error saving report:', error);
        hideLoadingDialog();
        showMessage('Failed to save report. Please try again.', 'error');
    }
};

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

function hideErrorDialog() {
    const existingDialog = document.getElementById('errorDialog');
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
        border-radius: 12px;
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
        width: 40px;
        height: 40px;
        background: #f0fdf4;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
    `;
    icon.innerHTML = '<i class="fas fa-check-circle" style="color: #0D5B11; font-size: 18px;"></i>';
    
    // Create message
    const messageEl = document.createElement('p');
    messageEl.style.cssText = `
        color: #374151;
        font-size: 14px;
        font-weight: 500;
        margin: 0 0 20px 0;
        line-height: 1.5;
    `;
    messageEl.textContent = message;
    
    // Create OK button
    const button = document.createElement('button');
    button.textContent = 'OK';
    button.style.cssText = `
        background: #0D5B11;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 20px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    button.onmouseover = () => button.style.background = '#0a4a0e';
    button.onmouseout = () => button.style.background = '#0D5B11';
    button.onclick = () => {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
    };
    
    // Add click outside to close
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
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
    dialog.appendChild(button);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
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
                const mode = getToggleMode(reportType);
                if (mode === 'month') {
                    const selectedYears = getSelectedYears(reportType, true);
                    const selectedMonths = getSelectedMonths(reportType);
                    return { 
                        mode: 'month',
                        year: selectedYears.length > 0 ? selectedYears[0] : null,
                        months: selectedMonths
                    };
                } else {
                    const selectedYears = getSelectedYears(reportType, false);
                    return { 
                        mode: 'year',
                        years: selectedYears
                    };
                }
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
// Show minimalist error dialog (centered white container)
function showErrorDialog(message) {
    // Remove existing dialogs
    hideLoadingDialog();
    hideErrorDialog();
    
    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.id = 'errorDialog';
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
        border-radius: 12px;
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
    
    // Create error icon
    const icon = document.createElement('div');
    icon.style.cssText = `
        width: 40px;
        height: 40px;
        background: #fef2f2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
    `;
    icon.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ef4444; font-size: 18px;"></i>';
    
    // Create message
    const messageEl = document.createElement('p');
    messageEl.style.cssText = `
        color: #374151;
        font-size: 14px;
        font-weight: 500;
        margin: 0 0 20px 0;
        line-height: 1.5;
    `;
    messageEl.textContent = message;
    
    // Create OK button
    const button = document.createElement('button');
    button.textContent = 'OK';
    button.style.cssText = `
        background: #0D5B11;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 20px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    button.onmouseover = () => button.style.background = '#0a4a0e';
    button.onmouseout = () => button.style.background = '#0D5B11';
    button.onclick = () => {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
    };
    
    // Add click outside to close
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
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
    dialog.appendChild(button);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

function showMessage(message, type = 'info') {
    // Use error dialog for error messages
    if (type === 'error') {
        showErrorDialog(message);
        return;
    }
    
    // For other message types, use the original notification style
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
let backendSentTotal = null;
async function loadReportHistories() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('No access token found');
            return;
        }

        // Load reports from database
        const response = await fetch('/api/auth/generated-reports?limit=1000', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('Failed to load reports from database:', response.status);
            // Fallback to localStorage if database fails
            loadReportHistoriesFromLocalStorage();
            return;
        }

        const result = await response.json();
        // Track backend total for accurate count in All view (include Branch-only when filtered)
        if (result && result.data && typeof result.data.total === 'number') {
            backendSentTotal = result.data.total;
        } else {
            backendSentTotal = null;
        }
        const reports = result.data?.reports || [];

        // Process all reports into unified format
        const allReports = reports.map(report => {
            // Ensure report_request_id is properly handled (could be null, undefined, or a valid UUID)
            const reportRequestId = report.report_request_id || null;
            
            // Determine status: "sent" if from request, "saved" if independent
            // Check explicitly for null, undefined, empty string, or falsy values
            const hasRequestId = reportRequestId !== null && 
                                reportRequestId !== undefined && 
                                reportRequestId !== '' &&
                                reportRequestId !== 0;
            const status = hasRequestId ? 'sent' : 'saved';
            
            return {
                id: report.id,
                title: generateReportTitle(report.report_type, report.config, report.created_at),
                details: generateReportDetails(report.report_type, report.config),
                date: report.created_at,
                status: status,
                type: report.report_type,
                branch_id: report.branch_id,
                branch_name: report.branch_name,
                config: report.config || {},
                report_request_id: reportRequestId
            };
        });

        // Store all reports for filtering
        allSentReports = allReports;

        // Display all reports and update count via filters pipeline
        applyAllSentFilters();

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
    
    // Store and render through filters to update count
    allSentReports = allReports;
    applyAllSentFilters();
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
        status: 'saved', // Default to 'saved' for localStorage fallback (independent reports)
        type: reportType,
        branch_id: userBranchId,
        branch_name: userBranchName,
        config: reportData.config || {},
        report_request_id: null // No request ID for localStorage fallback
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
        historyList.innerHTML = history.map(report => {
            // Determine status text based on report status
            const statusText = report.status === 'saved' ? 'SAVED' : 'SENT';
            const statusClass = report.status || 'sent';
            
            return `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-title">${report.title}</div>
                    <div class="history-details">${report.details}</div>
                </div>
                <div class="history-meta">
                    <div class="history-status ${statusClass}">${statusText}</div>
                    <div class="history-timestamp">${formatSmartTimestamp(report.date)}</div>
                </div>
            </div>
            `;
        }).join('');
    }
}

// Generate clean filename from report title (for downloads)
function generateReportFileName(reportType, config, createdAt) {
    // Parse date string and handle timezone properly to avoid day shift
    let localDateString = createdAt;
    if (createdAt && createdAt.includes('T')) {
        localDateString = createdAt.split('T')[0];
    }
    
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

// Filter report history sections based on type
function filterReportHistory(reportType) {
    const reportTypes = ['savings', 'disbursement', 'member', 'branch'];
    
    reportTypes.forEach(type => {
        const historySection = document.getElementById(`${type}ReportHistory`);
        if (historySection) {
            if (reportType === 'all' || reportType === type) {
                historySection.style.display = 'block';
            } else {
                historySection.style.display = 'none';
            }
        }
    });
    
    console.log(`Filtered report history to show: ${reportType}`);
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
    window.inConfigurationMode = true;
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
    
    // Hide dropdown filter
    const reportTypeFilter = document.querySelector('.report-type-filter');
    if (reportTypeFilter) {
        reportTypeFilter.style.display = 'none';
    }
    
    // Show back button
    const backContainer = document.getElementById('backToHistoryContainer');
    if (backContainer) backContainer.style.display = 'flex';
    
    // Hide initial state to prevent "Choose a Report Type" flash
    const initialState = document.getElementById('initialState');
    if (initialState) {
        initialState.style.display = 'none';
    }
    
    // Show report configuration section
    const reportConfig = document.querySelector('.report-config');
    if (reportConfig) {
        reportConfig.style.display = 'block';
        // Scroll to the top of the page
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Show generation UI when entering configuration
    showGenerateReportSection();
}

// Hide report configuration and show history (for returning to history view)
async function hideReportConfiguration() {
    window.inConfigurationMode = false;
    
    // Hide report configuration section first
    const reportConfig = document.querySelector('.report-config');
    if (reportConfig) {
        reportConfig.style.display = 'none';
    }
    
    // Hide generate report button and canvas
    hideGenerateReportSection();
    
    // Unlock configuration and remove locked notes
    unlockConfiguration();
    
    // Show sent reports section
    const sentReportsSection = document.querySelector('.sent-reports-section');
    if (sentReportsSection) {
        sentReportsSection.style.display = 'block';
    }
    
    // Show sent reports container (important: this gets hidden in configuration mode)
    const sentReportsContainer = document.getElementById('sentReportsContainer');
    if (sentReportsContainer) {
        sentReportsContainer.style.display = 'block';
    }
    
    // Hide initial state to prevent "Choose a Report Type" message
    const initialState = document.getElementById('initialState');
    if (initialState) {
        initialState.style.display = 'none';
    }
    
    // Show date range filter
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    if (dateRangeFilter) {
        dateRangeFilter.style.display = 'flex';
    }
    
    // Show dropdown filter
    const reportTypeFilter = document.querySelector('.report-type-filter');
    if (reportTypeFilter) {
        reportTypeFilter.style.display = 'block';
    }
    
    // Hide back button
    const backContainer = document.getElementById('backToHistoryContainer');
    if (backContainer) backContainer.style.display = 'none';
    
    // Refresh reports list to show latest generated reports
    try {
        await initializeReportHistories();
    } catch (error) {
        console.error('Error refreshing reports:', error);
    }
    
    // Reset filter to show all reports
    filterSentReports('all');
    
    // Scroll to top to show the reports list
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Unlock configuration and remove locked notes
function unlockConfiguration() {
    try {
        // Remove locked notes from all configuration headers (IT Head doesn't use locking)
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
    // Do not hide generation UI while in configuration mode (e.g., from notification action)
    if (window.inConfigurationMode) {
        return;
    }
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
    
    // Hide AI recommendation controls
    const aiRecommendationControls = document.getElementById('aiRecommendationControls');
    if (aiRecommendationControls) {
        aiRecommendationControls.style.display = 'none';
        aiRecommendationControls.setAttribute('aria-hidden', 'true');
    }
    
    // Hide button container
    const buttonContainer = document.querySelector('.button-container');
    if (buttonContainer) {
        buttonContainer.style.display = 'none';
    }
}

// Show generate report section (button and canvas)
function showGenerateReportSection() {
    addReportCanvas();
    // Make sure only one generate section is visible
    const gen = document.querySelector('.generate-section');
    if (gen) gen.style.display = 'block';
    const sendFinanceSection = document.getElementById('sendFinanceSection');
    // Keep send button hidden until a report is actually generated
    if (sendFinanceSection) sendFinanceSection.style.display = 'none';
    // Show button container
    const buttonContainer = document.querySelector('.button-container');
    if (buttonContainer) {
        buttonContainer.style.display = 'flex';
    }
    const reportCanvas = document.getElementById('reportCanvas');
    if (reportCanvas) reportCanvas.style.display = 'block';
}

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
    } catch (error) {
        console.error('Error viewing report:', error);
        showMessage('Failed to load report', 'error');
    }
};

// Display report content in a modal (render PDF inline)
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

    // Fetch PDF blob and display in iframe
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
                downloadReportPDF(report.id);
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
        // Remove click handler
        modal.onclick = null;
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

// Setup report type dropdown menu
function setupReportTypeDropdown() {
    // Check if user is from main branch and show/hide branch reports option
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    const branchReportOption = document.getElementById('branchReportOption');
    if (branchReportOption) {
        // Use flex for main branch users, none for non-main branch users
        branchReportOption.style.display = isMainBranchUser ? 'flex' : 'none';
    }
    
    // Close dropdown when clicking outside
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

// Select report type from dropdown
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
    
    // Show checkmark only if it's NOT "Generate Report" (empty type)
    if (type !== '') {
        const selectedOption = document.querySelector(`[data-type="${type}"]`);
        if (selectedOption) {
            const checkIcon = selectedOption.querySelector('.check-icon');
            if (checkIcon) checkIcon.style.display = 'block';
        }
    }
    
    // Update button text
    const types = {
        '': 'Generate Report',
        'savings': 'Savings Report',
        'disbursement': 'Disbursement Report',
        'member': 'Member Report',
        'branch': 'Branch Report'
    };
    
    if (btnText) btnText.textContent = types[type] || 'Generate Report';
    
    if (type === '') {
        // Show sent reports section and hide configuration
        hideReportConfiguration();
    } else {
        // Show report configuration for selected type
        window.inConfigurationMode = true;
        showReportConfiguration();
        showConfigurationSection(type);
        
        // Activate the corresponding button in the hidden selector (for compatibility)
        const btn = document.querySelector(`.report-type-btn[data-type="${type}"]`);
        if (btn) {
            document.querySelectorAll('.report-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    }
}

// Make functions globally available
window.showReportConfiguration = showReportConfiguration;
window.selectMember = selectMember;
window.toggleReportTypeMenu = toggleReportTypeMenu;
window.selectReportType = selectReportType;

