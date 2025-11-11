// Global variable to store deactivated user info (identity verified)
let deactivatedUserInfo = null;

// Remove intro logo after animation completes
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const introLogo = document.getElementById('introLogo');
        if (introLogo) {
            introLogo.classList.add('hidden');
        }
    }, 2300);
});

// Login functionality
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const errorMessage = document.getElementById('errorMessage');

    // Hide any previous error messages
    errorMessage.style.display = 'none';

    // Basic validation
    if (!username || !password) {
        showError('Please enter both username and password');
        return;
    }

    // Disable login button and show loading state
    loginBtn.disabled = true;

    // Show loading dialog
    const loadingDialog = document.getElementById('loadingDialog');
    const loadingText = document.querySelector('#loadingDialog p');
    
    // Show loading dialog
    loadingDialog.style.display = 'flex';
    
    // Immediately show role-specific message (we'll get the role from the form or make an educated guess)
    if (loadingText) {
        // Try to get role from username pattern or show generic message
        let roleGuess = 'User';
        
        if (username.includes('mc.')) {
            roleGuess = 'Marketing Clerk';
        } else if (username.includes('fo.')) {
            roleGuess = 'Finance Officer';
        } else if (username.includes('it.')) {
            roleGuess = 'IT Head';
        }
        
        loadingText.textContent = `Logging in as ${roleGuess}`;
    }

    try {
        // Make API call to authentication service
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store authentication tokens and user data
            localStorage.setItem('access_token', data.tokens.access_token);
            localStorage.setItem('refresh_token', data.tokens.refresh_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('lastLoginTime', new Date().toISOString());
            // Store the raw username used to log in as a reliable fallback for other pages
            try { localStorage.setItem('login_username', username); } catch (_) {}
            
            // Store user role for logout display
            const userRole = data.user.role_display_name || data.user.role;
            localStorage.setItem('user_role', userRole);
            console.log('User role stored in localStorage:', userRole);
            
            // Store branch information for branch-specific access
            if (data.user.branch_id) {
                localStorage.setItem('user_branch_id', data.user.branch_id);
                localStorage.setItem('user_branch_name', data.user.branch_name);
                localStorage.setItem('user_branch_location', data.user.branch_location);
                localStorage.setItem('is_main_branch_user', data.user.is_main_branch_user);
            }

            // Update loading dialog text with actual role from API response
            if (loadingText) {
                loadingText.textContent = `Logging in as ${data.user.role_display_name}`;
            }

            // Show loading for a moment then instantly switch to welcome
            setTimeout(() => {
                // Hide loading dialog instantly (no transition)
                document.getElementById('loadingDialog').style.display = 'none';
                
                // Show success dialog with role-specific message
                const successDialog = document.getElementById('loadingDialog').nextElementSibling;
                const successMessage = document.getElementById('successMessage');
                
                // Set success message based on user role and branch
                const userBranchName = data.user.branch_name || 'IBAAN';
                const roleDisplayName = data.user.role_display_name || 'User';
                successMessage.textContent = `Welcome, ${userBranchName} ${roleDisplayName}!`;
                
                // Show success dialog instantly (no transition between screens)
                successDialog.style.display = 'flex';
                
                // Show welcome for 2.5 seconds, then fade out before redirect
                setTimeout(() => {
                    // Add fade-out animation
                    successDialog.style.animation = 'fadeOut 0.5s ease-out forwards';
                    
                    // Redirect early during fade-out to prevent login page flash
                    setTimeout(() => {
                        redirectBasedOnRole(data.user.role);
                    }, 100);
                }, 2500);
            }, 1000);

        } else {
            // Check if the error is due to identity-verified deactivation
            if (data.code === 'ACCOUNT_DEACTIVATED' && data.identity_verified === true) {
                // Password is correct, but account is deactivated
                // Store verified user info for reactivation request (including password for code verification)
                deactivatedUserInfo = {
                    username: data.username,
                    user_id: data.user_id,
                    password: password, // Store password temporarily for reactivation code flow
                    identity_verified: true
                };
                
                // Hide loading dialog
                document.getElementById('loadingDialog').style.display = 'none';
                
                // Show reactivation modal (identity is verified)
                showReactivationModal();
            } else {
                // Invalid credentials or other error
                showError(data.error || 'Login failed. Please check your credentials.');
            }
            
            loginBtn.disabled = false;
            document.getElementById('loadingDialog').style.display = 'none';
        }

    } catch (error) {
        console.error('Login error:', error);
        
        // Handle network or other errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('Cannot connect to authentication service. Please ensure the service is running.');
        } else {
            showError('Login failed. Please try again.');
        }
        
        loginBtn.disabled = false;
        document.getElementById('loadingDialog').style.display = 'none';
    }
}

