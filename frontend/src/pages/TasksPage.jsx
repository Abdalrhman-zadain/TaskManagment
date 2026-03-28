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
  const [filter, setFilter] = useState("ALL");

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

  const filteredTasks = tasks.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "IN_PROGRESS") return t.status === "IN_PROGRESS";
    if (filter === "DONE") return t.status === "DONE";
    if (filter === "OVERDUE") return new Date(t.deadline) < new Date() && t.status !== "DONE";
    return true;
  });

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
            <h1 className="text-2xl font-bold">Tasks</h1>
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

        <div className="bg-white/4 border border-white/8 rounded-xl p-6">
          <div className="flex gap-1 mb-6 bg-white/4 rounded-lg p-1 max-w-md">
            {["ALL", "IN_PROGRESS", "DONE", "OVERDUE"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 text-sm py-2 rounded-md font-medium transition ${filter === f
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                {f === "IN_PROGRESS"
                  ? "In Progress"
                  : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-white/2 rounded-xl border border-dashed border-white/8">
                <div className="text-2xl mb-2 flex justify-center">📋</div>
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
