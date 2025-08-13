// Account functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize account functionality when page is loaded
    initializeAccount();
});

// Initialize all account functionality
function initializeAccount() {
    // Setup event listeners
    setupProfileEventListeners();
    setupSecurityEventListeners();
    setupPreferenceEventListeners();
    setupActionEventListeners();
    
    // Load user preferences from localStorage
    loadUserPreferences();
}

// Setup profile-related event listeners
function setupProfileEventListeners() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', toggleProfileEdit);
    }
    
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', handleAvatarChange);
    }
}

// Setup security-related event listeners
function setupSecurityEventListeners() {
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const toggle2FABtn = document.getElementById('toggle2FABtn');
    const manageSessionsBtn = document.getElementById('manageSessionsBtn');
    
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', handlePasswordChange);
    }
    
    if (toggle2FABtn) {
        toggle2FABtn.addEventListener('click', toggleTwoFactorAuth);
    }
    
    if (manageSessionsBtn) {
        manageSessionsBtn.addEventListener('click', manageLoginSessions);
    }
}

// Setup preference-related event listeners
function setupPreferenceEventListeners() {
    const languageSelect = document.getElementById('languageSelect');
    const themeSelect = document.getElementById('themeSelect');
    const emailNotifications = document.getElementById('emailNotifications');
    const autoLogoutSelect = document.getElementById('autoLogoutSelect');
    
    if (languageSelect) {
        languageSelect.addEventListener('change', handleLanguageChange);
    }
    
    if (themeSelect) {
        themeSelect.addEventListener('change', handleThemeChange);
    }
    
    if (emailNotifications) {
        emailNotifications.addEventListener('change', handleNotificationPreference);
    }
    
    if (autoLogoutSelect) {
        autoLogoutSelect.addEventListener('change', handleAutoLogoutChange);
    }
}

// Setup action button event listeners
function setupActionEventListeners() {
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const cancelChangesBtn = document.getElementById('cancelChangesBtn');
    const viewAllActivityBtn = document.getElementById('viewAllActivityBtn');
    
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', saveChanges);
    }
    
    if (cancelChangesBtn) {
        cancelChangesBtn.addEventListener('click', cancelChanges);
    }
    
    if (viewAllActivityBtn) {
        viewAllActivityBtn.addEventListener('click', viewAllActivity);
    }
}

// Toggle profile editing mode
function toggleProfileEdit() {
    const editBtn = document.getElementById('editProfileBtn');
    const profileFields = document.querySelectorAll('.profile-field input');
    const isEditing = editBtn.classList.contains('editing');
    
    if (isEditing) {
        // Save changes
        saveProfileChanges();
        editBtn.innerHTML = '<i class="fas fa-edit"></i><span>Edit</span>';
        editBtn.classList.remove('editing');
        
        // Make fields readonly
        profileFields.forEach(field => {
            field.readOnly = true;
            field.classList.remove('editing');
        });
        
        showMessage('Profile updated successfully!', 'success');
    } else {
        // Enter edit mode
        editBtn.innerHTML = '<i class="fas fa-save"></i><span>Save</span>';
        editBtn.classList.add('editing');
        
        // Make fields editable
        profileFields.forEach(field => {
            field.readOnly = false;
            field.classList.add('editing');
        });
    }
}

// Save profile changes
function saveProfileChanges() {
    const profileData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        position: document.getElementById('position').value,
        branch: document.getElementById('branch').value,
        employeeId: document.getElementById('employeeId').value
    };
    
    // Save to localStorage (in real app, this would be an API call)
    localStorage.setItem('userProfile', JSON.stringify(profileData));
    
    // Add to activity log
    addActivityLog('Profile Update', 'Updated profile information');
}

// Handle avatar change
function handleAvatarChange() {
    // Create file input for image upload
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // In real app, this would upload to server
            showMessage('Avatar updated successfully!', 'success');
            addActivityLog('Avatar Update', 'Changed profile picture');
        }
    });
    
    fileInput.click();
}

