// Account JavaScript for IT Head

let isEditMode = false;
let originalData = {};
let detachListeners = null; // function to remove input listeners when exiting edit mode

// Initialize account
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
});

// Helper: format branch display as "Main Branch IBAAN" or "Branch 3 IBAAN"
function formatBranchDisplay({ isMain, name, location, number, id }) {
    const loc = (location || '').toString().trim();
    const locUpper = loc ? loc.toUpperCase() : '';
    const nameStr = (name || '').toString().trim();
    const isMainBranch = !!isMain || /\bmain\b/i.test(nameStr);

    if (isMainBranch) {
        return `Main Branch ${locUpper || 'IBAAN'}`.trim();
    }

    // Prefer explicit number
    let branchNum = number;
    if (!branchNum && nameStr) {
        const m = nameStr.match(/branch\s*(\d+)/i);
        if (m) branchNum = m[1];
    }
    // As a last resort, if id looks numeric and > 0, use it
    if (!branchNum && typeof id !== 'undefined' && id !== null) {
        const n = parseInt(id, 10);
        if (!isNaN(n) && n > 0) branchNum = n;
    }

    if (branchNum) {
        return `Branch ${branchNum} ${locUpper || ''}`.trim();
    }

    // Fallbacks
    if (nameStr) {
        // If name already includes 'Branch', keep it and append location
        if (/branch/i.test(nameStr)) {
            return `${nameStr} ${locUpper || ''}`.trim();
        }
        return `${nameStr} ${locUpper || ''}`.trim();
    }
    return locUpper || 'Main Branch IBAAN';
}

