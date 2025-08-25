/**
 * Account Settings JavaScript - IMVCMPC Marketing Clerk
 * 
 * This file handles all account-related functionality including:
 * 
 * BRANCH-SPECIFIC FEATURES:
 * - Dynamic employee ID format: MC-001 for main branch, MC-002 for branch 2, etc.
 * - Dynamic email format: mc.ibaan.imvcmpc@gmail.com for main, mc.bauan.imvcmpc@gmail.com for others
 * - Dynamic role display: "Marketing Clerk (Main Branch)" vs "Marketing Clerk (Branch X)"
 * - Dynamic branch access: "ALL Branches access" for main, "Branch X access only" for others
 * 
 * SECURITY FEATURES:
 * - Role and access fields are non-editable
 * - Branch details are non-editable
 * - Only personal information is editable
 * 
 * @author IMVCMPC Development Team
 * @version 3.0.0
 * @lastUpdated 2024
 */

// Account Management System for Marketing Clerk
document.addEventListener('DOMContentLoaded', function() {
    initializeAccount();
    initializeDynamicUserHeader(); // Add this line
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
    
    // Initialize branch-specific account information
    initializeBranchSpecificAccount();
}

// Initialize branch-specific account information
function initializeBranchSpecificAccount() {
    const userBranchId = localStorage.getItem('user_branch_id');
    const userBranchName = localStorage.getItem('user_branch_name');
    const userBranchLocation = localStorage.getItem('user_branch_location');
    const isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';
    
    // Update account header based on branch
    updateAccountHeader(userBranchName, isMainBranchUser);
    
    // Update personal information based on branch
    updatePersonalInformation(userBranchId, userBranchName, userBranchLocation, isMainBranchUser);
    
    // Update role and access information based on branch
    updateRoleAndAccess(userBranchName, userBranchLocation, isMainBranchUser);
    
    // Update branch information in account details
    updateBranchInformation(userBranchId, userBranchName, userBranchLocation, isMainBranchUser);
}

// Update personal information based on branch
function updatePersonalInformation(branchId, branchName, branchLocation, isMainBranch) {
    // Generate employee ID based on branch
    let employeeId;
    if (isMainBranch) {
        employeeId = 'MC-001';
    } else {
        // For other branches, use branch number
        employeeId = `MC-00${branchId}`;
    }
    
    // Generate email based on branch
    let email;
    if (isMainBranch) {
        email = 'mc.ibaan.imvcmpc@gmail.com';
    } else {
        const branchCode = branchLocation.toLowerCase().replace(/\s+/g, '');
        email = `mc.${branchCode}.imvcmpc@gmail.com`;
    }
    
    // Update employee ID display and input
    const employeeIdElement = document.getElementById('employeeId');
    const employeeIdInput = document.getElementById('employeeIdInput');
    if (employeeIdElement) employeeIdElement.textContent = employeeId;
    if (employeeIdInput) employeeIdInput.value = employeeId;
    
    // Update email display and input
    const emailElement = document.getElementById('emailAddress');
    const emailInput = document.getElementById('emailInput');
    if (emailElement) emailElement.textContent = email;
    if (emailInput) emailInput.value = email;
    
    // Save to localStorage
    const personalData = {
        employeeId: employeeId,
        email: email,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('personalData', JSON.stringify(personalData));
}

// Update role and access information based on branch
function updateRoleAndAccess(branchName, branchLocation, isMainBranch) {
    // Update user role
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement) {
        if (isMainBranch) {
            userRoleElement.textContent = 'Marketing Clerk (Main Branch)';
        } else {
            userRoleElement.textContent = `Marketing Clerk (${branchLocation})`;
        }
    }
    
    // Update assigned branch
    const assignedBranchElement = document.getElementById('assignedBranch');
    if (assignedBranchElement) {
        if (isMainBranch) {
            assignedBranchElement.textContent = 'IBAAN Main Branch - All Branch Access';
        } else {
            assignedBranchElement.textContent = `${branchLocation} - Branch ${branchName.split(' ')[1]} access only`;
        }
    }
    
    // Update permissions based on branch
    updatePermissions(isMainBranch);
}

// Update permissions based on branch access
function updatePermissions(isMainBranch) {
    const permissionTags = document.getElementById('permissionTags');
    let permissions = [];
    
    if (isMainBranch) {
        permissions = ['View All Branches', 'Manage Member Data', 'View Analytics', 'Generate Reports'];
    } else {
        permissions = ['View Own Branch', 'Manage Member Data', 'View Analytics', 'Generate Reports'];
    }
    
    // Update permission tags
    if (permissionTags) {
        permissionTags.innerHTML = permissions.map(permission => 
            `<span class="permission-tag">${permission}</span>`
        ).join('');
    }
}

// Update account header based on branch
function updateAccountHeader(branchName, isMainBranch) {
    // Keep title as "Account Settings" only
    const headerTitle = document.querySelector('.account-header h1');
    if (headerTitle) {
        headerTitle.textContent = 'Account Settings';
    }
    
    const headerDescription = document.querySelector('.account-header p');
    if (headerDescription && branchName) {
        if (isMainBranch) {
            headerDescription.textContent = 'Manage your account preferences and security settings with access to all branches.';
        } else {
            headerDescription.textContent = `Manage your account preferences and security settings for ${branchName}.`;
        }
    }
}

// Update branch information in account details
function updateBranchInformation(branchId, branchName, branchLocation, isMainBranch) {
    // Update branch name
    const branchNameElement = document.getElementById('branchName');
    if (branchNameElement) {
        branchNameElement.textContent = branchName;
    }
    
    // Update branch location
    const branchLocationElement = document.getElementById('branchLocation');
    if (branchLocationElement) {
        branchLocationElement.textContent = `${branchLocation}, Batangas`;
    }
    
    // Update branch contact (keep default for now)
    const branchContactElement = document.getElementById('branchContact');
    if (branchContactElement) {
        branchContactElement.textContent = '+63 43 123 4567';
    }
    
    // Update operation days (keep default for now)
    const branchOperationDaysElement = document.getElementById('branchOperationDays');
    if (branchOperationDaysElement) {
        branchOperationDaysElement.textContent = 'Monday - Friday';
    }
}

// Setup page visibility handling for accurate session tracking
function setupPageVisibilityHandling() {
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
            const activeTime = currentTime - startTime;
            localStorage.setItem('lastActiveTime', activeTime.toString());
        }
    });
    
    window.addEventListener('load', function() {
        const lastActiveTime = localStorage.getItem('lastActiveTime');
        if (lastActiveTime) {
            const now = new Date();
            const adjustedStartTime = new Date(now - parseInt(lastActiveTime));
            localStorage.setItem('sessionStartTime', adjustedStartTime.toISOString());
            localStorage.removeItem('lastActiveTime');
        }
    });
}