// Handle password change
function handlePasswordChange() {
    const currentPassword = prompt('Enter current password:');
    if (currentPassword) {
        const newPassword = prompt('Enter new password:');
        if (newPassword) {
            const confirmPassword = prompt('Confirm new password:');
            if (newPassword === confirmPassword) {
                // In real app, this would validate and update password
                showMessage('Password changed successfully!', 'success');
                addActivityLog('Password Change', 'Password updated');
            } else {
                showMessage('Passwords do not match!', 'error');
            }
        }
    }
}

// Toggle two-factor authentication
function toggleTwoFactorAuth() {
    const toggleBtn = document.getElementById('toggle2FABtn');
    const isEnabled = toggleBtn.classList.contains('enabled');
    
    if (isEnabled) {
        // Disable 2FA
        if (confirm('Are you sure you want to disable two-factor authentication?')) {
            toggleBtn.innerHTML = '<i class="fas fa-toggle-off"></i><span>Enable</span>';
            toggleBtn.classList.remove('enabled');
            showMessage('Two-factor authentication disabled', 'warning');
            addActivityLog('2FA Disabled', 'Two-factor authentication turned off');
        }
    } else {
        // Enable 2FA
        const code = prompt('Enter the 6-digit code from your authenticator app:');
        if (code && code.length === 6) {
            toggleBtn.innerHTML = '<i class="fas fa-toggle-on"></i><span>Disable</span>';
            toggleBtn.classList.add('enabled');
            showMessage('Two-factor authentication enabled', 'success');
            addActivityLog('2FA Enabled', 'Two-factor authentication turned on');
        } else {
            showMessage('Invalid code. Please try again.', 'error');
        }
    }
}

// Manage login sessions
function manageLoginSessions() {
    // In real app, this would show a modal with active sessions
    showMessage('Session management feature coming soon!', 'info');
}

// Handle language change
function handleLanguageChange() {
    const languageSelect = document.getElementById('languageSelect');
    const selectedLanguage = languageSelect.value;
    
    // Save preference
    localStorage.setItem('userLanguage', selectedLanguage);
    
    // In real app, this would change the UI language
    showMessage(`Language changed to ${languageSelect.options[languageSelect.selectedIndex].text}`, 'success');
    addActivityLog('Language Change', `Changed language to ${selectedLanguage}`);
}

// Handle theme change
function handleThemeChange() {
    const themeSelect = document.getElementById('themeSelect');
    const selectedTheme = themeSelect.value;
    
    // Save preference
    localStorage.setItem('userTheme', selectedTheme);
    
    // Apply theme (in real app, this would change CSS variables)
    applyTheme(selectedTheme);
    showMessage(`Theme changed to ${themeSelect.options[themeSelect.selectedIndex].text}`, 'success');
    addActivityLog('Theme Change', `Changed theme to ${selectedTheme}`);
}

