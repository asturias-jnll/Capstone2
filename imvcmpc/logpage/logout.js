// Logout functionality
function goToLogin() {
    // Add a small delay for better UX
    showLoadingState('login-again-btn', 'Redirecting...');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
}



// Show loading state for buttons
function showLoadingState(buttonId, text) {
    const button = document.getElementById(buttonId);
    if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        button.disabled = true;
        
        // Reset button after redirect
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 1000);
    }
}

// Add logout timestamp
function addLogoutTimestamp() {
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    
    // Store logout timestamp
    localStorage.setItem('lastLogoutTime', timestamp);
}

// Auto-redirect to login after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    // Add logout timestamp
    addLogoutTimestamp();
    
    // Show countdown
    let countdown = 5;
    const countdownElement = document.createElement('div');
    countdownElement.className = 'countdown';
    countdownElement.style.cssText = `
        text-align: center;
        margin-top: 20px;
        font-size: 14px;
        color: var(--gray-500);
    `;
    
    const logoutCard = document.querySelector('.logout-card');
    if (logoutCard) {
        logoutCard.appendChild(countdownElement);
    }
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = `Auto-redirecting to login in ${countdown} second${countdown !== 1 ? 's' : ''}...`;
        }
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            goToLogin();
        }
    }, 1000);
    
    // Update countdown text immediately
    countdownElement.textContent = `Auto-redirecting to login in ${countdown} seconds...`;
});
