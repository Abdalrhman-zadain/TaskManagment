const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');

const router = express.Router();
const prisma = new PrismaClient();
const GOVERNMENT_TRANSACTION_TYPE_AR = 'معاملات حكومية';

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isPublicRelationsSectionName(sectionName) {
  const normalized = normalizeText(sectionName);
  return normalized === 'public relations' || normalized === 'العلاقات العامة';
}

function sanitizePrGovernmentData(input) {
  if (!input || typeof input !== 'object') return null;

  const fields = {
    companyName: String(input.companyName || '').trim(),
    governmentEntity: String(input.governmentEntity || '').trim(),
    transactionType: String(input.transactionType || '').trim(),
    governmentEmployee: String(input.governmentEmployee || '').trim(),
    applicationNumber: String(input.applicationNumber || '').trim(),
    taxIdNumber: String(input.taxIdNumber || '').trim(),
    nationalIdNumber: String(input.nationalIdNumber || '').trim(),
    notes: String(input.notes || '').trim(),
    updates: String(input.updates || '').trim()
  };

  const hasAnyValue = Object.values(fields).some((value) => value.length > 0);
  return hasAnyValue ? fields : null;
}

// All task routes require login
router.use(authMiddleware);

// ── GET /api/tasks ─────────────────────────────────────
// CEO sees all tasks, Manager sees their section, Employee sees their own
router.get('/', requireRole('CEO', 'MANAGER', 'EMPLOYEE'), async (req, res) => {
  try {
    let where = {};

    if (req.user.role === 'MANAGER') {
      where.sectionId = req.user.sectionId;
    } else if (req.user.role === 'EMPLOYEE') {
      where.assigneeId = req.user.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, role: true } },
        creator: { select: { id: true, name: true, role: true } },
        section: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, status: true } },
        score: true,
        subtasks: true
      },
      orderBy: { deadline: 'asc' }
    });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tasks/:id ─────────────────────────────────
