import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function statusTone(status) {
  if (status === "DONE") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "PENDING_APPROVAL") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "LATE") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "IN_PROGRESS") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function buildCalendarDays(currentMonth) {
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startDay = firstDayOfMonth.getDay();
  const gridStartDate = new Date(firstDayOfMonth);
  gridStartDate.setDate(firstDayOfMonth.getDate() - startDay);

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(gridStartDate);
    date.setDate(gridStartDate.getDate() + index);

    return {
      date,
      key: formatDateKey(date),
      isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
    };
  });
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const role =
    user.role === "CEO"
      ? "CEO"
      : user.role === "MANAGER"
        ? "Manager"
        : "Employee";

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

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const tasksByDate = useMemo(() => {
    return tasks.reduce((map, task) => {
      if (!task.deadline) return map;

      const key = formatDateKey(new Date(task.deadline));
      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(task);
      return map;
    }, {});
  }, [tasks]);

  function goToPreviousMonth() {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1));
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role={role} />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#5f78a3]">
            Planning
          </div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Calendar</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            This step loads real tasks and places them on the calendar using each task deadline.
          </p>
        </div>

        <section className="app-panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Month View</div>
              <div className="mt-1 text-xs text-slate-500">
                Click any task card to open its detail page.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Previous
              </button>
              <div className="min-w-[180px] text-center text-sm font-semibold text-slate-900">
                {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <button
                type="button"
                onClick={goToNextMonth}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Next
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Loading calendar tasks...
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

                return (
                  <div
                    key={day.key}
                    className={`min-h-[140px] rounded-xl border p-3 ${
                      day.isCurrentMonth
                        ? "border-slate-200 bg-white"
                        : "border-slate-200 bg-slate-50/80"
                    }`}
                  >
                    <div
                      className={`mb-3 text-xs font-semibold ${
                        day.isCurrentMonth ? "text-slate-700" : "text-slate-400"
                      }`}
                    >
                      {day.date.getDate()}
                    </div>

                    <div className="space-y-2">
                      {dayTasks.length === 0 ? (
                        <div className="text-[11px] text-slate-400">No tasks</div>
                      ) : (
                        dayTasks.slice(0, 3).map((task) => (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => navigate(`/tasks/${task.id}`)}
                            className={`w-full rounded-lg border px-2 py-2 text-left text-xs transition hover:opacity-90 ${statusTone(task.status)}`}
                          >
                            <div className="truncate font-semibold">{task.title}</div>
                            <div className="mt-1 truncate opacity-80">
                              {task.assignee?.name || "Unassigned"}
                            </div>
                          </button>
                        ))
                      )}

                      {dayTasks.length > 3 && (
                        <div className="text-[11px] font-medium text-slate-500">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
