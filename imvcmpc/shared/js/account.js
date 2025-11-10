/**
 * Dynamic Account Settings JavaScript - IMVCMPC
 * 
 * This file handles account functionality for both Finance Officer and Marketing Clerk
 * with dynamic information based on user role and branch assignment.
 * 
 * BRANCH STRUCTURE:
 * - Branch 1: IBAAN (Main Branch)
 * - Branch 2: BAUAN
 * - Branch 3: SAN JOSE
 * - Branch 4: ROSARIO
 * - Branch 5: SAN JUAN
 * - Branch 6: PADRE GARCIA
 * - Branch 7: LIPA CITY
 * - Branch 8: BATANGAS CITY
 * - Branch 9: MABINI LIPA
 * - Branch 10: CALAMIAS
 * - Branch 11: LEMERY
 * - Branch 12: MATAAS NA KAHOY
 * - Branch 13: TANAUAN
 * 
 * @author IMVCMPC Development Team
 * @version 4.0.0
 * @lastUpdated 2024
 */

// Initialize account system
document.addEventListener('DOMContentLoaded', function() {
    initializeAccount();
    initializeDynamicUserHeader();
    
    // Force update after a short delay to ensure all elements are loaded
    setTimeout(() => {
        console.log('Force updating account information...');
        initializeDynamicAccount();
    }, 100);
});

// Initialize all account functionality
function initializeAccount() {
    setupEventListeners();
    loadUserPreferences();
    updateDateTime();
    initializeAccountStatus();
    setupPageVisibilityHandling();
    setInterval(updateDateTime, 1000);
    setInterval(updateSessionDuration, 1000);
    
    // Initialize dynamic account information based on user role and branch
    initializeDynamicAccount();
}

// Initialize dynamic account information based on user role and branch
function initializeDynamicAccount() {
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = localStorage.getItem('user_role') || userData.role_display_name || 'User';
    const userBranchId = localStorage.getItem('user_branch_id') || userData.branch_id || '1';
    const userBranchName = localStorage.getItem('user_branch_name') || userData.branch_name || 'Main Branch';
    const userBranchLocation = localStorage.getItem('user_branch_location') || userData.branch_location || 'IBAAN';
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true' || userData.is_main_branch_user === true;
    
    // Debug logging
    console.log('Account Debug Info:', {
        userRole,
        userBranchId,
        userBranchName,
        userBranchLocation,
        isMainBranchUser,
        userData
    });
    
    // Update all account information dynamically
    updatePersonalInformation(userRole, userBranchId, userBranchName, userBranchLocation, isMainBranchUser);
    updateRoleAndAccess(userRole, userBranchName, userBranchLocation, isMainBranchUser);
    updateBranchInformation(userBranchId, userBranchName, userBranchLocation, isMainBranchUser);
    updateAccountHeader(userRole, userBranchName, isMainBranchUser);
}

