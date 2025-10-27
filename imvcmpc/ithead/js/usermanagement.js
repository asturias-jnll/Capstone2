// User Management JavaScript for IT Head

// Sort state - default: branch ascending
let sortField = 'branch';
let sortOrder = 'asc';

// Store all users for filtering
let allUsers = [];

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
    
    // Apply sorting based on selected field
    const sortedUsers = users.sort((a, b) => {
        let valueA, valueB;
        
        if (sortField === 'name') {
            const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
            const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
            valueA = nameA;
            valueB = nameB;
            
            // Compare values
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
        
        return `
        <tr>
            <td>${fullName || username}</td>
            <td>${username}</td>
            <td>${role}</td>
            <td>${branchName}</td>
            <td>
                <span class="status-badge ${user.is_active ? 'active' : 'inactive'}">
                    ${user.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button onclick="editUser('${user.id}', event)" class="action-btn edit" title="Edit User">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="toggleUserStatus('${user.id}', ${user.is_active}, event)" class="action-btn ${user.is_active ? 'deactivate' : 'activate'}" title="${user.is_active ? 'Deactivate' : 'Activate'}">
                    <i class="fas fa-${user.is_active ? 'lock' : 'unlock'}"></i>
                </button>
                <button onclick="resetPassword('${user.id}', event)" class="action-btn reset" title="Reset Password">
                    <i class="fas fa-key"></i>
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
    alert('Add User feature will be implemented in future updates.');
}

// Edit user
function editUser(userId, event) {
    if (event) event.stopPropagation();
    alert(`Edit user feature for user ID: ${userId}`);
    // TODO: Implement edit user modal
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

// Reset password
function resetPassword(userId, event) {
    if (event) event.stopPropagation();
    if (confirm('Are you sure you want to reset this user\'s password?')) {
        console.log('Reset password for:', userId);
        // TODO: Implement API call to reset password
    }
}

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
        if (index === (field === 'name' ? 0 : field === 'role' ? 1 : 2)) {
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
window.editUser = editUser;
window.toggleUserStatus = toggleUserStatus;
window.resetPassword = resetPassword;
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
            
            return fullName.includes(searchTerm) ||
                   username.includes(searchTerm) ||
                   role.includes(searchTerm) ||
                   branchName.includes(searchTerm);
        });
    }
    
    displayUsers(filteredUsers);
}

