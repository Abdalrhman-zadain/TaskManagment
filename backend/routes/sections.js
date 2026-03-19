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
        _count:  { select: { tasks: true } }
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
    const section = await prisma.section.update({
      where: { id: parseInt(req.params.id) },
      data:  { name, managerId: managerId ? parseInt(managerId) : null }
    });
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