// Handle notification preference change
function handleNotificationPreference() {
    const emailNotifications = document.getElementById('emailNotifications');
    const isEnabled = emailNotifications.checked;
    
    // Save preference
    localStorage.setItem('emailNotifications', isEnabled);
    
    showMessage(`Email notifications ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
    addActivityLog('Notification Preference', `Email notifications ${isEnabled ? 'enabled' : 'disabled'}`);
}

// Handle auto-logout change
function handleAutoLogoutChange() {
    const autoLogoutSelect = document.getElementById('autoLogoutSelect');
    const selectedValue = autoLogoutSelect.value;
    
    // Save preference
    localStorage.setItem('autoLogout', selectedValue);
    
    showMessage(`Auto-logout set to ${autoLogoutSelect.options[autoLogoutSelect.selectedIndex].text}`, 'success');
    addActivityLog('Auto-logout Change', `Set auto-logout to ${selectedValue} minutes`);
}

// Save all changes
function saveChanges() {
    // Collect all preference changes
    const preferences = {
        language: document.getElementById('languageSelect').value,
        theme: document.getElementById('themeSelect').value,
        emailNotifications: document.getElementById('emailNotifications').checked,
        autoLogout: document.getElementById('autoLogoutSelect').value
    };
    
    // Save to localStorage
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    
    showMessage('All changes saved successfully!', 'success');
    addActivityLog('Settings Save', 'Saved all account preferences');
}

// Cancel changes
function cancelChanges() {
    // Reset to saved preferences
    loadUserPreferences();
    
    // Reset profile edit mode if active
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn.classList.contains('editing')) {
        toggleProfileEdit();
    }
    
    showMessage('Changes cancelled', 'info');
}

// View all activity
function viewAllActivity() {
    // In real app, this would navigate to a detailed activity page
    showMessage('Activity history feature coming soon!', 'info');
}

// Load user preferences from localStorage
function loadUserPreferences() {
    const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
    
    if (preferences.language) {
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) languageSelect.value = preferences.language;
    }
    
    if (preferences.theme) {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = preferences.theme;
    }
    
    if (preferences.emailNotifications !== undefined) {
        const emailNotifications = document.getElementById('emailNotifications');
        if (emailNotifications) emailNotifications.checked = preferences.emailNotifications;
    }
    
    if (preferences.autoLogout) {
        const autoLogoutSelect = document.getElementById('autoLogoutSelect');
        if (autoLogoutSelect) autoLogoutSelect.value = preferences.autoLogout;
    }
}

// Apply theme to the application
function applyTheme(theme) {
    // In real app, this would change CSS variables or load different stylesheets
    document.body.className = `theme-${theme}`;
}

// Add activity to the log
function addActivityLog(action, description) {
    const activities = JSON.parse(localStorage.getItem('userActivities') || '[]');
    
    const newActivity = {
        id: Date.now(),
        action: action,
        description: description,
        timestamp: new Date(),
        type: 'user'
    };
    
    activities.unshift(newActivity);
    
    // Keep only last 50 activities
    if (activities.length > 50) {
        activities.splice(50);
    }
    
    localStorage.setItem('userActivities', JSON.stringify(activities));
}

// Show message to user
function showMessage(message, type = 'info') {
    // Create temporary message element
    const messageElement = document.createElement('div');
    messageElement.className = `account-message ${type}`;
    messageElement.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        background: ${type === 'success' ? 'var(--green-500)' : type === 'error' ? 'var(--red-500)' : type === 'warning' ? 'var(--yellow-500)' : 'var(--blue-500)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        font-size: 14px;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    messageElement.textContent = message;

    document.body.appendChild(messageElement);

    // Animate in
    setTimeout(() => {
        messageElement.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        messageElement.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 300);
            }, 3000);
}

// Get session information
function getSessionInfo() {
    const loginTime = localStorage.getItem('lastLoginTime');
    const lastActivity = localStorage.getItem('lastActivityTime');
    const sessionTimeout = localStorage.getItem('sessionTimeout') || '1800000'; // 30 minutes
    const idleTimeout = localStorage.getItem('idleTimeout') || '900000'; // 15 minutes
    
    if (loginTime) {
        const loginDate = new Date(parseInt(loginTime));
        const lastActivityDate = lastActivity ? new Date(parseInt(lastActivity)) : null;
        const sessionTimeoutDate = new Date(parseInt(loginTime) + parseInt(sessionTimeout));
        const idleTimeoutDate = lastActivity ? new Date(parseInt(lastActivity) + parseInt(idleTimeout)) : null;
        
        return {
            loginTime: loginDate.toLocaleString(),
            lastActivity: lastActivityDate ? lastActivityDate.toLocaleString() : 'N/A',
            sessionExpires: sessionTimeoutDate.toLocaleString(),
            idleExpires: idleTimeoutDate ? idleTimeoutDate.toLocaleString() : 'N/A',
            sessionDuration: Math.floor((Date.now() - parseInt(loginTime)) / 60000) + ' minutes'
        };
    }
    
    return null;
}

// Display session information
function displaySessionInfo() {
    const sessionInfo = getSessionInfo();
    if (sessionInfo) {
        const message = `Session Info:
• Login Time: ${sessionInfo.loginTime}
• Last Activity: ${sessionInfo.lastActivity}
• Session Duration: ${sessionInfo.sessionDuration}
• Session Expires: ${sessionInfo.sessionExpires}
• Idle Expires: ${sessionInfo.idleExpires}`;
        
        showMessage('Session information displayed in console', 'info');
        console.log('Session Information:', sessionInfo);
    } else {
        showMessage('No session information available', 'warning');
    }
}
