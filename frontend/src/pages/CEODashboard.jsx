import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import TaskCard from "../components/TaskCard";
import api from "../api/client";

export default function CEODashboard() {
  const [tasks, setTasks] = useState([]);
  const [sections, setSections] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [t, s, u] = await Promise.all([
          api.get("/tasks"),
          api.get("/sections"),
          api.get("/users"),
        ]);
        setTasks(t.data);
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

  const done = tasks.filter((t) => t.status === "DONE").length;
  const progress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const overdue = tasks.filter(
    (t) => new Date(t.deadline) < new Date() && t.status !== "DONE",
  ).length;
  const onTimeRate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  // Top performers sorted by on time count
  const allPerformers = [...users]
    .filter((u) => u.role === "EMPLOYEE" || u.role === "MANAGER")
    .sort((a, b) => b.onTimeCount - a.onTimeCount);

  const filteredTasks = tasks.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "IN_PROGRESS") return t.status === "IN_PROGRESS";
    if (filter === "DONE") return t.status === "DONE";
    if (filter === "OVERDUE") return new Date(t.deadline) < new Date() && t.status !== "DONE";
    return true;
  });

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1D3A]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );

  return (
    <div className="flex min-h-screen bg-[#0F1D3A]">
      <Sidebar role="CEO" />

      <main className="flex-1 p-7 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold">CEO Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {new Date().toDateString()}
            </p>
          </div>
          <button
            onClick={() => navigate("/tasks/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            + New Task
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          <StatCard
            label="Total Tasks"
            value={tasks.length}
            sub={`${sections.length} sections`}
            color="blue"
          />
          <StatCard
            label="Completed On Time"
            value={done}
            sub={`${onTimeRate}% on-time rate`}
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
            value={overdue}
            sub={overdue > 0 ? "Needs attention" : "All clear!"}
            color={overdue > 0 ? "red" : "green"}
          />
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* LEFT: Sections + Recent Tasks */}
          <div className="col-span-2 flex flex-col gap-5">
            {/* Sections */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold">Sections</h2>
                <button
                  onClick={() => navigate("/sections")}
                  className="text-xs text-blue-400"
                >
                  Manage →
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
                    <div
                      key={sec.id}
                      className="bg-white/4 border border-white/8 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          <div className="w-2 h-2 rounded-full bg-teal-400" />
                          {sec.name}
                          <span className="text-[10px] bg-teal-400/15 text-teal-300 px-2 py-0.5 rounded-full font-medium">
                            Active
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          Manager: {sec.manager?.name || "Unassigned"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-400">
                        <span>
                          <strong className="text-white">
                            {secTasks.length}
                          </strong>{" "}
                          tasks
                        </span>
                        <span>
                          <strong className="text-white">{secDone}</strong> done
                        </span>
                        <span>
                          <strong
                            className={
                              secOverdue > 0 ? "text-red-400" : "text-white"
                            }
                          >
                            {secOverdue}
                          </strong>{" "}
                          overdue
                        </span>
                        <span>
                          <strong className="text-white">
                            {sec.members?.length || 0}
                          </strong>{" "}
                          members
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Add section */}
                <div
                  onClick={() => navigate("/sections")}
                  className="border border-dashed border-white/15 rounded-xl p-4 flex items-center gap-3 text-slate-400 text-sm cursor-pointer hover:border-blue-500 hover:text-blue-400 transition"
                >
                  <div className="w-6 h-6 rounded-md bg-white/6 flex items-center justify-center text-base">
                    +
                  </div>
                  Create a new section
                </div>
              </div>
            </div>

            {/* Recent Tasks */}
            <div className="bg-white/4 border border-white/8 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold">Recent Tasks</h2>
                <div className="flex gap-1 bg-white/4 rounded-lg p-0.5">
                  {["ALL", "IN_PROGRESS", "DONE", "OVERDUE"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 text-[10px] rounded-md font-medium transition ${filter === f
                          ? "bg-blue-600 text-white"
                          : "text-slate-400 hover:text-white"
                        }`}
                    >
                      {f === "IN_PROGRESS"
                        ? "In Progress"
                        : f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => navigate("/tasks")}
                  className="text-xs text-blue-400 ml-2"
                >
                  View all →
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {filteredTasks.slice(0, 10).map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {filteredTasks.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No tasks found in this category
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-5">
            {/* Overdue alerts */}
            {overdue > 0 && (
              <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                <h2 className="text-sm font-bold text-red-400 mb-3">
                  ⚠ Overdue Alerts
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
                      className="flex gap-2.5 p-2.5 bg-red-500/7 border border-red-500/15 rounded-lg mb-2 last:mb-0"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{t.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {t.assignee?.name} · {t.section?.name}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Top Performers */}
            <div className="bg-white/4 border border-white/8 rounded-xl p-4 flex flex-col max-h-[500px]">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="text-sm font-bold">Team Performance</h2>
                <button onClick={() => navigate('/users')} className="text-xs text-blue-400">All users →</button>
              </div>
              <div className="overflow-y-auto pr-2 -mr-2">
                {allPerformers.map((emp, i) => (
                  <div
                    key={emp.id}
                    onClick={() => navigate(`/users/${emp.id}`)}
                    className="flex items-center gap-2.5 py-2.5 border-b border-white/8 last:border-0 cursor-pointer hover:bg-white/5 px-2 -mx-2 rounded-lg transition"
                  >
                    <div
                      className={`text-sm font-bold w-5 text-center ${i === 0
                        ? "text-yellow-400"
                        : i === 1
                          ? "text-slate-300"
                          : i === 2
                            ? "text-amber-700"
                            : "text-slate-500"
                        }`}
                    >
                      {i + 1}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-300">
                      {emp.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{emp.name}</div>
                      <div className="text-xs text-slate-400">
                        {emp.role === "MANAGER" ? 'Manager' : 'Employee'} · {emp.section?.name || 'No Section'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">{emp.onTimeCount}</div>
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
