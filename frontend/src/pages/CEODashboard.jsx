import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import TaskCard from "../components/TaskCard";
import api from "../api/client";

export default function CEODashboard() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [projectClientFilter, setProjectClientFilter] = useState("ALL");
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [t, p, s, u] = await Promise.all([
          api.get("/tasks"),
          api.get("/projects"),
          api.get("/sections"),
          api.get("/users"),
        ]);
        setTasks(t.data);
        setProjects(p.data);
        setSections(s.data);
        setUsers(u.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function deleteSection(sectionId) {
    if (
      !window.confirm(
        "Are you sure? This will delete the section and all associated data.",
      )
    ) {
      return;
    }
    try {
      await api.delete(`/sections/${sectionId}`);
      setSections(sections.filter((s) => s.id !== sectionId));
    } catch (err) {
      console.error("Failed to delete section:", err);
      alert("Failed to delete section");
    }
  }

  const done = tasks.filter((t) => t.status === "DONE").length;
  const progress = tasks.filter((t) =>
    ["TODO", "IN_PROGRESS"].includes(t.status),
  ).length;
  const overdue = tasks.filter(
    (t) => new Date(t.deadline) < new Date() && t.status !== "DONE",
  ).length;
  const onTimeRate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const allPerformers = [...users]
    .filter((u) => u.role === "EMPLOYEE" || u.role === "MANAGER")
    .sort((a, b) => b.onTimeCount - a.onTimeCount);

  function getProjectProgress(project) {
    const totalTasks = project.tasks?.length || 0;
    const doneTasks =
      project.tasks?.filter((task) => task.status === "DONE").length || 0;
    return totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  }

  function getProjectStatus(project) {
    if (project.status === "COMPLETED") return "COMPLETED";
    if (project.deadline && new Date(project.deadline) < new Date())
      return "DELAYED";
    return "ACTIVE";
  }

  const projectClients = Array.from(
    new Map(
      projects
        .filter((project) => project.client?.name)
        .map((project) => [project.client.id, project.client]),
    ).values(),
  );

  const filteredProjects = projects.filter((project) => {
    const matchesStatus =
      projectFilter === "ALL" || getProjectStatus(project) === projectFilter;
    const matchesClient =
      projectClientFilter === "ALL" ||
      String(project.client?.id) === projectClientFilter;
    return matchesStatus && matchesClient;
  });

  const filteredTasks = tasks.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "IN_PROGRESS")
      return t.status === "IN_PROGRESS" || t.status === "TODO";
    if (filter === "PENDING_APPROVAL") return t.status === "PENDING_APPROVAL";
    if (filter === "DONE") return t.status === "DONE";
    if (filter === "OVERDUE")
      return new Date(t.deadline) < new Date() && t.status !== "DONE";
    return true;
  });

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="text-slate-500">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role="CEO" />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <h1 className="page-title">{t("dashboard.title")}</h1>
            <p className="page-subtitle">{new Date().toDateString()}</p>
          </div>
          <button
            onClick={() => navigate("/tasks/new")}
            className="btn-primary px-4 py-2 text-sm font-medium"
          >
            + {t("tasks.createNew")}
          </button>
        </div>

        <div className="mb-7 grid grid-cols-4 gap-4">
          <StatCard
            label={t("dashboard.completedTasks")}
            value={tasks.length}
            sub={`${sections.length} ${t("common.sections")}`}
            color="blue"
          />
          <StatCard
            label={t("dashboard.completedTasks")}
            value={done}
            sub={`${onTimeRate}% ${t("dashboard.onTimeRate")}`}
            color="green"
          />
          <StatCard
            label={t("dashboard.performance")}
            value={progress}
            sub={t("common.loading")}
            color="amber"
          />
          <StatCard
            label={t("tasks.pending")}
            value={overdue}
            sub={overdue > 0 ? t("common.error") : t("common.success")}
            color={overdue > 0 ? "red" : "green"}
          />
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 flex flex-col gap-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  {t("sections.title")}
                </h2>
                <button
                  onClick={() => navigate("/sections")}
                  className="text-xs font-medium text-[#1275e2]"
                >
                  {t("common.view")} →
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {sections.map((sec) => {
                  const secTasks = tasks.filter((t) => t.sectionId === sec.id);
                  const secDone = secTasks.filter(
                    (t) => t.status === "DONE",
                  ).length;
                  const secOverdue = secTasks.filter(
                    (t) =>
                      new Date(t.deadline) < new Date() && t.status !== "DONE",
                  ).length;
                  const pct = secTasks.length
                    ? Math.round((secDone / secTasks.length) * 100)
                    : 0;

                  return (
                    <div key={sec.id} className="app-panel p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <div className="h-2 w-2 rounded-full bg-teal-400" />
                          {sec.name}
                          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                            {t("projects.active")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">
                            {t("projects.manager")}:{" "}
                            {sec.manager?.name || "Unassigned"}
                          </span>
                          <button
                            onClick={() => deleteSection(sec.id)}
                            className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-teal-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-xs text-slate-500">
                          {pct}%
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>
                          <strong className="text-slate-900">
                            {secTasks.length}
                          </strong>{" "}
                          tasks
                        </span>
                        <span>
                          <strong className="text-slate-900">{secDone}</strong>{" "}
                          done
                        </span>
                        <span>
                          <strong
                            className={
                              secOverdue > 0
                                ? "text-rose-600"
                                : "text-slate-900"
                            }
                          >
                            {secOverdue}
                          </strong>{" "}
                          overdue
                        </span>
                        <span>
                          <strong className="text-slate-900">
                            {sec.members?.length || 0}
                          </strong>{" "}
                          members
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div
                  onClick={() => navigate("/sections")}
                  className="app-panel-muted flex cursor-pointer items-center gap-3 p-4 text-sm text-slate-500 transition hover:border-[#1275e2] hover:text-[#1275e2]"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-base">
                    +
                  </div>
                  Create a new section
                </div>
              </div>
            </div>

            <div className="app-panel p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Projects</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={projectClientFilter}
                    onChange={(e) => setProjectClientFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 outline-none transition focus:border-[#1275e2] focus:bg-white"
                  >
                    <option value="ALL">All Clients</option>
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
                        {status.charAt(0) + status.slice(1).toLowerCase()}
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
                    <div
                      key={project.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {project.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Client: {project.client?.name || "Unknown"} ·
                            Manager: {project.manager?.name || "Unassigned"}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-medium ${statusClasses}`}
                        >
                          {status}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                          <span>Progress</span>
                          <span>{progressValue}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-[#1275e2]"
                            style={{ width: `${progressValue}%` }}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                        <span>
                          Deadline:{" "}
                          <strong className="text-slate-900">
                            {project.deadline
                              ? new Date(project.deadline).toLocaleDateString()
                              : "Not set"}
                          </strong>
                        </span>
                        <span>
                          Tasks:{" "}
                          <strong className="text-slate-900">
                            {project.tasks?.length || 0}
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No projects found in this category
                  </div>
                )}
              </div>
            </div>

            <div className="app-panel p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Recent Tasks
                </h2>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
                  {[
                    "ALL",
                    "IN_PROGRESS",
                    "PENDING_APPROVAL",
                    "DONE",
                    "OVERDUE",
                  ].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-md px-3 py-1 text-[10px] font-medium transition ${
                        filter === f
                          ? "bg-[#1275e2] text-white"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {f === "IN_PROGRESS"
                        ? "Waiting Response"
                        : f === "PENDING_APPROVAL"
                          ? "Pending Review"
                          : f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => navigate("/tasks")}
                  className="ml-2 text-xs font-medium text-[#1275e2]"
                >
                  View all →
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {filteredTasks.slice(0, 10).map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {filteredTasks.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No tasks found in this category
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {overdue > 0 && (
              <div className="app-panel p-4">
                <h2 className="mb-3 text-sm font-bold text-rose-600">
                  Overdue Alerts
                </h2>
                {tasks
                  .filter(
                    (t) =>
                      new Date(t.deadline) < new Date() && t.status !== "DONE",
                  )
                  .slice(0, 4)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="mb-2 flex gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-2.5 last:mb-0"
                    >
                      <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {t.title}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {t.assignee?.name} · {t.section?.name}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="app-panel flex max-h-[500px] flex-col p-4">
              <div className="mb-3 flex shrink-0 items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Team Performance
                </h2>
                <button
                  onClick={() => navigate("/users")}
                  className="text-xs font-medium text-[#1275e2]"
                >
                  All users →
                </button>
              </div>
              <div className="-mr-2 overflow-y-auto pr-2">
                {allPerformers.map((emp, i) => (
                  <div
                    key={emp.id}
                    onClick={() => navigate(`/users/${emp.id}`)}
                    className="mx-[-0.5rem] flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2.5 transition hover:bg-slate-50"
                  >
                    <div
                      className={`w-5 text-center text-sm font-bold ${
                        i === 0
                          ? "text-yellow-500"
                          : i === 1
                            ? "text-slate-400"
                            : i === 2
                              ? "text-amber-700"
                              : "text-slate-400"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1275e2]">
                      {emp.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">
                        {emp.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {emp.role === "MANAGER" ? "Manager" : "Employee"} ·{" "}
                        {emp.section?.name || "No Section"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {emp.onTimeCount}
                      </div>
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
