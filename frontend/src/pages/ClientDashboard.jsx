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
  return String(status).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusTone(status) {
  if (status === "COMPLETED" || status === "APPROVED") return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25";
  if (status === "AT_RISK" || status === "REJECTED") return "bg-rose-500/15 text-rose-300 border border-rose-500/25";
  if (status === "PENDING") return "bg-amber-500/15 text-amber-300 border border-amber-500/25";
  return "bg-sky-500/15 text-sky-300 border border-sky-500/25";
}

function StatCard({ label, value, subtext, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
      <div className={`mb-3 h-1 w-14 rounded-full ${accent}`} />
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{subtext}</div>
    </div>
  );
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
    return <div className="min-h-screen flex items-center justify-center bg-white text-slate-400">Loading client dashboard...</div>;
  }

  if (error && !dashboard) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-rose-500">{error}</div>;
  }

  function renderHome() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Projects" value={summary.total} subtext="Visible to this client" accent="bg-sky-400" />
          <StatCard label="Completed" value={summary.completed} subtext="Closed successfully" accent="bg-emerald-400" />
          <StatCard label="At Risk" value={summary.atRisk} subtext="Needs extra attention" accent="bg-rose-400" />
          <StatCard label="Avg Progress" value={`${summary.avgProgress}%`} subtext="Across all linked work" accent="bg-cyan-400" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold text-white">Project Progress</h2>
            <p className="text-sm text-slate-400 mt-1">Real progress calculated from linked project tasks.</p>
            <div className="h-72 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectChartData}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16 }} />
                  <Area type="monotone" dataKey="progress" stroke="#38bdf8" fill="rgba(56,189,248,0.25)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <div className="space-y-3 mt-4">
              {recentActivity.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/8 bg-slate-950/50 p-4">
                  <div className="text-sm text-white">{item.text}</div>
                  <div className="text-xs text-slate-400 mt-1">{item.projectName} · {formatDate(item.time)}</div>
                </div>
              ))}
              {recentActivity.length === 0 && <p className="text-sm text-slate-400">No activity yet.</p>}
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
                  ? "border-sky-400/40 bg-sky-500/10"
                  : "border-white/10 bg-slate-900/70 hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-white">{project.name}</div>
                  <div className="text-sm text-slate-400 mt-1">
                    Manager: {project.manager.name} · Section: {project.section.name}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${statusTone(project.status)}`}>{formatStatus(project.status)}</span>
              </div>
              {project.description && <p className="text-sm text-slate-300 mt-3">{project.description}</p>}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Deadline: {formatDate(project.deadline)}</span>
                <span>{project.progress}% complete</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-cyan-400" style={{ width: `${project.progress}%` }} />
              </div>
            </button>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          {!selectedProject ? (
            <p className="text-sm text-slate-400">No project selected.</p>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white">{selectedProject.name}</h2>
              <p className="text-sm text-slate-400 mt-1">{selectedProject.description || "No project description yet."}</p>
              <div className="grid gap-3 mt-5 md:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Budget</div>
                  <div className="mt-2 text-sm text-white">{selectedProject.budget || "Not set"}</div>
                </div>
                <div className="rounded-xl border border-white/8 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Deadline</div>
                  <div className="mt-2 text-sm text-white">{formatDate(selectedProject.deadline)}</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Task Feed</h3>
                  <span className="text-xs text-slate-400">{selectedProject.tasks.length} linked tasks</span>
                </div>
                <div className="space-y-3 mt-4">
                  {selectedProject.tasks.map((task) => (
                    <div key={task.id} className="rounded-xl border border-white/8 bg-slate-950/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-white">{task.title}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            Assigned to {task.assignee?.name || "Unknown"} · Due {formatDate(task.deadline)}
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs ${statusTone(task.status)}`}>{formatStatus(task.status)}</span>
                      </div>
                    </div>
                  ))}
                  {selectedProject.tasks.length === 0 && <p className="text-sm text-slate-400">No tasks linked yet.</p>}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white">Comment Thread</h3>
                <div className="space-y-3 mt-4">
                  {selectedProject.comments.map((comment) => (
                    <div key={comment.id} className="rounded-xl border border-white/8 bg-slate-950/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-white">
                          {comment.author.name}
                          <span className="ml-2 text-xs text-slate-400">{formatStatus(comment.author.role)}</span>
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(comment.createdAt)}</div>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{comment.message}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    placeholder="Share feedback or request changes..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                  />
                  <button
                    onClick={addComment}
                    disabled={commentSaving}
                    className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
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
          <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-white">{item.taskName}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {item.projectName} · Submitted by {item.submittedBy} · {formatDate(item.uploadDate)}
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${statusTone(item.status)}`}>{formatStatus(item.status)}</span>
            </div>
            {item.evidenceUrl && (
              <a href={`http://localhost:5000${item.evidenceUrl}`} target="_blank" rel="noreferrer" className="inline-block mt-4 text-sm text-sky-300 hover:text-sky-200">
                Open {item.type.toLowerCase()} evidence
              </a>
            )}
          </div>
        ))}
        {deliverables.length === 0 && <p className="text-sm text-slate-400">No deliverables uploaded yet.</p>}
      </div>
    );
  }

  function renderReports() {
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">Progress by Project</h2>
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectChartData}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16 }} />
                <Area type="monotone" dataKey="progress" stroke="#38bdf8" fill="rgba(56,189,248,0.25)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">Completed vs Open Tasks</h2>
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16 }} />
                <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="open" fill="#f59e0b" radius={[6, 6, 0, 0]} />
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
          <div key={notification.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs text-sky-300">{formatStatus(notification.type)}</span>
              <span className="text-xs text-slate-500">{formatDate(notification.createdAt)}</span>
            </div>
            <p className="mt-3 text-sm text-slate-200">{notification.message}</p>
          </div>
        ))}
        {notifications.length === 0 && <p className="text-sm text-slate-400">No notifications yet.</p>}
      </div>
    );
  }

  function renderProfile() {
    return (
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-300 text-2xl font-bold text-slate-950">
            {clientProfile.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="mt-4 text-center">
            <h2 className="text-xl font-semibold text-white">{clientProfile.name}</h2>
            <p className="mt-1 text-sm text-slate-400">Client Portal</p>
          </div>

          <div className="mt-6 space-y-3">
            {[
              ["Email", clientProfile.email],
              ["Joined", formatDate(clientProfile.joined)],
              ["Linked Projects", summary.total],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/8 bg-slate-950/50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
                <div className="mt-1 text-sm text-white">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <StatCard label="Projects" value={summary.total} subtext="Scoped to this client account" accent="bg-sky-400" />
          <StatCard label="Deliverables" value={deliverables.length} subtext="Evidence files shared with you" accent="bg-emerald-400" />
          <StatCard label="Unread Notifications" value={notifications.filter((item) => !item.read).length} subtext="Recent updates awaiting review" accent="bg-cyan-400" />
        </section>
      </div>
    );
  }

  const pageTitle = navItems.find((item) => item.id === activePage)?.label || "Dashboard";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 px-6 py-6">
            <div className="text-2xl font-bold text-slate-900">Client<span className="text-cyan-500">View</span></div>
            <p className="mt-1 text-sm text-slate-500">Connected to live project data</p>
          </div>

          <div className="px-4 py-5 lg:flex-1">
            <div className="mb-3 px-3 text-xs uppercase tracking-[0.25em] text-slate-400">Navigation</div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition ${
                    activePage === item.id ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === "notifications" && notifications.length > 0 && (
                    <span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs text-white">{notifications.length}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="px-4 pb-6 lg:mt-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-900">{clientProfile.name}</div>
              <div className="text-xs text-slate-500">{clientProfile.email}</div>
            </div>
            <button
              onClick={signOut}
              className="mt-3 w-full text-left text-xs text-slate-500 hover:text-red-500 transition py-1"
            >
              Sign out →
            </button>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-600">Client Portal</div>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">{pageTitle}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {selectedProject ? `Currently focused on ${selectedProject.name}` : "Viewing all linked projects"}
              </p>
            </div>
          </div>

          {error && <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

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
