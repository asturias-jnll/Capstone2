// Notifications functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeNotifications();
});

// Initialize all notifications functionality
function initializeNotifications() {
    setupFilterEventListeners();
    setupNotificationEventListeners();
    loadNotifications();
    updateUnreadCount();
    
}






// Setup filter button event listeners
function setupFilterEventListeners() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filterType = this.getAttribute('data-filter');
            filterNotifications(filterType);
        });
    });
}

// Setup notification item event listeners
function setupNotificationEventListeners() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.notification-item')) {
            const notificationItem = e.target.closest('.notification-item');
            const notificationId = notificationItem.getAttribute('data-id');
            
            if (notificationItem.classList.contains('unread')) {
                markAsRead(notificationId);
            }
        }
        
        if (e.target.closest('.notification-action-btn')) {
            const actionBtn = e.target.closest('.notification-action-btn');
            const action = actionBtn.getAttribute('data-action');
            const notificationId = actionBtn.closest('.notification-item').getAttribute('data-id');
            
            handleNotificationAction(action, notificationId);
        }
    });
}

// Load notifications data
function loadNotifications() {
    // Generate main branch notifications (all branches)
    const notifications = generateMainBranchNotifications();
    
    localStorage.setItem('notifications', JSON.stringify(notifications));
    displayNotifications(notifications);
}


// Generate main branch notifications (all branches)
function generateMainBranchNotifications() {
    return [
        {
            id: 1,
            title: 'New Member Registration - IBAAN Main Branch',
            content: 'A new member has been registered in IBAAN Main Branch. Please review the application.',
            type: 'info',
            priority: 'normal',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            isRead: false,
            category: 'transaction',
            branch: 'ibaamain',
            status: 'pending'
        },
        {
            id: 2,
            title: 'System Maintenance Alert',
            content: 'Scheduled system maintenance will occur tonight from 11:00 PM to 2:00 AM. Some services may be temporarily unavailable.',
            type: 'warning',
            priority: 'important',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            isRead: false,
            category: 'system',
            branch: 'ibaamain',
            status: 'active'
        },
        {
            id: 3,
            title: 'Monthly Report Generated',
            content: 'The monthly financial report for December 2024 has been successfully generated and is ready for review.',
            type: 'success',
            priority: 'normal',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            isRead: false,
            category: 'system',
            branch: 'ibaamain',
            status: 'completed'
        },
        {
            id: 4,
            title: 'Branch Performance Alert - SAN JOSE Branch',
            content: 'SAN JOSE Branch - Own Branch has exceeded its monthly savings target by 15%. Great performance!',
            type: 'success',
            priority: 'normal',
            timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
            isRead: true,
            category: 'transaction',
            branch: 'sanjose',
            status: 'completed'
        },
        {
            id: 5,
            title: 'Database Backup Completed',
            content: 'Daily database backup has been completed successfully. All data is secure and up to date.',
            type: 'info',
            priority: 'normal',
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
            isRead: true,
            category: 'system',
            branch: 'ibaamain',
            status: 'completed'
        },
        {
            id: 6,
            title: 'Member Data Update Required - IBAAN Main Branch',
            content: 'Finance Officer has requested review of member data updates. Please review and update member information as needed.',
            type: 'warning',
            priority: 'important',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            isRead: true,
            category: 'transaction',
            branch: 'ibaamain',
            status: 'pending'
        },
        {
            id: 7,
            title: 'New Transaction - LIPA CITY Branch',
            content: 'Large deposit transaction completed in LIPA CITY Branch - Own Branch. Amount: ₱500,000.00',
            type: 'success',
            priority: 'normal',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            isRead: false,
            category: 'transaction',
            branch: 'lipacity',
            status: 'completed'
        },
        {
            id: 8,
            title: 'System Update Available',
            content: 'New system update v2.1.5 is available for installation. Includes performance improvements and bug fixes.',
            type: 'info',
            priority: 'important',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            isRead: false,
            category: 'system',
            branch: 'ibaamain',
            status: 'pending'
        }
    ];
}


// Display notifications in the UI
function displayNotifications(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    const notificationsEmpty = document.getElementById('notificationsEmpty');
    
    if (!notificationsList) return;
    
    if (notifications.length === 0) {
        notificationsList.style.display = 'none';
        notificationsEmpty.style.display = 'block';
        return;
    }
    
    notificationsList.style.display = 'block';
    notificationsEmpty.style.display = 'none';
    notificationsList.innerHTML = '';
    
    notifications.forEach(notification => {
        const notificationItem = createNotificationItem(notification);
        notificationsList.appendChild(notificationItem);
    });
}

// Create a single notification item
function createNotificationItem(notification) {
    const notificationItem = document.createElement('div');
    notificationItem.className = `notification-item ${notification.isRead ? '' : 'unread'} ${notification.priority === 'important' ? 'important' : ''} ${notification.category}`;
    notificationItem.setAttribute('data-id', notification.id);
    notificationItem.setAttribute('data-branch', notification.branch);
    notificationItem.setAttribute('data-status', notification.status);
    
    const timeAgo = getTimeAgo(notification.timestamp);
    const typeClass = notification.type;
    const branchName = getBranchName(notification.branch);
    
    notificationItem.innerHTML = `
        <div class="notification-header">
            <div>
                <div class="notification-title">${notification.title}</div>
                <div class="notification-meta">
                    <span class="notification-type ${typeClass}">
                        <i class="fas fa-${getTypeIcon(notification.type)}"></i>
                        ${notification.type}
                    </span>
                    <span class="notification-branch">${branchName}</span>
                    <span class="notification-time">${timeAgo}</span>
                </div>
            </div>
        </div>
        <div class="notification-content">${notification.content}</div>
        <div class="notification-actions">
            ${notification.isRead ? '' : '<button class="notification-action-btn primary" data-action="mark-read"><i class="fas fa-check"></i> Mark as Read</button>'}
            ${notification.status === 'pending' ? '<button class="notification-action-btn warning" data-action="mark-done"><i class="fas fa-check-circle"></i> Mark as Done</button>' : ''}
            <button class="notification-action-btn" data-action="dismiss"><i class="fas fa-times"></i> Dismiss</button>
        </div>
    `;
    
    return notificationItem;
}

