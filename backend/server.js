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

const app = express();
const prisma = new PrismaClient();
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TeamTask API',
      version: '1.0.0',
    },
    servers: [
      { url: 'http://localhost:5000' }
    ]
  },
  apis: [__dirname + '/swagger.js'],
});

// ── Middleware ─────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://192.168.1.251:5173', 'http://192.168.1.251:5173', 'http://0.0.0.0:5173'] }));
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/client', clientRoutes);

// ── Health check ───────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'TeamTask API is running ✓' });
});

// ── Auto-flag LATE tasks ───────────────────────────────
// Runs on startup and every 15 minutes to flip overdue tasks to LATE status
async function markLateTasks() {
  try {
    const result = await prisma.task.updateMany({
      where: {
        status: { in: ['TODO', 'IN_PROGRESS'] },
        deadline: { lt: new Date() }
      },
      data: { status: 'LATE' }
    });
    if (result.count > 0) {
      console.log(`[auto-late] Marked ${result.count} overdue task(s) as LATE`);
    }
  } catch (err) {
    console.error('[auto-late] Error:', err.message);
  }
}

// ── Start server ───────────────────────────────────────
const http = require('http');
const { initSocket } = require('./socket');
const server = http.createServer(app);
const io = initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on http://0.0.0.0:${PORT} (LAN: http://192.168.1.251:${PORT})`);
  markLateTasks();
  setInterval(markLateTasks, 15 * 60 * 1000); // every 15 min
});
