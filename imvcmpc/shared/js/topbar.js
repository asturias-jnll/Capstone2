// Shared Top Bar Functionality
// This file handles dynamic updates for the top bar across all pages

// Branch mapping for all branches
const branchData = {
    '1': { name: 'Main Branch', location: 'IBAAN', contact: '+63 43 123 4567', isMain: true },
    '2': { name: 'Branch 2', location: 'BAUAN', contact: '+63 43 234 5678', isMain: false },
    '3': { name: 'Branch 3', location: 'SAN JOSE', contact: '+63 43 345 6789', isMain: false },
    '4': { name: 'Branch 4', location: 'ROSARIO', contact: '+63 43 456 7890', isMain: false },
    '5': { name: 'Branch 5', location: 'SAN JUAN', contact: '+63 43 567 8901', isMain: false },
    '6': { name: 'Branch 6', location: 'PADRE GARCIA', contact: '+63 43 678 9012', isMain: false },
    '7': { name: 'Branch 7', location: 'LIPA CITY', contact: '+63 43 789 0123', isMain: false },
    '8': { name: 'Branch 8', location: 'BATANGAS CITY', contact: '+63 43 890 1234', isMain: false },
    '9': { name: 'Branch 9', location: 'MABINI LIPA', contact: '+63 43 901 2345', isMain: false },
    '10': { name: 'Branch 10', location: 'CALAMIAS', contact: '+63 43 012 3456', isMain: false },
    '11': { name: 'Branch 11', location: 'LEMERY', contact: '+63 43 123 4567', isMain: false },
    '12': { name: 'Branch 12', location: 'MATAAS NA KAHOY', contact: '+63 43 234 5678', isMain: false },
    '13': { name: 'Branch 13', location: 'TANAUAN', contact: '+63 43 345 6789', isMain: false }
};

// Function to get user data from multiple sources
function getUserData() {
    console.log('=== GETTING USER DATA FOR TOPBAR ===');
    
    // Try to get from localStorage first
    let userRole = localStorage.getItem('user_role');
    let userBranchId = localStorage.getItem('user_branch_id');
    let userBranchName = localStorage.getItem('user_branch_name');
    let userBranchLocation = localStorage.getItem('user_branch_location');
    let isMainBranchUser = localStorage.getItem('is_main_branch_user') === 'true';

    console.log('localStorage values:');
    console.log('- user_role:', userRole);
    console.log('- user_branch_id:', userBranchId);
    console.log('- user_branch_name:', userBranchName);
    console.log('- user_branch_location:', userBranchLocation);
    console.log('- is_main_branch_user:', isMainBranchUser);

    // FIX: Correct the branch data based on location
    if (userBranchLocation) {
        // Find the correct branch ID based on location
        const correctBranch = Object.entries(branchData).find(([id, data]) => 
            data.location === userBranchLocation
        );
        
        if (correctBranch) {
            const [correctId, correctData] = correctBranch;
            console.log(`Correcting branch data for location: ${userBranchLocation}`);
            console.log(`Correct branch ID: ${correctId}, Name: ${correctData.name}`);
            
            userBranchId = correctId;
            userBranchName = correctData.name;
            isMainBranchUser = correctData.isMain;
        }
    }

    // If not found, try to get from user object
    if (!userRole || !userBranchId) {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('User object from localStorage:', userData);
            
            userRole = userRole || userData.role_display_name || userData.role;
            userBranchId = userBranchId || userData.branch_id;
            userBranchName = userBranchName || userData.branch_name;
            userBranchLocation = userBranchLocation || userData.branch_location;
            isMainBranchUser = isMainBranchUser || userData.is_main_branch_user === true;
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }

    // If still not found, try to get from URL or other sources
    if (!userBranchId) {
        // Check if we can determine from current page context
        const currentPath = window.location.pathname;
        console.log('Current path:', currentPath);
        
        if (currentPath.includes('marketingclerk')) {
            userRole = userRole || 'Marketing Clerk';
        } else if (currentPath.includes('financeofficer')) {
            userRole = userRole || 'Finance Officer';
        }
    }

    // Default fallback
    userRole = userRole || 'User';
    userBranchId = userBranchId || '1';
    userBranchName = userBranchName || 'Main Branch';
    userBranchLocation = userBranchLocation || 'IBAAN';
    isMainBranchUser = isMainBranchUser || userBranchId === '1';

    console.log('Final user data:');
    console.log('- userRole:', userRole);
    console.log('- userBranchId:', userBranchId);
    console.log('- userBranchName:', userBranchName);
    console.log('- userBranchLocation:', userBranchLocation);
    console.log('- isMainBranchUser:', isMainBranchUser);

    return {
        userRole,
        userBranchId: userBranchId.toString(),
        userBranchName,
        userBranchLocation,
        isMainBranchUser
    };
}

// Function to update top bar information
function updateTopBar() {
    console.log('=== UPDATING TOP BAR ===');
    
    const userData = getUserData();
    const { userRole, userBranchId, userBranchLocation, isMainBranchUser } = userData;

    // Update Header - FIXED FORMAT
    updateElement('userName', userRole);
    const headerText = isMainBranchUser 
        ? `IMVCMPC - Main Branch ${userBranchLocation}`
        : `IMVCMPC - Branch ${userBranchId} ${userBranchLocation}`;
    updateElement('userRole', headerText);
    
    // Update dropdown content for mobile
    updateElement('dropdownUserName', userRole);
    updateElement('dropdownUserRole', headerText);

    console.log('Top bar updated successfully!');
}

// Helper function to update element text
function updateElement(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
        console.log(`Updated ${id} to: ${text}`);
    } else {
        console.warn(`Element with id '${id}' not found`);
    }
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const dateElement = document.getElementById('currentDate');
    const timeElement = document.getElementById('currentTime');
    
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('en-US', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }
}

// Mobile dropdown toggle functionality
function initializeMobileDropdown() {
    const userAvatar = document.getElementById('userAvatar');
    const userDropdown = document.getElementById('userDropdown');
    
    // Only initialize dropdown on mobile screens
    function isMobileScreen() {
        return window.innerWidth <= 768;
    }
    
    console.log('Initializing mobile dropdown...');
    console.log('User avatar found:', !!userAvatar);
    console.log('User dropdown found:', !!userDropdown);
    console.log('Is mobile screen:', isMobileScreen());
    
    if (userAvatar && userDropdown) {
        userAvatar.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Only show dropdown on mobile screens
            if (isMobileScreen()) {
                console.log('Avatar clicked! Toggling dropdown...');
                userDropdown.classList.toggle('show');
                console.log('Dropdown classes:', userDropdown.className);
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userAvatar.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
        
        // Close dropdown on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                userDropdown.classList.remove('show');
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (!isMobileScreen()) {
                userDropdown.classList.remove('show');
            }
        });
    } else {
        console.error('Could not find user avatar or dropdown elements');
    }
}

// Initialize top bar when page loads
function initializeTopBar() {
    console.log('Initializing top bar...');
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Initialize mobile dropdown
    initializeMobileDropdown();
    
    // Update top bar immediately and after delays to ensure it works
    updateTopBar();
    setTimeout(updateTopBar, 100);
    setTimeout(updateTopBar, 500);
    setTimeout(updateTopBar, 1000);
}

// Make functions globally available
window.updateTopBar = updateTopBar;
window.updateDateTime = updateDateTime;
window.initializeTopBar = initializeTopBar;
