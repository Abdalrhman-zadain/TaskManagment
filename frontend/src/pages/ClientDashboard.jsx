import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

const navItems = [
  { id: "home", label: "Dashboard" },
  { id: "projects", label: "Projects" },
  { id: "deliverables", label: "Deliverables" },
  { id: "reports", label: "Reports" },
  { id: "notifications", label: "Notifications" },
  { id: "profile", label: "Profile" },
];

function formatDate(date) {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status) {
  return String(status)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusTone(status) {
  if (status === "COMPLETED" || status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "AT_RISK" || status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function ClientStatCard({ label, value, subtext, accent }) {
  return (
    <div className="app-panel p-5">
      <div className={`mb-3 h-1 w-14 rounded-full ${accent}`} />
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{subtext}</div>
    </div>
  );
}

function chartTooltipStyle() {
  return {
    backgroundColor: "#ffffff",
    border: "1px solid #d9e2ef",
    borderRadius: 16,
    boxShadow: "0 18px 42px rgba(17, 40, 74, 0.08)",
    color: "#17324d",
  };
}

export default function ClientDashboard() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("home");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await api.get("/client/dashboard");
      setDashboard(res.data);
      if (!selectedProjectId && res.data.projects[0]) {
        setSelectedProjectId(res.data.projects[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load client dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const projects = dashboard?.projects || [];
  const notifications = dashboard?.notifications || [];
  const deliverables = dashboard?.deliverables || [];
  const clientProfile = dashboard?.client || {
    name: storedUser.name,
    email: storedUser.email,
    joined: null,
  };

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) || projects[0] || null;

  const summary = useMemo(() => {
    const completed = projects.filter((project) => project.status === "COMPLETED").length;
    const atRisk = projects.filter((project) => project.status === "AT_RISK").length;
    const avgProgress = projects.length
      ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)
      : 0;

    return {
      total: projects.length,
      completed,
      atRisk,
      avgProgress,
    };
  }, [projects]);

  const projectChartData = useMemo(
    () =>
      projects.map((project) => ({
        name: project.name.length > 12 ? `${project.name.slice(0, 12)}...` : project.name,
        progress: project.progress,
      })),
    [projects],
  );

  const workloadData = useMemo(
    () =>
      projects.map((project) => {
        const completedTasks = project.tasks.filter((task) => task.status === "DONE").length;
        return {
          name: project.name.length > 12 ? `${project.name.slice(0, 12)}...` : project.name,
          completed: completedTasks,
          open: project.tasks.length - completedTasks,
        };
      }),
    [projects],
  );

  const recentActivity = useMemo(
    () =>
      projects
        .flatMap((project) =>
          project.tasks
            .filter((task) => task.evidenceUploadedAt || task.completedAt || task.createdAt)
            .map((task) => ({
              id: `${project.id}-${task.id}`,
              projectName: project.name,
              text:
                task.approvalStatus === "APPROVED"
                  ? `${task.title} was approved`
                  : task.evidenceUrl
                    ? `${task.title} has a new deliverable ready`
                    : `${task.title} is in progress`,
              time: task.evidenceUploadedAt || task.completedAt || task.createdAt || project.createdAt,
            })),
        )
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 6),
    [projects],
  );

  async function addComment() {
    if (!selectedProject || !newComment.trim()) return;
    setCommentSaving(true);
    try {
      await api.post(`/client/projects/${selectedProject.id}/comments`, {
        message: newComment.trim(),
      });
      setNewComment("");
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add comment");
    } finally {
      setCommentSaving(false);
    }
  }

  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  if (loading) {
    return <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">Loading client dashboard...</div>;
  }

  if (error && !dashboard) {
    return <div className="app-shell flex min-h-screen items-center justify-center text-rose-600">{error}</div>;
  }

  function renderHome() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ClientStatCard label="Projects" value={summary.total} subtext="Visible to this client" accent="bg-[#1275e2]" />
          <ClientStatCard label="Completed" value={summary.completed} subtext="Closed successfully" accent="bg-emerald-400" />
          <ClientStatCard label="At Risk" value={summary.atRisk} subtext="Needs extra attention" accent="bg-[#c55b00]" />
          <ClientStatCard label="Avg Progress" value={`${summary.avgProgress}%`} subtext="Across all linked work" accent="bg-[#5f78a3]" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="app-panel p-5">
            <h2 className="text-lg font-semibold text-slate-900">Project Progress</h2>
            <p className="mt-1 text-sm text-slate-500">Real progress calculated from linked project tasks.</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectChartData}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={chartTooltipStyle()} />
                  <Area type="monotone" dataKey="progress" stroke="#1275e2" fill="rgba(18,117,226,0.16)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="app-panel p-5">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
            <div className="mt-4 space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="text-sm text-slate-800">{item.text}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.projectName} · {formatDate(item.time)}</div>
                </div>
              ))}
              {recentActivity.length === 0 && <p className="text-sm text-slate-500">No activity yet.</p>}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderProjects() {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={`w-full rounded-2xl border p-5 text-left transition ${
                selectedProject?.id === project.id
                  ? "border-[#1275e2] bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{project.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Manager: {project.manager.name} · Section: {project.section.name}
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(project.status)}`}>{formatStatus(project.status)}</span>
              </div>
              {project.description && <p className="mt-3 text-sm text-slate-600">{project.description}</p>}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>Deadline: {formatDate(project.deadline)}</span>
                <span>{project.progress}% complete</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-[#1275e2]" style={{ width: `${project.progress}%` }} />
              </div>
            </button>
          ))}
        </section>

        <section className="app-panel p-5">
          {!selectedProject ? (
            <p className="text-sm text-slate-500">No project selected.</p>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-900">{selectedProject.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedProject.description || "No project description yet."}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Budget</div>
                  <div className="mt-2 text-sm text-slate-900">{selectedProject.budget || "Not set"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Deadline</div>
                  <div className="mt-2 text-sm text-slate-900">{formatDate(selectedProject.deadline)}</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Task Feed</h3>
                  <span className="text-xs text-slate-500">{selectedProject.tasks.length} linked tasks</span>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedProject.tasks.map((task) => (
                    <div key={task.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{task.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Assigned to {task.assignee?.name || "Unknown"} · Due {formatDate(task.deadline)}
                          </div>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(task.status)}`}>{formatStatus(task.status)}</span>
                      </div>
                    </div>
                  ))}
                  {selectedProject.tasks.length === 0 && <p className="text-sm text-slate-500">No tasks linked yet.</p>}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-900">Comment Thread</h3>
                <div className="mt-4 space-y-3">
                  {selectedProject.comments.map((comment) => (
                    <div key={comment.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-slate-900">
                          {comment.author.name}
                          <span className="ml-2 text-xs text-slate-500">{formatStatus(comment.author.role)}</span>
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(comment.createdAt)}</div>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{comment.message}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    placeholder="Share feedback or request changes..."
                    className="app-input"
                  />
                  <button
                    onClick={addComment}
                    disabled={commentSaving}
                    className="btn-primary px-4 py-2 text-sm font-medium"
                  >
                    {commentSaving ? "Posting..." : "Add Comment"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  function renderDeliverables() {
    return (
      <div className="space-y-4">
        {deliverables.map((item) => (
          <div key={item.id} className="app-panel p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.taskName}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {item.projectName} · Submitted by {item.submittedBy} · {formatDate(item.uploadDate)}
                </div>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(item.status)}`}>{formatStatus(item.status)}</span>
            </div>
            {item.evidenceUrl && (
              <a
                href={`http://localhost:5000${item.evidenceUrl}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-sm font-medium text-[#1275e2] hover:text-[#0f63c0]"
              >
                Open {item.type.toLowerCase()} evidence
              </a>
            )}
          </div>
        ))}
        {deliverables.length === 0 && <p className="text-sm text-slate-500">No deliverables uploaded yet.</p>}
      </div>
    );
  }

  function renderReports() {
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="app-panel p-5">
          <h2 className="text-lg font-semibold text-slate-900">Progress by Project</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectChartData}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={chartTooltipStyle()} />
                <Area type="monotone" dataKey="progress" stroke="#1275e2" fill="rgba(18,117,226,0.16)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="app-panel p-5">
          <h2 className="text-lg font-semibold text-slate-900">Completed vs Open Tasks</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={chartTooltipStyle()} />
                <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="open" fill="#c55b00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    );
  }

  function renderNotifications() {
    return (
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div key={notification.id} className="app-panel p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">{formatStatus(notification.type)}</span>
              <span className="text-xs text-slate-500">{formatDate(notification.createdAt)}</span>
            </div>
            <p className="mt-3 text-sm text-slate-700">{notification.message}</p>
          </div>
        ))}
        {notifications.length === 0 && <p className="text-sm text-slate-500">No notifications yet.</p>}
      </div>
    );
  }

  function renderProfile() {
    return (
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="app-panel p-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#1275e2] to-[#5f78a3] text-2xl font-bold text-white">
            {clientProfile.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="mt-4 text-center">
            <h2 className="text-xl font-semibold text-slate-900">{clientProfile.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Client Portal</p>
          </div>

          <div className="mt-6 space-y-3">
            {[
              ["Email", clientProfile.email],
              ["Joined", formatDate(clientProfile.joined)],
              ["Linked Projects", summary.total],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
                <div className="mt-1 text-sm text-slate-900">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <ClientStatCard label="Projects" value={summary.total} subtext="Scoped to this client account" accent="bg-[#1275e2]" />
          <ClientStatCard label="Deliverables" value={deliverables.length} subtext="Evidence files shared with you" accent="bg-emerald-400" />
          <ClientStatCard
            label="Unread Notifications"
            value={notifications.filter((item) => !item.read).length}
            subtext="Recent updates awaiting review"
            accent="bg-[#5f78a3]"
          />
        </section>
      </div>
    );
  }

  const pageTitle = navItems.find((item) => item.id === activePage)?.label || "Dashboard";

  return (
    <div className="app-shell min-h-screen">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-[#fbfdff] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:border-r lg:border-b-0">
          <div className="border-b border-slate-200 px-6 py-6">
            <div className="text-2xl font-bold text-slate-900">
              Client<span className="text-[#1275e2]">View</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Connected to live project data</p>
          </div>

          <div className="px-4 py-5 lg:flex-1">
            <div className="mb-3 px-3 text-xs uppercase tracking-[0.25em] text-slate-400">Navigation</div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                    activePage === item.id
                      ? "bg-[#1275e2] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === "notifications" && notifications.length > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      activePage === item.id ? "bg-white text-[#1275e2]" : "bg-[#1275e2] text-white"
                    }`}>
                      {notifications.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="px-4 pb-6 lg:mt-auto">
            <div className="app-panel p-4 shadow-none">
              <div className="text-sm font-medium text-slate-900">{clientProfile.name}</div>
              <div className="text-xs text-slate-500">{clientProfile.email}</div>
            </div>
            <button
              onClick={signOut}
              className="mt-3 w-full py-1 text-left text-xs text-slate-500 transition hover:text-[#c55b00]"
            >
              Sign out →
            </button>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-[#5f78a3]">Client Portal</div>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">{pageTitle}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {selectedProject ? `Currently focused on ${selectedProject.name}` : "Viewing all linked projects"}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {activePage === "home" && renderHome()}
          {activePage === "projects" && renderProjects()}
          {activePage === "deliverables" && renderDeliverables()}
          {activePage === "reports" && renderReports()}
          {activePage === "notifications" && renderNotifications()}
          {activePage === "profile" && renderProfile()}
        </main>
      </div>
    </div>
  );
}
