import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TaskCard from "../components/TaskCard";
import api from "../api/client";

function roleLabel(user) {
  if (user.role === "CEO") return "CEO";
  if (user.role === "MANAGER") return "Manager";
  return "Employee";
}

export default function TasksPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const active = tasks.filter((t) => t.status !== "DONE");
  const done = tasks.filter((t) => t.status === "DONE");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1D3A] text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0F1D3A]">
      <Sidebar role={roleLabel(user)} />

      <main className="flex-1 p-7 overflow-y-auto">
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold">Tasks</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {new Date().toDateString()}
            </p>
          </div>
          {(user.role === "CEO" || user.role === "MANAGER") && (
            <button
              onClick={() => navigate("/tasks/new")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              + New Task
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white/4 border border-white/8 rounded-xl p-4">
            <h2 className="text-sm font-bold mb-3">Active ({active.length})</h2>
            {active.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No active tasks
              </p>
            ) : (
              active.map((task) => (
                <TaskCard key={task.id} task={task} onMarkDone={markDone} />
              ))
            )}
          </div>

          <div className="bg-white/4 border border-white/8 rounded-xl p-4">
            <h2 className="text-sm font-bold mb-3">
              Completed ({done.length})
            </h2>
            {done.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No completed tasks
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
