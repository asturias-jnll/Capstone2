const express = require('express');
const NotificationService = require('./notificationService');
const { authenticateToken, checkRole, auditLog } = require('./middleware');

const router = express.Router();
const notificationService = new NotificationService();

// Get all notifications for the current user
router.get('/notifications',
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user.id;
            console.log('🔍 GET /notifications - User from JWT token:');
            console.log('   user_id:', userId);
            console.log('   username:', req.user.username);
            console.log('   role:', req.user.role);
            
            const { category, is_read, is_highlighted, branch_id, limit, offset } = req.query;

            const filters = {};
            
            if (category) {
                filters.category = category;
            }

            if (is_read !== undefined) {
                filters.is_read = is_read === 'true';
            }

            if (is_highlighted !== undefined) {
                filters.is_highlighted = is_highlighted === 'true';
            }

            if (branch_id) {
                filters.branch_id = parseInt(branch_id);
            }

            if (limit) {
                filters.limit = parseInt(limit);
            }

            if (offset) {
                filters.offset = parseInt(offset);
            }

            const notifications = await notificationService.getNotifications(userId, filters);

            res.json({
                success: true,
                data: notifications,
                count: notifications.length
            });

        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get notification by ID
router.get('/notifications/:notificationId',
    authenticateToken,
    async (req, res) => {
        try {
            const { notificationId } = req.params;
            const userId = req.user.id;

            const notification = await notificationService.getNotificationById(notificationId, userId);

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    error: 'Notification not found'
                });
            }

            res.json({
                success: true,
                data: notification
            });

        } catch (error) {
            console.error('Error fetching notification:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Create a notification (admin only)
router.post('/notifications',
    authenticateToken,
    checkRole(['it_head', 'finance_officer']),
    auditLog('create_notification', 'notifications'),
    async (req, res) => {
        try {
            const { user_id, branch_id, title, content, category, type, status, reference_type, reference_id, is_highlighted, priority } = req.body;

            if (!user_id || !title || !content) {
                return res.status(400).json({
                    success: false,
                    error: 'user_id, title, and content are required'
                });
            }

            const notificationData = {
                user_id,
                branch_id,
                title,
                content,
                category: category || 'system',
                type: type || null,
                status: status || 'pending',
                reference_type,
                reference_id,
                is_highlighted: is_highlighted || false,
                priority: priority || 'normal'
            };

            const notification = await notificationService.createNotification(notificationData);

            res.status(201).json({
                success: true,
                message: 'Notification created successfully',
                data: notification
            });

        } catch (error) {
            console.error('Error creating notification:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Mark notification as read
router.put('/notifications/:notificationId/read',
    authenticateToken,
    async (req, res) => {
        try {
            const { notificationId } = req.params;
            const userId = req.user.id;

            const notification = await notificationService.markAsRead(notificationId, userId);

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    error: 'Notification not found'
                });
            }

            res.json({
                success: true,
                message: 'Notification marked as read',
                data: notification
            });

        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Update highlight status
router.put('/notifications/:notificationId/highlight',
    authenticateToken,
    async (req, res) => {
        try {
            const { notificationId } = req.params;
            const userId = req.user.id;
            const { is_highlighted } = req.body;

            if (is_highlighted === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'is_highlighted field is required'
                });
            }

            const notification = await notificationService.updateHighlightStatus(notificationId, userId, is_highlighted);

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    error: 'Notification not found'
                });
            }

            res.json({
                success: true,
                message: 'Notification highlight status updated',
                data: notification
            });

        } catch (error) {
            console.error('Error updating notification highlight status:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Delete notification
router.delete('/notifications/:notificationId',
    authenticateToken,
    auditLog('delete_notification', 'notifications'),
    async (req, res) => {
        try {
            const { notificationId } = req.params;
            const userId = req.user.id;

            const notification = await notificationService.deleteNotification(notificationId, userId);

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    error: 'Notification not found'
                });
            }

            res.json({
                success: true,
                message: 'Notification deleted successfully',
                data: notification
            });

        } catch (error) {
            console.error('Error deleting notification:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Get unread notification count
router.get('/notifications-count/unread',
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const { category, branch_id } = req.query;

            const filters = {};
            
            if (category) {
                filters.category = category;
            }

            if (branch_id) {
                filters.branch_id = parseInt(branch_id);
            }

            const count = await notificationService.getUnreadCount(userId, filters);

            res.json({
                success: true,
                count: count
            });

        } catch (error) {
            console.error('Error fetching unread count:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Mark all notifications as read
router.put('/notifications/mark-all-read',
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const { category, branch_id } = req.body;

            const filters = {};
            
            if (category) {
                filters.category = category;
            }

            if (branch_id) {
                filters.branch_id = parseInt(branch_id);
            }

            const notifications = await notificationService.markAllAsRead(userId, filters);

            res.json({
                success: true,
                message: 'All notifications marked as read',
                count: notifications.length
            });

        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

module.exports = router;
