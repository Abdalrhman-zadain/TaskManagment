const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// ── POST /api/users ───────────────────────────────────
// CEO and Manager can create accounts
router.post('/', requireRole('CEO', 'MANAGER'), async (req, res) => {
  // Validate manager has section FIRST
  if (req.user.role === 'MANAGER' && !req.user.sectionId) {
    return res.status(403).json({ error: 'You must belong to a section to create employee accounts' });
  }

  let { name, email, password, role, sectionId } = req.body;
  let parsedSectionId = sectionId ? parseInt(sectionId) : null;

  if (req.user.role === 'MANAGER') {
    if (role !== 'EMPLOYEE') return res.status(403).json({ error: 'Managers can only create Employee accounts' });
    parsedSectionId = req.user.sectionId; // Force manager scope
  }

  try {
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['MANAGER', 'EMPLOYEE', 'CLIENT'].includes(role)) {
      return res.status(400).json({ error: 'Role must be MANAGER, EMPLOYEE, or CLIENT' });
    }

    // Managers MUST have a section
    if (role === 'MANAGER' && !parsedSectionId) {
      return res.status(400).json({ error: 'Section is required when creating a Manager' });
    }

    if (role === 'CLIENT') {
      parsedSectionId = null;
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    if (parsedSectionId) {
      const section = await prisma.section.findUnique({ where: { id: parsedSectionId } });
      if (!section) {
        return res.status(404).json({ error: 'Section not found' });
      }
    }

    const hashed = await bcrypt.hash(password, 10);

    // For managers: create user AND update section's managerId
    if (role === 'MANAGER' && parsedSectionId) {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashed,
          role,
          sectionId: parsedSectionId
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          section: { select: { id: true, name: true } }
        }
      });

      // Update section to assign this manager
      await prisma.section.update({
        where: { id: parsedSectionId },
        data: { managerId: user.id }
      });

      res.status(201).json(user);
    } else {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashed,
          role,
          sectionId: parsedSectionId
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          section: { select: { id: true, name: true } }
        }
      });

      res.status(201).json(user);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/me ──────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, role: true,
        stars: true, level: true, onTimeCount: true, createdAt: true,
        section: { select: { id: true, name: true } },
        scores: { include: { task: { select: { title: true, deadline: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users ─────────────────────────────────────
// CEO sees all users, Manager sees their section
router.get('/', async (req, res) => {
  try {
    let where = {};
    if (req.user.role === 'MANAGER') {
      where = {
        OR: [
          { sectionId: req.user.sectionId },
          { role: 'CLIENT' }
        ]
      };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true,
        stars: true, level: true, onTimeCount: true,
        section: { select: { id: true, name: true } },
        managedSection: { select: { id: true, name: true } },
        scores: { select: { value: true, isOnTime: true } }
      }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/:id ─────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true, name: true, email: true, role: true,
        stars: true, level: true, onTimeCount: true, createdAt: true,
        section: { select: { id: true, name: true } },
        scores: { include: { task: { select: { title: true, deadline: true } } }, orderBy: { createdAt: 'desc' } }
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/users/:id ──────────────────────────────
// CEO and Manager can update users
router.patch('/:id', requireRole('CEO', 'MANAGER'), async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const { name, email, password, role, sectionId } = req.body;

    // Get the target user
    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Can't edit yourself or CEO
    if (targetUser.id === req.user.id) {
      return res.status(403).json({ error: 'You cannot edit your own account' });
    }
    if (targetUser.role === 'CEO') {
      return res.status(403).json({ error: 'Cannot edit CEO account' });
    }

    // Managers can only edit employees in their section
    if (req.user.role === 'MANAGER') {
      if (targetUser.role !== 'EMPLOYEE' || targetUser.sectionId !== req.user.sectionId) {
        return res.status(403).json({ error: 'Managers can only edit employees in their section' });
      }
    }

    // Validate inputs
    const updateData = {};

    if (name !== undefined && name.trim()) {
      updateData.name = name.trim();
    }

    if (email !== undefined && email.trim()) {
      const existingEmail = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (existingEmail && existingEmail.id !== targetId) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updateData.email = email.trim();
    }

    if (password !== undefined && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Only CEO can change role
    if (req.user.role === 'CEO' && role !== undefined) {
      if (!['MANAGER', 'EMPLOYEE', 'CLIENT'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      // If changing to MANAGER, sectionId is required
      if (role === 'MANAGER' && !sectionId) {
        return res.status(400).json({ error: 'Section is required for Manager role' });
      }
      updateData.role = role;
    }

    // Handle section changes
    let newSectionId = undefined;
    if (sectionId !== undefined) {
      if (sectionId === null || sectionId === '') {
        newSectionId = null; // Remove from section (only for CLIENT or unassign)
      } else {
        const section = await prisma.section.findUnique({ where: { id: parseInt(sectionId) } });
        if (!section) {
          return res.status(404).json({ error: 'Section not found' });
        }
        newSectionId = parseInt(sectionId);
      }
      updateData.sectionId = newSectionId;
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        section: { select: { id: true, name: true } }
      }
    });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/users/:id ─────────────────────────────
router.delete('/:id', requireRole('CEO', 'MANAGER'), async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });

    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (targetUser.role === 'CEO') return res.status(403).json({ error: 'Cannot delete CEO' });

    if (req.user.role === 'MANAGER') {
      if (targetUser.role !== 'EMPLOYEE' || targetUser.sectionId !== req.user.sectionId) {
        return res.status(403).json({ error: 'Managers can only delete employees within their scope' });
      }
    }

    const [managedProject, clientProject] = await Promise.all([
      prisma.project.findFirst({ where: { managerId: targetId }, select: { id: true, name: true } }),
      prisma.project.findFirst({ where: { clientId: targetId }, select: { id: true, name: true } }),
    ]);

    if (managedProject) {
      return res.status(400).json({ error: `Cannot delete user while managing project "${managedProject.name}"` });
    }

    if (clientProject) {
      return res.status(400).json({ error: `Cannot delete client while linked to project "${clientProject.name}"` });
    }

    // Get all tasks created by or assigned to this user
    const userTasks = await prisma.task.findMany({
      where: {
        OR: [
          { creatorId: targetId },
          { assigneeId: targetId }
        ]
      },
      select: { id: true }
    });
    const taskIds = userTasks.map(t => t.id);

    // Delete in proper order to handle foreign key constraints
    await prisma.$transaction([
      // Delete scores for tasks created/assigned to this user
      ...(taskIds.length > 0 ? [prisma.score.deleteMany({ where: { taskId: { in: taskIds } } })] : []),
      // Delete scores where this user is the scorer
      prisma.score.deleteMany({ where: { userId: targetId } }),
      // Delete notifications
      prisma.notification.deleteMany({ where: { userId: targetId } }),
      // Delete project comments
      prisma.projectComment.deleteMany({ where: { userId: targetId } }),
      // Delete tasks
      ...(taskIds.length > 0 ? [prisma.task.deleteMany({ where: { id: { in: taskIds } } })] : []),
      // Delete user
      prisma.user.delete({ where: { id: targetId } })
    ]);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
