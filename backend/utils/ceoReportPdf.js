const PAGE = { width: 595.28, height: 841.89, margin: 44 };

const COLORS = {
  brand: [0.07, 0.36, 0.84],
  brandDark: [0.05, 0.22, 0.5],
  ink: [0.09, 0.14, 0.21],
  muted: [0.39, 0.45, 0.53],
  soft: [0.96, 0.98, 1],
  line: [0.84, 0.88, 0.92],
  green: [0.1, 0.58, 0.45],
  amber: [0.78, 0.49, 0.08],
  red: [0.83, 0.24, 0.28],
  white: [1, 1, 1],
};

function fmt(n) {
  return Number(n.toFixed(2)).toString();
}

function esc(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function estimateWidth(text, fontSize) {
  return String(text).length * fontSize * 0.52;
}

function wrapText(text, fontSize, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || estimateWidth(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

class PdfPage {
  constructor() {
    this.ops = [];
  }

  push(op) {
    this.ops.push(op);
  }

  fillRect(x, y, w, h, color) {
    this.push(`${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg`);
    this.push(`${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)} re f`);
  }

  strokeRect(x, y, w, h, color, lineWidth = 1) {
    this.push(`${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} RG`);
    this.push(`${fmt(lineWidth)} w`);
    this.push(`${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)} re S`);
  }

  text(text, x, y, size = 12, font = "F1", color = COLORS.ink) {
    this.push("BT");
    this.push(`/${font} ${fmt(size)} Tf`);
    this.push(`${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg`);
    this.push(`1 0 0 1 ${fmt(x)} ${fmt(y)} Tm`);
    this.push(`(${esc(text)}) Tj`);
    this.push("ET");
  }

  textLines(lines, x, y, size = 12, lineHeight = 16, font = "F1", color = COLORS.ink) {
    let currentY = y;
    for (const line of lines) {
      this.text(line, x, currentY, size, font, color);
      currentY -= lineHeight;
    }
    return currentY;
  }

  wrappedText(text, x, y, width, size = 12, lineHeight = 16, font = "F1", color = COLORS.ink) {
    return this.textLines(wrapText(text, size, width), x, y, size, lineHeight, font, color);
  }
}

function drawFooter(page, pageNo) {
  page.text("TeamTask CEO Dashboard Report", PAGE.margin, 20, 9.5, "F1", COLORS.muted);
  page.text(`Page ${pageNo}`, PAGE.width - PAGE.margin - 30, 20, 9.5, "F1", COLORS.muted);
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toISOString().slice(0, 10);
}

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

function fitText(text, maxLength) {
  const value = String(text || "");
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function drawMetricCards(page, summary) {
  const cards = [
    ["Total Tasks", String(summary.totalTasks), `${summary.totalSections} sections`],
    ["Completed", String(summary.completedTasks), `${summary.onTimeRate}% on-time rate`],
    ["In Progress", String(summary.inProgressTasks), "TODO + IN_PROGRESS"],
    ["Overdue", String(summary.overdueTasks), summary.overdueTasks > 0 ? "Needs attention" : "All clear"],
    ["Projects", String(summary.totalProjects), `${summary.activeProjects} active`],
    ["Completed Projects", String(summary.completedProjects), `${summary.delayedProjects} delayed`],
  ];

  const startX = PAGE.margin;
  const gap = 10;
  const cardW = 157;
  const cardH = 78;

  cards.forEach(([label, value, sub], index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = startX + col * (cardW + gap);
    const y = 560 - row * (cardH + 12);
    page.fillRect(x, y, cardW, cardH, COLORS.soft);
    page.strokeRect(x, y, cardW, cardH, COLORS.line, 0.8);
    page.text(label.toUpperCase(), x + 12, y + 58, 9, "F2", COLORS.muted);
    page.text(value, x + 12, y + 34, 22, "F2", COLORS.brandDark);
    page.text(sub, x + 12, y + 14, 10, "F1", COLORS.muted);
  });
}

function drawTable(page, title, columns, rows, topY) {
  const tableX = PAGE.margin;
  const tableW = PAGE.width - PAGE.margin * 2;
  const innerW = tableW - 16;
  const totalColumnWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const scale = totalColumnWidth > innerW ? innerW / totalColumnWidth : 1;
  const layoutColumns = columns.map((column) => ({
    ...column,
    width: column.width * scale,
  }));
  const headerH = 24;
  const rowH = 22;
  const titleY = topY;
  page.text(title, tableX, titleY, 16, "F2", COLORS.ink);

  let y = titleY - 18;
  page.fillRect(tableX, y - headerH + 6, tableW, headerH, COLORS.brandDark);

  let cursorX = tableX + 8;
  layoutColumns.forEach((column) => {
    page.text(column.label, cursorX, y - 11, 8.8, "F2", COLORS.white);
    cursorX += column.width;
  });

  y -= headerH;

  rows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 0) {
      page.fillRect(tableX, y - rowH + 6, tableW, rowH, [0.99, 0.99, 1]);
    }
    page.strokeRect(tableX, y - rowH + 6, tableW, rowH, COLORS.line, 0.5);

    let cellX = tableX + 8;
    layoutColumns.forEach((column) => {
      const value = fitText(row[column.key], column.max || 28);
      page.text(value, cellX, y - 11, 9.2, "F1", COLORS.ink);
      cellX += column.width;
    });
    y -= rowH;
  });

  return y;
}

function createSummary(tasks, projects, sections, users) {
  const completedTasks = tasks.filter((task) => task.status === "DONE").length;
  const inProgressTasks = tasks.filter((task) => ["TODO", "IN_PROGRESS"].includes(task.status)).length;
  const pendingApprovalTasks = tasks.filter((task) => task.status === "PENDING_APPROVAL").length;
  const overdueTasks = tasks.filter((task) => new Date(task.deadline) < new Date() && task.status !== "DONE").length;
  const totalProjects = projects.length;
  const completedProjects = projects.filter((project) => project.status === "COMPLETED").length;
  const delayedProjects = projects.filter(
    (project) => project.status !== "COMPLETED" && project.deadline && new Date(project.deadline) < new Date()
  ).length;
  const activeProjects = totalProjects - completedProjects;
  const onTimeRate = pct(completedTasks, tasks.length);

  const sectionRows = sections.map((section) => {
    const sectionTasks = tasks.filter((task) => task.sectionId === section.id);
    const sectionDone = sectionTasks.filter((task) => task.status === "DONE").length;
    const sectionOverdue = sectionTasks.filter(
      (task) => new Date(task.deadline) < new Date() && task.status !== "DONE"
    ).length;
    return {
      section: section.name,
      manager: section.manager?.name || "Unassigned",
      tasks: String(sectionTasks.length),
      done: String(sectionDone),
      overdue: String(sectionOverdue),
      progress: `${pct(sectionDone, sectionTasks.length)}%`,
      members: String(section.members?.length || 0),
    };
  });

  const projectRows = projects.slice(0, 8).map((project) => {
    const totalTasks = project.tasks?.length || 0;
    const doneTasks = project.tasks?.filter((task) => task.status === "DONE").length || 0;
    const status =
      project.status === "COMPLETED"
        ? "COMPLETED"
        : project.deadline && new Date(project.deadline) < new Date()
          ? "DELAYED"
          : "ACTIVE";

    return {
      project: project.name,
      client: project.client?.name || "Unknown",
      manager: project.manager?.name || "Unassigned",
      tasks: String(totalTasks),
      progress: `${pct(doneTasks, totalTasks)}%`,
      status,
      deadline: formatDate(project.deadline),
    };
  });

  const performerRows = users
    .filter((user) => user.role === "EMPLOYEE" || user.role === "MANAGER")
    .sort((a, b) => b.onTimeCount - a.onTimeCount)
    .slice(0, 8)
    .map((user) => ({
      name: user.name,
      role: user.role,
      section: user.section?.name || "No Section",
      onTime: String(user.onTimeCount || 0),
      stars: String(user.stars || 0),
      level: user.level || "BRONZE",
    }));

  const alertRows = tasks
    .filter((task) => new Date(task.deadline) < new Date() && task.status !== "DONE")
    .slice(0, 8)
    .map((task) => ({
      task: task.title,
      assignee: task.assignee?.name || "Unknown",
      section: task.section?.name || "Unknown",
      deadline: formatDate(task.deadline),
      status: task.status,
    }));

  return {
    totalTasks: tasks.length,
    completedTasks,
    inProgressTasks,
    pendingApprovalTasks,
    overdueTasks,
    onTimeRate,
    totalProjects,
    completedProjects,
    delayedProjects,
    activeProjects,
    totalSections: sections.length,
    totalUsers: users.length,
    sectionRows,
    projectRows,
    performerRows,
    alertRows,
  };
}

function buildOverviewPage(summary) {
  const page = new PdfPage();
  page.fillRect(0, 690, PAGE.width, 152, COLORS.brandDark);
  page.text("CEO Dashboard Report", PAGE.margin, 782, 24, "F2", COLORS.white);
  page.text(`Generated ${formatDate(new Date())}`, PAGE.margin, 758, 11, "F1", COLORS.white);
  page.wrappedText(
    "This report is generated from the current TeamTask data and focuses on delivery visibility: completed tasks, in-progress work, overdue tasks, section progress, project status, and team performance.",
    PAGE.margin,
    730,
    420,
    11.5,
    15,
    "F1",
    COLORS.white
  );

  drawMetricCards(page, summary);

  page.text("Snapshot", PAGE.margin, 432, 16, "F2", COLORS.ink);
  page.wrappedText(
    `The system currently contains ${summary.totalTasks} tasks across ${summary.totalSections} sections and ${summary.totalProjects} projects. ${summary.completedTasks} tasks are completed, ${summary.inProgressTasks} are in progress, ${summary.pendingApprovalTasks} are waiting for approval, and ${summary.overdueTasks} are overdue.`,
    PAGE.margin,
    408,
    500,
    11,
    15,
    "F1",
    COLORS.muted
  );

  page.fillRect(PAGE.margin, 282, 248, 98, COLORS.soft);
  page.strokeRect(PAGE.margin, 282, 248, 98, COLORS.line, 0.8);
  page.text("Task Status Mix", PAGE.margin + 14, 350, 13, "F2", COLORS.ink);
  page.text(`Completed: ${summary.completedTasks}`, PAGE.margin + 14, 325, 11, "F1", COLORS.green);
  page.text(`In Progress: ${summary.inProgressTasks}`, PAGE.margin + 14, 304, 11, "F1", COLORS.brandDark);
  page.text(`Pending Approval: ${summary.pendingApprovalTasks}`, PAGE.margin + 120, 325, 11, "F1", COLORS.amber);
  page.text(`Overdue: ${summary.overdueTasks}`, PAGE.margin + 120, 304, 11, "F1", COLORS.red);

  page.fillRect(302, 282, 249, 98, COLORS.soft);
  page.strokeRect(302, 282, 249, 98, COLORS.line, 0.8);
  page.text("Project Health", 316, 350, 13, "F2", COLORS.ink);
  page.text(`Active: ${summary.activeProjects}`, 316, 325, 11, "F1", COLORS.brandDark);
  page.text(`Completed: ${summary.completedProjects}`, 316, 304, 11, "F1", COLORS.green);
  page.text(`Delayed: ${summary.delayedProjects}`, 430, 325, 11, "F1", COLORS.red);
  page.text(`Users: ${summary.totalUsers}`, 430, 304, 11, "F1", COLORS.muted);

  drawFooter(page, 1);
  return page;
}

function buildSectionsProjectsPage(summary) {
  const page = new PdfPage();
  let bottom = drawTable(
    page,
    "Section Progress",
    [
      { key: "section", label: "Section", width: 112, max: 20 },
      { key: "manager", label: "Manager", width: 100, max: 18 },
      { key: "tasks", label: "Tasks", width: 50, max: 8 },
      { key: "done", label: "Done", width: 50, max: 8 },
      { key: "overdue", label: "Overdue", width: 58, max: 8 },
      { key: "progress", label: "Progress", width: 62, max: 10 },
      { key: "members", label: "Members", width: 58, max: 8 },
    ],
    summary.sectionRows.length ? summary.sectionRows : [{ section: "No sections", manager: "-", tasks: "0", done: "0", overdue: "0", progress: "0%", members: "0" }],
    780
  );

  bottom -= 30;

  drawTable(
    page,
    "Project Progress",
    [
      { key: "project", label: "Project", width: 130, max: 23 },
      { key: "client", label: "Client", width: 90, max: 15 },
      { key: "manager", label: "Manager", width: 88, max: 15 },
      { key: "tasks", label: "Tasks", width: 42, max: 8 },
      { key: "progress", label: "Progress", width: 58, max: 10 },
      { key: "status", label: "Status", width: 70, max: 12 },
      { key: "deadline", label: "Deadline", width: 74, max: 12 },
    ],
    summary.projectRows.length ? summary.projectRows : [{ project: "No projects", client: "-", manager: "-", tasks: "0", progress: "0%", status: "-", deadline: "-" }],
    bottom
  );

  drawFooter(page, 2);
  return page;
}

function buildPerformancePage(summary) {
  const page = new PdfPage();
  let bottom = drawTable(
    page,
    "Top Team Performance",
    [
      { key: "name", label: "Name", width: 126, max: 24 },
      { key: "role", label: "Role", width: 72, max: 12 },
      { key: "section", label: "Section", width: 116, max: 20 },
      { key: "onTime", label: "On-Time", width: 56, max: 8 },
      { key: "stars", label: "Stars", width: 52, max: 8 },
      { key: "level", label: "Level", width: 64, max: 10 },
    ],
    summary.performerRows.length ? summary.performerRows : [{ name: "No performers", role: "-", section: "-", onTime: "0", stars: "0", level: "-" }],
    780
  );

  bottom -= 30;

  drawTable(
    page,
    "Overdue Alerts",
    [
      { key: "task", label: "Task", width: 180, max: 32 },
      { key: "assignee", label: "Assignee", width: 104, max: 16 },
      { key: "section", label: "Section", width: 96, max: 18 },
      { key: "deadline", label: "Deadline", width: 68, max: 12 },
      { key: "status", label: "Status", width: 60, max: 12 },
    ],
    summary.alertRows.length ? summary.alertRows : [{ task: "No overdue tasks", assignee: "-", section: "-", deadline: "-", status: "-" }],
    bottom
  );

  drawFooter(page, 3);
  return page;
}

function pdfObject(id, body) {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

function buildPdf(pages) {
  let nextId = 1;
  const objects = [];
  const catalogId = nextId++;
  const pagesId = nextId++;
  const fontRegularId = nextId++;
  const fontBoldId = nextId++;
  const pageEntries = [];

  for (const page of pages) {
    const stream = page.ops.join("\n");
    const streamId = nextId++;
    const pageId = nextId++;
    objects.push(pdfObject(streamId, `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`));
    pageEntries.push({ pageId, streamId });
  }

  objects.push(pdfObject(fontRegularId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
  objects.push(pdfObject(fontBoldId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"));

  for (const entry of pageEntries) {
    objects.push(
      pdfObject(
        entry.pageId,
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${fmt(PAGE.width)} ${fmt(PAGE.height)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${entry.streamId} 0 R >>`
      )
    );
  }

  objects.push(pdfObject(pagesId, `<< /Type /Pages /Count ${pageEntries.length} /Kids [${pageEntries.map((entry) => `${entry.pageId} 0 R`).join(" ")}] >>`));
  objects.push(pdfObject(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`));

  const order = [catalogId, pagesId, fontRegularId, fontBoldId].concat(
    pageEntries.flatMap((entry) => [entry.streamId, entry.pageId])
  );

  const bodyMap = new Map();
  for (const object of objects) {
    const id = Number(object.split(" ", 1)[0]);
    bodyMap.set(id, object);
  }

  let pdf = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const offsets = [0];

  for (const id of order) {
    offsets[id] = Buffer.byteLength(pdf, "utf8");
    pdf += bodyMap.get(id);
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${order.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const id of order) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${order.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

function buildCeoReportPdf(data) {
  const summary = createSummary(data.tasks, data.projects, data.sections, data.users);
  const pages = [buildOverviewPage(summary), buildSectionsProjectsPage(summary), buildPerformancePage(summary)];
  return buildPdf(pages);
}

module.exports = { buildCeoReportPdf };
