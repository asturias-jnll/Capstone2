// Main navigation and common functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize date and time display
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Set active navigation item based on current page
    setActiveNavigation();
    
    // Initialize session management
    initializeSessionManagement();
});

// Update date and time display
function updateDateTime() {
    const now = new Date();
    
    // Update date
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', dateOptions);
    }
    
    // Update time
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
    };
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('en-US', timeOptions);
    }
}

// Set active navigation item based on current page
function setActiveNavigation() {
    const currentPage = window.location.pathname.split('/').pop();
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.classList.remove('active');
        
        // Check if this nav item corresponds to current page
        if (currentPage === 'dashboard.html' && item.getAttribute('href') === 'dashboard.html') {
            item.classList.add('active');
        } else if (currentPage === 'memberdata.html' && item.getAttribute('href') === 'memberdata.html') {
            item.classList.add('active');
        } else if (currentPage === 'analytics.html' && item.getAttribute('href') === 'analytics.html') {
            item.classList.add('active');
        } else if (currentPage === 'reports.html' && item.getAttribute('href') === 'reports.html') {
            item.classList.add('active');
        } else if (currentPage === 'notifications.html' && item.getAttribute('href') === 'notifications.html') {
            item.classList.add('active');
        } else if (currentPage === 'account.html' && item.getAttribute('href') === 'account.html') {
            item.classList.add('active');
        }
    });
}

// Logout function
function logout() {
    // Show enhanced logout confirmation modal
    showLogoutConfirmation();
}

// Show enhanced logout confirmation modal
function showLogoutConfirmation() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'logout-modal-overlay';
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
        backdrop-filter: blur(4px);
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'logout-modal';
    modalContent.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 32px;
        text-align: center;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: modalSlideIn 0.3s ease-out;
    `;

    modalContent.innerHTML = `
        <div class="logout-modal-icon" style="
            width: 64px;
            height: 64px;
            background: var(--red);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: white;
            font-size: 24px;
        ">
            <i class="fas fa-sign-out-alt"></i>
        </div>
        <h2 style="
            font-size: 24px;
            font-weight: 700;
            color: var(--dark-green);
            margin-bottom: 16px;
        ">Confirm Logout</h2>
        <p style="
            font-size: 16px;
            color: var(--gray-600);
            margin-bottom: 24px;
            line-height: 1.5;
        ">Are you sure you want to logout? This will end your current session and clear all temporary data.</p>
        <div style="
            display: flex;
            gap: 12px;
            justify-content: center;
        ">
            <button id="cancelLogout" style="
                padding: 12px 24px;
                border: 2px solid var(--gray-300);
                border-radius: 8px;
                background: white;
                color: var(--gray-600);
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            ">Cancel</button>
            <button id="confirmLogout" style="
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                background: var(--red);
                color: white;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            ">Logout</button>
        </div>
    `;

    // Add CSS animation
    const style = document.createElement('style');
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
        
        #cancelLogout:hover {
            border-color: var(--gray-400);
            background: var(--gray-50);
        }
        
        #confirmLogout:hover {
            background: #dc2626;
            transform: translateY(-1px);
        }
    `;
    document.head.appendChild(style);

    // Add modal to page
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Add event listeners
    document.getElementById('cancelLogout').addEventListener('click', () => {
        closeLogoutModal();
    });

    document.getElementById('confirmLogout').addEventListener('click', () => {
        closeLogoutModal();
        performLogout();
    });

    // Close modal on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeLogoutModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLogoutModal();
        }
    });
}

// Close logout modal
function closeLogoutModal() {
    const modal = document.querySelector('.logout-modal-overlay');
    if (modal) {
        modal.style.animation = 'modalSlideOut 0.2s ease-in';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 200);
    }
}

// Perform actual logout
function performLogout() {
    // Clear any stored user data
    clearUserSession();
    
    // Show logout message
    showLogoutMessage();
    
    // Redirect to logout page after a brief delay
    setTimeout(() => {
        window.location.href = '../../logpage/logout.html';
    }, 1000);
}

// Clear user session data
function clearUserSession() {
    // Clear localStorage items
    localStorage.removeItem('userProfile');
    localStorage.removeItem('userPreferences');
    localStorage.removeItem('userActivities');
    localStorage.removeItem('notifications');
    localStorage.removeItem('lastLoginTime');
    
    // Clear any session storage
    sessionStorage.clear();
    
    // Clear any cookies (if using them)
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
}

