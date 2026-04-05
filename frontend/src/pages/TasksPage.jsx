import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import TaskCard from "../components/TaskCard";
import api from "../api/client";

function roleLabel(user) {
  if (user.role === "CEO") return "CEO";
  if (user.role === "MANAGER") return "Manager";
  return "Employee";
}

export default function TasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [sectionFilter, setSectionFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [scoreFilter, setScoreFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/tasks");
        setTasks(res.data);
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
      alert(err.response?.data?.error || "Unable to mark task complete");
    }
  }

  const projectOptions = Array.from(
    new Map(
      tasks
        .filter((task) => task.project?.id && task.project?.name)
        .map((task) => [task.project.id, task.project]),
    ).values(),
  );

  const sectionOptions = Array.from(
    new Map(
      tasks
        .filter((task) => task.section?.id && task.section?.name)
        .map((task) => [task.section.id, task.section]),
    ).values(),
  );

  const assigneeOptions = Array.from(
    new Map(
      tasks
        .filter((task) => task.assignee?.id && task.assignee?.name)
        .map((task) => [task.assignee.id, task.assignee]),
    ).values(),
  );

  const filteredTasks = tasks.filter((t) => {
    const deadlineDate = t.deadline ? new Date(t.deadline) : null;
    const taskScore = t.score?.value;
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matchesStatus =
      filter === "ALL"
        ? true
        : filter === "IN_PROGRESS"
          ? t.status === "IN_PROGRESS" || t.status === "TODO"
          : filter === "PENDING_APPROVAL"
            ? t.status === "PENDING_APPROVAL"
            : filter === "DONE"
              ? t.status === "DONE"
              : filter === "OVERDUE"
                ? deadlineDate && deadlineDate < new Date() && t.status !== "DONE"
                : true;

    const matchesProject =
      projectFilter === "ALL" || String(t.project?.id || "") === projectFilter;
    const matchesSection =
      sectionFilter === "ALL" || String(t.section?.id || "") === sectionFilter;
    const matchesAssignee =
      assigneeFilter === "ALL" || String(t.assignee?.id || "") === assigneeFilter;
    const matchesScore =
      scoreFilter === "ALL" ||
      (scoreFilter === "HIGH" && taskScore >= 8 && taskScore <= 10) ||
      (scoreFilter === "MEDIUM" && taskScore >= 5 && taskScore <= 7) ||
      (scoreFilter === "LOW" && taskScore >= 0 && taskScore <= 4);
    const matchesFromDate = !fromDate || (deadlineDate && deadlineDate >= new Date(`${fromDate}T00:00:00`));
    const matchesToDate = !toDate || (deadlineDate && deadlineDate <= new Date(`${toDate}T23:59:59`));
    const matchesSearch = !normalizedSearch || t.title.toLowerCase().includes(normalizedSearch);

    return (
      matchesStatus &&
      matchesProject &&
      matchesSection &&
      matchesAssignee &&
      matchesScore &&
      matchesFromDate &&
      matchesToDate &&
      matchesSearch
    );
  });

  function clearFilters() {
    setFilter("ALL");
    setProjectFilter("ALL");
    setSectionFilter("ALL");
    setAssigneeFilter("ALL");
    setScoreFilter("ALL");
    setFromDate("");
    setToDate("");
    setSearchTerm("");
  }

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role={roleLabel(user)} />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <h1 className="page-title">{t("tasks.title")}</h1>
            <p className="page-subtitle">{new Date().toDateString()}</p>
          </div>
          {(user.role === "CEO" || user.role === "MANAGER") && (
            <button
              onClick={() => navigate("/tasks/new")}
              className="btn-primary px-4 py-2 text-sm font-medium"
            >
              + {t("tasks.createNew")}
            </button>
          )}
        </div>

        <div className="app-panel p-6">
          <div className="mb-6 flex max-w-2xl gap-1 rounded-lg bg-slate-100 p-1">
            {["ALL", "IN_PROGRESS", "PENDING_APPROVAL", "DONE", "OVERDUE"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                  filter === f
                    ? "bg-[#1275e2] text-white shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-900"
                }`}
              >
                {f === "IN_PROGRESS"
                  ? t("tasks.inProgress")
                  : f === "PENDING_APPROVAL"
                    ? t("tasks.pending")
                    : f === "DONE"
                      ? t("tasks.completed")
                      : f === "OVERDUE"
                        ? "Overdue"
                        : t("common.view")}
              </button>
            ))}
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3">
            <div>
              <label className="app-label">{t("common.projects")}</label>
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="app-input">
                <option value="ALL">{t("projects.allProjects")}</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="app-label">{t("users.section")}</label>
              <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="app-input">
                <option value="ALL">{t("sections.allSections")}</option>
                {sectionOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="app-label">Assigned To</label>
              <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="app-input">
                <option value="ALL">All People</option>
                {assigneeOptions.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="app-label">Score</label>
              <select value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value)} className="app-input">
                <option value="ALL">All Scores</option>
                <option value="HIGH">High 8-10</option>
                <option value="MEDIUM">Medium 5-7</option>
                <option value="LOW">Low 0-4</option>
              </select>
            </div>

            <div>
              <label className="app-label">From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="app-input" />
            </div>

            <div>
              <label className="app-label">To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="app-input" />
            </div>
          </div>

          <div className="mb-6 flex items-end justify-between gap-3">
            <div className="flex-1">
              <label className="app-label">Search</label>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="app-input"
                placeholder="Search task name"
              />
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Clear Filters
            </button>
          </div>

          <div className="mb-4 text-xs text-slate-500">
            Showing <strong className="text-slate-900">{filteredTasks.length}</strong> of{" "}
            <strong className="text-slate-900">{tasks.length}</strong> tasks
          </div>

          <div className="flex flex-col gap-2">
            {filteredTasks.length === 0 ? (
              <div className="app-panel-muted py-12 text-center text-slate-500">
                <div className="mb-2 flex justify-center text-2xl">📋</div>
                <p className="text-sm">No tasks found in this category</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} onMarkDone={markDone} />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
