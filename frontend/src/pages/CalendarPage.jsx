import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

const weekDaysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekDaysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function statusTone(status) {
  if (status === "DONE")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "PENDING_APPROVAL")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "LATE") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "IN_PROGRESS")
    return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function buildCalendarDays(currentMonth) {
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  );
  const startDay = firstDayOfMonth.getDay();
  const gridStartDate = new Date(firstDayOfMonth);
  gridStartDate.setDate(firstDayOfMonth.getDate() - startDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStartDate);
    date.setDate(gridStartDate.getDate() + index);

    return {
      date,
      key: formatDateKey(date),
      isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
      isToday: formatDateKey(date) === formatDateKey(new Date()),
    };
  });
}

function roleLabel(user) {
  if (user.role === "CEO") return "CEO";
  if (user.role === "MANAGER") return "Manager";
  return "Employee";
}

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith("ar");
  const tx = (ar, en) => (isArabic ? ar : en);
  const locale = isArabic ? "ar-EG" : "en-US";
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const todayKey = formatDateKey(new Date());

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await api.get("/tasks");
        setTasks(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  const projectOptions = useMemo(
    () =>
      Array.from(
        new Map(
          tasks
            .filter((task) => task.project?.id && task.project?.name)
            .map((task) => [task.project.id, task.project]),
        ).values(),
      ),
    [tasks],
  );

  const assigneeOptions = useMemo(
    () =>
      Array.from(
        new Map(
          tasks
            .filter((task) => task.assignee?.id && task.assignee?.name)
            .map((task) => [task.assignee.id, task.assignee]),
        ).values(),
      ),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesStatus =
        statusFilter === "ALL" || task.status === statusFilter;
      const matchesProject =
        projectFilter === "ALL" ||
        String(task.project?.id || "") === projectFilter;
      const matchesAssignee =
        assigneeFilter === "ALL" ||
        String(task.assignee?.id || "") === assigneeFilter;
      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        task.project?.name?.toLowerCase().includes(normalizedSearch) ||
        task.assignee?.name?.toLowerCase().includes(normalizedSearch);

      return (
        matchesStatus && matchesProject && matchesAssignee && matchesSearch
      );
    });
  }, [assigneeFilter, projectFilter, searchTerm, statusFilter, tasks]);

  const calendarDays = useMemo(
    () => buildCalendarDays(currentMonth),
    [currentMonth],
  );

  const tasksByDate = useMemo(() => {
    return filteredTasks.reduce((map, task) => {
      if (!task.deadline) return map;

      const key = formatDateKey(new Date(task.deadline));
      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(task);
      return map;
    }, {});
  }, [filteredTasks]);

  const selectedDateTasks = tasksByDate[selectedDateKey] || [];
  const weekDays = isArabic ? weekDaysAr : weekDaysEn;
  const statusLabel = (status) => {
    const key = String(status || "TODO");
    const map = {
      TODO: tx("قيد البدء", "TODO"),
      IN_PROGRESS: tx("قيد التنفيذ", "IN PROGRESS"),
      PENDING_APPROVAL: tx("بانتظار الاعتماد", "PENDING APPROVAL"),
      DONE: tx("مكتملة", "DONE"),
      LATE: tx("متأخرة", "LATE"),
    };
    return map[key] || key.replaceAll("_", " ");
  };

  const visibleMonthTasks = useMemo(
    () =>
      filteredTasks.filter((task) => {
        if (!task.deadline) return false;
        const deadline = new Date(task.deadline);
        return (
          deadline.getFullYear() === currentMonth.getFullYear() &&
          deadline.getMonth() === currentMonth.getMonth()
        );
      }),
    [currentMonth, filteredTasks],
  );

  function goToPreviousMonth() {
    setCurrentMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() - 1, 1),
    );
  }

  function goToNextMonth() {
    setCurrentMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + 1, 1),
    );
  }

  function goToToday() {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(formatDateKey(now));
  }

  function clearFilters() {
    setStatusFilter("ALL");
    setProjectFilter("ALL");
    setAssigneeFilter("ALL");
    setSearchTerm("");
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role={roleLabel(user)} />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#5f78a3]">
            {t("calendar.title")}
          </div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {t("calendar.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {t("calendar.subtitle")}
          </p>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-4">
          <div className="app-panel p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              {t("calendar.visibleTasks")}
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">
              {filteredTasks.length}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {t("common.filter")}
            </div>
          </div>

          <div className="app-panel p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              {t("calendar.thisMonth")}
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">
              {visibleMonthTasks.length}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {t("calendar.tasksDue")}{" "}
              {currentMonth.toLocaleDateString("en-US", { month: "long" })}
            </div>
          </div>

          <div className="app-panel p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              {t("calendar.selectedDay")}
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">
              {selectedDateTasks.length}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {t("calendar.tasksOn")} {selectedDateKey}
            </div>
          </div>

          <div className="app-panel p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              {t("tasks.pending")}
            </div>
            <div className="mt-3 text-3xl font-bold text-rose-600">
              {filteredTasks.filter((task) => task.status === "LATE").length}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {t("common.error")}
            </div>
          </div>
        </div>

        <div className="mb-6 app-panel p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="app-label">{t("common.search")}</label>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="app-input"
                placeholder={tx("مهمة، مشروع، أو موظف", "Task, project, or assignee")}
              />
            </div>

            <div>
              <label className="app-label">{t("tasks.status")}</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="app-input"
              >
                <option value="ALL">{t("common.view")}</option>
                <option value="TODO">{tx("قيد البدء", "To Do")}</option>
                <option value="IN_PROGRESS">{t("tasks.inProgress")}</option>
                <option value="PENDING_APPROVAL">{t("tasks.pending")}</option>
                <option value="DONE">{t("tasks.completed")}</option>
                <option value="LATE">{tx("متأخرة", "Late")}</option>
              </select>
            </div>

            <div>
              <label className="app-label">{tx("المشروع", "Project")}</label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="app-input"
              >
                <option value="ALL">{tx("كل المشاريع", "All Projects")}</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="app-label">{tx("المسند إليه", "Assignee")}</label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="app-input"
              >
                <option value="ALL">{tx("كل الأشخاص", "All People")}</option>
                {assigneeOptions.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                {tx("مسح الفلاتر", "Clear Filters")}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
          <section className="app-panel p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {tx("عرض الشهر", "Month View")}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {tx(
                    "اختر يومًا لعرض قائمة المهام الكاملة لذلك التاريخ.",
                    "Select a day to inspect the full task list for that date.",
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {tx("السابق", "Previous")}
                </button>
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-lg bg-[#1275e2] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#0f63c0]"
                >
                  {tx("اليوم", "Today")}
                </button>
                <div className="min-w-[190px] text-center text-sm font-semibold text-slate-900">
                  {currentMonth.toLocaleDateString(locale, {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {tx("التالي", "Next")}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                {tx("جارٍ تحميل مهام التقويم...", "Loading calendar tasks...")}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-3">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {day}
                  </div>
                ))}

                {calendarDays.map((day) => {
                  const dayTasks = tasksByDate[day.key] || [];
                  const isSelected = day.key === selectedDateKey;

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setSelectedDateKey(day.key)}
                      className={`min-h-[148px] rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-[#1275e2] bg-blue-50/40 shadow-sm"
                          : day.isCurrentMonth
                            ? "border-slate-200 bg-white hover:border-slate-300"
                            : "border-slate-200 bg-slate-50/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div
                          className={`text-xs font-semibold ${
                            day.isCurrentMonth
                              ? "text-slate-700"
                              : "text-slate-400"
                          }`}
                        >
                          {day.date.getDate()}
                        </div>
                        {day.isToday && (
                          <span className="rounded-full bg-[#1275e2] px-2 py-0.5 text-[10px] font-semibold text-white">
                            {tx("اليوم", "Today")}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {dayTasks.length === 0 ? (
                          <div className="text-[11px] text-slate-400">
                            {tx("لا توجد مهام", "No tasks")}
                          </div>
                        ) : (
                          dayTasks.slice(0, 3).map((task) => (
                            <div
                              key={task.id}
                              className={`rounded-lg border px-2 py-2 text-xs ${statusTone(task.status)}`}
                            >
                              <div className="truncate font-semibold">
                                {task.title}
                              </div>
                              <div className="mt-1 truncate opacity-80">
                                {task.assignee?.name || tx("غير مسند", "Unassigned")}
                              </div>
                            </div>
                          ))
                        )}

                        {dayTasks.length > 3 && (
                          <div className="text-[11px] font-medium text-slate-500">
                            {isArabic
                              ? `+${dayTasks.length - 3} أكثر`
                              : `+${dayTasks.length - 3} more`}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="app-panel p-6">
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-900">
                {tx("اليوم المحدد", "Selected Day")}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {new Date(`${selectedDateKey}T12:00:00`).toLocaleDateString(
                  isArabic ? "ar-EG" : "en-GB",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )}
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              {selectedDateTasks.length === 0
                ? tx("لا توجد مهام مجدولة لهذا التاريخ.", "No tasks scheduled for this date.")
                : isArabic
                  ? `يوجد ${selectedDateTasks.length} مهمة مجدولة لهذا التاريخ.`
                  : `${selectedDateTasks.length} task${selectedDateTasks.length > 1 ? "s" : ""} scheduled for this date.`}
            </div>

            <div className="space-y-3">
              {selectedDateTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                  {tx(
                    "اختر يومًا آخر أو قم بإزالة بعض الفلاتر.",
                    "Choose another day or remove some filters.",
                  )}
                </div>
              ) : (
                selectedDateTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {task.title}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {task.project?.name || tx("بدون مشروع", "No project")} •{" "}
                          {task.assignee?.name || tx("غير مسند", "Unassigned")}
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(task.status)}`}
                      >
                        {statusLabel(task.status)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                      <div>
                        <div className="uppercase tracking-wide text-slate-400">
                          {tx("القسم", "Section")}
                        </div>
                        <div className="mt-1 text-slate-700">
                          {task.section?.name || tx("غير محدد", "Not set")}
                        </div>
                      </div>
                      <div>
                        <div className="uppercase tracking-wide text-slate-400">
                          {tx("الأولوية", "Priority")}
                        </div>
                        <div className="mt-1 capitalize text-slate-700">
                          {task.priority || tx("متوسطة", "medium")}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