// Update personal information based on role and branch
function updatePersonalInformation(userRole, branchId, branchName, branchLocation, isMainBranch) {
    // Generate employee ID based on role and branch
    let employeeId;
    let fullName;
    let email;
    
    // Full name is just the role
    fullName = userRole;
    
    // Generate employee ID based on role and branch
    if (userRole === 'Finance Officer') {
        if (isMainBranch) {
            employeeId = 'FO-001';
        } else {
            employeeId = `FO-00${branchId}`;
        }
    } else if (userRole === 'Marketing Clerk') {
        if (isMainBranch) {
            employeeId = 'MC-001';
        } else {
            employeeId = `MC-00${branchId}`;
        }
    } else {
        // Default fallback
        employeeId = 'EMP-001';
    }
    
    // Generate email based on branch location
    if (isMainBranch) {
        email = 'ibaan@imvcmpc.com';
    } else {
        const branchCode = branchLocation.toLowerCase().replace(/\s+/g, '');
        email = `${branchCode}@imvcmpc.com`;
    }
    
    // Debug logging
    console.log('Personal Info Update:', { fullName, employeeId, email });
    
    // Update display elements
    updateElement('fullName', fullName);
    updateElement('employeeId', employeeId);
    updateElement('emailAddress', email);
    
    // Update input fields
    updateInputValue('fullNameInput', fullName);
    updateInputValue('employeeIdInput', employeeId);
    updateInputValue('emailInput', email);
    
    // Save to localStorage
    const personalData = {
        fullName: fullName,
        employeeId: employeeId,
        email: email,
        userRole: userRole,
        branchId: branchId,
        branchName: branchName,
        branchLocation: branchLocation,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('personalData', JSON.stringify(personalData));
}

// Update role and access information based on role and branch
function updateRoleAndAccess(userRole, branchName, branchLocation, isMainBranch) {
    // Update user role display
    updateElement('userRoleDisplay', userRole);
    
    // Update assigned branch
    const assignedBranchElement = document.getElementById('assignedBranch');
    if (assignedBranchElement) {
        if (isMainBranch) {
            assignedBranchElement.textContent = 'IBAAN Main Branch - All Branches Access';
        } else {
            assignedBranchElement.textContent = `${branchLocation} - Branch ${branchName.split(' ')[1]} Access only`;
        }
    }
    
    // Update permissions based on role and branch
    updatePermissions(userRole, isMainBranch);
}

// Update permissions based on role and branch access
function updatePermissions(userRole, isMainBranch) {
    const permissionTags = document.getElementById('permissionTags');
    let permissions = [];
    
    if (userRole === 'Finance Officer') {
        if (isMainBranch) {
            permissions = [
                'View All Branches',
                'Manage Financial Data',
                'Approve Transactions',
                'Generate Financial Reports',
                'View Analytics',
                'Manage Member Accounts'
            ];
        } else {
            permissions = [
                'View Own Branch',
                'Manage Financial Data',
                'Approve Transactions',
                'Generate Financial Reports',
                'View Analytics',
                'Manage Member Accounts'
            ];
        }
    } else if (userRole === 'Marketing Clerk') {
        if (isMainBranch) {
            permissions = [
                'View All Branches',
                'Manage Member Data',
                'View Analytics',
                'Generate Reports',
                'Manage Notifications',
                'View Member Information'
            ];
        } else {
            permissions = [
                'View Own Branch',
                'Manage Member Data',
                'View Analytics',
                'Generate Reports',
                'Manage Notifications',
                'View Member Information'
            ];
        }
    } else {
        permissions = ['Basic Access'];
    }
    
    // Update permission tags
    if (permissionTags) {
        permissionTags.innerHTML = permissions.map(permission => 
            `<span class="permission-tag">${permission}</span>`
        ).join('');
    }
}

// Update branch information in account details
function updateBranchInformation(branchId, branchName, branchLocation, isMainBranch) {
    // Update branch name - format as "Main Branch", "Branch 2", "Branch 3", etc.
    let displayBranchName;
    if (isMainBranch) {
        displayBranchName = 'Main Branch';
    } else {
        displayBranchName = `Branch ${branchId}`;
    }
    updateElement('branchName', displayBranchName);
    
    // Update branch location
    updateElement('branchLocation', `${branchLocation}, Batangas`);
    
    // Update branch contact based on branch
    const branchContacts = {
        '1': '+63 43 123 4567', // IBAAN
        '2': '+63 43 234 5678', // BAUAN
        '3': '+63 43 345 6789', // SAN JOSE
        '4': '+63 43 456 7890', // ROSARIO
        '5': '+63 43 567 8901', // SAN JUAN
        '6': '+63 43 678 9012', // PADRE GARCIA
        '7': '+63 43 789 0123', // LIPA CITY
        '8': '+63 43 890 1234', // BATANGAS CITY
        '9': '+63 43 901 2345', // MABINI LIPA
        '10': '+63 43 012 3456', // CALAMIAS
        '11': '+63 43 123 4567', // LEMERY
        '12': '+63 43 234 5678',  // MATAAS NA KAHOY
        '13': '+63 43 345 6789'   // TANAUAN
    };
    
    const contact = branchContacts[branchId] || '+63 43 123 4567';
    updateElement('branchContact', contact);
    
    // Update operation days
    updateElement('branchOperationDays', 'Monday - Friday');
}

// Update account header based on role and branch
function updateAccountHeader(userRole, branchName, isMainBranch) {
    const headerTitle = document.querySelector('.account-header h1');
    if (headerTitle) {
        headerTitle.textContent = 'Account Settings';
    }
    
    const headerDescription = document.querySelector('.account-header p');
    if (headerDescription) {
        if (isMainBranch) {
            headerDescription.textContent = `Manage your ${userRole.toLowerCase()} account preferences and security settings with access to all branches.`;
        } else {
            headerDescription.textContent = `Manage your ${userRole.toLowerCase()} account preferences and security settings for ${branchName}.`;
        }
    }
}

// Helper function to update element text content
function updateElement(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// Helper function to update input value
function updateInputValue(inputId, value) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = value;
    }
}

