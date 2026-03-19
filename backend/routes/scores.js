const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// ── GET /api/scores/user/:userId ───────────────────────
// Only visible to: the employee themselves, their section manager, or CEO
router.get('/user/:userId', async (req, res) => {
  const targetId = parseInt(req.params.userId);
  const me = req.user;

  try {
    // Access-control check
    if (me.role !== 'CEO' && me.id !== targetId) {
      if (me.role === 'MANAGER') {
        // Manager may only view scores of employees in their own section
        const target = await prisma.user.findUnique({
          where: { id: targetId },
          select: { sectionId: true }
        });
        if (!target || target.sectionId !== me.sectionId) {
          return res.status(403).json({ error: 'You can only view scores of employees in your section' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const scores = await prisma.score.findMany({
      where: { userId: targetId },
      include: { task: { select: { title: true, deadline: true, completedAt: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const avg = scores.length
      ? (scores.reduce((sum, s) => sum + s.value, 0) / scores.length).toFixed(1)
      : 0;

    res.json({ scores, average: parseFloat(avg) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/scores/:id ──────────────────────────────
// Manager or CEO can adjust a score
router.patch('/:id', requireRole('CEO', 'MANAGER'), async (req, res) => {
  const { value } = req.body;

  if (value < 1 || value > 10) {
    return res.status(400).json({ error: 'Score must be between 1 and 10' });
  }

  try {
    const score = await prisma.score.update({
      where: { id: parseInt(req.params.id) },
      data: { value, adjusted: true, adjustedBy: req.user.id }
    });
    res.json(score);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
