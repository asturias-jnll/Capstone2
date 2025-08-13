// Login functionality
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    // Hide any previous error messages
    errorMessage.style.display = 'none';

    // Basic validation
    if (!username || !password) {
        showError('Please enter both username and password');
        return;
    }

    // Simulate login process
    loginBtn.disabled = true;
    loginBtnText.textContent = 'LOGGING IN...';

    // Show loading dialog
    document.getElementById('loadingDialog').style.display = 'flex';

    // Simulate API call delay
    setTimeout(() => {
        // For demo purposes, accept any non-empty credentials
        if (username && password) {
            // Hide loading dialog
            document.getElementById('loadingDialog').style.display = 'none';
            
            // Show success dialog
            document.getElementById('successDialog').style.display = 'flex';
            document.getElementById('successMessage').textContent = 'Login successful!';
            
            // Redirect to main dashboard after a short delay
            setTimeout(() => {
                window.location.href = '../marketingclerk/html/main.html';
            }, 1500);
        } else {
            showError('Invalid credentials. Please try again.');
            loginBtn.disabled = false;
            loginBtnText.textContent = 'LOGIN';
            document.getElementById('loadingDialog').style.display = 'none';
        }
    }, 2000);
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
