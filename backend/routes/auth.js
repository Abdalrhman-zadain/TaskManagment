const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ── POST /api/auth/register ────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, role, sectionId } = req.body;

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, sectionId: sectionId || null }
    });

    res.status(201).json({ message: 'User created', userId: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ───────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid email or password' });

    // Create JWT token (expires in 7 days)
    const token = jwt.sign(
      { id: user.id, role: user.role, sectionId: user.sectionId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sectionId: user.sectionId,
        stars: user.stars,
        level: user.level
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
