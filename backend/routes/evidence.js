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
        // Allow supported image and video formats only
        const allowed = /\.(jpg|jpeg|png|mp4|mov)$/i;
        if (allowed.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, MP4, and MOV files are allowed'));
        }
    }
});

router.use(authMiddleware);

// ── POST /api/evidence/upload ──────────────────────────
// Manager uploads evidence (photo/video) for a task
router.post('/upload', upload.array('files', 10), async (req, res) => {
    const { taskId } = req.body;
    const taskIdNum = parseInt(taskId);

    try {
        if (!req.files?.length) {
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
        const uploadedEvidence = req.files.map((file) => `/uploads/${file.filename}`);

        const updatedTask = await prisma.task.update({
            where: { id: taskIdNum },
            data: {
                evidenceUrl: uploadedEvidence[0],
                evidenceUrls: uploadedEvidence,
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

        const { approvalComment, customScore } = req.body;

        // Auto-score the task (same logic as mark done, but via approval)
        const deadline = new Date(task.deadline);
        const now = new Date();
        const diffDays = (now - deadline) / (1000 * 60 * 60 * 24);

        let scoreValue;
        let isOnTime = false;

        if (['CEO', 'MANAGER'].includes(req.user.role) && customScore !== undefined && customScore !== null && customScore !== '') {
            const parsedScore = Number(customScore);
            if (parsedScore < 1 || parsedScore > 10) {
                return res.status(400).json({ error: 'Score must be between 1 and 10' });
            }
            scoreValue = parsedScore;
            isOnTime = diffDays <= 0;
        } else {
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
                evidenceUrls: true,
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

        // Can only delete if task is not yet fully approved (DONE)
        if (task.status === 'DONE') {
            return res.status(400).json({ error: 'Cannot delete evidence for a completed task' });
        }

        // Delete the file from uploads folder
        const evidencePaths = task.evidenceUrls?.length ? task.evidenceUrls : task.evidenceUrl ? [task.evidenceUrl] : [];
        evidencePaths.forEach((evidencePath) => {
            const filePath = path.join(process.cwd(), evidencePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        // Clear evidence from task and set back to IN_PROGRESS
        const updatedTask = await prisma.task.update({
            where: { id: taskIdNum },
            data: {
                evidenceUrl: null,
                evidenceUrls: [],
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