// Get branch name from branch code
function getBranchName(branchCode) {
    const branches = {
        'ibaamain': 'Branch 1 - IBAAN',
        'bauan': 'Branch 2 - BAUAN',
        'sanjose': 'Branch 3 - SAN JOSE',
        'rosario': 'Branch 4 - ROSARIO',
        'sanjuan': 'Branch 5 - SAN JUAN',
        'padregarcia': 'Branch 6 - PADRE GARCIA',
        'lipacity': 'Branch 7 - LIPA CITY',
        'batangascity': 'Branch 8 - BATANGAS CITY',
        'mabini': 'Branch 9 - MABINI LIPA',
        'calamias': 'Branch 10 - CALAMIAS',
        'lemery': 'Branch 11 - LEMERY',
        'mataasnakahoy': 'Branch 12 - MATAAS NA KAHOY',
        'tanauan': 'Branch 13 - TANAUAN'
    };
    return branches[branchCode] || branchCode;
}

// Get appropriate icon for notification type
function getTypeIcon(type) {
    const icons = {
        'info': 'info-circle',
        'warning': 'exclamation-triangle',
        'error': 'times-circle',
        'success': 'check-circle'
    };
    return icons[type] || 'bell';
}

// Get time ago string
function getTimeAgo(timestamp) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

// Filter notifications based on selected filter
function filterNotifications(filterType) {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    let filteredNotifications = [];
    
    switch (filterType) {
        case 'unread':
            filteredNotifications = notifications.filter(n => !n.isRead);
            break;
        case 'read':
            filteredNotifications = notifications.filter(n => n.isRead);
            break;
        case 'important':
            filteredNotifications = notifications.filter(n => n.priority === 'important');
            break;
        case 'system':
            filteredNotifications = notifications.filter(n => n.category === 'system');
            break;
        case 'done':
            filteredNotifications = notifications.filter(n => n.status === 'completed');
            break;
        default: // 'all'
            filteredNotifications = notifications;
            break;
    }
    
    displayNotifications(filteredNotifications);
}


// Mark a notification as read
function markAsRead(notificationId) {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const notification = notifications.find(n => n.id == notificationId);
    
    if (notification && !notification.isRead) {
        notification.isRead = true;
        localStorage.setItem('notifications', JSON.stringify(notifications));
        
        const notificationItem = document.querySelector(`[data-id="${notificationId}"]`);
        if (notificationItem) {
            notificationItem.classList.remove('unread');
            notificationItem.classList.remove('important');
            
            const actions = notificationItem.querySelector('.notification-actions');
            if (actions) {
                actions.innerHTML = `
                    ${notification.status === 'pending' ? '<button class="notification-action-btn warning" data-action="mark-done"><i class="fas fa-check-circle"></i> Mark as Done</button>' : ''}
                    <button class="notification-action-btn" data-action="dismiss"><i class="fas fa-times"></i> Dismiss</button>
                `;
            }
        }
        
        updateUnreadCount();
    }
}

// Handle notification action
function handleNotificationAction(action, notificationId) {
    switch (action) {
        case 'mark-read':
            markAsRead(notificationId);
            break;
        case 'mark-done':
            markAsDone(notificationId);
            break;
        case 'dismiss':
            dismissNotification(notificationId);
            break;
    }
}

// Mark notification as done
function markAsDone(notificationId) {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const notification = notifications.find(n => n.id == notificationId);
    
    if (notification) {
        notification.status = 'completed';
        localStorage.setItem('notifications', JSON.stringify(notifications));
        
        const notificationItem = document.querySelector(`[data-id="${notificationId}"]`);
        if (notificationItem) {
            notificationItem.setAttribute('data-status', 'completed');
            const actions = notificationItem.querySelector('.notification-actions');
            if (actions) {
                actions.innerHTML = `
                    <button class="notification-action-btn" data-action="dismiss"><i class="fas fa-times"></i> Dismiss</button>
                `;
            }
        }
        
        showNotificationMessage('Notification marked as done', 'success');
    }
}

// Dismiss a notification
function dismissNotification(notificationId) {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const updatedNotifications = notifications.filter(n => n.id != notificationId);
    
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    
    const notificationItem = document.querySelector(`[data-id="${notificationId}"]`);
    if (notificationItem) {
        notificationItem.remove();
    }
    
    const remainingNotifications = document.querySelectorAll('.notification-item');
    if (remainingNotifications.length === 0) {
        document.getElementById('notificationsList').style.display = 'none';
        document.getElementById('notificationsEmpty').style.display = 'block';
    }
    
    updateUnreadCount();
}

// Update unread count badge
function updateUnreadCount() {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    const unreadBadge = document.getElementById('unreadCount');
    if (unreadBadge) {
        unreadBadge.textContent = unreadCount;
        unreadBadge.style.display = unreadCount === 0 ? 'none' : 'inline';
    }
}

// Show notification message
function showNotificationMessage(message, type = 'info') {
    const messageElement = document.createElement('div');
    messageElement.className = `notification-message ${type}`;
    messageElement.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        background: ${type === 'success' ? 'var(--green-500)' : 'var(--blue-500)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        font-size: 14px;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    messageElement.textContent = message;
    
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
        messageElement.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        messageElement.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 300);
    }, 3000);
}
