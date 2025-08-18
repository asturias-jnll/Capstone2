/**
 * Account Settings JavaScript - IMVCMPC Marketing Clerk
 * 
 * This file handles all account-related functionality including:
 * 
 * ACCOUNT STATUS FEATURES:
 * - Security Status: Shows "Active" if logged in within 7 days, "Inactive for X days" if longer
 * - Last Login: Shows exact date and time of last successful login
 * - Session Duration: Shows duration since last login (hours, minutes, seconds)
 * - Login Attempts: Shows total successful and failed login attempts
 * 
 * SECURITY FEATURES:
 * - Automatic status tracking based on login activity
 * - Clean, simple status display without icons
 * - Session persistence across page refreshes
 * 
 * ERROR HANDLING:
 * - Comprehensive error handling with fallbacks
 * - Data validation and sanitization
 * - Console logging for debugging
 * - Graceful degradation on errors
 * 
 * @author IMVCMPC Development Team
 * @version 2.0.0
 * @lastUpdated 2024
 */

// Account functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeAccount();
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
}

// Setup page visibility handling for accurate session tracking
function setupPageVisibilityHandling() {
    let hiddenTime = 0;
    let lastHiddenTime = null;
    
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Page became hidden (user switched tabs or minimized)
            lastHiddenTime = new Date();
        } else {
            // Page became visible again
            if (lastHiddenTime) {
                const hiddenDuration = new Date() - lastHiddenTime;
                hiddenTime += hiddenDuration;
                lastHiddenTime = null;
            }
        }
    });
    
    // Store hidden time in localStorage for persistence
    setInterval(() => {
        if (hiddenTime > 0) {
            localStorage.setItem('sessionHiddenTime', hiddenTime.toString());
        }
    }, 5000);
    
    // Handle page refresh and navigation
    window.addEventListener('beforeunload', function() {
        // Store current session state before page unload
        const currentTime = new Date();
        const sessionStartTime = localStorage.getItem('sessionStartTime');
        if (sessionStartTime) {
            const startTime = new Date(sessionStartTime);
            const activeTime = currentTime - startTime;
            localStorage.setItem('lastActiveTime', activeTime.toString());
        }
    });
    
    // Restore session state after page reload
    window.addEventListener('load', function() {
        const lastActiveTime = localStorage.getItem('lastActiveTime');
        if (lastActiveTime) {
            // Adjust session start time to account for page reload
            const now = new Date();
            const adjustedStartTime = new Date(now - parseInt(lastActiveTime));
            localStorage.setItem('sessionStartTime', adjustedStartTime.toISOString());
            localStorage.removeItem('lastActiveTime');
        }
    });
}

// Initialize account status with real data
function initializeAccountStatus() {
    // Initialize session start time if not exists
    if (!localStorage.getItem('sessionStartTime')) {
        localStorage.setItem('sessionStartTime', new Date().toISOString());
    }
    
    // Initialize login attempts if not exists
    if (!localStorage.getItem('loginAttempts')) {
        localStorage.setItem('loginAttempts', JSON.stringify({
            successful: 1,
            failed: 0,
            lastAttempt: new Date().toISOString()
        }));
    }
    
    // Initialize last login if not exists
    if (!localStorage.getItem('lastLogin')) {
        localStorage.setItem('lastLogin', new Date().toISOString());
    }
    
    // Record this page load as a successful login (simulating user authentication)
    recordSuccessfulLogin();
    
    // Update all status displays
    updateSecurityStatus();
    updateLastLogin();
    updateSessionDuration();
    updateLoginAttempts();
}

