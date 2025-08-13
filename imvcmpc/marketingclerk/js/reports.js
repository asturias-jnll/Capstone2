// Reports functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize reports when page is loaded
    initializeReports();
});

// Initialize all reports functionality
function initializeReports() {
    // Setup event listeners
    setupToggleEventListeners();
    setupFilterEventListeners();
    setupSearchEventListeners();
    
    // Initialize default state
    updateReportDisplay();
}

// Setup toggle button event listeners
function setupToggleEventListeners() {
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all toggle buttons
            toggleBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update filter sections
            updateFilterSections(this.getAttribute('data-type'));
            
            // Update report display
            updateReportDisplay();
        });
    });
}

// Setup filter event listeners
function setupFilterEventListeners() {
    const branchFilter = document.getElementById('reportBranch');
    const monthFilter = document.getElementById('reportMonth');
    const yearFilter = document.getElementById('reportYear');
    
    if (branchFilter) {
        branchFilter.addEventListener('change', updateReportDisplay);
    }
    
    if (monthFilter) {
        monthFilter.addEventListener('change', updateReportDisplay);
    }
    
    if (yearFilter) {
        yearFilter.addEventListener('change', updateReportDisplay);
    }
}

// Setup search event listeners
function setupSearchEventListeners() {
    const memberSearch = document.getElementById('memberSearchReport');
    
    if (memberSearch) {
        memberSearch.addEventListener('input', function() {
            // Debounce search input
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                updateReportDisplay();
            }, 300);
        });
    }
}

// Update filter sections based on toggle selection
function updateFilterSections(type) {
    const memberFilters = document.getElementById('memberFilters');
    const branchFilters = document.getElementById('branchFilters');
    
    if (type === 'member') {
        memberFilters.classList.add('active');
        branchFilters.classList.remove('active');
    } else if (type === 'branch') {
        memberFilters.classList.remove('active');
        branchFilters.classList.add('active');
    }
}

// Update report display based on current filters
function updateReportDisplay() {
    const activeToggle = document.querySelector('.toggle-btn.active');
    const reportType = activeToggle ? activeToggle.getAttribute('data-type') : 'member';
    
    // Get current filter values
    const filters = getCurrentFilters();
    
    // Generate report data based on filters
    const reportData = generateReportData(reportType, filters);
    
    // Update report title and content
    updateReportTitle(reportType);
    updateReportContent(reportData);
}

// Get current filter values
function getCurrentFilters() {
    const memberSearch = document.getElementById('memberSearchReport')?.value || '';
    const branch = document.getElementById('reportBranch')?.value || '';
    const month = document.getElementById('reportMonth')?.value || '';
    const year = document.getElementById('reportYear')?.value || '';
    
    return {
        memberSearch,
        branch,
        month,
        year
    };
}

// Generate report data based on type and filters
function generateReportData(type, filters) {
    // Mock data - in real app, this would come from API/database
    if (type === 'member') {
        return generateMemberReport(filters);
    } else if (type === 'branch') {
        return generateBranchReport(filters);
    }
    
    return { message: 'No report type selected' };
}

// Generate member report data
function generateMemberReport(filters) {
    const mockMembers = [
        { name: 'Rita Helera', branch: 'Branch 1 - IBAAN', savings: 34000, disbursement: 15000, total: 49000 },
        { name: 'Jom Cortez', branch: 'Branch 1 - IBAAN', savings: 40000, disbursement: 20000, total: 60000 },
        { name: 'Alvin Aquino', branch: 'Branch 1 - IBAAN', savings: 50000, disbursement: 25000, total: 75000 },
        { name: 'Maria Santos', branch: 'Branch 2 - BAUAN', savings: 35000, disbursement: 18000, total: 53000 },
        { name: 'Juan Dela Cruz', branch: 'Branch 3 - SAN JOSE', savings: 45000, disbursement: 22000, total: 67000 }
    ];
    
    let filteredMembers = [...mockMembers];
    
    // Apply filters
    if (filters.memberSearch) {
        filteredMembers = filteredMembers.filter(member => 
            member.name.toLowerCase().includes(filters.memberSearch.toLowerCase())
        );
    }
    
    if (filters.branch) {
        filteredMembers = filteredMembers.filter(member => 
            member.branch === filters.branch
        );
    }
    
    return {
        type: 'member',
        totalMembers: filteredMembers.length,
        totalSavings: filteredMembers.reduce((sum, member) => sum + member.savings, 0),
        totalDisbursement: filteredMembers.reduce((sum, member) => sum + member.disbursement, 0),
        totalAmount: filteredMembers.reduce((sum, member) => sum + member.total, 0),
        members: filteredMembers
    };
}

