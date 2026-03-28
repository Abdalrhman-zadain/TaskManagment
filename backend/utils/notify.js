const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create an in-app notification for a user.
 * @param {object} opts
 * @param {number} opts.userId     - recipient user ID
 * @param {string} opts.type       - task_assigned | task_done | deadline_missed | level_up
 * @param {string} opts.message    - human-readable message
 * @param {number} [opts.taskId]   - optional related task ID
 */
const { sendToUser } = require('../socket');

async function createNotification({ userId, type, message, taskId = null }) {
    try {
        const notification = await prisma.notification.create({
            data: { userId, type, message, taskId }
        });

        // Emit real-time notification
        sendToUser(userId, 'notification', notification);
    } catch (err) {
        // Notifications are non-critical
        console.error('Failed to create notification:', err.message);
    }
}

module.exports = { createNotification };
