// Remove intro logo after animation completes
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const introLogo = document.getElementById('introLogo');
        if (introLogo) {
            introLogo.classList.add('hidden');
        }
    }, 2300);
    
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        showErrorState('Reset token is missing. Please use the link from your email.');
        return;
    }
    
    // Verify token and load form
    verifyResetToken(token);
    
    // Add password validation listeners
    setupPasswordValidation();
});

// Store reset token globally
let resetToken = null;
let userInfo = null;

// Verify reset token
async function verifyResetToken(token) {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const resetForm = document.getElementById('resetForm');
    
    try {
        const response = await fetch(`/api/auth/verify-reset-token/${token}`);
        const data = await response.json();
        
        if (data.success) {
            resetToken = token;
            userInfo = data.user;
            
            // Hide loading, show form
            if (loadingState) loadingState.style.display = 'none';
            if (errorState) errorState.style.display = 'none';
            if (resetForm) {
                resetForm.style.display = 'block';
                
                // Display user info
                const userInfoText = document.getElementById('userInfoText');
                if (userInfoText && userInfo) {
                    userInfoText.textContent = `Resetting password for: ${userInfo.username}`;
                }
            }
        } else {
            showErrorState(data.error || 'Invalid or expired reset token');
        }
    } catch (error) {
        console.error('Token verification error:', error);
        showErrorState('Failed to verify reset token. Please try again or request a new reset link.');
    }
}

// Show error state
function showErrorState(message) {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const resetForm = document.getElementById('resetForm');
    const errorMessage = document.getElementById('errorMessage');
    
    if (loadingState) loadingState.style.display = 'none';
    if (resetForm) resetForm.style.display = 'none';
    if (errorState) {
        errorState.style.display = 'block';
        if (errorMessage) {
            errorMessage.textContent = message;
        }
    }
}

// Setup password validation
function setupPasswordValidation() {
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            validatePasswordRequirements(this.value);
            checkPasswordMatch();
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            checkPasswordMatch();
        });
    }
}

// Validate password requirements
function validatePasswordRequirements(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    // Update requirement indicators
    updateRequirement('req-length', requirements.length);
    updateRequirement('req-uppercase', requirements.uppercase);
    updateRequirement('req-number', requirements.number);
    updateRequirement('req-special', requirements.special);
    
    return Object.values(requirements).every(req => req === true);
}

// Update requirement indicator
function updateRequirement(id, isValid) {
    const element = document.getElementById(id);
    if (element) {
        if (isValid) {
            element.classList.add('valid');
            const icon = element.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-check-circle';
            }
        } else {
            element.classList.remove('valid');
            const icon = element.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-circle';
            }
        }
    }
}

// Check if passwords match
function checkPasswordMatch() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const matchError = document.getElementById('passwordMatchError');
    
    if (confirmPassword && newPassword !== confirmPassword) {
        if (matchError) {
            matchError.textContent = 'Passwords do not match';
            matchError.style.display = 'block';
        }
        return false;
    } else {
        if (matchError) {
            matchError.style.display = 'none';
        }
        return true;
    }
}

// Toggle password visibility
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleBtn = passwordInput.nextElementSibling;
    const icon = toggleBtn.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Submit reset password
async function submitResetPassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const resetError = document.getElementById('resetError');
    const resetErrorText = document.getElementById('resetErrorText');
    const resetBtn = document.getElementById('resetPasswordBtn');
    const resetBtnText = document.getElementById('resetPasswordBtnText');
    
    // Hide previous errors
    if (resetError) resetError.style.display = 'none';
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
        if (resetError && resetErrorText) {
            resetErrorText.textContent = 'Passwords do not match';
            resetError.style.display = 'flex';
        }
        return;
    }
    
    // Validate password requirements
    if (!validatePasswordRequirements(newPassword)) {
        if (resetError && resetErrorText) {
            resetErrorText.textContent = 'Password does not meet all requirements';
            resetError.style.display = 'flex';
        }
        return;
    }
    
    // Disable button
    if (resetBtn) {
        resetBtn.disabled = true;
        if (resetBtnText) resetBtnText.textContent = 'Resetting...';
    }
    
    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: resetToken,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success state
            showSuccessState();
        } else {
            // Show error
            if (resetError && resetErrorText) {
                resetErrorText.textContent = data.error || 'Failed to reset password. Please try again.';
                resetError.style.display = 'flex';
            }
            
            // Re-enable button
            if (resetBtn) {
                resetBtn.disabled = false;
                if (resetBtnText) resetBtnText.textContent = 'Reset Password';
            }
        }
    } catch (error) {
        console.error('Reset password error:', error);
        
        // Show error
        if (resetError && resetErrorText) {
            resetErrorText.textContent = 'An error occurred. Please try again later.';
            resetError.style.display = 'flex';
        }
        
        // Re-enable button
        if (resetBtn) {
            resetBtn.disabled = false;
            if (resetBtnText) resetBtnText.textContent = 'Reset Password';
        }
    }
}

// Show success state
function showSuccessState() {
    const resetForm = document.getElementById('resetForm');
    const successState = document.getElementById('successState');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    
    if (resetForm) resetForm.style.display = 'none';
    if (loadingState) loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
    if (successState) successState.style.display = 'block';
}

// Handle Enter key press
document.addEventListener('DOMContentLoaded', function() {
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (newPasswordInput) {
        newPasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                confirmPasswordInput.focus();
            }
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitResetPassword();
            }
        });
    }
});