// Update security status based on login activity
function updateSecurityStatus() {
    try {
        const securityStatusElement = document.querySelector('.status-content .form-group:first-child .info-value');
        if (!securityStatusElement) {
            console.warn('Security status element not found');
            return;
        }
        
        const lastLogin = localStorage.getItem('lastLogin');
        if (!lastLogin) {
            securityStatusElement.textContent = 'Active';
            return;
        }
        
        const loginDate = new Date(lastLogin);
        const now = new Date();
        
        // Validate date
        if (isNaN(loginDate.getTime())) {
            console.warn('Invalid last login date detected, resetting');
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
        // Fallback to safe default
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
        if (!lastLoginElement) {
            console.warn('Last login element not found');
            return;
        }
        
        const lastLogin = localStorage.getItem('lastLogin');
        if (lastLogin) {
            const loginDate = new Date(lastLogin);
            
            // Validate date
            if (isNaN(loginDate.getTime())) {
                console.warn('Invalid last login date detected, resetting');
                localStorage.setItem('lastLogin', new Date().toISOString());
                lastLoginElement.textContent = 'Just now';
                return;
            }
            
            // Format: "December 15, 2024 at 2:30 PM"
            const dateOptions = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            const timeOptions = { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            };
            
            const dateStr = loginDate.toLocaleDateString('en-US', dateOptions);
            const timeStr = loginDate.toLocaleTimeString('en-US', timeOptions);
            
            lastLoginElement.textContent = `${dateStr} at ${timeStr}`;
        }
    } catch (error) {
        console.error('Error updating last login:', error);
        // Fallback to safe default
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
        if (!sessionDurationElement) {
            console.warn('Session duration element not found');
            return;
        }
        
        const lastLogin = localStorage.getItem('lastLogin');
        if (lastLogin) {
            const loginDate = new Date(lastLogin);
            
            // Validate date
            if (isNaN(loginDate.getTime())) {
                console.warn('Invalid last login date detected, resetting');
                localStorage.setItem('lastLogin', new Date().toISOString());
                sessionDurationElement.textContent = '0 seconds';
                return;
            }
            
            const now = new Date();
            let timeDiff = now - loginDate;
            
            // Subtract hidden time (when user was not actively using the page)
            const hiddenTime = parseInt(localStorage.getItem('sessionHiddenTime') || '0');
            timeDiff -= hiddenTime;
            
            // Ensure time difference is not negative
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
        // Fallback to safe default
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
        if (!loginAttemptsElement) {
            console.warn('Login attempts element not found');
            return;
        }
        
        const loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
        const successful = loginAttempts.successful || 1;
        const failed = loginAttempts.failed || 0;
        
        // Validate data
        if (typeof successful !== 'number' || typeof failed !== 'number' || 
            successful < 0 || failed < 0) {
            console.warn('Invalid login attempts data detected, resetting');
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
        // Fallback to safe default
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
    
    // Update displays
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
    
    // Update displays
    updateSecurityStatus();
    updateLoginAttempts();
}

// Reset session (for logout)
function resetSession() {
    localStorage.removeItem('sessionStartTime');
    // Don't remove loginAttempts and lastLogin as they should persist
}

// Setup all event listeners
function setupEventListeners() {
    const editPersonalBtn = document.getElementById('editPersonalBtn');
    const editRoleBtn = document.getElementById('editRoleBtn');
    const editBranchBtn = document.getElementById('editBranchBtn');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const cancelChangesBtn = document.getElementById('cancelChangesBtn');
    
    if (editPersonalBtn) {
        editPersonalBtn.addEventListener('click', () => toggleEditMode('personal'));
    }
    
    if (editRoleBtn) {
        editRoleBtn.addEventListener('click', () => toggleEditMode('role'));
    }
    
    if (editBranchBtn) {
        editBranchBtn.addEventListener('click', () => toggleEditMode('branch'));
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
    
    // Add event listeners for role and branch changes
    const userRoleSelect = document.getElementById('userRoleSelect');
    const branchSelect = document.getElementById('branchSelect');
    
    if (userRoleSelect) {
        userRoleSelect.addEventListener('change', () => {
            const userRole = userRoleSelect.value;
            const assignedBranch = branchSelect ? branchSelect.value : 'IBAAN Main Branch - All Branches Access';
            updatePermissions(userRole, assignedBranch);
        });
    }
    
    if (branchSelect) {
        branchSelect.addEventListener('change', () => {
            const userRole = userRoleSelect ? userRoleSelect.value : 'Marketing Clerk';
            const assignedBranch = branchSelect.value;
            updatePermissions(userRole, assignedBranch);
        });
    }
}

// Toggle edit mode for different sections
function toggleEditMode(section) {
    const editBtn = document.getElementById(`edit${section.charAt(0).toUpperCase() + section.slice(1)}Btn`);
    const isEditing = editBtn.classList.contains('editing');
    
    if (isEditing) {
        // Save changes
        saveSectionChanges(section);
        editBtn.innerHTML = '<i class="fas fa-edit"></i><span>Edit</span>';
        editBtn.classList.remove('editing');
        
        // Exit edit mode for form groups
        if (section === 'personal') {
            document.querySelectorAll('.personal-details .form-group').forEach(group => {
                group.classList.remove('editing');
            });
        } else if (section === 'role') {
            // Remove editing class from role form groups
            document.querySelectorAll('.role-info .form-group').forEach(group => {
                group.classList.remove('editing');
            });
        } else if (section === 'branch') {
            // Remove editing class from branch form groups
            document.querySelectorAll('.branch-info .form-group').forEach(group => {
                group.classList.remove('editing');
            });
        }
        
        if (section === 'personal') {
            showMessage('Personal Information updated successfully!', 'success');
        } else if (section === 'role') {
            showMessage('Role & Access updated successfully!', 'success');
        } else if (section === 'branch') {
            showMessage('Branch Details updated successfully!', 'success');
        } else {
            showMessage(`${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully!`, 'success');
        }
    } else {
        // Enter edit mode
        editBtn.innerHTML = '<i class="fas fa-save"></i><span>Save</span>';
        editBtn.classList.add('editing');
        
        // Enter edit mode for form groups
        if (section === 'personal') {
            document.querySelectorAll('.personal-details .form-group').forEach(group => {
                group.classList.add('editing');
            });
        } else if (section === 'role') {
            // Add editing class to role form groups
            document.querySelectorAll('.role-info .form-group').forEach(group => {
                group.classList.add('editing');
            });
        } else if (section === 'branch') {
            // Add editing class to branch form groups
            document.querySelectorAll('.branch-info .form-group').forEach(group => {
                group.classList.add('editing');
            });
        }
    }
}

// Save changes for specific section
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
            } else if (section === 'role') {
            // Get values from select fields
            const userRole = document.getElementById('userRoleSelect').value;
            const assignedBranch = document.getElementById('branchSelect').value;
            
            // Update display values
            document.getElementById('userRole').textContent = userRole;
            document.getElementById('assignedBranch').textContent = assignedBranch;
            
            // Update permissions automatically based on role and branch
            updatePermissions(userRole, assignedBranch);
            
            // Save to localStorage
            const roleData = {
                userRole: userRole,
                assignedBranch: assignedBranch,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('roleData', JSON.stringify(roleData));
            
            addActivityLog('Role & Access Update', 'Updated role and access information');
        } else if (section === 'branch') {
            // Get values from input fields
            const branchContact = document.getElementById('branchContactInput').value;
            const branchOperationDays = document.getElementById('branchOperationDaysSelect').value;
            
            // Update display values
            document.getElementById('branchContact').textContent = branchContact;
            document.getElementById('branchOperationDays').textContent = branchOperationDays;
            
            // Save to localStorage
            const branchData = {
                branchContact: branchContact,
                branchOperationDays: branchOperationDays,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('branchData', JSON.stringify(branchData));
            
            addActivityLog('Branch Details Update', 'Updated branch information');
        } else {
        const sectionData = {
            section: section,
            timestamp: new Date().toISOString()
        };
        
        // Save to localStorage (in real app, this would be an API call)
        localStorage.setItem(`${section}Data`, JSON.stringify(sectionData));
        addActivityLog(`${section.charAt(0).toUpperCase() + section.slice(1)} Update`, `Updated ${section} information`);
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
            // Create preview
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
    // Check if any section is in edit mode
    const editingSections = document.querySelectorAll('.edit-btn.editing');
    if (editingSections.length > 0) {
        editingSections.forEach(btn => {
            const section = btn.id.replace('edit', '').replace('Btn', '').toLowerCase();
            saveSectionChanges(section);
            btn.innerHTML = '<i class="fas fa-edit"></i><span>Edit</span>';
            btn.classList.remove('editing');
        });
        
        // Exit edit mode for all form groups
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('editing');
        });
    }
    
    showMessage('All changes saved successfully!', 'success');
    addActivityLog('Settings Save', 'Saved all account preferences');
}

// Cancel changes
function cancelChanges() {
    // Reset edit mode for all sections
    const editBtns = document.querySelectorAll('.edit-btn');
    editBtns.forEach(btn => {
        if (btn.classList.contains('editing')) {
            btn.innerHTML = '<i class="fas fa-edit"></i><span>Edit</span>';
            btn.classList.remove('editing');
        }
    });
    
    // Exit edit mode for all form groups
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
    
    // Load saved branch data
    const branchData = JSON.parse(localStorage.getItem('branchData') || '{}');
    if (branchData.branchContact) {
        document.getElementById('branchContact').textContent = branchData.branchContact;
        document.getElementById('branchContactInput').value = branchData.branchContact;
    }
    if (branchData.branchOperationDays) {
        document.getElementById('branchOperationDays').textContent = branchData.branchOperationDays;
        document.getElementById('branchOperationDaysSelect').value = branchData.branchOperationDays;
    }
    
    // Set initial values for read-only branch fields
    document.getElementById('branchNameInput').value = document.getElementById('branchName').textContent;
    document.getElementById('branchLocationInput').value = document.getElementById('branchLocation').textContent;
    
    // Load any other saved preferences
    const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
    // Apply preferences if needed
}

// Update permissions automatically based on role and branch
function updatePermissions(userRole, assignedBranch) {
    const permissionTags = document.getElementById('permissionTags');
    let permissions = [];
    
    if (userRole === 'Marketing Clerk') {
        if (assignedBranch.includes('IBAAN Main Branch')) {
            permissions = ['View All Branches', 'Manage Member Data', 'View Analytics', 'Generate Reports'];
        } else {
            permissions = ['View Own Branch', 'Manage Member Data', 'View Analytics', 'Generate Reports'];
        }
    } else if (userRole === 'Finance Officer') {
        if (assignedBranch.includes('IBAAN Main Branch')) {
            permissions = ['View All Branches', 'Validate Member Data', 'View Analytics', 'Generate Reports'];
        } else {
            permissions = ['View Own Branch', 'Validate Member Data', 'View Analytics', 'Generate Reports'];
        }
    } else if (userRole === 'IT Head') {
        permissions = ['View All Branches', 'System Administration', 'User Management', 'View Analytics', 'Generate Reports'];
    }
    
    // Update permission tags
    permissionTags.innerHTML = permissions.map(permission => 
        `<span class="permission-tag">${permission}</span>`
    ).join('');
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
