import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import TaskCard from "../components/TaskCard";
import api from "../api/client";

export default function EmployeeDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

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

  async function markDone(taskId) {
    try {
      const res = await api.patch(`/tasks/${taskId}/done`);
      alert(`Task completed! Your score: ${res.data.score.value}/10`);
      loadTasks();
    } catch (err) {
      alert(err.response?.data?.error || "Error");
    }
  }

  const done = tasks.filter((t) => t.status === "DONE");
  const active = tasks.filter((t) => t.status !== "DONE");
  const overdue = tasks.filter(
    (t) => new Date(t.deadline) < new Date() && t.status !== "DONE",
  ).length;
  const avgScore =
    done.length && done.some((t) => t.score)
      ? (
          done.filter((t) => t.score).reduce((s, t) => s + t.score.value, 0) /
          done.filter((t) => t.score).length
        ).toFixed(1)
      : "—";

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-400">
        Loading...
      </div>
    );

  return (
    <div className="flex min-h-screen bg-white text-slate-900">
      <Sidebar role="Employee" />
      <main className="flex-1 p-7 overflow-y-auto">
        <div className="mb-7">
          <h1 className="text-xl font-bold">My Tasks</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toDateString()}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-7">
          <StatCard
            label="Assigned to Me"
            value={tasks.length}
            sub="Total tasks"
            color="blue"
          />
          <StatCard
            label="Completed"
            value={done.length}
            sub="All time"
            color="green"
          />
          <StatCard
            label="Avg Score"
            value={avgScore}
            sub="Out of 10"
            color="amber"
          />
          <StatCard
            label="Overdue"
            value={overdue}
            sub={overdue === 0 ? "All clear! 🎉" : "Needs attention"}
            color={overdue > 0 ? "red" : "green"}
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Active Tasks */}
          <div className="bg-white/4 border border-white/8 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">
                Active Tasks ({active.length})
              </h2>
              <button
                onClick={() => navigate("/tasks")}
                className="text-xs text-blue-400 ml-2"
              >
                View all →
              </button>
            </div>
            {active.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No active tasks 🎉
              </p>
            ) : (
              active.map((task) => (
                <TaskCard key={task.id} task={task} onMarkDone={markDone} />
              ))
            )}
          </div>

          {/* Completed Tasks */}
          <div className="bg-white/4 border border-white/8 rounded-xl p-4">
            <h2 className="text-sm font-bold mb-3">
              Completed ({done.length})
            </h2>
            {done.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No completed tasks yet
              </p>
            ) : (
              done.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
