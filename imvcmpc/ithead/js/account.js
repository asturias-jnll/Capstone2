// Account JavaScript for IT Head

let isEditMode = false;
let originalData = {};
let detachListeners = null; // function to remove input listeners when exiting edit mode

// Initialize account
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
    
    // Initialize account status after a short delay to ensure DOM is ready
    setTimeout(() => {
        initializeAccountStatus();
        setupPageVisibilityHandling();
    }, 100);
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setInterval(updateSessionDuration, 1000);
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
        showErrorDialog('Please fill in all required fields');
        return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showErrorDialog('Please enter a valid email address');
        return;
    }
    
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            showErrorDialog('Unauthorized');
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
            showSuccessDialog('Profile updated successfully');
            // Update stored data and exit edit mode
            originalData = { fullName, username, email };
            exitEditMode();
        } else {
            const error = await response.json();
            showErrorDialog(error.detail || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showErrorDialog('Failed to update profile');
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
        showErrorDialog('Please fill in all password fields');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showErrorDialog('New passwords do not match');
        return;
    }
    
    if (newPassword.length < 8) {
        showErrorDialog('Password must be at least 8 characters long');
        return;
    }
    
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            showErrorDialog('Unauthorized');
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
            showSuccessDialog('Password changed successfully');
            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showErrorDialog('Failed to change password');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showErrorDialog('Failed to change password');
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

// Show minimalist success dialog
function showSuccessDialog(message) {
    // Remove existing dialogs
    const existingDialog = document.getElementById('successDialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
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
    
    // Add fadeIn animation if not exists
    if (!document.getElementById('fadeInStyle')) {
        const style = document.createElement('style');
        style.id = 'fadeInStyle';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Assemble dialog
    dialog.appendChild(icon);
    dialog.appendChild(messageEl);
    dialog.appendChild(button);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

// Show minimalist error dialog
function showErrorDialog(message) {
    // Remove existing dialogs
    const existingDialog = document.getElementById('errorDialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
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
    
    // Add fadeIn animation if not exists
    if (!document.getElementById('fadeInStyle')) {
        const style = document.createElement('style');
        style.id = 'fadeInStyle';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Assemble dialog
    dialog.appendChild(icon);
    dialog.appendChild(messageEl);
    dialog.appendChild(button);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

// Setup page visibility handling for accurate session tracking
function setupPageVisibilityHandling() {
    // Reset hidden time for the current session
    // The sessionStartTime already reflects the original login time,
    // so we only need to track hidden time for the current page load
    localStorage.removeItem('sessionHiddenTime');
    let hiddenTime = 0;
    let lastHiddenTime = null;
    
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            lastHiddenTime = new Date();
        } else {
            if (lastHiddenTime) {
                const hiddenDuration = new Date() - lastHiddenTime;
                hiddenTime += hiddenDuration;
                lastHiddenTime = null;
            }
        }
    });
    
    setInterval(() => {
        if (hiddenTime > 0) {
            localStorage.setItem('sessionHiddenTime', hiddenTime.toString());
        }
    }, 5000);
    
    window.addEventListener('beforeunload', function() {
        const currentTime = new Date();
        const sessionStartTime = localStorage.getItem('sessionStartTime');
        if (sessionStartTime) {
            const startTime = new Date(sessionStartTime);
            const totalElapsed = currentTime - startTime;
            // Subtract hidden time to get only active time (excluding time when page was hidden)
            const currentHiddenTime = parseInt(localStorage.getItem('sessionHiddenTime') || '0');
            const activeTime = totalElapsed - currentHiddenTime;
            // Save active time (excluding hidden time) so restoration is accurate
            localStorage.setItem('lastActiveTime', activeTime.toString());
        }
    });
    
    // Note: Session restoration is now handled in initializeAccountStatus()
    // to ensure it happens before checking if it's a new login
}

// Initialize account status with real data
function initializeAccountStatus() {
    const now = new Date();
    
    // First, restore session if it was saved on page unload
    // This must happen before checking if it's a new login
    // Note: We don't recalculate sessionStartTime from lastActiveTime because
    // sessionStartTime should remain the original login time. The lastActiveTime
    // is only used to verify session continuity, but the actual start time is preserved.
    const lastActiveTime = localStorage.getItem('lastActiveTime');
    if (lastActiveTime) {
        // Clear lastActiveTime as it's no longer needed after restoration check
        localStorage.removeItem('lastActiveTime');
        // Note: sessionStartTime should already be preserved from before the page unload
        // We don't recalculate it because that would cause incorrect duration calculations
    }
    
    // Re-read sessionStartTime after potential restoration
    const sessionStartTime = localStorage.getItem('sessionStartTime');
    const lastLoginTime = localStorage.getItem('lastLoginTime'); // Set by login.js on actual login
    const lastLogin = localStorage.getItem('lastLogin');
    
    // Check if this is a new login or just a page refresh
    // A new login is indicated by:
    // 1. sessionStartTime doesn't exist AND lastLoginTime was set recently (within last 2 minutes)
    // 2. OR sessionStartTime is old (more than 30 minutes ago, indicating session expired)
    let isNewLogin = false;
    
    if (!sessionStartTime) {
        // No existing session
        if (lastLoginTime) {
            // Check if lastLoginTime was set very recently (within 2 minutes)
            const loginTime = new Date(lastLoginTime);
            const timeSinceLogin = now - loginTime;
            const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds
            
            if (timeSinceLogin < twoMinutes) {
                // Very recent login with no session, this is a new login
                isNewLogin = true;
            }
        } else {
            // No session and no recent login time, treat as new login
            isNewLogin = true;
        }
    } else {
        // Session exists - check if it's expired
        const sessionStart = new Date(sessionStartTime);
        const sessionAge = now - sessionStart;
        const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
        
        if (sessionAge > thirtyMinutes) {
            // Session expired, treat as new login
            isNewLogin = true;
        } else {
            // Session is still valid - this is a refresh, not a new login
            isNewLogin = false;
        }
    }
    
    // Initialize sessionStartTime if it doesn't exist or if it's a new login
    if (!sessionStartTime || isNewLogin) {
        localStorage.setItem('sessionStartTime', now.toISOString());
    }
    
    // Initialize lastLogin if it doesn't exist
    if (!lastLogin) {
        localStorage.setItem('lastLogin', now.toISOString());
        // If we just created lastLogin and there was no original session, treat as new login
        if (!sessionStartTime) {
            isNewLogin = true;
        }
    }
    
    // Only record successful login if it's actually a new login
    if (isNewLogin) {
        recordSuccessfulLogin();
    } else {
        // Just update the display without resetting times
        updateSecurityStatus();
        updateLastLogin();
        updateSessionDuration();
    }
    
    // Always ensure display is updated (in case elements weren't ready earlier)
    setTimeout(() => {
        updateSecurityStatus();
        updateLastLogin();
        updateSessionDuration();
    }, 200);
}

// Update security status based on login activity
function updateSecurityStatus() {
    try {
        const securityStatusElement = document.getElementById('securityStatus');
        if (!securityStatusElement) return;
        
        const lastLogin = localStorage.getItem('lastLogin');
        if (!lastLogin) {
            securityStatusElement.textContent = 'Active';
            return;
        }
        
        const loginDate = new Date(lastLogin);
        const now = new Date();
        
        if (isNaN(loginDate.getTime())) {
            localStorage.setItem('lastLogin', new Date().toISOString());
            securityStatusElement.textContent = 'Active';
            return;
        }
        
        const timeDiff = now - loginDate;
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 7) {
            securityStatusElement.textContent = 'Active';
        } else {
            securityStatusElement.textContent = `Inactive for ${daysDiff} days`;
        }
        
    } catch (error) {
        console.error('Error updating security status:', error);
        const securityStatusElement = document.getElementById('securityStatus');
        if (securityStatusElement) {
            securityStatusElement.textContent = 'Active';
        }
    }
}

// Update last login display with exact date and time
function updateLastLogin() {
    try {
        const lastLoginElement = document.getElementById('lastLogin');
        if (!lastLoginElement) return;
        
        const lastLogin = localStorage.getItem('lastLogin');
        if (lastLogin) {
            const loginDate = new Date(lastLogin);
            
            if (isNaN(loginDate.getTime())) {
                localStorage.setItem('lastLogin', new Date().toISOString());
                lastLoginElement.textContent = '—';
                return;
            }
            
            // Use toLocaleString() to match MC/FO format: "MM/DD/YYYY, H:MM:SS AM/PM"
            lastLoginElement.textContent = loginDate.toLocaleString('en-US');
        } else {
            lastLoginElement.textContent = '—';
        }
    } catch (error) {
        console.error('Error updating last login:', error);
        const lastLoginElement = document.getElementById('lastLogin');
        if (lastLoginElement) {
            lastLoginElement.textContent = '—';
        }
    }
}

// Update session duration since session start
function updateSessionDuration() {
    try {
        const sessionDurationElement = document.getElementById('sessionDuration');
        if (!sessionDurationElement) return;
        
        const sessionStartTime = localStorage.getItem('sessionStartTime');
        if (sessionStartTime) {
            const sessionStart = new Date(sessionStartTime);
            
            if (isNaN(sessionStart.getTime())) {
                // Invalid session start time, reset it
                const now = new Date();
                localStorage.setItem('sessionStartTime', now.toISOString());
                sessionDurationElement.textContent = '0s';
                return;
            }
            
            const now = new Date();
            let timeDiff = now - sessionStart;
            
            // Subtract hidden time (when page was in background)
            const hiddenTime = parseInt(localStorage.getItem('sessionHiddenTime') || '0');
            timeDiff -= hiddenTime;
            
            if (timeDiff < 0) timeDiff = 0;
            
            const hours = Math.floor(timeDiff / 3600000);
            const minutes = Math.floor((timeDiff % 3600000) / 60000);
            const seconds = Math.floor((timeDiff % 60000) / 1000);
            
            // Use abbreviated format to match MC/FO: "Xh Ym" or "Ym" or "Xs"
            let durationText;
            if (hours > 0) {
                durationText = `${hours}h ${minutes}m`;
            } else if (minutes > 0) {
                durationText = `${minutes}m`;
            } else {
                durationText = `${seconds}s`;
            }
            
            sessionDurationElement.textContent = durationText;
        } else {
            // No session start time, show 0
            sessionDurationElement.textContent = '0s';
        }
    } catch (error) {
        console.error('Error updating session duration:', error);
        const sessionDurationElement = document.getElementById('sessionDuration');
        if (sessionDurationElement) {
            sessionDurationElement.textContent = '0s';
        }
    }
}

// Record successful login
function recordSuccessfulLogin() {
    localStorage.setItem('lastLogin', new Date().toISOString());
    localStorage.setItem('sessionStartTime', new Date().toISOString());
    
    updateSecurityStatus();
    updateLastLogin();
    updateSessionDuration();
}

// Update date and time display
function updateDateTime() {
    const now = new Date();
    
    // Update date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateDisplay = document.getElementById('currentDate');
    if (dateDisplay) {
        dateDisplay.textContent = now.toLocaleDateString('en-US', dateOptions);
    }
    
    // Update time
    const timeDisplay = document.getElementById('currentTime');
    if (timeDisplay) {
        timeDisplay.textContent = now.toLocaleTimeString('en-US', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }
}

// Export functions
window.handleChangePassword = handleChangePassword;
window.togglePassword = togglePassword;