// Initialize account status with real data
function initializeAccountStatus() {
    if (!localStorage.getItem('sessionStartTime')) {
        localStorage.setItem('sessionStartTime', new Date().toISOString());
    }
    
    if (!localStorage.getItem('loginAttempts')) {
        localStorage.setItem('loginAttempts', JSON.stringify({
            successful: 1,
            failed: 0,
            lastAttempt: new Date().toISOString()
        }));
    }
    
    if (!localStorage.getItem('lastLogin')) {
        localStorage.setItem('lastLogin', new Date().toISOString());
    }
    
    recordSuccessfulLogin();
    
    updateSecurityStatus();
    updateLastLogin();
    updateSessionDuration();
    updateLoginAttempts();
}

// Update security status based on login activity
function updateSecurityStatus() {
    try {
        const securityStatusElement = document.querySelector('.status-content .form-group:first-child .info-value');
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
        const securityStatusElement = document.querySelector('.status-content .form-group:first-child .info-value');
        if (securityStatusElement) {
            securityStatusElement.textContent = 'Active';
        }
    }
}

// Update last login display with exact date and time
function updateLastLogin() {
    try {
        const lastLoginElement = document.querySelector('.status-content .form-group:nth-child(2) .info-value');
        if (!lastLoginElement) return;
        
        const lastLogin = localStorage.getItem('lastLogin');
        if (lastLogin) {
            const loginDate = new Date(lastLogin);
            
            if (isNaN(loginDate.getTime())) {
                localStorage.setItem('lastLogin', new Date().toISOString());
                lastLoginElement.textContent = 'Just now';
                return;
            }
            
            const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
            
            const dateStr = loginDate.toLocaleDateString('en-US', dateOptions);
            const timeStr = loginDate.toLocaleTimeString('en-US', timeOptions);
            
            lastLoginElement.textContent = `${dateStr} at ${timeStr}`;
        }
    } catch (error) {
        console.error('Error updating last login:', error);
        const lastLoginElement = document.querySelector('.status-content .form-group:nth-child(2) .info-value');
        if (lastLoginElement) {
            lastLoginElement.textContent = 'Just now';
        }
    }
}

