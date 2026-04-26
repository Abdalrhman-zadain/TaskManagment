const PAGE = { width: 595.28, height: 841.89, margin: 40 };

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
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function estimateWidth(text, fontSize) {
  return String(text).length * fontSize * 0.52;
}

function wrapText(text, fontSize, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

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
  return lines.length ? lines : [''];
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

  text(text, x, y, size = 12, font = 'F1', color = COLORS.ink) {
    this.push('BT');
    this.push(`/${font} ${fmt(size)} Tf`);
    this.push(`${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg`);
    this.push(`1 0 0 1 ${fmt(x)} ${fmt(y)} Tm`);
    this.push(`(${esc(text)}) Tj`);
    this.push('ET');
  }

  textLines(lines, x, y, size = 12, lineHeight = 16, font = 'F1', color = COLORS.ink) {
    let currentY = y;
    for (const line of lines) {
      this.text(line, x, currentY, size, font, color);
      currentY -= lineHeight;
    }
    return currentY;
  }

  wrappedText(text, x, y, width, size = 12, lineHeight = 16, font = 'F1', color = COLORS.ink) {
    return this.textLines(wrapText(text, size, width), x, y, size, lineHeight, font, color);
  }
}

function formatDate(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toISOString().slice(0, 10);
}

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

function avg(values) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function fitText(text, maxLength) {
  const value = String(text || '');
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function drawFooter(page, pageNo) {
  page.text('TeamTask Reporting', PAGE.margin, 18, 9.5, 'F1', COLORS.muted);
  page.text(`Page ${pageNo}`, PAGE.width - PAGE.margin - 28, 18, 9.5, 'F1', COLORS.muted);
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

  page.text(title, tableX, topY, 15, 'F2', COLORS.ink);

  let y = topY - 18;
  page.fillRect(tableX, y - headerH + 6, tableW, headerH, COLORS.brandDark);

  let cursorX = tableX + 8;
  layoutColumns.forEach((column) => {
    page.text(column.label, cursorX, y - 11, 8.6, 'F2', COLORS.white);
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
      page.text(fitText(row[column.key], column.max || 28), cellX, y - 11, 8.8, 'F1', COLORS.ink);
      cellX += column.width;
    });

    y -= rowH;
  });

  return y;
}

function isRejected(task) {
  return task.approvalStatus === 'REJECTED';
}

function isLate(task) {
  return task.status === 'LATE' || (task.status !== 'DONE' && new Date(task.deadline) < new Date());
}

function isPending(task) {
  return ['TODO', 'IN_PROGRESS', 'PENDING_APPROVAL'].includes(task.status) && !isRejected(task);
}

function summarizePersonalTasks(tasks, targetUser) {
  const scoredTasks = tasks.filter((task) => task.score && typeof task.score.value === 'number');

  return {
    personName: targetUser.name,
    role: targetUser.role,
    section: targetUser.section?.name || targetUser.managedSection?.name || 'No Section',
    level: targetUser.level || 'BRONZE',
    stars: targetUser.stars || 0,
    totalTasks: tasks.length,
    completed: tasks.filter((task) => task.status === 'DONE').length,
    late: tasks.filter(isLate).length,
    pending: tasks.filter(isPending).length,
    rejected: tasks.filter(isRejected).length,
    onTimeRate: pct(scoredTasks.filter((task) => task.score.isOnTime).length, scoredTasks.length),
    averageScore: avg(scoredTasks.map((task) => task.score.value)),
    taskRows: tasks.map((task) => ({
      title: task.title,
      project: task.project?.name || 'No Project',
      deadline: formatDate(task.deadline),
      status: task.status,
      approval: task.approvalStatus || 'PENDING',
      score: task.score ? String(task.score.value) : '-',
    })),
  };
}