// Initialize dynamic user header - Make it globally accessible
window.initializeDynamicUserHeader = function() {
    const userRole = localStorage.getItem('user_role') || 'User';
    const userBranchName = localStorage.getItem('user_branch_name') || 'Main Branch';
    const userBranchLocation = localStorage.getItem('user_branch_location') || 'IBAAN';
    
    // Update user name (role) in header
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = userRole;
    }
    
    // Update user role (branch) in header
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement) {
        if (userBranchLocation) {
            userRoleElement.textContent = `IMVCMPC - ${userBranchName} ${userBranchLocation}`;
        } else {
            userRoleElement.textContent = `IMVCMPC - ${userBranchName}`;
        }
    }
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

// Setup all event listeners
function setupEventListeners() {
    const editPersonalBtn = document.getElementById('editPersonalBtn');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const cancelChangesBtn = document.getElementById('cancelChangesBtn');
    
    if (editPersonalBtn) {
        editPersonalBtn.addEventListener('click', () => toggleEditMode('personal'));
    }
    
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', handleAvatarChange);
    }
    
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', saveChanges);
    }
    
    if (cancelChangesBtn) {
        cancelChangesBtn.addEventListener('click', cancelChanges);
    }
}

// Toggle edit mode for personal section only
function toggleEditMode(section) {
    if (section !== 'personal') return; // Only personal section is editable
    
    const editBtn = document.getElementById(`edit${section.charAt(0).toUpperCase() + section.slice(1)}Btn`);
    const isEditing = editBtn.classList.contains('editing');
    
    if (isEditing) {
        // Save changes
        saveSectionChanges(section);
        editBtn.innerHTML = '<i class="fas fa-edit"></i><span>Edit</span>';
        editBtn.classList.remove('editing');
        
        // Exit edit mode for form groups
        document.querySelectorAll('.personal-details .form-group').forEach(group => {
            group.classList.remove('editing');
        });
        
        showMessage('Personal Information updated successfully!', 'success');
    } else {
        // Enter edit mode
        editBtn.innerHTML = '<i class="fas fa-save"></i><span>Save</span>';
        editBtn.classList.add('editing');
        
        // Enter edit mode for form groups
        document.querySelectorAll('.personal-details .form-group').forEach(group => {
            group.classList.add('editing');
        });
    }
}

