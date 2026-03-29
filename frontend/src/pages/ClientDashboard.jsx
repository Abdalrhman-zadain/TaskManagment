import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const clientProfile = {
  name: "Nora Haddad",
  company: "Summit Retail Group",
  email: "nora@summitretail.com",
  phone: "+962 7 9000 2211",
  role: "Client Stakeholder",
  location: "Amman, Jordan",
  joined: "January 2026",
};

const initialProjects = [
  {
    id: 1,
    name: "Retail Mobile App Launch",
    manager: "Maya Salim",
    managerTitle: "Senior Delivery Manager",
    deadline: "2026-04-18",
    status: "IN_PROGRESS",
    progress: 72,
    budget: "$42,000",
    description:
      "Cross-platform customer app for loyalty, in-store pickup, and personalized campaigns.",
    timeline: [
      { phase: "Discovery", date: "2026-01-10", status: "done" },
      { phase: "UX & UI Design", date: "2026-02-05", status: "done" },
      { phase: "Core Development", date: "2026-03-15", status: "in_progress" },
      { phase: "Client QA", date: "2026-04-07", status: "upcoming" },
    ],
    milestones: [
      { id: 11, name: "Wireframes approved", done: true },
      { id: 12, name: "API integration", done: true },
      { id: 13, name: "Push notification flow", done: false },
      { id: 14, name: "Store submission package", done: false },
    ],
    activity: [
      { id: 101, text: "Homepage checkout flow refined", time: "2 hours ago" },
      { id: 102, text: "Android build shared with QA", time: "Yesterday" },
    ],
    deadlines: [
      { id: 1001, label: "Client QA handoff", date: "2026-04-07" },
      { id: 1002, label: "Launch review meeting", date: "2026-04-14" },
    ],
    feedbackThread: [
      {
        id: 1,
        author: "Nora Haddad",
        role: "Client",
        message: "Please make the loyalty banner more visible on the dashboard.",
        time: "Mar 25, 10:30 AM",
      },
      {
        id: 2,
        author: "Maya Salim",
        role: "Manager",
        message: "Done. We also improved the CTA contrast for mobile users.",
        time: "Mar 25, 2:10 PM",
      },
    ],
  },
  {
    id: 2,
    name: "Warehouse Analytics Portal",
    manager: "Rami Odeh",
    managerTitle: "Operations Program Manager",
    deadline: "2026-04-02",
    status: "DELAYED",
    progress: 58,
    budget: "$28,500",
    description:
      "Internal analytics portal for inventory turnover, order accuracy, and staff performance dashboards.",
    timeline: [
      { phase: "Requirements", date: "2026-01-14", status: "done" },
      { phase: "Data modeling", date: "2026-02-08", status: "done" },
      { phase: "Dashboard build", date: "2026-03-12", status: "in_progress" },
      { phase: "Executive review", date: "2026-04-02", status: "upcoming" },
    ],
    milestones: [
      { id: 21, name: "Inventory dashboard", done: true },
      { id: 22, name: "Shipment alerts", done: false },
      { id: 23, name: "Role permissions", done: true },
      { id: 24, name: "Export reports", done: false },
    ],
    activity: [
      { id: 201, text: "Data refresh issue identified and being fixed", time: "5 hours ago" },
      { id: 202, text: "Report export design approved", time: "2 days ago" },
    ],
    deadlines: [
      { id: 2001, label: "Export module delivery", date: "2026-03-31" },
      { id: 2002, label: "Executive review", date: "2026-04-02" },
    ],
    feedbackThread: [
      {
        id: 3,
        author: "Nora Haddad",
        role: "Client",
        message: "The shipment delay widget should be the first card managers see.",
        time: "Mar 23, 9:00 AM",
      },
      {
        id: 4,
        author: "Rami Odeh",
        role: "Manager",
        message: "We reordered the widgets and added a red alert state for overdue shipments.",
        time: "Mar 23, 12:45 PM",
      },
    ],
  },
  {
    id: 3,
    name: "Brand Campaign Asset Pack",
    manager: "Dana Khoury",
    managerTitle: "Creative Project Manager",
    deadline: "2026-03-26",
    status: "COMPLETED",
    progress: 100,
    budget: "$12,000",
    description:
      "Campaign creative package covering social, display, and launch video assets for spring promotion.",
    timeline: [
      { phase: "Brief approval", date: "2026-02-01", status: "done" },
      { phase: "Concept design", date: "2026-02-11", status: "done" },
      { phase: "Final production", date: "2026-03-04", status: "done" },
      { phase: "Final delivery", date: "2026-03-26", status: "done" },
    ],
    milestones: [
      { id: 31, name: "Moodboards approved", done: true },
      { id: 32, name: "Social pack delivered", done: true },
      { id: 33, name: "Launch video exported", done: true },
      { id: 34, name: "Final archive shared", done: true },
    ],
    activity: [
      { id: 301, text: "Final deliverables approved by client", time: "3 days ago" },
      { id: 302, text: "Campaign asset archive uploaded", time: "4 days ago" },
    ],
    deadlines: [{ id: 3001, label: "Project closed", date: "2026-03-26" }],
    feedbackThread: [
      {
        id: 5,
        author: "Dana Khoury",
        role: "Manager",
        message: "All source files and exports are now in the deliverables folder.",
        time: "Mar 24, 4:25 PM",
      },
    ],
  },
];