// Redirect user based on their role
function redirectBasedOnRole(role) {
    switch (role) {
        case 'marketing_clerk':
            window.location.href = '../shared/html/memberdata.html';
            break;
        case 'finance_officer':
            window.location.href = '../financeofficer/html/dashboard.html';
            break;
        case 'it_head':
            window.location.href = '../ithead/html/main.html'; // Adjust path if needed
            break;
        default:
            // Default to marketing clerk member data page
            window.location.href = '../shared/html/memberdata.html';
            break;
    }
}

// Refresh access token using refresh token
async function refreshAccessToken() {
    try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        const data = await response.json();

        if (data.success) {
            // Update stored access token
            localStorage.setItem('access_token', data.access_token);
            return data.access_token;
        } else {
            throw new Error(data.error || 'Token refresh failed');
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        // Clear stored tokens and redirect to login
        clearUserSession();
        window.location.href = 'login.html';
        throw error;
    }
}

// Clear user session data
function clearUserSession() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastLoginTime');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_branch_id');
    localStorage.removeItem('user_branch_name');
    localStorage.removeItem('user_branch_location');
    localStorage.removeItem('is_main_branch_user');
}

// Check if user is already logged in
function checkExistingSession() {
    const accessToken = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    
    if (accessToken && user) {
        try {
            const userData = JSON.parse(user);
            // Check if token is expired (basic check)
            const lastLogin = new Date(localStorage.getItem('lastLoginTime'));
            const now = new Date();
            const hoursSinceLogin = (now - lastLogin) / (1000 * 60 * 60);
            
            // If logged in less than 24 hours ago, redirect to appropriate dashboard
            if (hoursSinceLogin < 24) {
                redirectBasedOnRole(userData.role);
            } else {
                // Token expired, clear session
                clearUserSession();
            }
        } catch (error) {
            console.error('Session validation error:', error);
            clearUserSession();
        }
    }
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleBtn.className = 'fas fa-eye';
    }
}

// Show error message
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
}

// Show reactivation modal
function showReactivationModal() {
    const modal = document.getElementById('reactivationModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Reset to step 1 (send code)
        const sendCodeStep = document.getElementById('sendCodeStep');
        const verifyCodeStep = document.getElementById('verifyCodeStep');
        const submitBtn = document.getElementById('submitReactivationBtn');
        const sendCodeBtn = document.getElementById('sendCodeBtn');
        
        if (sendCodeStep) sendCodeStep.style.display = 'block';
        if (verifyCodeStep) verifyCodeStep.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'none';
        if (sendCodeBtn) {
            sendCodeBtn.disabled = false;
            sendCodeBtn.innerHTML = '<i class="fas fa-envelope"></i> Send Verification Code';
        }
        
        // Clear previous inputs and errors
        const reasonInput = document.getElementById('reactivationReason');
        const codeInput = document.getElementById('verificationCode');
        const reasonError = document.getElementById('reasonError');
        const codeError = document.getElementById('codeError');
        const sendCodeError = document.getElementById('sendCodeError');
        const statusMsg = document.getElementById('reactivationStatus');
        
        if (reasonInput) reasonInput.value = '';
        if (codeInput) codeInput.value = '';
        if (reasonError) {
            reasonError.textContent = '';
            reasonError.style.display = 'none';
        }
        if (codeError) {
            codeError.textContent = '';
            codeError.style.display = 'none';
        }
        if (sendCodeError) {
            sendCodeError.textContent = '';
            sendCodeError.style.display = 'none';
        }
        if (statusMsg) {
            statusMsg.textContent = '';
            statusMsg.style.display = 'none';
            statusMsg.className = 'reactivation-status';
        }
    }
}

// Close reactivation modal
function closeReactivationModal() {
    const modal = document.getElementById('reactivationModal');
    if (modal) {
        modal.style.display = 'none';
        // Clear password from memory for security
        if (deactivatedUserInfo) {
            deactivatedUserInfo.password = null;
        }
        deactivatedUserInfo = null;
    }
}