// Generate branch report data
function generateBranchReport(filters) {
    const mockBranches = [
        { name: 'Branch 1 - IBAAN', savings: 145000, disbursement: 98000, total: 243000 },
        { name: 'Branch 2 - BAUAN', savings: 116000, disbursement: 85000, total: 201000 },
        { name: 'Branch 3 - SAN JOSE', savings: 125000, disbursement: 92000, total: 217000 },
        { name: 'Branch 4 - ROSARIO', savings: 98000, disbursement: 75000, total: 173000 },
        { name: 'Branch 5 - SAN JUAN', savings: 87000, disbursement: 68000, total: 155000 },
        { name: 'Branch 6 - PADRE GARCIA', savings: 92000, disbursement: 72000, total: 164000 }
    ];
    
    let filteredBranches = [...mockBranches];
    
    // Apply branch filter
    if (filters.branch) {
        filteredBranches = filteredBranches.filter(branch => 
            branch.name === filters.branch
        );
    }
    
    return {
        type: 'branch',
        totalBranches: filteredBranches.length,
        totalSavings: filteredBranches.reduce((sum, branch) => sum + branch.savings, 0),
        totalDisbursement: filteredBranches.reduce((sum, branch) => sum + branch.disbursement, 0),
        totalAmount: filteredBranches.reduce((sum, branch) => sum + branch.total, 0),
        branches: filteredBranches
    };
}

// Update report title
function updateReportTitle(type) {
    const reportTitle = document.getElementById('reportTitle');
    if (reportTitle) {
        reportTitle.textContent = type.toUpperCase() + ' REPORT';
    }
}

// Update report content
function updateReportContent(data) {
    const summaryContent = document.getElementById('summaryContent');
    if (!summaryContent) return;
    
    if (data.message) {
        summaryContent.innerHTML = `<p>${data.message}</p>`;
        return;
    }
    
    let content = '';
    
    if (data.type === 'member') {
        content = generateMemberReportHTML(data);
    } else if (data.type === 'branch') {
        content = generateBranchReportHTML(data);
    }
    
    summaryContent.innerHTML = content;
}

// Generate member report HTML
function generateMemberReportHTML(data) {
    let html = `
        <div class="report-stats">
            <div class="stat-row">
                <span class="stat-label">Total Members:</span>
                <span class="stat-value">${data.totalMembers}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Savings:</span>
                <span class="stat-value">₱${data.totalSavings.toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Disbursement:</span>
                <span class="stat-value">₱${data.totalDisbursement.toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Amount:</span>
                <span class="stat-value">₱${data.totalAmount.toLocaleString()}</span>
            </div>
        </div>
    `;
    
    if (data.members && data.members.length > 0) {
        html += `
            <div class="report-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Branch</th>
                            <th>Savings</th>
                            <th>Disbursement</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.members.forEach(member => {
            html += `
                <tr>
                    <td>${member.name}</td>
                    <td>${member.branch}</td>
                    <td>₱${member.savings.toLocaleString()}</td>
                    <td>₱${member.disbursement.toLocaleString()}</td>
                    <td>₱${member.total.toLocaleString()}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    return html;
}

// Generate branch report HTML
function generateBranchReportHTML(data) {
    let html = `
        <div class="report-stats">
            <div class="stat-row">
                <span class="stat-label">Total Branches:</span>
                <span class="stat-value">${data.totalBranches}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Savings:</span>
                <span class="stat-value">₱${data.totalSavings.toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Disbursement:</span>
                <span class="stat-value">₱${data.totalDisbursement.toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Amount:</span>
                <span class="stat-value">₱${data.totalAmount.toLocaleString()}</span>
            </div>
        </div>
    `;
    
    if (data.branches && data.branches.length > 0) {
        html += `
            <div class="report-table">
                <table>
                    <thead>
                        <tr>
                            <th>Branch</th>
                            <th>Savings</th>
                            <th>Disbursement</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.branches.forEach(branch => {
            html += `
                <tr>
                    <td>${branch.name}</td>
                    <td>₱${branch.savings.toLocaleString()}</td>
                    <td>₱${branch.disbursement.toLocaleString()}</td>
                    <td>₱${branch.total.toLocaleString()}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    return html;
}

// Open date picker (placeholder function)
function openDatePicker() {
    // In a real implementation, this would open a date picker modal
    // For now, we'll just show an alert
    alert('Date picker functionality will be implemented here.');
}

// Download report as PDF
function downloadReport() {
    const activeToggle = document.querySelector('.toggle-btn.active');
    const reportType = activeToggle ? activeToggle.getAttribute('data-type') : 'member';
    
    console.log(`Downloading ${reportType} report...`);
    
    // In a real implementation, this would generate and download a PDF
    alert(`${reportType.toUpperCase()} report download will be implemented here.`);
}

// Clear all filters
function clearFilters() {
    // Reset search input
    const memberSearch = document.getElementById('memberSearchReport');
    if (memberSearch) memberSearch.value = '';
    
    // Reset select dropdowns
    const branchSelect = document.getElementById('reportBranch');
    if (branchSelect) branchSelect.value = '';
    
    const monthSelect = document.getElementById('reportMonth');
    if (monthSelect) monthSelect.value = '';
    
    const yearSelect = document.getElementById('reportYear');
    if (yearSelect) yearSelect.value = '';
    
    // Reset date display
    const selectedDate = document.getElementById('selectedDate');
    if (selectedDate) selectedDate.textContent = 'Select Date';
    
    // Reset type toggle to savings
    const typeBtns = document.querySelectorAll('.type-btn');
    typeBtns.forEach(btn => btn.classList.remove('active'));
    const savingsBtn = document.querySelector('.type-btn[data-type="savings"]');
    if (savingsBtn) savingsBtn.classList.add('active');
    
    // Update report display
    updateReportDisplay();
}