const initialDeliverables = [
  {
    id: 1,
    projectId: 1,
    taskName: "Checkout flow implementation",
    type: "Photo",
    uploadDate: "2026-03-27",
    submittedBy: "Yousef Naser",
    status: "PENDING_REVIEW",
  },
  {
    id: 2,
    projectId: 1,
    taskName: "Push notification preview",
    type: "Video",
    uploadDate: "2026-03-26",
    submittedBy: "Lina Haddad",
    status: "APPROVED",
  },
  {
    id: 3,
    projectId: 2,
    taskName: "Warehouse dashboard prototype",
    type: "Photo",
    uploadDate: "2026-03-28",
    submittedBy: "Ahmad Rahal",
    status: "CHANGES_REQUESTED",
  },
  {
    id: 4,
    projectId: 3,
    taskName: "Launch animation final export",
    type: "Video",
    uploadDate: "2026-03-22",
    submittedBy: "Dana Khoury",
    status: "APPROVED",
  },
];

const notificationsData = [
  {
    id: 1,
    type: "Milestone Completed",
    message: "Retail Mobile App Launch reached 72% completion.",
    time: "20 minutes ago",
  },
  {
    id: 2,
    type: "Deliverable Submitted",
    message: "New checkout flow evidence was submitted for review.",
    time: "3 hours ago",
  },
  {
    id: 3,
    type: "Deadline Approaching",
    message: "Warehouse Analytics Portal review is due in 4 days.",
    time: "Today",
  },
  {
    id: 4,
    type: "Project Completed",
    message: "Brand Campaign Asset Pack was marked complete.",
    time: "3 days ago",
  },
];

const progressTrendData = [
  { week: "W1", progress: 18 },
  { week: "W2", progress: 31 },
  { week: "W3", progress: 46 },
  { week: "W4", progress: 57 },
  { week: "W5", progress: 69 },
  { week: "W6", progress: 77 },
];

const reportBarData = [
  { name: "Retail App", completed: 21, pending: 8 },
  { name: "Warehouse", completed: 14, pending: 10 },
  { name: "Campaign", completed: 18, pending: 0 },
];

const projectStatusColors = {
  COMPLETED: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  IN_PROGRESS: "bg-sky-500/15 text-sky-300 border border-sky-500/25",
  DELAYED: "bg-rose-500/15 text-rose-300 border border-rose-500/25",
};

const deliverableStatusColors = {
  PENDING_REVIEW:
    "bg-amber-500/15 text-amber-300 border border-amber-500/25",
  APPROVED: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  CHANGES_REQUESTED:
    "bg-rose-500/15 text-rose-300 border border-rose-500/25",
};

const navItems = [
  { id: "home", label: "Client Dashboard" },
  { id: "projects", label: "My Projects" },
  { id: "detail", label: "Project Detail" },
  { id: "deliverables", label: "Evidence & Deliverables" },
  { id: "reports", label: "Reports & Analytics" },
  { id: "notifications", label: "Notifications" },
  { id: "profile", label: "Profile" },
];

function formatStatus(status) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatCard({ label, value, subtext, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.8)]">
      <div className={`mb-3 h-1 w-14 rounded-full ${accent}`} />
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{subtext}</div>
    </div>
  );
}

