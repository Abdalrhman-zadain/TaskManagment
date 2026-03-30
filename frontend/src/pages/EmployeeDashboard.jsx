import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import TaskCard from "../components/TaskCard";
import api from "../api/client";

export default function EmployeeDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      : "-";

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role="Employee" />
      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-7">
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">{new Date().toDateString()}</p>
        </div>

        <div className="mb-7 grid grid-cols-4 gap-4">
          <StatCard label="Assigned to Me" value={tasks.length} sub="Total tasks" color="blue" />
          <StatCard label="Completed" value={done.length} sub="All time" color="green" />
          <StatCard label="Avg Score" value={avgScore} sub="Out of 10" color="amber" />
          <StatCard
            label="Overdue"
            value={overdue}
            sub={overdue === 0 ? "All clear" : "Needs attention"}
            color={overdue > 0 ? "red" : "green"}
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="app-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Active Tasks ({active.length})</h2>
              <button
                onClick={() => navigate("/tasks")}
                className="ml-2 text-xs font-medium text-[#1275e2]"
              >
                View all →
              </button>
            </div>
            {active.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No active tasks yet</p>
            ) : (
              active.map((task) => (
                <TaskCard key={task.id} task={task} onMarkDone={markDone} />
              ))
            )}
          </div>

          <div className="app-panel p-4">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Completed ({done.length})</h2>
            {done.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No completed tasks yet</p>
            ) : (
              done.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
