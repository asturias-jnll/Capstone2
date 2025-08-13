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
    loginBtnText.textContent = 'LOGGING IN...';

    // Show loading dialog
    document.getElementById('loadingDialog').style.display = 'flex';

    try {
        // Make API call to authentication service
        const response = await fetch('http://localhost:3001/api/auth/login', {
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

            // Hide loading dialog
            document.getElementById('loadingDialog').style.display = 'none';

            // Show success dialog with role-specific message
            const successDialog = document.getElementById('successDialog');
            const successMessage = document.getElementById('successMessage');
            
            // Update loading dialog text to show actual user role
            const loadingText = document.querySelector('#loadingDialog p');
            if (loadingText) {
                loadingText.textContent = `Logging in as ${data.user.role_display_name}...`;
            }

            // Set success message based on user role
            successMessage.textContent = `Welcome, ${data.user.first_name} ${data.user.last_name}!`;
            
            // Show success dialog
            successDialog.style.display = 'flex';

            // Redirect based on user role after a short delay
            setTimeout(() => {
                redirectBasedOnRole(data.user.role);
            }, 1500);

        } else {
            // Handle API error
            showError(data.error || 'Login failed. Please check your credentials.');
            loginBtn.disabled = false;
            loginBtnText.textContent = 'LOGIN';
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
        loginBtnText.textContent = 'LOGIN';
        document.getElementById('loadingDialog').style.display = 'none';
    }
}

// Redirect user based on their role
function redirectBasedOnRole(role) {
    switch (role) {
        case 'marketing_clerk':
            window.location.href = '../marketingclerk/html/main.html';
            break;
        case 'finance_officer':
            window.location.href = '../financeofficer/html/main.html'; // Adjust path if needed
            break;
        case 'it_head':
            window.location.href = '../ithead/html/main.html'; // Adjust path if needed
            break;
        default:
            // Default to marketing clerk for now
            window.location.href = '../marketingclerk/html/main.html';
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

        const response = await fetch('http://localhost:3001/api/auth/refresh', {
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

// Close success dialog
function closeSuccessDialog() {
    document.getElementById('successDialog').style.display = 'none';
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
