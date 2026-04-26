const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { buildCeoReportPdf } = require('../utils/ceoReportPdf');

const router = express.Router();
const prisma = new PrismaClient();

const REPORT_TYPES = new Set([
  'EMPLOYEE',
  'MANAGER_PERSONAL',
  'MANAGER_SECTION',
]);

function normalizeQueryValue(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim();
}

function buildDateRange(startDate, endDate) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && Number.isNaN(start.getTime())) {
    const err = new Error('Invalid start date');
    err.statusCode = 400;
    throw err;
  }

  if (end && Number.isNaN(end.getTime())) {
    const err = new Error('Invalid end date');
    err.statusCode = 400;
    throw err;
  }

  if (!start || !end) {
    const err = new Error('Start date and end date are required');
    err.statusCode = 400;
    throw err;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (start > end) {
    const err = new Error('Start date cannot be after end date');
    err.statusCode = 400;
    throw err;
  }

  return { gte: start, lte: end };
}

function parseUserId(userId) {
  const parsed = Number(userId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const err = new Error('A valid person is required');
    err.statusCode = 400;
    throw err;
  }
  return parsed;
}

function getTaskInclude() {
  return {
    assignee: {
      select: {
        id: true,
        name: true,
        role: true,
        stars: true,
        level: true,
        onTimeCount: true,
        section: { select: { id: true, name: true } },
      },
    },
    section: { select: { id: true, name: true } },
    project: {
      select: {
        id: true,
        name: true,
        status: true,
      },
    },
    score: true,
  };
}

async function getTargetUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      stars: true,
      level: true,
      onTimeCount: true,
      sectionId: true,
      section: { select: { id: true, name: true, managerId: true } },
      managedSection: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    const err = new Error('Selected person was not found');
    err.statusCode = 404;
    throw err;
  }

  return user;
}

router.use(authMiddleware);

router.get('/ceo', requireRole('CEO'), async (req, res) => {
  try {
    const reportType = normalizeQueryValue(req.query.reportType)?.toUpperCase();
    if (!REPORT_TYPES.has(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    const userId = parseUserId(req.query.userId);
    const startDate = normalizeQueryValue(req.query.startDate);
    const endDate = normalizeQueryValue(req.query.endDate);
    const dateRange = buildDateRange(startDate, endDate);
    const targetUser = await getTargetUser(userId);

    if (reportType === 'EMPLOYEE' && targetUser.role !== 'EMPLOYEE') {
      return res.status(400).json({ error: 'Employee report requires an employee' });
    }

    if ((reportType === 'MANAGER_PERSONAL' || reportType === 'MANAGER_SECTION') && targetUser.role !== 'MANAGER') {
      return res.status(400).json({ error: 'Manager report requires a manager' });
    }

    if (reportType === 'MANAGER_SECTION' && !targetUser.sectionId) {
      return res.status(400).json({ error: 'Selected manager is not assigned to a section' });
    }

    if (reportType === 'EMPLOYEE' || reportType === 'MANAGER_PERSONAL') {
      const tasks = await prisma.task.findMany({
        where: {
          assigneeId: targetUser.id,
          deadline: dateRange,
        },
        include: getTaskInclude(),
        orderBy: { deadline: 'asc' },
      });

      const pdfBuffer = buildCeoReportPdf({
        reportType,
        startDate,
        endDate,
        targetUser,
        tasks,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="TeamTask-Person-Report.pdf"');
      return res.send(pdfBuffer);
    }

    const [managerTasks, teamMembers, sectionTasks] = await Promise.all([
      prisma.task.findMany({
        where: {
          assigneeId: targetUser.id,
          deadline: dateRange,
        },
        include: getTaskInclude(),
        orderBy: { deadline: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          role: 'EMPLOYEE',
          sectionId: targetUser.sectionId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          stars: true,
          level: true,
          onTimeCount: true,
          section: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.task.findMany({
        where: {
          sectionId: targetUser.sectionId,
          deadline: dateRange,
        },
        include: getTaskInclude(),
        orderBy: { deadline: 'asc' },
      }),
    ]);

    const pdfBuffer = buildCeoReportPdf({
      reportType,
      startDate,
      endDate,
      targetUser,
      managerTasks,
      teamMembers,
      sectionTasks,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="TeamTask-Manager-Section-Report.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;
