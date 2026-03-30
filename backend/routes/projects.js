const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, requireRole } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

function getProjectScope(user) {
  if (user.role === "CEO") return {};
  if (user.role === "MANAGER") {
    return {
      OR: [{ managerId: user.id }, { sectionId: user.sectionId || -1 }],
    };
  }
  if (user.role === "CLIENT") {
    return { clientId: user.id };
  }
  return { id: -1 };
}

router.get("/", requireRole("CEO", "MANAGER", "CLIENT"), async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: getProjectScope(req.user),
      include: {
        client: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
        section: { select: { id: true, name: true } },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            deadline: true,
            evidenceUrl: true,
            evidenceUploadedAt: true,
            approvalStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireRole("CEO", "MANAGER"), async (req, res) => {
  try {
    let { name, description, clientId, managerId, sectionId, deadline, budget, status } = req.body;

    if (!name || !clientId) {
      return res.status(400).json({ error: "Name and client are required" });
    }

    let parsedClientId = Number(clientId);
    let parsedManagerId = managerId ? Number(managerId) : req.user.id;
    let parsedSectionId = sectionId ? Number(sectionId) : req.user.sectionId;

    if (req.user.role === "MANAGER") {
      parsedManagerId = req.user.id;
      parsedSectionId = req.user.sectionId;
      if (!parsedSectionId) {
        return res.status(400).json({ error: "Manager must belong to a section" });
      }
    }

    if (!parsedManagerId || !parsedSectionId) {
      return res.status(400).json({ error: "Manager and section are required" });
    }

    const [client, manager, section] = await Promise.all([
      prisma.user.findUnique({ where: { id: parsedClientId }, select: { id: true, role: true } }),
      prisma.user.findUnique({ where: { id: parsedManagerId }, select: { id: true, role: true, sectionId: true } }),
      prisma.section.findUnique({ where: { id: parsedSectionId }, select: { id: true, managerId: true } }),
    ]);

    if (!client || client.role !== "CLIENT") {
      return res.status(400).json({ error: "Selected client account is invalid" });
    }

    if (!manager || manager.role !== "MANAGER") {
      return res.status(400).json({ error: "Selected manager account is invalid" });
    }

    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    if (manager.sectionId !== parsedSectionId || section.managerId !== parsedManagerId) {
      return res.status(400).json({ error: "Manager must manage the selected section" });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        clientId: parsedClientId,
        managerId: parsedManagerId,
        sectionId: parsedSectionId,
        deadline: deadline ? new Date(deadline) : null,
        budget: budget || null,
        status: status || "IN_PROGRESS",
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
        section: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/complete", requireRole("CEO"), async (req, res) => {
  try {
    const projectId = Number(req.params.id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { status: "COMPLETED" },
      include: {
        client: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
        section: { select: { id: true, name: true } },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            deadline: true,
            evidenceUrl: true,
            evidenceUploadedAt: true,
            approvalStatus: true,
          },
        },
      },
    });

    res.json(updatedProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
