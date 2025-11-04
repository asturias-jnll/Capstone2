// User Management JavaScript for IT Head

// Sort state - default: branch ascending
let sortField = 'branch';
let sortOrder = 'asc';

// Store all users for filtering
let allUsers = [];
// Cache next branch number after first computation or after save
let nextBranchNumberCache = null;

// Initialize user management
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
    
    // Close sort menu when clicking outside
    document.addEventListener('click', function(e) {
        const sortDropdown = document.getElementById('sortDropdown');
        if (sortDropdown && !sortDropdown.contains(e.target)) {
            const sortMenu = document.getElementById('sortMenu');
            if (sortMenu) {
                sortMenu.classList.remove('active');
            }
        }
    });
    // Note: Modal should only close via the X button; ESC and backdrop clicks are disabled per requirements.
});

// Load all users and filter for Marketing Clerks and Finance Officers only
async function loadUsers() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('No access token found');
            return;
        }

        const response = await fetch('/api/auth/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const rawUsers = data.users || [];
            
            // Filter users: only show Marketing Clerks (MC) and Finance Officers (FO)
            // Exclude test users but include TANAUAN branch users
            const filteredUsers = rawUsers.filter(user => {
                const username = user.username || '';
                const role = user.role || user.role_display_name || '';
                
                // Only include users with mc. or fo. prefix
                const isMarketingClerk = username.toLowerCase().startsWith('mc.');
                const isFinanceOfficer = username.toLowerCase().startsWith('fo.');
                
                // Or check by role
                const isMC = role.toLowerCase().includes('marketing clerk');
                const isFO = role.toLowerCase().includes('finance officer');
                
                // Exclude test users (specifically test accounts, not TANAUAN branch users)
                // and IT Head
                const isNotTestUser = !username.toLowerCase().includes('test');
                const isNotITHead = role.toLowerCase() !== 'it head';
                
                return (isMarketingClerk || isFinanceOfficer || isMC || isFO) && 
                       isNotTestUser && 
                       isNotITHead;
            });
            
            // Store filtered users for search functionality
            allUsers = filteredUsers;
            
            applySearchAndDisplay();
            // Invalidate cached next branch number when user list refreshes
            nextBranchNumberCache = null;
        } else {
            console.error('Failed to load users');
            displayError('Failed to load users. Please try again.');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        displayError('An error occurred while loading users.');
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-users" style="font-size: 48px; color: #9CA3AF; margin-bottom: 16px;"></i>
                    <p style="color: #6B7280; font-size: 16px;">No users found</p>
                    <p style="color: #9CA3AF; font-size: 14px; margin-top: 8px;">Showing Marketing Clerks and Finance Officers only</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Helper to derive clean LOCATION text (e.g., IBAAN, BAUAN)
    const getLocation = (u) => {
        let loc = (u.branch_location || '').toString().trim();
        if (!loc) {
            // Try to derive from branch_name if available
            let bn = (u.branch_name || '').toString();
            // Remove common words and patterns, keep probable location token
            bn = bn.replace(/imvcmpc/gi, '')
                   .replace(/main\s*branch/gi, 'IBAAN')
                   .replace(/branch\s*\d+/gi, '')
                   .replace(/marketing\s*clerk|finance\s*officer/gi, '')
                   .replace(/[-_]/g, ' ')
                   .trim();
            // Take first word chunk as fallback location
            loc = bn.split(/\s+/)[0] || '';
        }
        return loc ? loc.toUpperCase() : 'N/A';
    };

    // Apply sorting based on selected field
    const sortedUsers = users.sort((a, b) => {
        let valueA, valueB;
        
        if (sortField === 'location') {
            // Sort by derived location name
            valueA = getLocation(a).toLowerCase();
            valueB = getLocation(b).toLowerCase();
            
            const comparison = valueA.localeCompare(valueB);
            return sortOrder === 'asc' ? comparison : -comparison;
            
        } else if (sortField === 'role') {
            valueA = (a.role_display_name || a.role || '').toLowerCase();
            valueB = (b.role_display_name || b.role || '').toLowerCase();
            
            // Compare values
            const comparison = valueA.localeCompare(valueB);
            return sortOrder === 'asc' ? comparison : -comparison;
            
        } else if (sortField === 'branch') {
            // Extract branch number for proper numeric sorting
            const getBranchNumber = (branchName) => {
                if (!branchName) return 999;
                
                const branchLower = branchName.toLowerCase();
                
                // Main Branch is 1
                if (branchLower.includes('main') || branchLower.includes('ibaan')) {
                    return 1;
                }
                
                // Extract number from "Branch X"
                const match = branchName.match(/branch\s*(\d+)/i);
                if (match) {
                    return parseInt(match[1], 10);
                }
                
                // Extract number from location names
                const locationMatch = branchName.match(/(\d+)/);
                if (locationMatch) {
                    return parseInt(locationMatch[1], 10);
                }
                
                return 999; // Unknown branches go last
            };
            
            const branchNumA = getBranchNumber(a.branch_name || a.branch_location);
            const branchNumB = getBranchNumber(b.branch_name || b.branch_location);
            
            // Numeric comparison
            if (branchNumA < branchNumB) {
                return sortOrder === 'asc' ? -1 : 1;
            }
            if (branchNumA > branchNumB) {
                return sortOrder === 'asc' ? 1 : -1;
            }
            return 0;
        }
        
        return 0;
    });
    
    tbody.innerHTML = sortedUsers.map(user => {
        // Clean first and last name - remove branch, role, and other unnecessary text
        let firstName = (user.first_name || '').replace(/finance officer/gi, '').replace(/marketing clerk/gi, '').replace(/branch\s*\d+/gi, '').trim();
        let lastName = (user.last_name || '').replace(/finance officer/gi, '').replace(/marketing clerk/gi, '').replace(/branch\s*\d+/gi, '').trim();
        
        const fullName = `${firstName} ${lastName}`.trim();
        const username = user.username || '';
        const role = user.role_display_name || user.role || 'N/A';
        
        // Clean branch name - extract just the branch name/location, remove any role text
        let branchName = user.branch_name || user.branch_location || 'N/A';
        
        // Remove common role patterns from branch name
        branchName = branchName.replace(/finance officer/gi, '').trim();
        branchName = branchName.replace(/marketing clerk/gi, '').trim();
        branchName = branchName.replace(/\s+/g, ' ').trim(); // Remove extra spaces
        const locationText = getLocation(user);
        
        return `
        <tr>
            <td>${locationText}</td>
            <td>${username}</td>
            <td>${role}</td>
            <td>${branchName}</td>
            <td>
                <span class="status-badge ${user.is_active ? 'active' : 'inactive'}">
                    ${user.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button onclick="toggleUserStatus('${user.id}', ${user.is_active}, event)" class="action-btn ${user.is_active ? 'deactivate' : 'activate'}" title="${user.is_active ? 'Deactivate' : 'Activate'}">
                    <i class="fas fa-${user.is_active ? 'lock' : 'unlock'}"></i>
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

// Display error message
function displayError(message) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #EF4444; margin-bottom: 16px;"></i>
                <p style="color: #EF4444; font-size: 16px;">${message}</p>
            </td>
        </tr>
    `;
}

// Show add user modal
function showAddUserModal() {
    const modal = document.getElementById('addUserModal');
    const stepMarketing = document.getElementById('stepMarketing');
    const stepFinance = document.getElementById('stepFinance');
    if (!modal || !stepMarketing || !stepFinance) return;

    // Reset fields
    ['mcLocation','mcUsername','mcBranch','foLocation','foUsername','foBranch'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const mcRole = document.getElementById('mcRole');
    const foRole = document.getElementById('foRole');
    if (mcRole) mcRole.value = 'Marketing Clerk';
    if (foRole) foRole.value = 'Finance Officer';

    // Auto-assign next Branch number to both entries
    const nextBranchNum = getNextBranchNumber();
    const mcBranch = document.getElementById('mcBranch');
    const foBranch = document.getElementById('foBranch');
    if (mcBranch) mcBranch.value = `Branch ${nextBranchNum}`;
    if (foBranch) foBranch.value = `Branch ${nextBranchNum}`;

    // Show modal and first step
    stepMarketing.classList.add('active');
    stepFinance.classList.remove('active');
    modal.style.display = 'flex';
}

function closeAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) modal.style.display = 'none';
}

function goToFinanceStep() {
    const stepMarketing = document.getElementById('stepMarketing');
    const stepFinance = document.getElementById('stepFinance');
    if (!stepMarketing || !stepFinance) return;

    // Basic validation (optional, minimal)
    const mcUsername = document.getElementById('mcUsername');
    if (mcUsername && !mcUsername.value.trim()) {
        alert('Please provide a Marketing Clerk username.');
        return;
    }

    stepMarketing.classList.remove('active');
    stepFinance.classList.add('active');
}

function backToMarketingStep() {
    const stepMarketing = document.getElementById('stepMarketing');
    const stepFinance = document.getElementById('stepFinance');
    if (!stepMarketing || !stepFinance) return;
    stepFinance.classList.remove('active');
    stepMarketing.classList.add('active');
}

function saveAddUsers() {
    // Collect values (no API call yet; will be implemented later per instruction)
    const payload = {
        marketingClerk: {
            location: document.getElementById('mcLocation')?.value?.trim() || '',
            username: document.getElementById('mcUsername')?.value?.trim() || '',
            role: document.getElementById('mcRole')?.value || 'Marketing Clerk',
            branch: document.getElementById('mcBranch')?.value?.trim() || ''
        },
        financeOfficer: {
            location: document.getElementById('foLocation')?.value?.trim() || '',
            username: document.getElementById('foUsername')?.value?.trim() || '',
            role: document.getElementById('foRole')?.value || 'Finance Officer',
            branch: document.getElementById('foBranch')?.value?.trim() || ''
        }
    };

    console.log('Add Users payload (no submit yet):', payload);
    // Pre-increment next branch number so successive additions increase: Branch N+1
    const currentNext = getNextBranchNumber();
    nextBranchNumberCache = currentNext + 1;
    // Also update the visible fields in case user stays in modal to add more
    const mcBranch = document.getElementById('mcBranch');
    const foBranch = document.getElementById('foBranch');
    if (mcBranch) mcBranch.value = `Branch ${nextBranchNumberCache}`;
    if (foBranch) foBranch.value = `Branch ${nextBranchNumberCache}`;
    // Do not close modal on save until further instructions
}

// Helpers to compute next Branch number based on existing users
function parseBranchNumber(branchText) {
    if (!branchText) return null;
    const text = String(branchText).toLowerCase();
    if (text.includes('main') || text.includes('ibaan')) return 1; // Treat Main/Ibaan as Branch 1
    const match = /branch\s*(\d+)/i.exec(branchText);
    if (match) return parseInt(match[1], 10);
    const matchAny = /(\d+)/.exec(branchText);
    if (matchAny) return parseInt(matchAny[1], 10);
    return null;
}

function getMaxBranchNumberFromUsers() {
    let maxNum = 0;
    allUsers.forEach(u => {
        const candidates = [u.branch_name, u.branch_location];
        candidates.forEach(c => {
            const n = parseBranchNumber(c);
            if (typeof n === 'number' && n > maxNum) maxNum = n;
        });
    });
    return maxNum;
}

function getNextBranchNumber() {
    if (typeof nextBranchNumberCache === 'number') return nextBranchNumberCache;
    const maxExisting = getMaxBranchNumberFromUsers();
    nextBranchNumberCache = (maxExisting || 0) + 1;
    return nextBranchNumberCache;
}

// Toggle user status (activate/deactivate)
function toggleUserStatus(userId, currentStatus, event) {
    if (event) event.stopPropagation();
    const action = currentStatus ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} this user?`)) {
        console.log(`Toggle user status: ${userId}, new status: ${!currentStatus}`);
        // TODO: Implement API call to toggle user status
        // After success, reload users
        loadUsers();
    }
}

// Note: Edit and Reset Password actions removed per requirements.

// Toggle sort dropdown
function toggleSortDropdown() {
    const sortMenu = document.getElementById('sortMenu');
    if (sortMenu) {
        sortMenu.classList.toggle('active');
    }
}

// Select sort option
function selectSortOption(field) {
    sortField = field;
    applySearchAndDisplay(); // Apply sorting to filtered results
    
    // Update active state in dropdown
    const sortOptions = document.querySelectorAll('.sort-section .sort-option');
    sortOptions.forEach((option, index) => {
        if (index === (field === 'location' ? 0 : field === 'role' ? 1 : 2)) {
            option.style.background = 'var(--gray-50)';
            option.style.fontWeight = '600';
        } else {
            option.style.background = '';
            option.style.fontWeight = '400';
        }
    });
}

// Select sort order
function selectSortOrder(order) {
    sortOrder = order;
    applySearchAndDisplay(); // Apply sorting to filtered results
    
    // Update check marks
    const ascCheck = document.getElementById('ascCheck');
    const descCheck = document.getElementById('descCheck');
    
    if (order === 'asc') {
        if (ascCheck) ascCheck.style.display = 'inline-block';
        if (descCheck) descCheck.style.display = 'none';
    } else {
        if (ascCheck) ascCheck.style.display = 'none';
        if (descCheck) descCheck.style.display = 'inline-block';
    }
}

// Export functions
window.showAddUserModal = showAddUserModal;
window.closeAddUserModal = closeAddUserModal;
window.goToFinanceStep = goToFinanceStep;
window.backToMarketingStep = backToMarketingStep;
window.saveAddUsers = saveAddUsers;
window.toggleUserStatus = toggleUserStatus;
window.loadUsers = loadUsers;
window.toggleSortDropdown = toggleSortDropdown;
window.selectSortOption = selectSortOption;
window.selectSortOrder = selectSortOrder;

// Filter users based on search input
function filterUsers() {
    applySearchAndDisplay();
}

// Apply search filter and display users
function applySearchAndDisplay() {
    const searchInput = document.getElementById('userSearch');
    const searchTerm = (searchInput?.value || '').toLowerCase().trim();
    
    let filteredUsers = allUsers;
    
    // Apply search filter if search term exists
    if (searchTerm) {
        filteredUsers = allUsers.filter(user => {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
            const username = (user.username || '').toLowerCase();
            const role = (user.role_display_name || user.role || '').toLowerCase();
         const branchName = ((user.branch_name || user.branch_location || '')).toLowerCase();
         const locationText = ((user.branch_location || '') || '').toLowerCase();
            
            return fullName.includes(searchTerm) ||
                   username.includes(searchTerm) ||
                   role.includes(searchTerm) ||
             branchName.includes(searchTerm) ||
             locationText.includes(searchTerm);
        });
    }
    
    displayUsers(filteredUsers);
}