function summarizeManagerSection(data) {
  const managerSummary = summarizePersonalTasks(data.managerTasks, data.targetUser);
  const teamTasks = data.sectionTasks.filter((task) => task.assigneeId !== data.targetUser.id);
  const teamOnlyEmployeeTasks = data.sectionTasks.filter((task) => task.assignee?.role === 'EMPLOYEE');
  const approvedCount = data.sectionTasks.filter((task) => task.approvalStatus === 'APPROVED').length;
  const submittedForApproval = data.sectionTasks.filter((task) => task.approvalStatus !== 'PENDING' || task.status === 'PENDING_APPROVAL').length;

  const individualRows = data.teamMembers.map((member) => {
    const memberTasks = data.sectionTasks.filter((task) => task.assigneeId === member.id);
    const scoredTasks = memberTasks.filter((task) => task.score && typeof task.score.value === 'number');

    return {
      employee: member.name,
      level: member.level || 'BRONZE',
      tasks: String(memberTasks.length),
      completed: String(memberTasks.filter((task) => task.status === 'DONE').length),
      late: String(memberTasks.filter(isLate).length),
      rejected: String(memberTasks.filter(isRejected).length),
      onTime: `${pct(scoredTasks.filter((task) => task.score.isOnTime).length, scoredTasks.length)}%`,
    };
  });

  const exceptionRows = data.sectionTasks
    .filter((task) => isLate(task) || isRejected(task) || task.status === 'PENDING_APPROVAL')
    .map((task) => ({
      task: task.title,
      assignee: task.assignee?.name || 'Unknown',
      deadline: formatDate(task.deadline),
      status: task.status,
      approval: task.approvalStatus || 'PENDING',
    }));

  return {
    managerSummary,
    sectionName: data.targetUser.section?.name || 'No Section',
    totalTeamMembers: data.teamMembers.length,
    totalSectionTasks: data.sectionTasks.length,
    teamCompleted: teamTasks.filter((task) => task.status === 'DONE').length,
    teamLate: teamTasks.filter(isLate).length,
    teamRejected: teamTasks.filter(isRejected).length,
    completionRate: pct(data.sectionTasks.filter((task) => task.status === 'DONE').length, data.sectionTasks.length),
    lateRate: pct(data.sectionTasks.filter(isLate).length, data.sectionTasks.length),
    approvalRate: pct(approvedCount, submittedForApproval),
    teamOnTimeRate: pct(
      teamOnlyEmployeeTasks.filter((task) => task.score?.isOnTime).length,
      teamOnlyEmployeeTasks.filter((task) => task.score).length
    ),
    individualRows,
    exceptionRows,
  };
}

function drawMetricCards(page, cards) {
  const startX = PAGE.margin;
  const gap = 10;
  const cardW = 158;
  const cardH = 74;

  cards.forEach(([label, value, sub], index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = startX + col * (cardW + gap);
    const y = 560 - row * (cardH + 12);
    page.fillRect(x, y, cardW, cardH, COLORS.soft);
    page.strokeRect(x, y, cardW, cardH, COLORS.line, 0.8);
    page.text(label.toUpperCase(), x + 12, y + 56, 9, 'F2', COLORS.muted);
    page.text(value, x + 12, y + 33, 20, 'F2', COLORS.brandDark);
    page.text(sub, x + 12, y + 14, 9.8, 'F1', COLORS.muted);
  });
}