// Update session duration since last login
function updateSessionDuration() {
    try {
        const sessionDurationElement = document.querySelector('.status-content .form-group:nth-child(3) .info-value');
        if (!sessionDurationElement) return;
        
        const lastLogin = localStorage.getItem('lastLogin');
        if (lastLogin) {
            const loginDate = new Date(lastLogin);
            
            if (isNaN(loginDate.getTime())) {
                localStorage.setItem('lastLogin', new Date().toISOString());
                sessionDurationElement.textContent = '0 seconds';
                return;
            }
            
            const now = new Date();
            let timeDiff = now - loginDate;
            
            const hiddenTime = parseInt(localStorage.getItem('sessionHiddenTime') || '0');
            timeDiff -= hiddenTime;
            
            if (timeDiff < 0) timeDiff = 0;
            
            const hours = Math.floor(timeDiff / 3600000);
            const minutes = Math.floor((timeDiff % 3600000) / 60000);
            const seconds = Math.floor((timeDiff % 60000) / 1000);
            
            let durationText;
            if (hours > 0) {
                durationText = `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
            } else if (minutes > 0) {
                durationText = `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds} second${seconds > 1 ? 's' : ''}`;
            } else {
                durationText = `${seconds} second${seconds > 1 ? 's' : ''}`;
            }
            
            sessionDurationElement.textContent = durationText;
        }
    } catch (error) {
        console.error('Error updating session duration:', error);
        const sessionDurationElement = document.querySelector('.status-content .form-group:nth-child(3) .info-value');
        if (sessionDurationElement) {
            sessionDurationElement.textContent = '0 seconds';
        }
    }
}

// Update login attempts display
function updateLoginAttempts() {
    try {
        const loginAttemptsElement = document.querySelector('.status-content .form-group:nth-child(4) .info-value');
        if (!loginAttemptsElement) return;
        
        const loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
        const successful = loginAttempts.successful || 1;
        const failed = loginAttempts.failed || 0;
        
        if (typeof successful !== 'number' || typeof failed !== 'number' || 
            successful < 0 || failed < 0) {
            localStorage.setItem('loginAttempts', JSON.stringify({
                successful: 1,
                failed: 0,
                lastAttempt: new Date().toISOString()
            }));
            loginAttemptsElement.textContent = '1 (Successful)';
            return;
        }
        
        let attemptsText;
        if (failed === 0) {
            attemptsText = `${successful} (Successful)`;
        } else {
            attemptsText = `${successful + failed} (${successful} Successful, ${failed} Failed)`;
        }
        
        loginAttemptsElement.textContent = attemptsText;
    } catch (error) {
        console.error('Error updating login attempts:', error);
        const loginAttemptsElement = document.querySelector('.status-content .form-group:nth-child(4) .info-value');
        if (loginAttemptsElement) {
            loginAttemptsElement.textContent = '1 (Successful)';
        }
    }
}

// Record successful login
function recordSuccessfulLogin() {
    const loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
    loginAttempts.successful = (loginAttempts.successful || 0) + 1;
    loginAttempts.lastAttempt = new Date().toISOString();
    loginAttempts.lastSuccessfulAttempt = new Date().toISOString();
    
    localStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
    localStorage.setItem('lastLogin', new Date().toISOString());
    localStorage.setItem('sessionStartTime', new Date().toISOString());
    
    updateSecurityStatus();
    updateLastLogin();
    updateSessionDuration();
    updateLoginAttempts();
}

// Record failed login attempt
function recordFailedLogin() {
    const loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
    loginAttempts.failed = (loginAttempts.failed || 0) + 1;
    loginAttempts.lastAttempt = new Date().toISOString();
    loginAttempts.lastFailedAttempt = new Date().toISOString();
    
    localStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
    
    updateSecurityStatus();
    updateLoginAttempts();
}

// Reset session (for logout)
function resetSession() {
    localStorage.removeItem('sessionStartTime');
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