// Save changes for personal section only
function saveSectionChanges(section) {
    if (section === 'personal') {
        // Get values from input fields
        const fullName = document.getElementById('fullNameInput').value;
        const email = document.getElementById('emailInput').value;
        const phone = document.getElementById('phoneInput').value;
        const employeeId = document.getElementById('employeeIdInput').value;
        
        // Update display values
        document.getElementById('fullName').textContent = fullName;
        document.getElementById('emailAddress').textContent = email;
        document.getElementById('phoneNumber').textContent = phone;
        document.getElementById('employeeId').textContent = employeeId;
        
        // Save to localStorage
        const personalData = {
            fullName: fullName,
            email: email,
            phone: phone,
            employeeId: employeeId,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('personalData', JSON.stringify(personalData));
        
        addActivityLog('Personal Info Update', 'Updated personal information');
    }
}

// Handle avatar change
function handleAvatarChange() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const avatarIcon = document.querySelector('.avatar-container i');
                avatarIcon.className = 'fas fa-user-circle';
                avatarIcon.style.backgroundImage = `url(${e.target.result})`;
                avatarIcon.style.backgroundSize = 'cover';
                avatarIcon.style.backgroundPosition = 'center';
                avatarIcon.style.borderRadius = '50%';
                avatarIcon.style.width = '100%';
                avatarIcon.style.height = '100%';
            };
            reader.readAsDataURL(file);
            
            showMessage('Avatar updated successfully!', 'success');
            addActivityLog('Avatar Update', 'Changed profile picture');
        }
    });
    
    fileInput.click();
}

// Save all changes
function saveChanges() {
    const editingSections = document.querySelectorAll('.edit-btn.editing');
    if (editingSections.length > 0) {
        editingSections.forEach(btn => {
            const section = btn.id.replace('edit', '').replace('Btn', '').toLowerCase();
            saveSectionChanges(section);
            btn.innerHTML = '<i class="fas fa-edit"></i><span>Edit</span>';
            btn.classList.remove('editing');
        });
        
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('editing');
        });
    }
    
    showMessage('All changes saved successfully!', 'success');
    addActivityLog('Settings Save', 'Saved all account preferences');
}

// Cancel changes
function cancelChanges() {
    const editBtns = document.querySelectorAll('.edit-btn');
    editBtns.forEach(btn => {
        if (btn.classList.contains('editing')) {
            btn.innerHTML = '<i class="fas fa-edit"></i><span>Edit</span>';
            btn.classList.remove('editing');
        }
    });
    
    document.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('editing');
    });
    
    // Reset input values to original display values
    document.getElementById('fullNameInput').value = document.getElementById('fullName').textContent;
    document.getElementById('emailInput').value = document.getElementById('emailAddress').textContent;
    document.getElementById('phoneInput').value = document.getElementById('phoneNumber').textContent;
    
    showMessage('Changes cancelled', 'info');
}

// Load user preferences from localStorage
function loadUserPreferences() {
    // Load saved personal data
    const personalData = JSON.parse(localStorage.getItem('personalData') || '{}');
    if (personalData.fullName) {
        document.getElementById('fullName').textContent = personalData.fullName;
        document.getElementById('fullNameInput').value = personalData.fullName;
    }
    if (personalData.email) {
        document.getElementById('emailAddress').textContent = personalData.email;
        document.getElementById('emailInput').value = personalData.email;
    }
    if (personalData.phone) {
        document.getElementById('phoneNumber').textContent = personalData.phone;
        document.getElementById('phoneInput').value = personalData.phone;
    }
    if (personalData.employeeId) {
        document.getElementById('employeeId').textContent = personalData.employeeId;
        document.getElementById('employeeIdInput').value = personalData.employeeId;
    }
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
    const messageElement = document.createElement('div');
    messageElement.className = `account-message ${type}`;
    messageElement.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        background: ${type === 'success' ? '#69B41E' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        font-size: 14px;
        font-weight: 600;
        transform: translateX(100%);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border-left: 4px solid ${type === 'success' ? '#0D5B11' : type === 'error' ? '#DC2626' : type === 'warning' ? '#D97706' : '#2563EB'};
    `;
    messageElement.textContent = message;

    document.body.appendChild(messageElement);

    // Animate in
    setTimeout(() => {
        messageElement.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 4 seconds
    setTimeout(() => {
        messageElement.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 400);
    }, 4000);
}