// Send reactivation verification code
async function sendReactivationCode() {
    if (!deactivatedUserInfo || !deactivatedUserInfo.password) {
        const sendCodeError = document.getElementById('sendCodeError');
        if (sendCodeError) {
            sendCodeError.textContent = 'Session expired. Please log in again.';
            sendCodeError.style.display = 'block';
        }
        return;
    }
    
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    const sendCodeError = document.getElementById('sendCodeError');
    const statusMsg = document.getElementById('reactivationStatus');
    
    // Hide previous errors
    if (sendCodeError) {
        sendCodeError.style.display = 'none';
    }
    if (statusMsg) {
        statusMsg.style.display = 'none';
    }
    
    // Disable button and show loading
    if (sendCodeBtn) {
        sendCodeBtn.disabled = true;
        sendCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    }
    
    try {
        const response = await fetch('/api/auth/send-reactivation-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: deactivatedUserInfo.username,
                password: deactivatedUserInfo.password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show step 2 (code input and reason)
            const sendCodeStep = document.getElementById('sendCodeStep');
            const verifyCodeStep = document.getElementById('verifyCodeStep');
            const submitBtn = document.getElementById('submitReactivationBtn');
            
            if (sendCodeStep) sendCodeStep.style.display = 'none';
            if (verifyCodeStep) verifyCodeStep.style.display = 'block';
            if (submitBtn) submitBtn.style.display = 'block';
            
            // Show success message
            if (statusMsg) {
                statusMsg.textContent = data.message || 'Verification code sent to your email.';
                statusMsg.className = 'reactivation-status success';
                statusMsg.style.display = 'block';
            }
            
            // Focus on code input and add number-only restriction
            const codeInput = document.getElementById('verificationCode');
            if (codeInput) {
                // Only allow numbers
                codeInput.addEventListener('input', function(e) {
                    this.value = this.value.replace(/[^0-9]/g, '');
                });
                setTimeout(() => codeInput.focus(), 100);
            }
        } else {
            // Show error
            if (sendCodeError) {
                sendCodeError.textContent = data.error || 'Failed to send verification code. Please try again.';
                sendCodeError.style.display = 'block';
            }
            
            // Re-enable button
            if (sendCodeBtn) {
                sendCodeBtn.disabled = false;
                sendCodeBtn.innerHTML = '<i class="fas fa-envelope"></i> Send Verification Code';
            }
        }
    } catch (error) {
        console.error('Send reactivation code error:', error);
        
        // Show error
        if (sendCodeError) {
            sendCodeError.textContent = 'An error occurred. Please try again.';
            sendCodeError.style.display = 'block';
        }
        
        // Re-enable button
        if (sendCodeBtn) {
            sendCodeBtn.disabled = false;
            sendCodeBtn.innerHTML = '<i class="fas fa-envelope"></i> Send Verification Code';
        }
    }
}

// Show forgot password modal
function showForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'flex';
        // Clear previous input and errors
        const input = document.getElementById('forgotPasswordInput');
        const error = document.getElementById('forgotPasswordError');
        const statusMsg = document.getElementById('forgotPasswordStatus');
        const submitBtn = document.getElementById('submitForgotPasswordBtn');
        
        if (input) input.value = '';
        if (error) {
            error.textContent = '';
            error.style.display = 'none';
        }
        if (statusMsg) {
            statusMsg.textContent = '';
            statusMsg.style.display = 'none';
            statusMsg.className = 'forgot-password-status';
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Reset Link';
        }
        
        // Focus on input
        if (input) {
            setTimeout(() => input.focus(), 100);
        }
    }
}

// Close forgot password modal
function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Submit forgot password request
async function submitForgotPassword() {
    const input = document.getElementById('forgotPasswordInput');
    const error = document.getElementById('forgotPasswordError');
    const statusMsg = document.getElementById('forgotPasswordStatus');
    const submitBtn = document.getElementById('submitForgotPasswordBtn');
    
    const usernameOrEmail = input ? input.value.trim() : '';
    
    // Validate input
    if (!usernameOrEmail) {
        if (error) {
            error.textContent = 'Please enter your username or email';
            error.style.display = 'block';
        }
        return;
    }
    
    // Hide error message
    if (error) {
        error.style.display = 'none';
    }
    
    // Disable button and show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
    }
    
    // Hide previous status message
    if (statusMsg) {
        statusMsg.style.display = 'none';
    }
    
    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username_or_email: usernameOrEmail
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success message with email address
            if (statusMsg) {
                statusMsg.textContent = data.message || `A password reset link was sent to ${data.email || 'your email address'}`;
                statusMsg.className = 'forgot-password-status success';
                statusMsg.style.display = 'block';
            }
            
            // Hide error message
            if (error) {
                error.style.display = 'none';
            }
            
            // Clear input
            if (input) input.value = '';
            
            // Close modal after 5 seconds
            setTimeout(() => {
                closeForgotPasswordModal();
            }, 5000);
        } else {
            // Show error message in error field
            if (error) {
                error.textContent = data.error || 'Failed to send reset link. Please try again.';
                error.style.display = 'block';
            }
            
            // Also show in status message for visibility
            if (statusMsg) {
                statusMsg.textContent = data.error || 'Failed to send reset link. Please try again.';
                statusMsg.className = 'forgot-password-status error';
                statusMsg.style.display = 'block';
            }
            
            // Re-enable button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Reset Link';
            }
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        
        // Show error message
        if (statusMsg) {
            statusMsg.textContent = 'An error occurred. Please try again later.';
            statusMsg.className = 'forgot-password-status error';
            statusMsg.style.display = 'block';
        }
        
        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Reset Link';
        }
    }
}

