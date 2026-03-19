const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// ── GET /api/notifications ─────────────────────────────
// Returns the current user's 50 most recent notifications
router.get('/', async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/notifications/read-all ─────────────────
// Mark every unread notification for the current user as read
// NOTE: must be defined BEFORE /:id/read to avoid route collision
router.patch('/read-all', async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, read: false },
            data: { read: true }
        });
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/notifications/:id/read ─────────────────
// Mark a single notification as read (must belong to current user)
router.patch('/:id/read', async (req, res) => {
    try {
        const notif = await prisma.notification.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!notif) return res.status(404).json({ error: 'Notification not found' });
        if (notif.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

        const updated = await prisma.notification.update({
            where: { id: notif.id },
            data: { read: true }
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
