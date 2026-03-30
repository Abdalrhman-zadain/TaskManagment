import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import TaskCard from "../components/TaskCard";
import api from "../api/client";

export default function ManagerDashboard() {
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [t, u] = await Promise.all([
          api.get("/tasks"),
          api.get("/users"),
        ]);
        setTasks(t.data);
        setTeam(u.data.filter((u) => u.role === "EMPLOYEE"));
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

  const done = tasks.filter((t) => t.status === "DONE").length;
  const progress = tasks.filter((t) => ["TODO", "IN_PROGRESS"].includes(t.status)).length;
  const overdue = tasks.filter(
    (t) => new Date(t.deadline) < new Date() && t.status !== "DONE",
  );

  const filtered =
    filter === "ALL"
      ? tasks
      : filter === "IN_PROGRESS"
        ? tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO")
        : filter === "PENDING_APPROVAL"
          ? tasks.filter((t) => t.status === "PENDING_APPROVAL")
          : filter === "DONE"
            ? tasks.filter((t) => t.status === "DONE")
            : overdue;

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role="Manager" />
      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <h1 className="page-title">Section Dashboard</h1>
            <p className="page-subtitle">{new Date().toDateString()}</p>
          </div>
          <button
            onClick={() => navigate("/tasks/new")}
            className="btn-primary px-4 py-2 text-sm font-medium"
          >
            + Assign Task
          </button>
        </div>

        <div className="mb-7 grid grid-cols-4 gap-4">
          <StatCard label="Section Tasks" value={tasks.length} sub={`${team.length} members`} color="teal" />
          <StatCard label="Completed" value={done} sub={`${tasks.length ? Math.round((done / tasks.length) * 100) : 0}% rate`} color="green" />
          <StatCard label="In Progress" value={progress} sub="Active now" color="amber" />
          <StatCard label="Overdue" value={overdue.length} sub={overdue.length > 0 ? "Needs attention" : "All clear"} color={overdue.length > 0 ? "red" : "green"} />
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 flex flex-col gap-5">
            {overdue.length > 0 && (
              <div className="app-panel p-4">
                <h2 className="mb-3 text-sm font-bold text-rose-600">Overdue Tasks</h2>
                {overdue.map((t) => (
                  <div key={t.id} className="mb-2 flex gap-2.5 last:mb-0">
                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{t.title}</div>
                      <div className="text-xs text-slate-500">
                        {t.assignee?.name} · {Math.round((new Date() - new Date(t.deadline)) / 86400000)} days overdue
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="app-panel p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                  {["ALL", "IN_PROGRESS", "PENDING_APPROVAL", "DONE", "OVERDUE"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`flex-1 rounded-md py-1.5 px-3 text-xs font-medium transition ${
                        filter === f ? "bg-[#1275e2] text-white" : "text-slate-500 hover:text-slate-900"
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
                <button onClick={() => navigate("/tasks")} className="ml-2 text-xs font-medium text-[#1275e2]">
                  View all →
                </button>
              </div>
              {filtered.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">No tasks here</p>
              ) : (
                filtered.map((task) => (
                  <TaskCard key={task.id} task={task} onMarkDone={markDone} />
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="app-panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">My Team</h2>
                <button onClick={() => navigate("/users")} className="text-xs font-medium text-[#1275e2]">
                  Full team →
                </button>
              </div>
              {team.map((emp) => (
                <div key={emp.id} className="flex items-center gap-2.5 border-b border-slate-100 py-2.5 last:border-0">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1275e2]">
                    {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
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
                    <div className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                      emp.level === "GOLD"
                        ? "bg-yellow-50 text-yellow-700"
                        : emp.level === "SILVER"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-50 text-amber-700"
                    }`}>
                      {emp.level}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="app-panel p-4">
              <h2 className="mb-4 text-sm font-bold text-slate-900">Section Progress</h2>
              {[
                {
                  label: "Completion",
                  value: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
                  color: "bg-teal-400",
                },
                {
                  label: "On-time rate",
                  value: tasks.length
                    ? Math.round((tasks.filter((t) => t.score?.isOnTime).length / tasks.length) * 100)
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
