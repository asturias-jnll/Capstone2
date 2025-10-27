// Account JavaScript for IT Head

// Initialize account
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
});

// Load user information
function loadUserInfo() {
    const userRole = localStorage.getItem('user_role') || 'IT Head';
    const branchName = localStorage.getItem('user_branch_name') || 'Main Branch';
    
    // Update display values
    document.getElementById('fullName').textContent = userRole;
    document.getElementById('position').textContent = userRole;
    document.getElementById('username').textContent = 'ithead@imvcmpc.com';
    document.getElementById('branch').textContent = branchName;
}

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

