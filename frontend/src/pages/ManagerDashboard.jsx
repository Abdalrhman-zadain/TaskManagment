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
  const progress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const overdue = tasks.filter(
    (t) => new Date(t.deadline) < new Date() && t.status !== "DONE",
  );

  const filtered =
    filter === "ALL"
      ? tasks
      : filter === "IN_PROGRESS"
        ? tasks.filter((t) => t.status === "IN_PROGRESS")
        : filter === "DONE"
          ? tasks.filter((t) => t.status === "DONE")
          : overdue;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1D3A] text-slate-400">
        Loading...
      </div>
    );

  return (
    <div className="flex min-h-screen bg-[#0F1D3A]">
      <Sidebar role="Manager" />
      <main className="flex-1 p-7 overflow-y-auto">
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold">Section Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {new Date().toDateString()}
            </p>
          </div>
          <button
            onClick={() => navigate("/tasks/new")}
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            + Assign Task
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-7">
          <StatCard
            label="Section Tasks"
            value={tasks.length}
            sub={`${team.length} members`}
            color="teal"
          />
          <StatCard
            label="Completed"
            value={done}
            sub={`${tasks.length ? Math.round((done / tasks.length) * 100) : 0}% rate`}
            color="green"
          />
          <StatCard
            label="In Progress"
            value={progress}
            sub="Active now"
            color="amber"
          />
          <StatCard
            label="Overdue"
            value={overdue.length}
            sub={overdue.length > 0 ? "Needs attention" : "All clear!"}
            color={overdue.length > 0 ? "red" : "green"}
          />
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 flex flex-col gap-5">
            {/* Overdue alert */}
            {overdue.length > 0 && (
              <div className="bg-red-500/7 border border-red-500/20 rounded-xl p-4">
                <h2 className="text-sm font-bold text-red-400 mb-3">
                  ⚠ Overdue Tasks
                </h2>
                {overdue.map((t) => (
                  <div key={t.id} className="flex gap-2.5 mb-2 last:mb-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-xs text-slate-400">
                        {t.assignee?.name} ·{" "}
                        {Math.round(
                          (new Date() - new Date(t.deadline)) / 86400000,
                        )}{" "}
                        days overdue
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Task list with filter tabs */}
            <div className="bg-white/4 border border-white/8 rounded-xl p-4">
              <div className="flex gap-1 mb-4 bg-white/4 rounded-lg p-1">
                {["ALL", "IN_PROGRESS", "DONE", "OVERDUE"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex-1 text-xs py-1.5 rounded-md font-medium transition ${filter === f
                        ? "bg-teal-500 text-white"
                        : "text-slate-400 hover:text-white"
                      }`}
                  >
                    {f === "IN_PROGRESS"
                      ? "In Progress"
                      : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  No tasks here
                </p>
              ) : (
                filtered.map((task) => (
                  <TaskCard key={task.id} task={task} onMarkDone={markDone} />
                ))
              )}
            </div>
          </div>

          {/* RIGHT — Team */}
          <div className="flex flex-col gap-5">
            <div className="bg-white/4 border border-white/8 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold">My Team</h2>
                <button
                  onClick={() => navigate("/users")}
                  className="text-xs text-blue-400"
                >
                  Full team →
                </button>
              </div>
              {team.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-2.5 py-2.5 border-b border-white/8 last:border-0"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-300 flex-shrink-0">
                    {emp.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{emp.name}</div>
                    <div className="flex gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          className={`text-xs ${s <= emp.stars ? "text-yellow-400" : "text-white/10"}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{emp.onTimeCount} ✓</div>
                    <div
                      className={`text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 ${emp.level === "GOLD"
                          ? "bg-yellow-500/15 text-yellow-400"
                          : emp.level === "SILVER"
                            ? "bg-slate-400/15 text-slate-300"
                            : "bg-amber-800/20 text-amber-600"
                        }`}
                    >
                      {emp.level === "GOLD"
                        ? "🥇"
                        : emp.level === "SILVER"
                          ? "🥈"
                          : "🥉"}{" "}
                      {emp.level}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Section Progress */}
            <div className="bg-white/4 border border-white/8 rounded-xl p-4">
              <h2 className="text-sm font-bold mb-4">Section Progress</h2>
              {[
                {
                  label: "Completion",
                  value: tasks.length
                    ? Math.round((done / tasks.length) * 100)
                    : 0,
                  color: "bg-teal-400",
                },
                {
                  label: "On-time rate",
                  value: tasks.length
                    ? Math.round(
                      (tasks.filter((t) => t.score?.isOnTime).length /
                        tasks.length) *
                      100,
                    )
                    : 0,
                  color: "bg-green-400",
                },
              ].map((item) => (
                <div key={item.label} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{item.label}</span>
                    <strong>{item.value}%</strong>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.value}%` }}
                    />
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
