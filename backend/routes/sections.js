const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// ── GET /api/sections ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const sections = await prisma.section.findMany({
      include: {
        manager: { select: { id: true, name: true } },
        members: { select: { id: true, name: true, role: true, stars: true, level: true } },
        _count: { select: { tasks: true } }
      }
    });
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sections ─────────────────────────────────
// Only CEO can create sections
router.post('/', requireRole('CEO'), async (req, res) => {
  const { name, managerId } = req.body;
  try {
    const section = await prisma.section.create({
      data: { name, managerId: managerId ? parseInt(managerId) : null }
    });
    res.status(201).json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/sections/:id ────────────────────────────
router.patch('/:id', requireRole('CEO'), async (req, res) => {
  const { name, managerId } = req.body;
  try {
    const sectionId = parseInt(req.params.id);
    const parsedManagerId = managerId ? parseInt(managerId) : null;

    // If assigning a manager, first unassign them from any other section
    if (parsedManagerId) {
      await prisma.section.updateMany({
        where: {
          managerId: parsedManagerId,
          id: { not: sectionId }
        },
        data: { managerId: null }
      });
    }

    // Now update this section
    const section = await prisma.section.update({
      where: { id: sectionId },
      data: { name, managerId: parsedManagerId }
    });
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/sections/:id ───────────────────────────
// Only CEO can delete sections
router.delete('/:id', requireRole('CEO'), async (req, res) => {
  try {
    const sectionId = parseInt(req.params.id);

    // Get all task IDs in this section
    const tasks = await prisma.task.findMany({
      where: { sectionId },
      select: { id: true }
    });
    const taskIds = tasks.map(t => t.id);

    // Get all project IDs in this section
    const projects = await prisma.project.findMany({
      where: { sectionId },
      select: { id: true }
    });
    const projectIds = projects.map(p => p.id);

    // Delete all scores associated with tasks in this section
    if (taskIds.length > 0) {
      await prisma.score.deleteMany({
        where: { taskId: { in: taskIds } }
      });
    }

    // Delete all project comments associated with projects in this section
    if (projectIds.length > 0) {
      await prisma.projectComment.deleteMany({
        where: { projectId: { in: projectIds } }
      });
    }

    // Delete all tasks associated with this section
    await prisma.task.deleteMany({
      where: { sectionId }
    });

    // Delete all projects associated with this section
    await prisma.project.deleteMany({
      where: { sectionId }
    });

    // Delete the section
    await prisma.section.delete({
      where: { id: sectionId }
    });

    res.json({ message: 'Section deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