// Load user information
async function loadUserInfo() {
    try {
        // Prepare fallbacks from localStorage
        const storedUserRaw = localStorage.getItem('user');
        let storedUser = {};
        try { storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : {}; } catch (_) {}
        const loginUsername = localStorage.getItem('login_username');

        // Set immediate defaults so fields are never blank
        const defaultFullName = (storedUser.first_name && storedUser.last_name)
            ? `${storedUser.first_name} ${storedUser.last_name}`.trim()
            : '';
        const defaultRole = storedUser.role_display_name || storedUser.role || 'IT Head';
        const defaultUsername = storedUser.username || loginUsername || 'it.head';
        const defaultEmail = storedUser.email || '';
        const defaultBranch = formatBranchDisplay({
            isMain: storedUser.is_main_branch_user,
            name: storedUser.branch_name,
            location: storedUser.branch_location,
            number: storedUser.branch_number,
            id: storedUser.branch_id
        }) || 'Main Branch IBAAN';

        document.getElementById('fullName').value = defaultFullName;
        document.getElementById('role').value = defaultRole;
        document.getElementById('username').value = defaultUsername;
        document.getElementById('email').value = defaultEmail;
        document.getElementById('branchLocation').value = defaultBranch;

        // Initialize originalData with defaults; may be overridden after fetch
        originalData = {
            fullName: defaultFullName,
            username: defaultUsername,
            email: defaultEmail
        };

        const token = localStorage.getItem('access_token');
        if (!token) {
            console.warn('No access token found; using fallback values');
            return;
        }

        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            // Populate fields
            document.getElementById('fullName').value = data.first_name && data.last_name 
                ? `${data.first_name} ${data.last_name}`.trim() 
                : '';
            document.getElementById('role').value = data.role_display_name || data.role || 'IT Head';
            document.getElementById('username').value = data.username || 'it.head';
            document.getElementById('email').value = data.email || '';
            document.getElementById('branchLocation').value = formatBranchDisplay({
                isMain: data.is_main_branch_user,
                name: data.branch_name,
                location: data.branch_location,
                number: data.branch_number,
                id: data.branch_id
            });
            
            // Store original data for cancel
            originalData = {
                fullName: document.getElementById('fullName').value,
                username: document.getElementById('username').value,
                email: document.getElementById('email').value
            };
        } else {
            console.warn('Failed to fetch /api/auth/me; keeping fallback values');
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// Update button state based on whether fields changed
function updateEditButtonDirtyState() {
    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const isDirty = (
        fullName !== (originalData.fullName || '') ||
        username !== (originalData.username || '') ||
        email !== (originalData.email || '')
    );
    const btn = document.getElementById('editBtn');
    const btnText = document.getElementById('editBtnText');
    if (!btn || !btnText) return;
    if (isEditMode) {
        btnText.textContent = 'Update';
        btn.disabled = !isDirty; // only enable when there are changes
    } else {
        btnText.textContent = 'Edit';
        btn.disabled = false;
    }
}

function enterEditMode() {
    if (isEditMode) return;
    isEditMode = true;
    const fullNameInput = document.getElementById('fullName');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const cancelBtn = document.getElementById('cancelBtn');

    // Store current values for dirty check
    originalData = {
        fullName: fullNameInput.value,
        username: usernameInput.value,
        email: emailInput.value
    };

    // Enable inputs
    fullNameInput.disabled = false;
    usernameInput.disabled = false;
    emailInput.disabled = false;

    // Show cancel button in edit mode
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    // Attach input listeners to detect changes
    const handler = updateEditButtonDirtyState;
    fullNameInput.addEventListener('input', handler);
    usernameInput.addEventListener('input', handler);
    emailInput.addEventListener('input', handler);
    detachListeners = () => {
        fullNameInput.removeEventListener('input', handler);
        usernameInput.removeEventListener('input', handler);
        emailInput.removeEventListener('input', handler);
        detachListeners = null;
    };

    // Initialize button state in edit mode
    updateEditButtonDirtyState();
}

function exitEditMode() {
    if (!isEditMode) return;
    isEditMode = false;
    const fullNameInput = document.getElementById('fullName');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const cancelBtn = document.getElementById('cancelBtn');

    // Detach listeners
    if (typeof detachListeners === 'function') detachListeners();

    // Disable inputs
    fullNameInput.disabled = true;
    usernameInput.disabled = true;
    emailInput.disabled = true;

    // Hide cancel button when exiting edit mode
    if (cancelBtn) cancelBtn.style.display = 'none';

    // Reset button state
    updateEditButtonDirtyState();
}

// Single button handler: Edit -> enter edit mode; Update -> save when dirty
function onEditOrUpdateClick() {
    if (!isEditMode) {
        enterEditMode();
        return;
    }
    // In edit mode: if button enabled, perform update
    const btn = document.getElementById('editBtn');
    if (btn && !btn.disabled) {
        savePersonalInfo();
    }
}

// Cancel editing and revert values
function onCancelEdit() {
    try {
        document.getElementById('fullName').value = originalData.fullName || '';
        document.getElementById('username').value = originalData.username || '';
        document.getElementById('email').value = originalData.email || '';
    } catch (e) {
        console.warn('Failed to restore original values:', e);
    }
    exitEditMode();
}

// Save personal information
async function savePersonalInfo() {
    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    
    if (!fullName || !username || !email) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            showNotification('Unauthorized', 'error');
            return;
        }
        
        // Split full name into first and last name
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const response = await fetch('/api/auth/update-profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                username: username,
                email: email
            })
        });
        
        if (response.ok) {
            showNotification('Profile updated successfully', 'success');
            // Update stored data and exit edit mode
            originalData = { fullName, username, email };
            exitEditMode();
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Failed to update profile', 'error');
    }
}

// Export functions to window
window.onEditOrUpdateClick = onEditOrUpdateClick;
window.savePersonalInfo = savePersonalInfo;
window.onCancelEdit = onCancelEdit;

// Handle change password
async function handleChangePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Please fill in all password fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showNotification('Password must be at least 8 characters long', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            showNotification('Unauthorized', 'error');
            return;
        }
        
        const response = await fetch('/api/auth/change-password', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        if (response.ok) {
            showNotification('Password changed successfully', 'success');
            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showNotification('Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('Failed to change password', 'error');
    }
}

// Toggle password visibility
function togglePassword(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Toggle between text (visible) and password (hidden) type
    if (input.type === 'text') {
        input.type = 'password';
        iconElement.classList.remove('fa-eye-slash');
        iconElement.classList.add('fa-eye');
    } else {
        input.type = 'text';
        iconElement.classList.remove('fa-eye');
        iconElement.classList.add('fa-eye-slash');
    }
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 12px;
        background: ${type === 'success' ? '#69B41E' : '#EF4444'};
        color: white;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        z-index: 10001;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Export functions
window.handleChangePassword = handleChangePassword;
window.togglePassword = togglePassword;

