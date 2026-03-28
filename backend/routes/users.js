const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// ── POST /api/users ───────────────────────────────────
// CEO can create manager/employee accounts
router.post('/', requireRole('CEO'), async (req, res) => {
  const { name, email, password, role, sectionId } = req.body;
  const parsedSectionId = sectionId ? parseInt(sectionId) : null;

  try {
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['MANAGER', 'EMPLOYEE'].includes(role)) {
      return res.status(400).json({ error: 'Role must be MANAGER or EMPLOYEE' });
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
    if (req.user.role === 'MANAGER') where.sectionId = req.user.sectionId;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true,
        stars: true, level: true, onTimeCount: true,
        section: { select: { id: true, name: true } },
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

module.exports = router;
