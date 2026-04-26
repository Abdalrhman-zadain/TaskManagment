const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const sectionRoutes = require('./routes/sections');
const scoreRoutes = require('./routes/scores');
const notificationRoutes = require('./routes/notifications');
const evidenceRoutes = require('./routes/evidence');
const projectRoutes = require('./routes/projects');
const clientRoutes = require('./routes/client');
const reportRoutes = require('./routes/reports');

const app = express();
const prisma = new PrismaClient();
const BUILT_IN_PUBLIC_RELATIONS_SECTION_NAMES = [
  'Public Relations',
  'العلاقات العامة',
];

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TeamTask API',
      version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:5000' }],
  },
  apis: [__dirname + '/swagger.js'],
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('192.168')
      ) {
        return callback(null, true);
      }

      if (
        origin.includes('trycloudflare.com') ||
        origin.includes('.ngrok') ||
        origin.includes('vercel.app')
      ) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'TeamTask API is running âœ“' });
});

async function markLateTasks() {
  try {
    const result = await prisma.task.updateMany({
      where: {
        status: { in: ['TODO', 'IN_PROGRESS'] },
        deadline: { lt: new Date() },
      },
      data: { status: 'LATE' },
    });

    if (result.count > 0) {
      console.log(`[auto-late] Marked ${result.count} overdue task(s) as LATE`);
    }
  } catch (err) {
    console.error('[auto-late] Error:', err.message);
  }
}

async function ensureBuiltInSections() {
  try {
    const existingPublicRelationsSection = await prisma.section.findFirst({
      where: {
        name: { in: BUILT_IN_PUBLIC_RELATIONS_SECTION_NAMES },
      },
      select: { id: true, name: true },
    });

    if (!existingPublicRelationsSection) {
      const createdSection = await prisma.section.create({
        data: { name: 'Public Relations' },
        select: { id: true, name: true },
      });
      console.log(`[bootstrap] Created built-in section: ${createdSection.name}`);
    }
  } catch (err) {
    console.error('[bootstrap] Error ensuring built-in sections:', err.message);
  }
}

const http = require('http');
const { initSocket } = require('./socket');
const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`âœ“ Server running on http://0.0.0.0:${PORT} (LAN: http://192.168.1.251:${PORT})`);
  ensureBuiltInSections();
  markLateTasks();
  setInterval(markLateTasks, 15 * 60 * 1000);
});
