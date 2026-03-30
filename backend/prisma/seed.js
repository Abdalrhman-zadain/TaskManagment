const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function upsertUser({ name, email, role, sectionId = null, passwordHash }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      sectionId,
      password: passwordHash,
    },
    create: {
      name,
      email,
      role,
      sectionId,
      password: passwordHash,
    },
  });
}

async function main() {
  const defaultPassword = "admin123";
  const passwordHash = await hashPassword(defaultPassword);

  const ceo = await upsertUser({
    name: "CEO Admin",
    email: "ceo@teamtask.com",
    role: "CEO",
    passwordHash,
  });

  const manager = await upsertUser({
    name: "Manager One",
    email: "manager@teamtask.com",
    role: "MANAGER",
    passwordHash,
  });

  const section = await prisma.section.upsert({
    where: { name: "Engineering" },
    update: { managerId: manager.id },
    create: {
      name: "Engineering",
      managerId: manager.id,
    },
  });

  const managerWithSection = await upsertUser({
    name: "Manager One",
    email: "manager@teamtask.com",
    role: "MANAGER",
    sectionId: section.id,
    passwordHash,
  });

  const employee1 = await upsertUser({
    name: "Employee One",
    email: "employee1@teamtask.com",
    role: "EMPLOYEE",
    sectionId: section.id,
    passwordHash,
  });

  const employee2 = await upsertUser({
    name: "Employee Two",
    email: "employee2@teamtask.com",
    role: "EMPLOYEE",
    sectionId: section.id,
    passwordHash,
  });

  const client = await upsertUser({
    name: "Client Demo",
    email: "client@teamtask.com",
    role: "CLIENT",
    passwordHash,
  });

  const project = await prisma.project.upsert({
    where: { id: 1 },
    update: {
      name: "Retail Mobile App Launch",
      description: "Cross-platform customer app for loyalty, in-store pickup, and personalized campaigns.",
      status: "IN_PROGRESS",
      budget: "$42,000",
      deadline: new Date("2026-04-18"),
      clientId: client.id,
      managerId: managerWithSection.id,
      sectionId: section.id,
    },
    create: {
      id: 1,
      name: "Retail Mobile App Launch",
      description: "Cross-platform customer app for loyalty, in-store pickup, and personalized campaigns.",
      status: "IN_PROGRESS",
      budget: "$42,000",
      deadline: new Date("2026-04-18"),
      clientId: client.id,
      managerId: managerWithSection.id,
      sectionId: section.id,
    },
  });

  const mainTask = await prisma.task.upsert({
    where: { id: 1 },
    update: {
      title: "Launch customer app MVP",
      description: "Deliver the first client-facing mobile app milestone.",
      status: "IN_PROGRESS",
      priority: "high",
      deadline: new Date("2026-04-12"),
      creatorId: ceo.id,
      assigneeId: managerWithSection.id,
      sectionId: section.id,
      projectId: project.id,
      parentId: null,
    },
    create: {
      id: 1,
      title: "Launch customer app MVP",
      description: "Deliver the first client-facing mobile app milestone.",
      status: "IN_PROGRESS",
      priority: "high",
      deadline: new Date("2026-04-12"),
      creatorId: ceo.id,
      assigneeId: managerWithSection.id,
      sectionId: section.id,
      projectId: project.id,
    },
  });

  await prisma.task.upsert({
    where: { id: 2 },
    update: {
      title: "Implement checkout flow",
      description: "Build the checkout and payment flow screens.",
      status: "PENDING_APPROVAL",
      priority: "high",
      deadline: new Date("2026-04-04"),
      creatorId: managerWithSection.id,
      assigneeId: employee1.id,
      sectionId: section.id,
      projectId: project.id,
      parentId: mainTask.id,
      evidenceUrl: null,
      evidenceUploadedAt: null,
      approvalStatus: "PENDING",
    },
    create: {
      id: 2,
      title: "Implement checkout flow",
      description: "Build the checkout and payment flow screens.",
      status: "PENDING_APPROVAL",
      priority: "high",
      deadline: new Date("2026-04-04"),
      creatorId: managerWithSection.id,
      assigneeId: employee1.id,
      sectionId: section.id,
      projectId: project.id,
      parentId: mainTask.id,
      evidenceUrl: null,
      evidenceUploadedAt: null,
      approvalStatus: "PENDING",
    },
  });

  await prisma.task.upsert({
    where: { id: 3 },
    update: {
      title: "Prepare push notification preview",
      description: "Create the notification UX and sample flows for client review.",
      status: "DONE",
      priority: "medium",
      deadline: new Date("2026-03-30"),
      completedAt: new Date("2026-03-29T14:00:00Z"),
      creatorId: managerWithSection.id,
      assigneeId: employee2.id,
      sectionId: section.id,
      projectId: project.id,
      parentId: mainTask.id,
      evidenceUrl: null,
      evidenceUploadedAt: null,
      approvalStatus: "APPROVED",
      approvalComment: "Approved for client presentation.",
      approvalBy: managerWithSection.id,
      approvalAt: new Date("2026-03-29T15:00:00Z"),
    },
    create: {
      id: 3,
      title: "Prepare push notification preview",
      description: "Create the notification UX and sample flows for client review.",
      status: "DONE",
      priority: "medium",
      deadline: new Date("2026-03-30"),
      completedAt: new Date("2026-03-29T14:00:00Z"),
      creatorId: managerWithSection.id,
      assigneeId: employee2.id,
      sectionId: section.id,
      projectId: project.id,
      parentId: mainTask.id,
      evidenceUrl: null,
      evidenceUploadedAt: null,
      approvalStatus: "APPROVED",
      approvalComment: "Approved for client presentation.",
      approvalBy: managerWithSection.id,
      approvalAt: new Date("2026-03-29T15:00:00Z"),
    },
  });

  await prisma.projectComment.deleteMany({ where: { projectId: project.id } });
  await prisma.projectComment.createMany({
    data: [
      {
        projectId: project.id,
        userId: client.id,
        message: "Please make the loyalty banner more visible on the dashboard.",
      },
      {
        projectId: project.id,
        userId: managerWithSection.id,
        message: "Done. We also improved the CTA contrast for mobile users.",
      },
    ],
  });

  console.log("Seed complete.");
  console.log(`CEO: ${ceo.email} / ${defaultPassword}`);
  console.log(`Manager: ${managerWithSection.email} / ${defaultPassword}`);
  console.log(`Employee: ${employee1.email} / ${defaultPassword}`);
  console.log(`Client: ${client.email} / ${defaultPassword}`);
  console.log(`Project: ${project.name}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
