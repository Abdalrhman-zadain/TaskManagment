const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');

const router = express.Router();
const prisma = new PrismaClient();

// ── Configure multer for file uploads ──────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        cb(null, `${timestamp}-${randomString}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        // Allow images and videos only
        const allowed = /\.(jpg|jpeg|png|gif|mp4|avi|mov|mkv)$/i;
        if (allowed.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed'));
        }
    }
});

router.use(authMiddleware);

// ── POST /api/evidence/upload ──────────────────────────
// Manager uploads evidence (photo/video) for a task
router.post('/upload', upload.single('file'), async (req, res) => {
    const { taskId } = req.body;
    const taskIdNum = parseInt(taskId);

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const task = await prisma.task.findUnique({
            where: { id: taskIdNum },
            select: { id: true, assigneeId: true, status: true, creatorId: true }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Only the assignee (manager or employee) can upload evidence
        if (task.assigneeId !== req.user.id) {
            return res.status(403).json({ error: 'You can only upload evidence for your assigned tasks' });
        }

        // Update task with evidence and set status to PENDING_APPROVAL
        const updatedTask = await prisma.task.update({
            where: { id: taskIdNum },
            data: {
                evidenceUrl: `/uploads/${req.file.filename}`,
                evidenceUploadedAt: new Date(),
                status: 'PENDING_APPROVAL',
                approvalStatus: 'PENDING'
            }
        });

        // Notify the creator (CEO or Manager) that evidence was uploaded
        await createNotification({
            userId: task.creatorId,
            type: 'task_pending_approval',
            message: `Task evidence uploaded and pending your approval: "${updatedTask.title}"`,
            taskId: taskIdNum
        });

        res.json({
            message: 'Evidence uploaded successfully',
            task: updatedTask
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/evidence/:id/approve ────────────────────
// CEO or Manager approves the task
router.patch('/:id/approve', requireRole('CEO', 'MANAGER'), async (req, res) => {
    const { approvalComment } = req.body;
    const taskIdNum = parseInt(req.params.id);

    try {
        const task = await prisma.task.findUnique({
            where: { id: taskIdNum },
            select: { id: true, creatorId: true, assigneeId: true, status: true, title: true, deadline: true }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Only the creator (CEO or Manager who assigned the task) can approve
        if (task.creatorId !== req.user.id) {
            return res.status(403).json({ error: 'Only the task creator can approve' });
        }

        if (task.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({ error: 'Task is not pending approval' });
        }

        // Auto-score the task (same logic as mark done, but via approval)
        const deadline = new Date(task.deadline);
        const now = new Date();
        const diffDays = (now - deadline) / (1000 * 60 * 60 * 24);

        let scoreValue;
        let isOnTime = false;

        if (diffDays <= 0) {
            scoreValue = Math.floor(Math.random() * 3) + 8;
            isOnTime = true;
        } else if (diffDays <= 2) {
            scoreValue = Math.floor(Math.random() * 3) + 5;
        } else if (diffDays <= 5) {
            scoreValue = Math.floor(Math.random() * 3) + 2;
        } else {
            scoreValue = 1;
        }

        // Update task approval
        const updatedTask = await prisma.task.update({
            where: { id: taskIdNum },
            data: {
                status: 'DONE',
                approvalStatus: 'APPROVED',
                approvalComment,
                approvalBy: req.user.id,
                approvalAt: new Date(),
                completedAt: new Date()
            }
        });

        // Create score record
        const score = await prisma.score.create({
            data: {
                value: scoreValue,
                isOnTime,
                taskId: taskIdNum,
                userId: task.assigneeId
            }
        });

        // Update user's on-time count and level (if on-time)
        if (isOnTime) {
            const user = await prisma.user.findUnique({ where: { id: task.assigneeId } });
            const newOnTimeCount = user.onTimeCount + 1;

            let newStars = user.stars;
            if (newOnTimeCount >= 30) newStars = 5;
            else if (newOnTimeCount >= 25) newStars = 4;
            else if (newOnTimeCount >= 20) newStars = 3;
            else if (newOnTimeCount >= 10) newStars = 2;
            else if (newOnTimeCount >= 5) newStars = 1;

            let newLevel = 'BRONZE';
            if (newStars >= 5) newLevel = 'GOLD';
            else if (newStars >= 3) newLevel = 'SILVER';

            await prisma.user.update({
                where: { id: task.assigneeId },
                data: { onTimeCount: newOnTimeCount, stars: newStars, level: newLevel }
            });

            if (newLevel !== user.level) {
                await createNotification({
                    userId: task.assigneeId,
                    type: 'level_up',
                    message: `Congratulations! You reached ${newLevel} level.`
                });
            }
        }

        // Notify the assignee that their task was approved
        await createNotification({
            userId: task.assigneeId,
            type: 'task_approved',
            message: `Your task "${task.title}" has been approved! Score: ${scoreValue}/10`,
            taskId: taskIdNum
        });

        res.json({ task: updatedTask, score });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/evidence/:id/reject ─────────────────────
// CEO or Manager rejects the task and sends it back
router.patch('/:id/reject', requireRole('CEO', 'MANAGER'), async (req, res) => {
    const { rejectionReason } = req.body;
    const taskIdNum = parseInt(req.params.id);

    try {
        const task = await prisma.task.findUnique({
            where: { id: taskIdNum },
            select: { id: true, creatorId: true, assigneeId: true, status: true, title: true }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Only the creator can reject
        if (task.creatorId !== req.user.id) {
            return res.status(403).json({ error: 'Only the task creator can reject' });
        }

        if (task.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({ error: 'Task is not pending approval' });
        }

        // Send task back to IN_PROGRESS
        const updatedTask = await prisma.task.update({
            where: { id: taskIdNum },
            data: {
                status: 'IN_PROGRESS',
                approvalStatus: 'REJECTED',
                approvalComment: rejectionReason,
                approvalBy: req.user.id,
                approvalAt: new Date()
            }
        });

        // Notify the assignee of rejection
        await createNotification({
            userId: task.assigneeId,
            type: 'task_rejected',
            message: `Your task "${task.title}" was rejected. Reason: ${rejectionReason || 'No feedback provided'}`,
            taskId: taskIdNum
        });

        res.json({ task: updatedTask });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/evidence/:id ───────────────────────────
// Manager deletes uploaded evidence to re-upload
router.delete('/:id', async (req, res) => {
    const taskIdNum = parseInt(req.params.id);

    try {
        const task = await prisma.task.findUnique({
            where: { id: taskIdNum },
            select: {
                id: true,
                assigneeId: true,
                evidenceUrl: true,
                status: true,
                title: true
            }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Only the assignee who uploaded the evidence can delete it
        if (task.assigneeId !== req.user.id) {
            return res.status(403).json({ error: 'You can only delete evidence for your own tasks' });
        }

        // Can only delete if task is PENDING_APPROVAL (not yet approved)
        if (task.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({ error: 'Can only delete evidence for tasks awaiting approval' });
        }

        // Delete the file from uploads folder
        if (task.evidenceUrl) {
            const filePath = path.join(process.cwd(), task.evidenceUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Clear evidence from task and set back to IN_PROGRESS
        const updatedTask = await prisma.task.update({
            where: { id: taskIdNum },
            data: {
                evidenceUrl: null,
                evidenceUploadedAt: null,
                status: 'IN_PROGRESS',
                approvalStatus: 'PENDING'
            }
        });

        res.json({
            message: 'Evidence deleted successfully',
            task: updatedTask
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
