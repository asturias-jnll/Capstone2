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

// -------- Modal validation helpers --------
function getVal(id) {
    const el = document.getElementById(id);
    return (el && typeof el.value === 'string') ? el.value.trim() : '';
}

function validateMarketingStep() {
    return !!(getVal('mcLocation') && getVal('mcUsername') && getVal('mcPassword'));
}

function validateFinanceStep() {
    return !!(getVal('foLocation') && getVal('foUsername') && getVal('foPassword'));
}

function updateNextButton() {
    const btn = document.getElementById('nextBtn');
    if (btn) btn.disabled = !validateMarketingStep();
}

function updateSaveButton() {
    const btn = document.getElementById('saveBtn');
    if (btn) btn.disabled = !validateFinanceStep();
}

// Show minimalist success dialog (matching Finance Officer design)
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
        z-index: 10100;
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

// Generate username/password from a location string
function formatBaseFromLocation(raw) {
    if (!raw) return '';
    return String(raw)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ''); // keep letters/numbers only
}

function autofillCreds(prefix) {
    // prefix: 'mc' or 'fo'
    const locEl = document.getElementById(prefix + 'Location');
    const userEl = document.getElementById(prefix + 'Username');
    const passEl = document.getElementById(prefix + 'Password');
    if (!locEl || !userEl || !passEl) return;

    const base = formatBaseFromLocation(locEl.value);
    if (base) {
        userEl.value = `${prefix}.${base}`;
        // Capitalize first letter for password to meet uppercase requirement
        const capitalizedBase = base.charAt(0).toUpperCase() + base.slice(1);
        passEl.value = `${capitalizedBase}123!`;
    } else {
        userEl.value = '';
        passEl.value = '';
    }
}

// Keep Finance Officer fields mirrored from Marketing Clerk
function syncFinanceFromMarketing() {
    const mcLocVal = getVal('mcLocation');
    const foLocEl = document.getElementById('foLocation');
    if (foLocEl) {
        foLocEl.value = mcLocVal;
    }
    // Derive FO username/password from FO location
    autofillCreds('fo');
    // Mirror Branch
    const mcBranch = document.getElementById('mcBranch');
    const foBranch = document.getElementById('foBranch');
    if (mcBranch && foBranch) {
        foBranch.value = mcBranch.value;
    }
    // Note: Email is NOT mirrored - each user needs their own email
    // Ensure role label is correct
    const foRole = document.getElementById('foRole');
    if (foRole) foRole.value = 'Finance Officer';
    updateSaveButton();
}

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
                <td colspan="7" style="text-align: center; padding: 40px;">
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
        
        const maskedPassword = '●'.repeat(8);
        return `
        <tr>
            <td>${locationText}</td>
            <td>${username}</td>
            <td><span class="password-mask" aria-label="Hidden password" title="Hidden password">${maskedPassword}</span></td>
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
            <td colspan="7" style="text-align: center; padding: 40px;">
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
    ['mcLocation','mcUsername','mcPassword','mcBranch','foLocation','foUsername','foPassword','foBranch'].forEach(id => {
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

    // Attach input listeners for validation
    ['mcLocation','mcUsername','mcPassword'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', function() {
            updateNextButton();
            // Always mirror FO from MC context
            syncFinanceFromMarketing();
        }, { once: false });
    });
    ['foLocation','foUsername','foPassword'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateSaveButton, { once: false });
    });

    // Autofill credentials when location changes
    const mcLoc = document.getElementById('mcLocation');
    if (mcLoc) mcLoc.addEventListener('input', function() {
        // Autofill MC creds from its location
        autofillCreds('mc');
        updateNextButton();
        // Keep FO mirrored whenever MC location changes
        syncFinanceFromMarketing();
    });
    const foLoc = document.getElementById('foLocation');
    if (foLoc) foLoc.addEventListener('input', function() {
        autofillCreds('fo');
        updateSaveButton();
    });

    // Initialize autofill and mirror (in case locations are pre-populated later)
    autofillCreds('mc');
    syncFinanceFromMarketing();

    // Initialize button states
    updateNextButton();
    updateSaveButton();
}

function closeAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) modal.style.display = 'none';
}

function goToFinanceStep() {
    const stepMarketing = document.getElementById('stepMarketing');
    const stepFinance = document.getElementById('stepFinance');
    if (!stepMarketing || !stepFinance) return;

    // Require all Marketing Clerk fields before proceeding
    if (!validateMarketingStep()) {
        alert('Please complete Location, Username, and Password for the Marketing Clerk.');
        return;
    }

    stepMarketing.classList.remove('active');
    stepFinance.classList.add('active');

    // Ensure FO fields mirror MC when moving to step 2
    syncFinanceFromMarketing();
}

function backToMarketingStep() {
    const stepMarketing = document.getElementById('stepMarketing');
    const stepFinance = document.getElementById('stepFinance');
    if (!stepMarketing || !stepFinance) return;
    stepFinance.classList.remove('active');
    stepMarketing.classList.add('active');
    // Ensure Next button reflects current values
    updateNextButton();
}

async function saveAddUsers() {
    // Block save unless Finance Officer fields are complete
    if (!validateFinanceStep()) {
        alert('Please complete Location, Username, and Password for the Finance Officer.');
        return;
    }
    // Collect values for backend API (email will be empty string as placeholder)
    const payload = {
        marketingClerk: {
            location: document.getElementById('mcLocation')?.value?.trim() || '',
            username: document.getElementById('mcUsername')?.value?.trim() || '',
            email: '', // Empty placeholder email
            password: document.getElementById('mcPassword')?.value || '',
            role: document.getElementById('mcRole')?.value || 'Marketing Clerk',
            branch: document.getElementById('mcBranch')?.value?.trim() || ''
        },
        financeOfficer: {
            location: document.getElementById('foLocation')?.value?.trim() || '',
            username: document.getElementById('foUsername')?.value?.trim() || '',
            email: '', // Empty placeholder email
            password: document.getElementById('foPassword')?.value || '',
            role: document.getElementById('foRole')?.value || 'Finance Officer',
            branch: document.getElementById('foBranch')?.value?.trim() || ''
        }
    };

    console.log('Submitting branch users:', payload);

    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('No access token found');
            alert('Authentication error. Please log in again.');
            return;
        }

        // Call backend API to register both users
        const response = await fetch('/api/auth/register-branch-users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('Branch users registered successfully:', result);

            // Show success dialog
            showSuccessDialog('The New Branch Users of IMVCMPC were added successfully');

            // Reset branch cache so next modal open recalculates from current table
            nextBranchNumberCache = null;

            // Reload users from backend to show the newly created users
            await loadUsers();

            // Close modal shortly after showing dialog
            setTimeout(() => {
                closeAddUserModal();
            }, 600);
        } else {
            console.error('Failed to register branch users:', result);
            alert(`Failed to add users: ${result.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error registering branch users:', error);
        alert('An error occurred while adding users. Please try again.');
    }
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
    
    if (currentStatus) {
        // Show deactivate confirmation modal
        showDeactivateConfirmation(userId, currentStatus);
    } else {
        // For activate, use simple confirm (or can be updated later)
        if (confirm(`Are you sure you want to ${action} this user?`)) {
            performToggleUserStatus(userId, currentStatus);
        }
    }
}

