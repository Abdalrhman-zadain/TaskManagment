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
    if (filter === "IN_PROGRESS") return t.status === "IN_PROGRESS" || t.status === "TODO";
    if (filter === "PENDING_APPROVAL") return t.status === "PENDING_APPROVAL";
    if (filter === "DONE") return t.status === "DONE";
    if (filter === "OVERDUE") return new Date(t.deadline) < new Date() && t.status !== "DONE";
    return true;
  });

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role={roleLabel(user)} />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="page-subtitle">{new Date().toDateString()}</p>
          </div>
          {(user.role === "CEO" || user.role === "MANAGER") && (
            <button
              onClick={() => navigate("/tasks/new")}
              className="btn-primary px-4 py-2 text-sm font-medium"
            >
              + New Task
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
                  ? "Waiting Response"
                  : f === "PENDING_APPROVAL"
                    ? "Pending Review"
                    : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
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
