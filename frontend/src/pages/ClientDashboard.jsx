import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

const baseNavItems = ["home", "projects", "deliverables", "reports", "notifications", "profile"];

const copy = {
  en: {
    nav: {
      home: "Dashboard",
      projects: "Projects",
      deliverables: "Deliverables",
      reports: "Reports",
      notifications: "Notifications",
      profile: "Profile",
    },
    language: "Language",
    clientPortal: "Client Portal",
    connected: "Connected to live project data",
    navigation: "Navigation",
    signOut: "Sign out →",
    loading: "Loading client dashboard...",
    loadError: "Failed to load client dashboard",
    notSet: "Not set",
    status: {
      COMPLETED: "Completed",
      APPROVED: "Approved",
      AT_RISK: "At Risk",
      REJECTED: "Rejected",
      PENDING: "Pending",
      TODO: "To Do",
      IN_PROGRESS: "In Progress",
      DONE: "Done",
      PENDING_APPROVAL: "Pending Approval",
      CEO: "CEO",
      MANAGER: "Manager",
      EMPLOYEE: "Employee",
      CLIENT: "Client",
      task_assigned: "Task Assigned",
      task_done: "Task Done",
      task_approved: "Task Approved",
      task_rejected: "Task Rejected",
      task_pending_approval: "Pending Approval",
      task_updated: "Task Updated",
      task_status_changed: "Status Updated",
      points_awarded: "Points Awarded",
      deadline_missed: "Deadline Missed",
      level_up: "Level Up",
    },
  },
  ar: {
    nav: {
      home: "لوحة التحكم",
      projects: "المشاريع",
      deliverables: "التسليمات",
      reports: "التقارير",
      notifications: "الإشعارات",
      profile: "الملف الشخصي",
    },
    language: "اللغة",
    clientPortal: "بوابة العميل",
    connected: "متصل ببيانات المشروع المباشرة",
    navigation: "التنقل",
    signOut: "تسجيل الخروج ←",
    loading: "جاري تحميل لوحة العميل...",
    loadError: "فشل تحميل لوحة العميل",
    notSet: "غير محدد",
    status: {
      COMPLETED: "مكتمل",
      APPROVED: "موافق عليه",
      AT_RISK: "معرض للخطر",
      REJECTED: "مرفوض",
      PENDING: "قيد الانتظار",
      TODO: "للعمل",
      IN_PROGRESS: "قيد التنفيذ",
      DONE: "منجز",
      PENDING_APPROVAL: "بانتظار الموافقة",
      CEO: "المدير التنفيذي",
      MANAGER: "مدير",
      EMPLOYEE: "موظف",
      CLIENT: "عميل",
      task_assigned: "تم إسناد مهمة",
      task_done: "تم إنجاز المهمة",
      task_approved: "تمت الموافقة على المهمة",
      task_rejected: "تم رفض المهمة",
      task_pending_approval: "بانتظار الموافقة",
      task_updated: "تم تحديث المهمة",
      task_status_changed: "تم تحديث الحالة",
      points_awarded: "تم منح نقاط",
      deadline_missed: "تم تجاوز الموعد النهائي",
      level_up: "ترقية مستوى",
    },
  },
};

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
  const [language, setLanguage] = useState(localStorage.getItem("clientDashboardLanguage") || "en");
  const [activePage, setActivePage] = useState("home");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [homeProjectStatusFilter, setHomeProjectStatusFilter] = useState("ALL");
  const [homeDeliverableProjectFilter, setHomeDeliverableProjectFilter] = useState("ALL");
  const [homeDeliverableStatusFilter, setHomeDeliverableStatusFilter] = useState("ALL");
  const [deliverablesProjectFilter, setDeliverablesProjectFilter] = useState("ALL");
  const [actionTaskId, setActionTaskId] = useState(null);
  const isArabic = language === "ar";
  const t = copy[language];

  function formatDate(date) {
    if (!date) return t.notSet;
    return new Date(date).toLocaleDateString(isArabic ? "ar" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatStatus(status) {
    return t.status[status] || String(status).replaceAll("_", " ");
  }

  function getHomeProjectStatus(project) {
    if (project.status === "COMPLETED" || project.progress === 100) return "COMPLETED";
    if (project.deadline && new Date(project.deadline) < new Date()) return "DELAYED";
    if (project.status === "AT_RISK") return "AT_RISK";
    return "ON_TRACK";
  }

  function getDeliverableBadge(status) {
    if (status === "APPROVED") return isArabic ? "تمت الموافقة" : "Approved";
    if (status === "REJECTED") return isArabic ? "مطلوب تعديلات" : "Changes Requested";
    return isArabic ? "بانتظار المراجعة" : "Pending Review";
  }

  function getDeliverableTone(status) {
    if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  useEffect(() => {
    localStorage.setItem("clientDashboardLanguage", language);
  }, [language]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await api.get("/client/dashboard");
      setDashboard(res.data);
      if (!selectedProjectId && res.data.projects[0]) {
        setSelectedProjectId(res.data.projects[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.error || t.loadError);
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
  const navItems = baseNavItems.map((id) => ({ id, label: t.nav[id] }));

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
                  ? (isArabic ? `تمت الموافقة على ${task.title}` : `${task.title} was approved`)
                  : task.evidenceUrl
                    ? (isArabic ? `يوجد تسليم جديد جاهز لـ ${task.title}` : `${task.title} has a new deliverable ready`)
                    : (isArabic ? `${task.title} قيد التنفيذ` : `${task.title} is in progress`),
              time: task.evidenceUploadedAt || task.completedAt || task.createdAt || project.createdAt,
            })),
        )
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 6),
    [projects, isArabic],
  );

  const homeFilteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        if (homeProjectStatusFilter === "ALL") return true;
        return getHomeProjectStatus(project) === homeProjectStatusFilter;
      }),
    [projects, homeProjectStatusFilter],
  );

  const homeFilteredDeliverables = useMemo(
    () =>
      deliverables.filter((item) => {
        const matchesProject =
          homeDeliverableProjectFilter === "ALL" || String(item.projectId) === homeDeliverableProjectFilter;
        const matchesStatus =
          homeDeliverableStatusFilter === "ALL" || item.status === homeDeliverableStatusFilter;
        return matchesProject && matchesStatus;
      }),
    [deliverables, homeDeliverableProjectFilter, homeDeliverableStatusFilter],
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
      setError(err.response?.data?.error || t.loadError);
    } finally {
      setCommentSaving(false);
    }
  }

  async function reviewDeliverable(taskId, action) {
    setActionTaskId(taskId);
    setError("");
    try {
      if (action === "approve") {
        await api.patch(`/client/deliverables/${taskId}/approve`);
      } else {
        await api.patch(`/client/deliverables/${taskId}/request-changes`, {
          comment: "Changes requested by client",
        });
      }
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.error || t.loadError);
    } finally {
      setActionTaskId(null);
    }
  }

  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  if (loading) {
    return <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">{t.loading}</div>;
  }

  if (error && !dashboard) {
    return <div className="app-shell flex min-h-screen items-center justify-center text-rose-600">{error}</div>;
  }

  function renderHome() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ClientStatCard label={isArabic ? "المشاريع" : "Projects"} value={summary.total} subtext={isArabic ? "مرئية لهذا العميل" : "Visible to this client"} accent="bg-[#1275e2]" />
          <ClientStatCard label={isArabic ? "المكتملة" : "Completed"} value={summary.completed} subtext={isArabic ? "أغلقت بنجاح" : "Closed successfully"} accent="bg-emerald-400" />
          <ClientStatCard label={isArabic ? "المعرضة للخطر" : "At Risk"} value={summary.atRisk} subtext={isArabic ? "تحتاج إلى اهتمام إضافي" : "Needs extra attention"} accent="bg-[#c55b00]" />
          <ClientStatCard label={isArabic ? "متوسط التقدم" : "Avg Progress"} value={`${summary.avgProgress}%`} subtext={isArabic ? "عبر جميع الأعمال المرتبطة" : "Across all linked work"} accent="bg-[#5f78a3]" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="app-panel p-5">
            <h2 className="text-lg font-semibold text-slate-900">{isArabic ? "تقدم المشروع" : "Project Progress"}</h2>
            <p className="mt-1 text-sm text-slate-500">{isArabic ? "تقدم حقيقي محسوب من مهام المشروع المرتبطة." : "Real progress calculated from linked project tasks."}</p>
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
            <h2 className="text-lg font-semibold text-slate-900">{isArabic ? "أحدث النشاطات" : "Recent Activity"}</h2>
            <div className="mt-4 space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="text-sm text-slate-800">{item.text}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.projectName} · {formatDate(item.time)}</div>
                </div>
              ))}
              {recentActivity.length === 0 && <p className="text-sm text-slate-500">{isArabic ? "لا يوجد نشاط بعد." : "No activity yet."}</p>}
            </div>
          </section>
        </div>

        <section className="app-panel p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{isArabic ? "المشاريع" : "Projects"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isArabic ? "جميع المشاريع المرتبطة بحساب هذا العميل." : "All projects linked to this client account."}
              </p>
            </div>
            <select
              value={homeProjectStatusFilter}
              onChange={(e) => setHomeProjectStatusFilter(e.target.value)}
              className="app-input w-full md:w-56"
            >
              <option value="ALL">{isArabic ? "كل الحالات" : "All Statuses"}</option>
              <option value="ON_TRACK">{isArabic ? "على المسار" : "On Track"}</option>
              <option value="AT_RISK">{isArabic ? "معرض للخطر" : "At Risk"}</option>
              <option value="COMPLETED">{isArabic ? "مكتمل" : "Completed"}</option>
              <option value="DELAYED">{isArabic ? "متأخر" : "Delayed"}</option>
            </select>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {homeFilteredProjects.map((project) => {
              const derivedStatus = getHomeProjectStatus(project);
              const deliverableCount = project.tasks.filter((task) => task.evidenceUrl).length;
              const statusLabel =
                derivedStatus === "ON_TRACK"
                  ? isArabic ? "على المسار" : "On Track"
                  : derivedStatus === "DELAYED"
                    ? isArabic ? "متأخر" : "Delayed"
                    : formatStatus(derivedStatus);
              const statusClasses =
                derivedStatus === "COMPLETED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : derivedStatus === "AT_RISK"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : derivedStatus === "DELAYED"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-blue-200 bg-blue-50 text-blue-700";

              return (
                <div key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{project.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {isArabic ? "المدير" : "Manager"}: {project.manager.name}
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusClasses}`}>{statusLabel}</span>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{isArabic ? "التقدم" : "Progress"}</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-[#1275e2]" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{isArabic ? "الموعد النهائي" : "Deadline"}</div>
                      <div className="mt-2 text-sm text-slate-900">{formatDate(project.deadline)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{isArabic ? "التسليمات" : "Deliverables"}</div>
                      <div className="mt-2 text-sm text-slate-900">{deliverableCount} {isArabic ? "مرفوع" : "submitted"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {homeFilteredProjects.length === 0 && (
              <p className="text-sm text-slate-500">{isArabic ? "لا توجد مشاريع ضمن هذا الفلتر." : "No projects match this filter."}</p>
            )}
          </div>
        </section>

        <section className="app-panel p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{isArabic ? "التسليمات" : "Deliverables"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isArabic ? "جميع ملفات الإثبات المرسلة عبر المشاريع المرتبطة." : "All submitted evidence across linked projects."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={homeDeliverableProjectFilter}
                onChange={(e) => setHomeDeliverableProjectFilter(e.target.value)}
                className="app-input w-full sm:w-56"
              >
                <option value="ALL">{isArabic ? "كل المشاريع" : "All Projects"}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select
                value={homeDeliverableStatusFilter}
                onChange={(e) => setHomeDeliverableStatusFilter(e.target.value)}
                className="app-input w-full sm:w-56"
              >
                <option value="ALL">{isArabic ? "كل الحالات" : "All Statuses"}</option>
                <option value="PENDING">{isArabic ? "بانتظار المراجعة" : "Pending Review"}</option>
                <option value="APPROVED">{isArabic ? "تمت الموافقة" : "Approved"}</option>
                <option value="REJECTED">{isArabic ? "مطلوب تعديلات" : "Changes Requested"}</option>
              </select>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {homeFilteredDeliverables.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.taskName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.projectName} · {isArabic ? "تم الإرسال بواسطة" : "Submitted by"} {item.submittedBy}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {isArabic ? "تاريخ الإرسال" : "Submitted"}: {formatDate(item.uploadDate)}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 xl:items-end">
                    <span className={`rounded-full border px-3 py-1 text-xs ${getDeliverableTone(item.status)}`}>
                      {getDeliverableBadge(item.status)}
                    </span>
                    {item.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => reviewDeliverable(item.id, "approve")}
                          disabled={actionTaskId === item.id}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionTaskId === item.id ? (isArabic ? "جارٍ الحفظ..." : "Saving...") : (isArabic ? "موافقة" : "Approve")}
                        </button>
                        <button
                          onClick={() => reviewDeliverable(item.id, "request-changes")}
                          disabled={actionTaskId === item.id}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isArabic ? "طلب تعديلات" : "Request Changes"}
                        </button>
                      </div>
                    )}
                    {item.evidenceUrl && (
                      <a
                        href={`http://localhost:5000${item.evidenceUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-[#1275e2] hover:text-[#0f63c0]"
                      >
                        {isArabic ? "فتح ملف الإثبات" : "Open evidence"}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {homeFilteredDeliverables.length === 0 && (
              <p className="text-sm text-slate-500">{isArabic ? "لا توجد تسليمات ضمن هذه الفلاتر." : "No deliverables match these filters."}</p>
            )}
          </div>
        </section>
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
                    {isArabic ? "المدير" : "Manager"}: {project.manager.name} · {isArabic ? "القسم" : "Section"}: {project.section.name}
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(project.status)}`}>{formatStatus(project.status)}</span>
              </div>
              {project.description && <p className="mt-3 text-sm text-slate-600">{project.description}</p>}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>{isArabic ? "الموعد النهائي" : "Deadline"}: {formatDate(project.deadline)}</span>
                <span>{project.progress}% {isArabic ? "مكتمل" : "complete"}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-[#1275e2]" style={{ width: `${project.progress}%` }} />
              </div>
            </button>
          ))}
        </section>

        <section className="app-panel p-5">
          {!selectedProject ? (
            <p className="text-sm text-slate-500">{isArabic ? "لم يتم اختيار مشروع." : "No project selected."}</p>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-900">{selectedProject.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedProject.description || (isArabic ? "لا يوجد وصف للمشروع حتى الآن." : "No project description yet.")}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{isArabic ? "الميزانية" : "Budget"}</div>
                  <div className="mt-2 text-sm text-slate-900">{selectedProject.budget || t.notSet}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{isArabic ? "الموعد النهائي" : "Deadline"}</div>
                  <div className="mt-2 text-sm text-slate-900">{formatDate(selectedProject.deadline)}</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">{isArabic ? "سجل المهام" : "Task Feed"}</h3>
                  <span className="text-xs text-slate-500">{selectedProject.tasks.length} {isArabic ? "مهام مرتبطة" : "linked tasks"}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedProject.tasks.map((task) => (
                    <div key={task.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{task.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {isArabic ? "مُسند إلى" : "Assigned to"} {task.assignee?.name || (isArabic ? "غير معروف" : "Unknown")} · {isArabic ? "ينتهي في" : "Due"} {formatDate(task.deadline)}
                          </div>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(task.status)}`}>{formatStatus(task.status)}</span>
                      </div>
                    </div>
                  ))}
                  {selectedProject.tasks.length === 0 && <p className="text-sm text-slate-500">{isArabic ? "لا توجد مهام مرتبطة بعد." : "No tasks linked yet."}</p>}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-900">{isArabic ? "سجل التعليقات" : "Comment Thread"}</h3>
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
                    placeholder={isArabic ? "شارك ملاحظاتك أو اطلب تعديلات..." : "Share feedback or request changes..."}
                    className="app-input"
                  />
                  <button
                    onClick={addComment}
                    disabled={commentSaving}
                    className="btn-primary px-4 py-2 text-sm font-medium"
                  >
                    {commentSaving ? (isArabic ? "جاري الإرسال..." : "Posting...") : (isArabic ? "إضافة تعليق" : "Add Comment")}
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
    const filteredDeliverables = deliverables.filter((item) => {
      if (deliverablesProjectFilter === "ALL") return true;
      return String(item.projectId) === deliverablesProjectFilter;
    });

    return (
      <div className="space-y-4">
        <div className="app-panel p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{isArabic ? "تصفية حسب المشروع" : "Filter by Project"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isArabic ? "اعرض جميع التسليمات أو تسليمات مشروع محدد." : "Show all deliverables or only one project's deliverables."}
              </p>
            </div>
            <select
              value={deliverablesProjectFilter}
              onChange={(e) => setDeliverablesProjectFilter(e.target.value)}
              className="app-input w-full sm:w-64"
            >
              <option value="ALL">{isArabic ? "كل المشاريع" : "All"}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredDeliverables.map((item) => (
          <div key={item.id} className="app-panel p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.taskName}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {item.projectName} · {isArabic ? "تم الإرسال بواسطة" : "Submitted by"} {item.submittedBy} · {formatDate(item.uploadDate)}
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
                {isArabic ? "فتح" : "Open"} {item.type.toLowerCase()} evidence
              </a>
            )}
          </div>
        ))}
        {filteredDeliverables.length === 0 && <p className="text-sm text-slate-500">{isArabic ? "لا توجد تسليمات مرفوعة بعد." : "No deliverables uploaded yet."}</p>}
      </div>
    );
  }

  function renderReports() {
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="app-panel p-5">
          <h2 className="text-lg font-semibold text-slate-900">{isArabic ? "التقدم حسب المشروع" : "Progress by Project"}</h2>
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
          <h2 className="text-lg font-semibold text-slate-900">{isArabic ? "المهام المكتملة مقابل المفتوحة" : "Completed vs Open Tasks"}</h2>
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
        {notifications.length === 0 && <p className="text-sm text-slate-500">{isArabic ? "لا توجد إشعارات بعد." : "No notifications yet."}</p>}
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
            <p className="mt-1 text-sm text-slate-500">{t.clientPortal}</p>
          </div>

          <div className="mt-6 space-y-3">
            {[
              [isArabic ? "البريد الإلكتروني" : "Email", clientProfile.email],
              [isArabic ? "تاريخ الانضمام" : "Joined", formatDate(clientProfile.joined)],
              [isArabic ? "المشاريع المرتبطة" : "Linked Projects", summary.total],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
                <div className="mt-1 text-sm text-slate-900">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <ClientStatCard label={isArabic ? "المشاريع" : "Projects"} value={summary.total} subtext={isArabic ? "ضمن نطاق حساب هذا العميل" : "Scoped to this client account"} accent="bg-[#1275e2]" />
          <ClientStatCard label={isArabic ? "التسليمات" : "Deliverables"} value={deliverables.length} subtext={isArabic ? "ملفات الإثبات المشتركة معك" : "Evidence files shared with you"} accent="bg-emerald-400" />
          <ClientStatCard
            label={isArabic ? "الإشعارات غير المقروءة" : "Unread Notifications"}
            value={notifications.filter((item) => !item.read).length}
            subtext={isArabic ? "تحديثات حديثة بانتظار المراجعة" : "Recent updates awaiting review"}
            accent="bg-[#5f78a3]"
          />
        </section>
      </div>
    );
  }

  const pageTitle = navItems.find((item) => item.id === activePage)?.label || t.nav.home;

  return (
    <div className="app-shell min-h-screen" dir={isArabic ? "rtl" : "ltr"}>
      <div className={`flex min-h-screen flex-col ${isArabic ? "lg:flex-row-reverse" : "lg:flex-row"}`}>
        <aside className="border-b border-slate-200 bg-[#fbfdff] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:border-r lg:border-b-0">
          <div className="border-b border-slate-200 px-6 py-6">
            <div className="text-2xl font-bold text-slate-900">
              {isArabic ? "عرض العميل" : <><span>Client</span><span className="text-[#1275e2]">View</span></>}
            </div>
            <p className="mt-1 text-sm text-slate-500">{t.connected}</p>
          </div>

          <div className="px-4 py-5 lg:flex-1">
            <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t.language}</span>
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  onClick={() => setLanguage("en")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${language === "en" ? "bg-[#1275e2] text-white" : "text-slate-600"}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("ar")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${language === "ar" ? "bg-[#1275e2] text-white" : "text-slate-600"}`}
                >
                  AR
                </button>
              </div>
            </div>
            <div className="mb-3 px-3 text-xs uppercase tracking-[0.25em] text-slate-400">{t.navigation}</div>
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
              className={`mt-3 w-full py-1 text-xs text-slate-500 transition hover:text-[#c55b00] ${isArabic ? "text-right" : "text-left"}`}
            >
              {t.signOut}
            </button>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-[#5f78a3]">{t.clientPortal}</div>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">{pageTitle}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {selectedProject
                  ? (isArabic ? `التركيز الحالي على ${selectedProject.name}` : `Currently focused on ${selectedProject.name}`)
                  : (isArabic ? "عرض جميع المشاريع المرتبطة" : "Viewing all linked projects")}
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