// Show deactivate confirmation modal
function showDeactivateConfirmation(userId, currentStatus) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'deactivate-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'deactivate-modal';
    modalContent.style.cssText = `
        background: #E9EEF3;
        border-radius: 24px;
        padding: 24px;
        text-align: center;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        animation: modalSlideIn 0.3s ease-out;
    `;

    modalContent.innerHTML = `
        <h2 style="
            font-size: 18px;
            font-weight: 600;
            color: #0B5E1C;
            margin-bottom: 8px;
        ">Confirm Deactivation</h2>
        <p style="
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 18px;
            line-height: 1.4;
        ">Are you sure you want to deactivate this user?</p>
        <div style="
            display: flex;
            gap: 12px;
            justify-content: center;
        ">
            <button id="cancelDeactivate" style="
                padding: 12px 24px;
                border: 1px solid #D1D5DB;
                border-radius: 10px;
                background: white;
                color: #4B5563;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 100px;
            ">Cancel</button>
            <button id="confirmDeactivate" style="
                padding: 12px 24px;
                border: none;
                border-radius: 10px;
                background: #187C19;
                color: white;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 100px;
            ">Deactivate</button>
        </div>
    `;

    // Add CSS animation if not already added
    if (!document.getElementById('deactivate-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'deactivate-modal-styles';
        style.textContent = `
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            @keyframes modalSlideOut {
                from {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
                to {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
            }
            
            #cancelDeactivate:hover {
                border-color: #9CA3AF;
                background: #F9FAFB;
                transform: translateY(-1px);
            }
            
            #confirmDeactivate:hover {
                background: #0B5E1C;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(11, 94, 28, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    // Add modal to page
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Add event listeners
    document.getElementById('cancelDeactivate').addEventListener('click', () => {
        closeDeactivateModal();
    });

    document.getElementById('confirmDeactivate').addEventListener('click', () => {
        closeDeactivateModal();
        performToggleUserStatus(userId, currentStatus);
    });

    // Close modal on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeDeactivateModal();
        }
    });

    // Close modal on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeDeactivateModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Close deactivate modal
function closeDeactivateModal() {
    const modal = document.querySelector('.deactivate-modal-overlay');
    if (modal) {
        const modalContent = modal.querySelector('.deactivate-modal');
        if (modalContent) {
            modalContent.style.animation = 'modalSlideOut 0.2s ease-in';
        }
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 200);
    }
}

// Perform the actual toggle user status action
function performToggleUserStatus(userId, currentStatus) {
    console.log(`Toggle user status: ${userId}, new status: ${!currentStatus}`);
    // TODO: Implement API call to toggle user status
    // After success, reload users
    loadUsers();
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
window.closeSuccessDialog = closeSuccessDialog;

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