// Show logout message
function showLogoutMessage() {
    // Create logout message element
    const messageElement = document.createElement('div');
    messageElement.className = 'logout-message';
    messageElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--dark-green);
        color: white;
        padding: 20px 40px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-size: 16px;
        font-weight: 600;
        text-align: center;
        animation: fadeInOut 1s ease-in-out;
    `;
    messageElement.innerHTML = `
        <i class="fas fa-sign-out-alt" style="margin-right: 8px;"></i>
        Logging out...
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(messageElement);

    // Remove message after animation
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
    }, 1000);
}

// Session Management
function initializeSessionManagement() {
    // Set login time if not already set
    if (!localStorage.getItem('lastLoginTime')) {
        localStorage.setItem('lastLoginTime', Date.now().toString());
    }
    
    // Set last activity time
    updateLastActivity();
    
    // Add activity listeners
    document.addEventListener('mousedown', updateLastActivity);
    document.addEventListener('keydown', updateLastActivity);
    document.addEventListener('scroll', updateLastActivity);
    document.addEventListener('click', updateLastActivity);
    
    // Check session timeout every minute
    setInterval(checkSessionTimeout, 60000);
    
    // Check for idle timeout every 30 seconds
    setInterval(checkIdleTimeout, 30000);
}

// Update last activity timestamp
function updateLastActivity() {
    localStorage.setItem('lastActivityTime', Date.now().toString());
}

// Check if session has timed out
function checkSessionTimeout() {
    const lastActivity = localStorage.getItem('lastActivityTime');
    const sessionTimeout = localStorage.getItem('sessionTimeout') || '1800000'; // 30 minutes default
    
    if (lastActivity && (Date.now() - parseInt(lastActivity)) > parseInt(sessionTimeout)) {
        showSessionTimeoutWarning();
    }
}

// Check for idle timeout
function checkIdleTimeout() {
    const lastActivity = localStorage.getItem('lastActivityTime');
    const idleTimeout = localStorage.getItem('idleTimeout') || '900000'; // 15 minutes default
    
    if (lastActivity && (Date.now() - parseInt(lastActivity)) > parseInt(idleTimeout)) {
        showIdleWarning();
    }
}

// Show session timeout warning
function showSessionTimeoutWarning() {
    const warning = document.createElement('div');
    warning.className = 'session-warning';
    warning.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--red);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    warning.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>Session Timeout Warning</strong><br>
                Your session will expire soon due to inactivity.
            </div>
        </div>
        <button onclick="extendSession()" style="
            margin-top: 12px;
            padding: 8px 16px;
            background: white;
            color: var(--red);
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        ">Extend Session</button>
    `;
    
    document.body.appendChild(warning);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (warning.parentNode) {
            warning.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (warning.parentNode) {
                    warning.parentNode.removeChild(warning);
                }
            }, 300);
        }
    }, 10000);
}

// Show idle warning
function showIdleWarning() {
    const warning = document.createElement('div');
    warning.className = 'idle-warning';
    warning.style.cssText = `
        position: fixed;
 top: 20px;
        right: 20px;
        background: var(--orange);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    warning.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fas fa-clock"></i>
            <div>
                <strong>Idle Warning</strong><br>
                You've been inactive for a while.
            </div>
        </div>
        <button onclick="updateLastActivity()" style="
            margin-top: 12px;
            padding: 8px 16px;
            background: white;
            color: var(--orange);
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        ">Stay Active</button>
    `;
    
    document.body.appendChild(warning);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (warning.parentNode) {
            warning.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (warning.parentNode) {
                    warning.parentNode.removeChild(warning);
                }
            }, 300);
        }
    }, 8000);
}

// Extend session
function extendSession() {
    updateLastActivity();
    
    // Show success message
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--green);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;
    message.innerHTML = '<i class="fas fa-check"></i> Session extended successfully!';
    
    document.body.appendChild(message);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 300);
        }
    }, 3000);
    
    // Remove any existing warnings
    const warnings = document.querySelectorAll('.session-warning, .idle-warning');
    warnings.forEach(w => {
        if (w.parentNode) {
            w.parentNode.removeChild(w);
        }
    });
}

// Add CSS animations for warnings
const warningStyles = document.createElement('style');
warningStyles.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(warningStyles);