export default function ClientDashboard() {
  const [activePage, setActivePage] = useState("home");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [selectedProjectId, setSelectedProjectId] = useState(1);
  const [projects] = useState(initialProjects);
  const [deliverables, setDeliverables] = useState(initialDeliverables);
  const [newComment, setNewComment] = useState("");
  const [projectComments, setProjectComments] = useState(() =>
    Object.fromEntries(initialProjects.map((project) => [project.id, project.feedbackThread])),
  );

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) || projects[0];

  const summary = useMemo(() => {
    const completed = projects.filter((project) => project.status === "COMPLETED").length;
    const inProgress = projects.filter((project) => project.status === "IN_PROGRESS").length;
    const delayed = projects.filter((project) => project.status === "DELAYED").length;
    const avgProgress = Math.round(
      projects.reduce((sum, project) => sum + project.progress, 0) / projects.length,
    );

    return {
      total: projects.length,
      completed,
      inProgress,
      delayed,
      avgProgress,
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (projectFilter === "ALL") return projects;
    return projects.filter((project) => project.status === projectFilter);
  }, [projectFilter, projects]);

  const clientActivity = useMemo(
    () =>
      projects
        .flatMap((project) =>
          project.activity.map((entry) => ({
            ...entry,
            projectName: project.name,
          })),
        )
        .slice(0, 6),
    [projects],
  );

  const upcomingDeadlines = useMemo(
    () =>
      projects
        .flatMap((project) =>
          project.deadlines.map((deadline) => ({
            ...deadline,
            projectName: project.name,
          })),
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5),
    [projects],
  );

  const homeProgressData = useMemo(
    () =>
      projects.map((project) => ({
        name: project.name.split(" ")[0],
        progress: project.progress,
      })),
    [projects],
  );

  function goToProject(projectId) {
    setSelectedProjectId(projectId);
    setActivePage("detail");
  }

  function updateDeliverableStatus(id, status) {
    setDeliverables((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  function addComment() {
    if (!newComment.trim()) return;

    setProjectComments((current) => ({
      ...current,
      [selectedProject.id]: [
        ...current[selectedProject.id],
        {
          id: Date.now(),
          author: clientProfile.name,
          role: "Client",
          message: newComment.trim(),
          time: "Just now",
        },
      ],
    }));
    setNewComment("");
  }

  function renderHome() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Projects"
            value={summary.total}
            subtext="Active client engagements"
            accent="bg-sky-400"
          />
          <StatCard
            label="Completed"
            value={summary.completed}
            subtext="Closed successfully"
            accent="bg-emerald-400"
          />
          <StatCard
            label="In Progress"
            value={summary.inProgress}
            subtext="Currently moving"
            accent="bg-cyan-400"
          />
          <StatCard
            label="Delayed"
            value={summary.delayed}
            subtext="Needs attention"
            accent="bg-rose-400"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">Overall Progress</h2>
              <p className="text-sm text-slate-400">
                Average completion across all client projects: {summary.avgProgress}%
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={homeProgressData}>
                  <defs>
                    <linearGradient id="clientProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 16,
                      color: "#e2e8f0",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="progress"
                    stroke="#38bdf8"
                    fill="url(#clientProgress)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Upcoming Deadlines</h2>
              <p className="text-sm text-slate-400">What needs client attention next</p>
            </div>
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className="rounded-xl border border-white/8 bg-slate-950/60 p-4"
                >
                  <div className="text-sm font-medium text-white">{deadline.label}</div>
                  <div className="mt-1 text-xs text-slate-400">{deadline.projectName}</div>
                  <div className="mt-2 text-xs text-cyan-300">{formatDate(deadline.date)}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <p className="text-sm text-slate-400">Latest updates shared with this client</p>
          </div>
          <div className="space-y-3">
            {clientActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 rounded-xl border border-white/8 bg-slate-950/50 p-4"
              >
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <div>
                  <div className="text-sm text-white">{item.text}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {item.projectName} • {item.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  function renderProjects() {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {["ALL", "IN_PROGRESS", "DELAYED", "COMPLETED"].map((filter) => (
            <button
              key={filter}
              onClick={() => setProjectFilter(filter)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                projectFilter === filter
                  ? "bg-sky-500 text-white"
                  : "border border-white/10 bg-slate-900/70 text-slate-300 hover:border-sky-400/40"
              }`}
            >
              {formatStatus(filter)}
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">{project.name}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs ${projectStatusColors[project.status]}`}>
                      {formatStatus(project.status)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    Manager: {project.manager} • Deadline: {formatDate(project.deadline)}
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${
                          project.status === "DELAYED" ? "bg-rose-400" : "bg-cyan-400"
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => goToProject(project.id)}
                    className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
                  >
                    View Detail
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setActivePage("deliverables");
                    }}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-200 hover:border-sky-400/40"
                  >
                    View Deliverables
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderProjectDetail() {
    const comments = projectComments[selectedProject.id] || [];
    const completedMilestones = selectedProject.milestones.filter((milestone) => milestone.done).length;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                selectedProject.id === project.id
                  ? "bg-sky-500 text-white"
                  : "border border-white/10 bg-slate-900/70 text-slate-300"
              }`}
            >
              {project.name}
            </button>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">{selectedProject.name}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  {selectedProject.description}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${projectStatusColors[selectedProject.status]}`}>
                {formatStatus(selectedProject.status)}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-white/8 bg-slate-950/50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Manager</div>
                <div className="mt-2 text-sm font-medium text-white">{selectedProject.manager}</div>
                <div className="text-xs text-slate-400">{selectedProject.managerTitle}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-slate-950/50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Deadline</div>
                <div className="mt-2 text-sm font-medium text-white">{formatDate(selectedProject.deadline)}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-slate-950/50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Budget</div>
                <div className="mt-2 text-sm font-medium text-white">{selectedProject.budget}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-slate-950/50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Completion</div>
                <div className="mt-2 text-sm font-medium text-white">{selectedProject.progress}%</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-white">Timeline</span>
                <span className="text-slate-400">
                  {completedMilestones}/{selectedProject.milestones.length} milestones complete
                </span>
              </div>
              <div className="space-y-3">
                {selectedProject.timeline.map((phase) => (
                  <div
                    key={phase.phase}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-slate-950/50 p-4"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{phase.phase}</div>
                      <div className="mt-1 text-xs text-slate-400">{formatDate(phase.date)}</div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        phase.status === "done"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : phase.status === "in_progress"
                            ? "bg-sky-500/15 text-sky-300"
                            : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {formatStatus(phase.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <h3 className="text-lg font-semibold text-white">Milestones</h3>
              <div className="mt-4 space-y-3">
                {selectedProject.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-slate-950/50 p-3"
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        milestone.done ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {milestone.done ? "✓" : "•"}
                    </div>
                    <div className="text-sm text-white">{milestone.name}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <h3 className="text-lg font-semibold text-white">Comment / Feedback Thread</h3>
              <div className="mt-4 space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-white/8 bg-slate-950/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-white">
                        {comment.author}
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {comment.role}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">{comment.time}</div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{comment.message}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                <textarea
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  rows={3}
                  placeholder="Share feedback, ask a question, or request a revision..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                />
                <button
                  onClick={addComment}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
                >
                  Add Comment
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  function renderDeliverables() {
    const projectDeliverables = deliverables.filter(
      (item) => item.projectId === selectedProject.id,
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                selectedProject.id === project.id
                  ? "bg-sky-500 text-white"
                  : "border border-white/10 bg-slate-900/70 text-slate-300"
              }`}
            >
              {project.name}
            </button>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projectDeliverables.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70"
            >
              <div className="flex h-44 items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-center">
                <div>
                  <div className="text-4xl text-cyan-300">{item.type === "Video" ? "▶" : "▣"}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-500">
                    {item.type} Preview
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <div className="text-sm font-semibold text-white">{item.taskName}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Submitted by {item.submittedBy} • {formatDate(item.uploadDate)}
                  </div>
                </div>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs ${deliverableStatusColors[item.status]}`}
                >
                  {formatStatus(item.status)}
                </span>

                <div className="flex gap-3">
                  <button
                    onClick={() => updateDeliverableStatus(item.id, "APPROVED")}
                    className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateDeliverableStatus(item.id, "CHANGES_REQUESTED")}
                    className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/20"
                  >
                    Request Changes
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderReports() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Reports & Analytics</h2>
            <p className="text-sm text-slate-400">
              Snapshot of delivery pace and outstanding work
            </p>
          </div>
          <button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">
            Download Report
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Progress Over Time</h3>
              <p className="text-sm text-slate-400">Weekly movement across active projects</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressTrendData}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="week" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 16,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="progress"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ fill: "#38bdf8", strokeWidth: 0, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Completed vs Pending</h3>
              <p className="text-sm text-slate-400">Task workload by project</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportBarData}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 16,
                    }}
                  />
                  <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pending" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderNotifications() {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Notifications</h2>
          <p className="text-sm text-slate-400">Milestones, submissions, and deadline reminders</p>
        </div>
        <div className="space-y-3">
          {notificationsData.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start gap-4 rounded-xl border border-white/8 bg-slate-950/50 p-4"
            >
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-400" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs text-sky-300">
                    {notification.type}
                  </span>
                  <span className="text-xs text-slate-500">{notification.time}</span>
                </div>
                <p className="mt-2 text-sm text-slate-200">{notification.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderProfile() {
    return (
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-300 text-2xl font-bold text-slate-950">
            NH
          </div>
          <div className="mt-4 text-center">
            <h2 className="text-xl font-semibold text-white">{clientProfile.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{clientProfile.role}</p>
            <p className="text-sm text-slate-500">{clientProfile.company}</p>
          </div>

          <div className="mt-6 space-y-3">
            {[
              ["Email", clientProfile.email],
              ["Phone", clientProfile.phone],
              ["Location", clientProfile.location],
              ["Joined", clientProfile.joined],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/8 bg-slate-950/50 p-4"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
                <div className="mt-1 text-sm text-white">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Projects"
              value={summary.total}
              subtext="Visible to this client"
              accent="bg-sky-400"
            />
            <StatCard
              label="Avg Progress"
              value={`${summary.avgProgress}%`}
              subtext="Across active work"
              accent="bg-cyan-400"
            />
            <StatCard
              label="Approved Deliverables"
              value={deliverables.filter((item) => item.status === "APPROVED").length}
              subtext="Client-approved proofs"
              accent="bg-emerald-400"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h3 className="text-lg font-semibold text-white">Account Summary</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              This client account can review deliverables, monitor project health, see
              deadlines, and share feedback with assigned managers. The dashboard is
              scoped only to projects delivered for {clientProfile.company}.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const pageTitles = {
    home: "Client Dashboard",
    projects: "My Projects",
    detail: "Project Detail",
    deliverables: "Evidence & Deliverables",
    reports: "Reports & Analytics",
    notifications: "Notifications",
    profile: "Profile",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-white/10 bg-slate-950/70 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="text-2xl font-bold text-white">
              Client<span className="text-cyan-300">View</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">External stakeholder portal</p>
          </div>

          <div className="px-4 py-5">
            <div className="mb-3 px-3 text-xs uppercase tracking-[0.25em] text-slate-500">
              Navigation
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition ${
                    activePage === item.id
                      ? "bg-sky-500/15 text-white ring-1 ring-sky-400/30"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === "notifications" && (
                    <span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs text-white">
                      {notificationsData.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto px-4 pb-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-300 font-bold text-slate-950">
                  NH
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{clientProfile.name}</div>
                  <div className="text-xs text-slate-400">{clientProfile.company}</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-300/80">
                Client Portal
              </div>
              <h1 className="mt-2 text-3xl font-semibold text-white">{pageTitles[activePage]}</h1>
              <p className="mt-1 text-sm text-slate-400">
                Viewing projects for {clientProfile.company}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActivePage("projects")}
                className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 hover:border-sky-400/40"
              >
                Browse Projects
              </button>
              <button
                onClick={() => setActivePage("reports")}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
              >
                Open Reports
              </button>
            </div>
          </div>

          {activePage === "home" && renderHome()}
          {activePage === "projects" && renderProjects()}
          {activePage === "detail" && renderProjectDetail()}
          {activePage === "deliverables" && renderDeliverables()}
          {activePage === "reports" && renderReports()}
          {activePage === "notifications" && renderNotifications()}
          {activePage === "profile" && renderProfile()}
        </main>
      </div>
    </div>
  );
}
