// Notifications functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize notifications when page is loaded
    initializeNotifications();
});

// Initialize all notifications functionality
function initializeNotifications() {
    // Setup event listeners
    setupFilterEventListeners();
    setupNotificationEventListeners();
    
    // Load initial notifications
    loadNotifications();
    
    // Update unread count
    updateUnreadCount();
}

// Setup filter button event listeners
function setupFilterEventListeners() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all filter buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Filter notifications
            const filterType = this.getAttribute('data-filter');
            filterNotifications(filterType);
        });
    });
}

// Setup notification item event listeners
function setupNotificationEventListeners() {
    // Event delegation for notification items
    document.addEventListener('click', function(e) {
        if (e.target.closest('.notification-item')) {
            const notificationItem = e.target.closest('.notification-item');
            const notificationId = notificationItem.getAttribute('data-id');
            
            // Mark as read if unread
            if (notificationItem.classList.contains('unread')) {
                markAsRead(notificationId);
            }
        }
        
        // Handle action button clicks
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
    // Mock notifications data - in real app, this would come from API/database
    const notifications = [
        {
            id: 1,
            title: 'New Member Registration',
            content: 'A new member has been registered in Branch 1 - IBAAN. Please review the application.',
            type: 'info',
            priority: 'normal',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            isRead: false,
            category: 'system'
        },
        {
            id: 2,
            title: 'System Maintenance Alert',
            content: 'Scheduled system maintenance will occur tonight from 11:00 PM to 2:00 AM. Some services may be temporarily unavailable.',
            type: 'warning',
            priority: 'important',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
            isRead: false,
            category: 'system'
        },
        {
            id: 3,
            title: 'Monthly Report Generated',
            content: 'The monthly financial report for December 2024 has been successfully generated and is ready for review.',
            type: 'success',
            priority: 'normal',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
            isRead: false,
            category: 'system'
        },
        {
            id: 4,
            title: 'Branch Performance Alert',
            content: 'Branch 3 - SAN JOSE has exceeded its monthly savings target by 15%. Great performance!',
            type: 'success',
            priority: 'normal',
            timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
            isRead: true,
            category: 'important'
        },
        {
            id: 5,
            title: 'Database Backup Completed',
            content: 'Daily database backup has been completed successfully. All data is secure and up to date.',
            type: 'info',
            priority: 'normal',
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
            isRead: true,
            category: 'system'
        },
        {
            id: 6,
            title: 'Member Data Update Required',
            content: 'Several member records require updates. Please review and update member information as needed.',
            type: 'warning',
            priority: 'important',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            isRead: true,
            category: 'important'
        }
    ];
    
    // Store notifications in localStorage for persistence
    localStorage.setItem('notifications', JSON.stringify(notifications));
    
    // Display notifications
    displayNotifications(notifications);
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
    
    // Clear existing notifications
    notificationsList.innerHTML = '';
    
    // Create notification items
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
    
    const timeAgo = getTimeAgo(notification.timestamp);
    const typeClass = notification.type;
    
    notificationItem.innerHTML = `
        <div class="notification-header">
            <div>
                <div class="notification-title">${notification.title}</div>
                <div class="notification-meta">
                    <span class="notification-type ${typeClass}">
                        <i class="fas fa-${getTypeIcon(notification.type)}"></i>
                        ${notification.type}
                    </span>
                    <span class="notification-time">${timeAgo}</span>
                </div>
            </div>
        </div>
        <div class="notification-content">${notification.content}</div>
        <div class="notification-actions">
            ${notification.isRead ? '' : '<button class="notification-action-btn primary" data-action="mark-read"><i class="fas fa-check"></i> Mark as Read</button>'}
            <button class="notification-action-btn" data-action="dismiss"><i class="fas fa-times"></i> Dismiss</button>
        </div>
    `;
    
    return notificationItem;
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
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

// Filter notifications based on selected filter
function filterNotifications(filterType) {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    let filteredNotifications = [];
    
    switch (filterType) {
        case 'unread':
            filteredNotifications = notifications.filter(n => !n.isRead);
            break;
        case 'important':
            filteredNotifications = notifications.filter(n => n.priority === 'important');
            break;
        case 'system':
            filteredNotifications = notifications.filter(n => n.category === 'system');
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
        
        // Update UI
        const notificationItem = document.querySelector(`[data-id="${notificationId}"]`);
        if (notificationItem) {
            notificationItem.classList.remove('unread');
            notificationItem.classList.remove('important');
            
            // Update actions
            const actions = notificationItem.querySelector('.notification-actions');
            if (actions) {
                actions.innerHTML = `
                    <button class="notification-action-btn" data-action="dismiss"><i class="fas fa-times"></i> Dismiss</button>
                `;
            }
        }
        
        // Update unread count
        updateUnreadCount();
    }
}

// Handle notification action
function handleNotificationAction(action, notificationId) {
    switch (action) {
        case 'mark-read':
            markAsRead(notificationId);
            break;
        case 'dismiss':
            dismissNotification(notificationId);
            break;
    }
}

// Dismiss a notification
function dismissNotification(notificationId) {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const updatedNotifications = notifications.filter(n => n.id != notificationId);
    
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    
    // Remove from UI
    const notificationItem = document.querySelector(`[data-id="${notificationId}"]`);
    if (notificationItem) {
        notificationItem.remove();
    }
    
    // Check if list is empty
    const remainingNotifications = document.querySelectorAll('.notification-item');
    if (remainingNotifications.length === 0) {
        document.getElementById('notificationsList').style.display = 'none';
        document.getElementById('notificationsEmpty').style.display = 'block';
    }
    
    // Update unread count
    updateUnreadCount();
}

// Mark all notifications as read
function markAllAsRead() {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    
    notifications.forEach(notification => {
        notification.isRead = true;
    });
    
    localStorage.setItem('notifications', JSON.stringify(notifications));
    
    // Update UI
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
        item.classList.remove('unread');
        item.classList.remove('important');
        
        // Update actions
        const actions = item.querySelector('.notification-actions');
        if (actions) {
            actions.innerHTML = `
                <button class="notification-action-btn" data-action="dismiss"><i class="fas fa-times"></i> Dismiss</button>
            `;
        }
    });
    
    // Update unread count
    updateUnreadCount();
    
    // Show success message
    showNotificationMessage('All notifications marked as read', 'success');
}

// Clear all notifications
function clearAllNotifications() {
    if (confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
        localStorage.removeItem('notifications');
        
        // Clear UI
        const notificationsList = document.getElementById('notificationsList');
        const notificationsEmpty = document.getElementById('notificationsEmpty');
        
        if (notificationsList) notificationsList.style.display = 'none';
        if (notificationsEmpty) notificationsEmpty.style.display = 'block';
        
        // Update unread count
        updateUnreadCount();
        
        // Show success message
        showNotificationMessage('All notifications cleared', 'success');
    }
}

// Update unread count badge
function updateUnreadCount() {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    const unreadBadge = document.getElementById('unreadCount');
    if (unreadBadge) {
        unreadBadge.textContent = unreadCount;
        
        // Hide badge if no unread notifications
        if (unreadCount === 0) {
            unreadBadge.style.display = 'none';
        } else {
            unreadBadge.style.display = 'inline';
        }
    }
}

// Show notification message
function showNotificationMessage(message, type = 'info') {
    // Create temporary message element
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
    
    // Animate in
    setTimeout(() => {
        messageElement.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageElement.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 300);
    }, 3000);
}
