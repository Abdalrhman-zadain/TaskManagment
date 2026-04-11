import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import TaskCard from "../components/TaskCard";
import api from "../api/client";

export default function ManagerDashboard() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith("ar");
  const tx = (ar, en) => (isArabic ? ar : en);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [projectClientFilter, setProjectClientFilter] = useState("ALL");
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [t, p, u] = await Promise.all([
          api.get("/tasks"),
          api.get("/projects"),
          api.get("/users"),
        ]);
        setTasks(t.data);
        setProjects(p.data);
        setTeam(u.data.filter((member) => member.role === "EMPLOYEE"));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function markDone(taskId) {
    try {
      await api.patch(`/tasks/${taskId}/done`);
      const res = await api.get("/tasks");
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  const done = tasks.filter((task) => task.status === "DONE").length;
  const progress = tasks.filter((task) => ["TODO", "IN_PROGRESS"].includes(task.status)).length;
  const overdue = tasks.filter(
    (task) => new Date(task.deadline) < new Date() && task.status !== "DONE",
  );

  const filtered =
    filter === "ALL"
      ? tasks
      : filter === "IN_PROGRESS"
        ? tasks.filter((task) => task.status === "IN_PROGRESS" || task.status === "TODO")
        : filter === "PENDING_APPROVAL"
          ? tasks.filter((task) => task.status === "PENDING_APPROVAL")
          : filter === "DONE"
            ? tasks.filter((task) => task.status === "DONE")
            : overdue;

  const managerProjects = projects.filter((project) => project.manager?.id === user.id);

  function getProjectProgress(project) {
    const totalTasks = project.tasks?.length || 0;
    const doneTasks = project.tasks?.filter((task) => task.status === "DONE").length || 0;
    return totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  }

  function getProjectStatus(project) {
    if (project.status === "COMPLETED") return "COMPLETED";
    if (project.deadline && new Date(project.deadline) < new Date()) return "DELAYED";
    return "ACTIVE";
  }

  function displayProjectStatus(status) {
    if (status === "ACTIVE") return tx("نشط", "ACTIVE");
    if (status === "COMPLETED") return tx("مكتمل", "COMPLETED");
    return tx("متأخر", "DELAYED");
  }

  function displayTaskFilter(filterKey) {
    if (filterKey === "IN_PROGRESS") return tx("بانتظار التنفيذ", "Waiting Response");
    if (filterKey === "PENDING_APPROVAL") return tx("بانتظار المراجعة", "Pending Review");
    if (filterKey === "DONE") return tx("مكتمل", "Done");
    if (filterKey === "OVERDUE") return tx("متأخر", "Overdue");
    return tx("الكل", "All");
  }

  const projectClients = Array.from(
    new Map(
      managerProjects
        .filter((project) => project.client?.name)
        .map((project) => [project.client.id, project.client]),
    ).values(),
  );

  const filteredProjects = managerProjects.filter((project) => {
    const matchesStatus = projectFilter === "ALL" || getProjectStatus(project) === projectFilter;
    const matchesClient =
      projectClientFilter === "ALL" || String(project.client?.id) === projectClientFilter;
    return matchesStatus && matchesClient;
  });

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        {tx("جارٍ التحميل...", "Loading...")}
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role="Manager" />
      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <h1 className="page-title">{tx("لوحة القسم", "Section Dashboard")}</h1>
            <p className="page-subtitle">
              {new Date().toLocaleDateString(isArabic ? "ar-EG" : "en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={() => navigate("/tasks/new")}
            className="btn-primary px-4 py-2 text-sm font-medium"
          >
            + {tx("تعيين مهمة", "Assign Task")}
          </button>
        </div>

        <div className="mb-7 grid grid-cols-4 gap-4">
          <StatCard
            label={tx("مهام القسم", "Section Tasks")}
            value={tasks.length}
            sub={isArabic ? `${team.length} أعضاء` : `${team.length} members`}
            color="teal"
          />
          <StatCard
            label={tx("مكتملة", "Completed")}
            value={done}
            sub={
              isArabic
                ? `نسبة ${tasks.length ? Math.round((done / tasks.length) * 100) : 0}%`
                : `${tasks.length ? Math.round((done / tasks.length) * 100) : 0}% rate`
            }
            color="green"
          />
          <StatCard
            label={tx("قيد التنفيذ", "In Progress")}
            value={progress}
            sub={tx("نشطة الآن", "Active now")}
            color="amber"
          />
          <StatCard
            label={tx("متأخرة", "Overdue")}
            value={overdue.length}
            sub={
              overdue.length > 0
                ? tx("تحتاج متابعة", "Needs attention")
                : tx("الوضع ممتاز", "All clear")
            }
            color={overdue.length > 0 ? "red" : "green"}
          />
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 flex flex-col gap-5">
            {overdue.length > 0 && (
              <div className="app-panel p-4">
                <h2 className="mb-3 text-sm font-bold text-rose-600">
                  {tx("المهام المتأخرة", "Overdue Tasks")}
                </h2>
                {overdue.map((task) => (
                  <div key={task.id} className="mb-2 flex gap-2.5 last:mb-0">
                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{task.title}</div>
                      <div className="text-xs text-slate-500">
                        {task.assignee?.name} ·{" "}
                        {isArabic
                          ? `متأخرة ${Math.round((new Date() - new Date(task.deadline)) / 86400000)} يوم`
                          : `${Math.round((new Date() - new Date(task.deadline)) / 86400000)} days overdue`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="app-panel p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">{tx("المشاريع", "Projects")}</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={projectClientFilter}
                    onChange={(e) => setProjectClientFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 outline-none transition focus:border-[#1275e2] focus:bg-white"
                  >
                    <option value="ALL">{tx("كل العملاء", "All Clients")}</option>
                    {projectClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
                    {["ALL", "ACTIVE", "COMPLETED", "DELAYED"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setProjectFilter(status)}
                        className={`rounded-md px-3 py-1 text-[10px] font-medium transition ${
                          projectFilter === status
                            ? "bg-[#1275e2] text-white"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {status === "ALL"
                          ? tx("الكل", "All")
                          : status === "ACTIVE"
                            ? tx("نشط", "Active")
                            : status === "COMPLETED"
                              ? tx("مكتمل", "Completed")
                              : tx("متأخر", "Delayed")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {filteredProjects.map((project) => {
                  const progressValue = getProjectProgress(project);
                  const status = getProjectStatus(project);
                  const statusClasses =
                    status === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-700"
                      : status === "DELAYED"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-blue-50 text-blue-700";

                  return (
                    <div key={project.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{project.name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {tx("العميل:", "Client:")} {project.client?.name || tx("غير معروف", "Unknown")}
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${statusClasses}`}>
                          {displayProjectStatus(status)}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                          <span>{tx("التقدم", "Progress")}</span>
                          <span>{progressValue}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-[#1275e2]" style={{ width: `${progressValue}%` }} />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                        <span>
                          {tx("الموعد النهائي:", "Deadline:")}{" "}
                          <strong className="text-slate-900">
                            {project.deadline
                              ? new Date(project.deadline).toLocaleDateString(isArabic ? "ar-EG" : "en-GB")
                              : tx("غير محدد", "Not set")}
                          </strong>
                        </span>
                        <span>
                          {tx("المهام:", "Tasks:")} <strong className="text-slate-900">{project.tasks?.length || 0}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-500">
                    {tx("لا توجد مشاريع في هذا التصنيف", "No projects found in this category")}
                  </div>
                )}
              </div>
            </div>

            <div className="app-panel p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                  {["ALL", "IN_PROGRESS", "PENDING_APPROVAL", "DONE", "OVERDUE"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        filter === f ? "bg-[#1275e2] text-white" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {displayTaskFilter(f)}
                    </button>
                  ))}
                </div>
                <button onClick={() => navigate("/tasks")} className="ml-2 text-xs font-medium text-[#1275e2]">
                  {isArabic ? "عرض الكل ←" : "View all →"}
                </button>
              </div>
              {filtered.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">{tx("لا توجد مهام هنا", "No tasks here")}</p>
              ) : (
                filtered.map((task) => <TaskCard key={task.id} task={task} onMarkDone={markDone} />)
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="app-panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">{tx("فريقي", "My Team")}</h2>
                <button onClick={() => navigate("/users")} className="text-xs font-medium text-[#1275e2]">
                  {isArabic ? "الفريق كامل ←" : "Full team →"}
                </button>
              </div>
              {team.map((emp) => (
                <div key={emp.id} className="flex items-center gap-2.5 border-b border-slate-100 py-2.5 last:border-0">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1275e2]">
                    {emp.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{emp.name}</div>
                    <div className="mt-0.5 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={`text-xs ${s <= emp.stars ? "text-yellow-500" : "text-slate-200"}`}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">{emp.onTimeCount} ✓</div>
                    <div
                      className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                        emp.level === "GOLD"
                          ? "bg-yellow-50 text-yellow-700"
                          : emp.level === "SILVER"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {emp.level}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="app-panel p-4">
              <h2 className="mb-4 text-sm font-bold text-slate-900">{tx("تقدم القسم", "Section Progress")}</h2>
              {[
                {
                  label: tx("نسبة الإنجاز", "Completion"),
                  value: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
                  color: "bg-teal-400",
                },
                {
                  label: tx("نسبة الالتزام بالموعد", "On-time rate"),
                  value: tasks.length
                    ? Math.round((tasks.filter((task) => task.score?.isOnTime).length / tasks.length) * 100)
                    : 0,
                  color: "bg-green-400",
                },
              ].map((item) => (
                <div key={item.label} className="mb-3 last:mb-0">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-slate-500">{item.label}</span>
                    <strong className="text-slate-900">{item.value}%</strong>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

