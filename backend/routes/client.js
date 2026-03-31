const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, requireRole } = require("../middleware/auth");
const { createNotification } = require("../utils/notify");

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);
router.use(requireRole("CLIENT"));

router.get("/dashboard", async (req, res) => {
  try {
    const [client, projects, notifications] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      prisma.project.findMany({
        where: { clientId: req.user.id },
        include: {
          manager: { select: { id: true, name: true, email: true } },
          section: { select: { id: true, name: true } },
          tasks: {
            include: {
              assignee: { select: { id: true, name: true, role: true } },
              creator: { select: { id: true, name: true, role: true } },
              score: true,
            },
            orderBy: [{ deadline: "asc" }, { createdAt: "asc" }],
          },
          comments: {
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const mappedProjects = projects.map((project) => {
      const totalTasks = project.tasks.length;
      const doneTasks = project.tasks.filter((task) => task.status === "DONE").length;
      const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        budget: project.budget,
        deadline: project.deadline,
        createdAt: project.createdAt,
        progress,
        manager: project.manager,
        section: project.section,
        tasks: project.tasks,
        comments: project.comments.map((comment) => ({
          id: comment.id,
          message: comment.message,
          createdAt: comment.createdAt,
          author: {
            id: comment.user.id,
            name: comment.user.name,
            role: comment.user.role,
          },
        })),
      };
    });

    const deliverables = mappedProjects.flatMap((project) =>
      project.tasks
        .filter((task) => task.evidenceUrl)
        .map((task) => ({
          id: task.id,
          projectId: project.id,
          projectName: project.name,
          taskName: task.title,
          submittedBy: task.assignee?.name || "Unknown",
          type: task.evidenceUrl.match(/\.(mp4|avi|mov|mkv)$/i) ? "Video" : "Image",
          uploadDate: task.evidenceUploadedAt,
          status: task.approvalStatus,
          evidenceUrl: task.evidenceUrl,
        })),
    );

    res.json({
      client: {
        ...client,
        joined: client?.createdAt || null,
      },
      projects: mappedProjects,
      deliverables,
      notifications,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/deliverables/:id/approve", async (req, res) => {
  try {
    const taskId = Number(req.params.id);

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          clientId: req.user.id,
        },
      },
      include: {
        project: {
          select: { id: true, name: true, managerId: true },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: "Deliverable not found" });
    }

    if (!task.evidenceUrl) {
      return res.status(400).json({ error: "No deliverable submitted for this task" });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "DONE",
        approvalStatus: "APPROVED",
        approvalComment: null,
        approvalBy: req.user.id,
        approvalAt: new Date(),
        completedAt: task.completedAt || new Date(),
      },
    });

    await Promise.all([
      createNotification({
        userId: task.assigneeId,
        type: "task_approved",
        message: `Client approved deliverable for "${task.title}"`,
        taskId,
      }),
      createNotification({
        userId: task.creatorId,
        type: "task_approved",
        message: `Client approved deliverable for "${task.title}"`,
        taskId,
      }),
    ]);

    res.json({ task: updatedTask });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/deliverables/:id/request-changes", async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const { comment } = req.body;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          clientId: req.user.id,
        },
      },
      include: {
        project: {
          select: { id: true, name: true, managerId: true },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: "Deliverable not found" });
    }

    if (!task.evidenceUrl) {
      return res.status(400).json({ error: "No deliverable submitted for this task" });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "IN_PROGRESS",
        approvalStatus: "REJECTED",
        approvalComment: comment?.trim() || "Changes requested by client",
        approvalBy: req.user.id,
        approvalAt: new Date(),
      },
    });

    await Promise.all([
      createNotification({
        userId: task.assigneeId,
        type: "task_rejected",
        message: `Client requested changes for "${task.title}"`,
        taskId,
      }),
      createNotification({
        userId: task.creatorId,
        type: "task_rejected",
        message: `Client requested changes for "${task.title}"`,
        taskId,
      }),
    ]);

    res.json({ task: updatedTask });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/comments", async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, clientId: req.user.id },
      select: { id: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const comment = await prisma.projectComment.create({
      data: {
        projectId,
        userId: req.user.id,
        message: message.trim(),
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    res.status(201).json({
      id: comment.id,
      message: comment.message,
      createdAt: comment.createdAt,
      author: {
        id: comment.user.id,
        name: comment.user.name,
        role: comment.user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