function buildPersonalOverviewPage(reportTitle, startDate, endDate, summary) {
  const page = new PdfPage();
  page.fillRect(0, 690, PAGE.width, 152, COLORS.brandDark);
  page.text(reportTitle, PAGE.margin, 782, 24, 'F2', COLORS.white);
  page.text(`${summary.personName} • ${summary.role}`, PAGE.margin, 758, 11, 'F1', COLORS.white);
  page.wrappedText(
    `Date range: ${formatDate(startDate)} to ${formatDate(endDate)}. Section: ${summary.section}. Performance level: ${summary.level}. This report summarizes assigned tasks, completion behavior, approval outcomes, scores, and on-time delivery.`,
    PAGE.margin,
    730,
    470,
    11,
    15,
    'F1',
    COLORS.white
  );

  drawMetricCards(page, [
    ['Assigned Tasks', String(summary.totalTasks), `Section: ${summary.section}`],
    ['Completed', String(summary.completed), `${summary.onTimeRate}% on-time rate`],
    ['Late', String(summary.late), summary.late ? 'Needs follow-up' : 'On track'],
    ['Pending', String(summary.pending), 'Open or awaiting submission'],
    ['Rejected', String(summary.rejected), 'Sent back for revision'],
    ['Avg Score', String(summary.averageScore || 0), `${summary.level} • ${summary.stars} stars`],
  ]);

  page.text('Key Metrics', PAGE.margin, 430, 15, 'F2', COLORS.ink);
  page.wrappedText(
    `${summary.personName} has ${summary.completed} completed tasks in the selected period, ${summary.late} late tasks, ${summary.pending} pending tasks, and ${summary.rejected} rejected submissions. The current performance level is ${summary.level} with ${summary.stars} stars and an average score of ${summary.averageScore || 0}.`,
    PAGE.margin,
    406,
    500,
    11,
    15,
    'F1',
    COLORS.muted
  );

  drawFooter(page, 1);
  return page;
}

function buildPersonalTasksPage(summary, pageNo) {
  const page = new PdfPage();
  drawTable(
    page,
    'Task Breakdown',
    [
      { key: 'title', label: 'Task', width: 180, max: 28 },
      { key: 'project', label: 'Project', width: 100, max: 16 },
      { key: 'deadline', label: 'Deadline', width: 70, max: 12 },
      { key: 'status', label: 'Status', width: 76, max: 14 },
      { key: 'approval', label: 'Approval', width: 74, max: 12 },
      { key: 'score', label: 'Score', width: 42, max: 6 },
    ],
    summary.taskRows.length
      ? summary.taskRows.slice(0, 20)
      : [{ title: 'No tasks in range', project: '-', deadline: '-', status: '-', approval: '-', score: '-' }],
    780
  );

  drawFooter(page, pageNo);
  return page;
}

function buildManagerSectionOverviewPage(startDate, endDate, summary, targetUser) {
  const page = new PdfPage();
  page.fillRect(0, 690, PAGE.width, 152, COLORS.brandDark);
  page.text('Manager Section Report', PAGE.margin, 782, 24, 'F2', COLORS.white);
  page.text(`${targetUser.name} • ${summary.sectionName}`, PAGE.margin, 758, 11, 'F1', COLORS.white);
  page.wrappedText(
    `Date range: ${formatDate(startDate)} to ${formatDate(endDate)}. This report combines the manager personal summary with full-section delivery health, individual employee breakdowns, and the current approval flow for the section.`,
    PAGE.margin,
    730,
    470,
    11,
    15,
    'F1',
    COLORS.white
  );

  drawMetricCards(page, [
    ['Section Tasks', String(summary.totalSectionTasks), `${summary.totalTeamMembers} team members`],
    ['Completion Rate', `${summary.completionRate}%`, `${summary.managerSummary.completed} manager completions`],
    ['Late Rate', `${summary.lateRate}%`, `${summary.teamLate} team late tasks`],
    ['Approval Rate', `${summary.approvalRate}%`, 'Approved submissions ratio'],
    ['Team Rejected', String(summary.teamRejected), 'Returned for revision'],
    ['Team On-Time', `${summary.teamOnTimeRate}%`, 'Employee scored tasks only'],
  ]);

  page.text('Manager Personal Summary', PAGE.margin, 430, 15, 'F2', COLORS.ink);
  page.wrappedText(
    `${targetUser.name} handled ${summary.managerSummary.totalTasks} personal tasks in this period, with ${summary.managerSummary.completed} completed, ${summary.managerSummary.late} late, ${summary.managerSummary.pending} pending, and ${summary.managerSummary.rejected} rejected. Personal on-time rate is ${summary.managerSummary.onTimeRate}% and average score is ${summary.managerSummary.averageScore || 0}.`,
    PAGE.margin,
    406,
    500,
    11,
    15,
    'F1',
    COLORS.muted
  );

  drawFooter(page, 1);
  return page;
}

