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
async function createNotification({ userId, type, message, taskId = null }) {
    try {
        await prisma.notification.create({
            data: { userId, type, message, taskId }
        });
    } catch (err) {
        // Notifications are non-critical — log but don't crash
        console.error('Failed to create notification:', err.message);
    }
}

module.exports = { createNotification };
