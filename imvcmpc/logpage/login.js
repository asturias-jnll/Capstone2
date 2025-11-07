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
            // Handle API error
            showError(data.error || 'Login failed. Please check your credentials.');
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



// Handle Enter key press on form inputs
document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
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