router.get('/:id', requireRole('CEO', 'MANAGER', 'EMPLOYEE'), async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        assignee: { select: { id: true, name: true, role: true, level: true, stars: true } },
        creator: { select: { id: true, name: true, role: true } },
        section: true,
        project: { select: { id: true, name: true, status: true, client: { select: { id: true, name: true } } } },
        score: true,
        subtasks: { include: { assignee: { select: { id: true, name: true } } } },
        parent: { select: { id: true, title: true } }
      }
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tasks ────────────────────────────────────
// CEO or Manager can create tasks
router.post('/', requireRole('CEO', 'MANAGER'), async (req, res) => {
  const {
    title,
    description,
    assigneeId,
    sectionId,
    deadline,
    priority,
    parentId,
    projectId,
    prGovernmentData
  } = req.body;
  const parsedAssigneeId = parseInt(assigneeId);
  const parsedSectionId = parseInt(sectionId);
  const parsedParentId = parentId ? parseInt(parentId) : null;
  const parsedProjectId = parseInt(projectId);
  const sanitizedPrGovernmentData = sanitizePrGovernmentData(prGovernmentData);

  try {
    if (!title || !deadline || Number.isNaN(parsedAssigneeId) || Number.isNaN(parsedSectionId) || Number.isNaN(parsedProjectId)) {
      return res.status(400).json({ error: 'Missing or invalid task fields' });
    }

    const assignee = await prisma.user.findUnique({
      where: { id: parsedAssigneeId },
      select: { id: true, role: true, sectionId: true }
    });

    if (!assignee) {
      return res.status(404).json({ error: 'Assignee not found' });
    }

    // Managers can only assign to employees
    if (req.user.role === 'MANAGER' && assignee.role !== 'EMPLOYEE') {
      return res.status(400).json({ error: 'Managers can only assign tasks to employees' });
    }
    if (assignee.role === 'CEO') {
      return res.status(400).json({ error: 'Cannot assign tasks to the CEO' });
    }

    const [section, project] = await Promise.all([
      prisma.section.findUnique({ where: { id: parsedSectionId } }),
      prisma.project.findUnique({ where: { id: parsedProjectId }, select: { id: true, sectionId: true, managerId: true } })
    ]);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (project.sectionId !== parsedSectionId) {
      return res.status(400).json({ error: 'Project must belong to the selected section' });
    }

    const isPublicRelationsSection = isPublicRelationsSectionName(section.name);
    if (sanitizedPrGovernmentData && !isPublicRelationsSection) {
      return res.status(400).json({ error: 'Government transaction fields are only allowed for Public Relations section tasks' });
    }

    const shouldStorePrGovernmentData =
      isPublicRelationsSection &&
      sanitizedPrGovernmentData &&
      sanitizedPrGovernmentData.transactionType === GOVERNMENT_TRANSACTION_TYPE_AR;

    if (req.user.role === 'CEO') {
      if (parsedParentId) {
        return res.status(400).json({ error: 'CEO must create a main task (without parent task)' });
      }

      if (assignee.role !== 'MANAGER') {
        return res.status(400).json({ error: 'CEO can only assign main tasks to a section manager' });
      }

      if (!section.managerId || section.managerId !== parsedAssigneeId) {
        return res.status(400).json({ error: 'Selected assignee must be the manager of the selected section' });
      }
      if (project.managerId !== parsedAssigneeId) {
        return res.status(400).json({ error: 'Selected assignee must be the manager for this project' });
      }
    }

    if (assignee.sectionId !== parsedSectionId) {
      return res.status(400).json({ error: 'Assignee must belong to the selected section' });
    }

    if (req.user.role === 'MANAGER') {
      if (!req.user.sectionId) {
        return res.status(403).json({ error: 'Manager is not assigned to a section' });
      }

      if (req.user.sectionId !== parsedSectionId) {
        return res.status(403).json({ error: 'Managers can only assign tasks within their own section' });
      }
    }

    if (parsedParentId) {
      const parentTask = await prisma.task.findUnique({
        where: { id: parsedParentId },
        include: {
          creator: { select: { id: true, role: true } }
        }
      });

      if (!parentTask) {
        return res.status(404).json({ error: 'Parent task not found' });
      }

      if (parentTask.sectionId !== parsedSectionId) {
        return res.status(400).json({ error: 'Parent task must belong to the same section' });
      }
      if (parentTask.projectId !== parsedProjectId) {
        return res.status(400).json({ error: 'Parent task must belong to the same project' });
      }

      if (req.user.role === 'MANAGER') {
        if (parentTask.creator.role !== 'CEO') {
          return res.status(400).json({ error: 'Subtask parent must be a CEO-created main task' });
        }

        if (parentTask.assigneeId !== req.user.id) {
          return res.status(403).json({ error: 'You can only create subtasks under tasks assigned to you' });
        }

        if (parentTask.parentId) {
          return res.status(400).json({ error: 'Manager can only create a subtask under a main task' });
        }
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        assigneeId: parsedAssigneeId,
        sectionId: parsedSectionId,
        creatorId: req.user.id,
        deadline: new Date(deadline),
        priority: priority || 'medium',
        parentId: parsedParentId,
        projectId: parsedProjectId,
        prCompanyName: shouldStorePrGovernmentData ? sanitizedPrGovernmentData.companyName : null,
        prGovernmentEntity: shouldStorePrGovernmentData ? sanitizedPrGovernmentData.governmentEntity : null,
        prTransactionType: shouldStorePrGovernmentData ? sanitizedPrGovernmentData.transactionType : null,
        prGovernmentEmployee: shouldStorePrGovernmentData ? sanitizedPrGovernmentData.governmentEmployee : null,
        prApplicationNumber: shouldStorePrGovernmentData ? sanitizedPrGovernmentData.applicationNumber : null,
        prTaxIdNumber: shouldStorePrGovernmentData ? sanitizedPrGovernmentData.taxIdNumber : null,
        prNationalIdNumber: shouldStorePrGovernmentData ? sanitizedPrGovernmentData.nationalIdNumber : null,
        prNotes: shouldStorePrGovernmentData ? sanitizedPrGovernmentData.notes : null,
        prUpdates: shouldStorePrGovernmentData ? sanitizedPrGovernmentData.updates : null
      }
    });

    // Notify the assignee that a task was assigned to them
    await createNotification({
      userId: parsedAssigneeId,
      type: 'task_assigned',
      message: `You have been assigned a new task: "${title}"`,
      taskId: task.id
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/tasks/:id/done ──────────────────────────
// Employee marks their task as done → auto-scores it
router.patch('/:id/done', requireRole('EMPLOYEE'), async (req, res) => {
  const taskId = parseInt(req.params.id);

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Only the assignee can mark it done
    if (task.assigneeId !== req.user.id) {
      return res.status(403).json({ error: 'You can only complete your own tasks' });
    }

    const completedAt = new Date();
    const deadline = new Date(task.deadline);
    const diffDays = (completedAt - deadline) / (1000 * 60 * 60 * 24);

    // ── Auto-score logic ──────────────────────────────
    let scoreValue;
    let isOnTime = false;

    if (diffDays <= 0) {
      // On time
      scoreValue = Math.floor(Math.random() * 3) + 8; // 8, 9, or 10
      isOnTime = true;
    } else if (diffDays <= 2) {
      // Slightly late
      scoreValue = Math.floor(Math.random() * 3) + 5; // 5, 6, or 7
    } else if (diffDays <= 5) {
      // Late
      scoreValue = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
    } else {
      // Very late
      scoreValue = 1;
    }

    // Update task status to PENDING_APPROVAL (approval workflow)
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: 'PENDING_APPROVAL', approvalStatus: 'PENDING' }
    });

    // Notify the creator (CEO or Manager) that task is ready for approval
    await createNotification({
      userId: task.creatorId,
      type: 'task_pending_approval',
      message: `Task "${task.title}" is pending your approval`,
      taskId: taskId
    });

    res.json({ task: updatedTask, message: 'Task submitted for approval' });
    return;

    /* Legacy auto-score logic (now handled in evidence approve endpoint)
    // Create score record
    const score = await prisma.score.create({
      data: { value: scoreValue, isOnTime, taskId, userId: req.user.id }
    });

    // Update user's on-time count, stars and level
    if (isOnTime) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
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
        where: { id: req.user.id },
        data: { onTimeCount: newOnTimeCount, stars: newStars, level: newLevel }
      });

      if (newLevel !== user.level) {
        await createNotification({
          userId: req.user.id,
          type: 'level_up',
          message: `Congratulations! You reached ${newLevel} level.`
        });
        if (user.sectionId) {
          const section = await prisma.section.findUnique({
            where: { id: user.sectionId },
            select: { managerId: true, name: true }
          });
          if (section?.managerId && section.managerId !== req.user.id) {
            await createNotification({
              userId: section.managerId,
              type: 'level_up',
              message: `Team member ${user.name} has reached ${newLevel} level.`
            });
          }
        }
      }
    }
    */
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/tasks/:id ───────────────────────────────
// Managers/CEO can update task details (priority, deadline, etc.)
router.patch('/:id', requireRole('CEO', 'MANAGER'), async (req, res) => {
  const taskId = parseInt(req.params.id);
  const { title, description, deadline, priority, status } = req.body;

  try {
    const originalTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { creatorId: true, assigneeId: true, title: true }
    });

    if (!originalTask) return res.status(404).json({ error: 'Task not found' });
    if (originalTask.creatorId !== req.user.id && req.user.role !== 'CEO') {
      return res.status(403).json({ error: 'Only the creator or CEO can edit this task' });
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        title,
        description,
        deadline: deadline ? new Date(deadline) : undefined,
        priority,
        status
      }
    });

    // Notify the assignee about the update
    await createNotification({
      userId: originalTask.assigneeId,
      type: 'task_updated',
      message: `Task details updated for: "${task.title}"`,
      taskId: taskId
    });

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/tasks/:id/status ───────────────────────
router.patch('/:id/status', requireRole('CEO', 'MANAGER', 'EMPLOYEE'), async (req, res) => {
  const { status } = req.body;
  const taskId = parseInt(req.params.id);
  try {
    const originalTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!originalTask) return res.status(404).json({ error: 'Task not found' });

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status }
    });

    // Notify the creator about status update
    if (originalTask.creatorId !== req.user.id) {
      await createNotification({
        userId: originalTask.creatorId,
        type: 'task_status_changed',
        message: `Task "${task.title}" status changed to ${status}`,
        taskId: taskId
      });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/tasks/:id ──────────────────────────────
router.delete('/:id', requireRole('CEO', 'MANAGER'), async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
