// Account functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeAccount();
});

// Initialize all account functionality
function initializeAccount() {
    setupEventListeners();
    loadUserPreferences();
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
        showMessage(`${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully!`, 'success');
    } else {
        // Enter edit mode
        editBtn.innerHTML = '<i class="fas fa-save"></i><span>Save</span>';
        editBtn.classList.add('editing');
    }
}

// Save changes for specific section
function saveSectionChanges(section) {
    const sectionData = {
        section: section,
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage (in real app, this would be an API call)
    localStorage.setItem(`${section}Data`, JSON.stringify(sectionData));
    addActivityLog(`${section.charAt(0).toUpperCase() + section.slice(1)} Update`, `Updated ${section} information`);
}

// Handle avatar change
function handleAvatarChange() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            showMessage('Avatar updated successfully!', 'success');
            addActivityLog('Avatar Update', 'Changed profile picture');
        }
    });
    
    fileInput.click();
}

// Save all changes
function saveChanges() {
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
    
    showMessage('Changes cancelled', 'info');
}

// Load user preferences from localStorage
function loadUserPreferences() {
    // Load any saved preferences (placeholder for future functionality)
    const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
    // Apply preferences if needed
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