// Submit reactivation request (Method 3 - with code verification)
async function submitReactivationRequest() {
    if (!deactivatedUserInfo || !deactivatedUserInfo.password) {
        const statusMsg = document.getElementById('reactivationStatus');
        if (statusMsg) {
            statusMsg.textContent = 'Session expired. Please log in again.';
            statusMsg.className = 'reactivation-status error';
            statusMsg.style.display = 'block';
        }
        return;
    }
    
    const reasonInput = document.getElementById('reactivationReason');
    const codeInput = document.getElementById('verificationCode');
    const reasonError = document.getElementById('reasonError');
    const codeError = document.getElementById('codeError');
    const statusMsg = document.getElementById('reactivationStatus');
    const submitBtn = document.getElementById('submitReactivationBtn');
    
    const reason = reasonInput ? reasonInput.value.trim() : '';
    const code = codeInput ? codeInput.value.trim() : '';
    
    // Validate code
    if (!code || !/^\d{6}$/.test(code)) {
        if (codeError) {
            codeError.textContent = 'Please enter a valid 6-digit verification code';
            codeError.style.display = 'block';
        }
        return;
    }
    
    // Validate reason
    if (!reason || reason.length < 10) {
        if (reasonError) {
            reasonError.textContent = 'Please provide a reason (at least 10 characters)';
            reasonError.style.display = 'block';
        }
        return;
    }
    
    // Hide error messages
    if (reasonError) {
        reasonError.style.display = 'none';
    }
    if (codeError) {
        codeError.style.display = 'none';
    }
    
    // Disable button and show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
    }
    
    // Hide previous status message
    if (statusMsg) {
        statusMsg.style.display = 'none';
    }
    
    try {
        const response = await fetch('/api/auth/verify-reactivation-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: deactivatedUserInfo.username,
                password: deactivatedUserInfo.password,
                code: code,
                reason: reason
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success message
            if (statusMsg) {
                statusMsg.textContent = 'Request submitted successfully! The IT Head will review your request.';
                statusMsg.className = 'reactivation-status success';
                statusMsg.style.display = 'block';
            }
            
            // Clear password from memory
            deactivatedUserInfo.password = null;
            
            // Close modal after 3 seconds
            setTimeout(() => {
                closeReactivationModal();
            }, 3000);
        } else {
            // Show error message
            if (data.error && data.error.includes('code')) {
                if (codeError) {
                    codeError.textContent = data.error;
                    codeError.style.display = 'block';
                }
            } else if (data.error && data.error.includes('reason')) {
                if (reasonError) {
                    reasonError.textContent = data.error;
                    reasonError.style.display = 'block';
                }
            } else {
                if (statusMsg) {
                    statusMsg.textContent = data.error || 'Failed to submit request. Please try again.';
                    statusMsg.className = 'reactivation-status error';
                    statusMsg.style.display = 'block';
                }
            }
            
            // Re-enable button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Request';
            }
        }
    } catch (error) {
        console.error('Reactivation request error:', error);
        
        // Show error message
        if (statusMsg) {
            statusMsg.textContent = 'An error occurred. Please try again later.';
            statusMsg.className = 'reactivation-status error';
            statusMsg.style.display = 'block';
        }
        
        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Request';
        }
    }
}



// Handle Enter key press on form inputs
document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    // Check if user was redirected due to account deactivation
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('deactivated') === 'true') {
        const deactivationMessage = sessionStorage.getItem('deactivationMessage');
        if (deactivationMessage) {
            showError(deactivationMessage);
            // Clear the message from sessionStorage after showing it
            sessionStorage.removeItem('deactivationMessage');
            // Remove the query parameter from URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    
    // Check if user is already logged in
    checkExistingSession();
    
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });
    
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });
    
    // Focus on username input when page loads
    usernameInput.focus();
});