function buildManagerSectionMembersPage(summary) {
  const page = new PdfPage();
  drawTable(
    page,
    'Individual Employee Breakdown',
    [
      { key: 'employee', label: 'Employee', width: 132, max: 22 },
      { key: 'level', label: 'Level', width: 58, max: 10 },
      { key: 'tasks', label: 'Tasks', width: 48, max: 8 },
      { key: 'completed', label: 'Done', width: 48, max: 8 },
      { key: 'late', label: 'Late', width: 48, max: 8 },
      { key: 'rejected', label: 'Rejected', width: 60, max: 10 },
      { key: 'onTime', label: 'On-Time', width: 64, max: 10 },
    ],
    summary.individualRows.length
      ? summary.individualRows
      : [{ employee: 'No team members', level: '-', tasks: '0', completed: '0', late: '0', rejected: '0', onTime: '0%' }],
    780
  );

  drawFooter(page, 2);
  return page;
}

function buildManagerSectionExceptionsPage(summary) {
  const page = new PdfPage();
  drawTable(
    page,
    'Section Exceptions',
    [
      { key: 'task', label: 'Task', width: 190, max: 30 },
      { key: 'assignee', label: 'Assignee', width: 110, max: 16 },
      { key: 'deadline', label: 'Deadline', width: 70, max: 12 },
      { key: 'status', label: 'Status', width: 70, max: 12 },
      { key: 'approval', label: 'Approval', width: 70, max: 12 },
    ],
    summary.exceptionRows.length
      ? summary.exceptionRows.slice(0, 20)
      : [{ task: 'No late, rejected, or pending-approval tasks', assignee: '-', deadline: '-', status: '-', approval: '-' }],
    780
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
    const stream = page.ops.join('\n');
    const streamId = nextId++;
    const pageId = nextId++;
    objects.push(pdfObject(streamId, `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`));
    pageEntries.push({ pageId, streamId });
  }

  objects.push(pdfObject(fontRegularId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'));
  objects.push(pdfObject(fontBoldId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'));

  for (const entry of pageEntries) {
    objects.push(
      pdfObject(
        entry.pageId,
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${fmt(PAGE.width)} ${fmt(PAGE.height)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${entry.streamId} 0 R >>`
      )
    );
  }

  objects.push(pdfObject(pagesId, `<< /Type /Pages /Count ${pageEntries.length} /Kids [${pageEntries.map((entry) => `${entry.pageId} 0 R`).join(' ')}] >>`));
  objects.push(pdfObject(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`));

  const order = [catalogId, pagesId, fontRegularId, fontBoldId].concat(
    pageEntries.flatMap((entry) => [entry.streamId, entry.pageId])
  );

  const bodyMap = new Map();
  for (const object of objects) {
    const id = Number(object.split(' ', 1)[0]);
    bodyMap.set(id, object);
  }

  let pdf = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n';
  const offsets = [0];

  for (const id of order) {
    offsets[id] = Buffer.byteLength(pdf, 'utf8');
    pdf += bodyMap.get(id);
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${order.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const id of order) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${order.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

function buildCeoReportPdf(data) {
  if (data.reportType === 'EMPLOYEE') {
    const summary = summarizePersonalTasks(data.tasks || [], data.targetUser);
    return buildPdf([
      buildPersonalOverviewPage('Employee Report', data.startDate, data.endDate, summary),
      buildPersonalTasksPage(summary, 2),
    ]);
  }

  if (data.reportType === 'MANAGER_PERSONAL') {
    const summary = summarizePersonalTasks(data.tasks || [], data.targetUser);
    return buildPdf([
      buildPersonalOverviewPage('Manager Personal Report', data.startDate, data.endDate, summary),
      buildPersonalTasksPage(summary, 2),
    ]);
  }

  const summary = summarizeManagerSection(data);
  return buildPdf([
    buildManagerSectionOverviewPage(data.startDate, data.endDate, summary, data.targetUser),
    buildManagerSectionMembersPage(summary),
    buildManagerSectionExceptionsPage(summary),
  ]);
}

module.exports = { buildCeoReportPdf };
