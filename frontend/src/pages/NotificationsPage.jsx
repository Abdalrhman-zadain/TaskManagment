import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../api/client";
import { socket } from "../socket";

const TYPE_LABELS = {
  task_assigned: "Task Assigned",
  task_done: "Task Completed",
  task_approved: "Task Approved",
  task_rejected: "Task Rejected",
  task_pending_approval: "Pending Approval",
  task_updated: "Task Updated",
  task_status_changed: "Status Updated",
  points_awarded: "Points Awarded",
  deadline_missed: "Deadline Missed",
  level_up: "Level Up",
};

const TYPE_COLORS = {
  task_assigned: "bg-blue-50 text-blue-700",
  task_done: "bg-emerald-50 text-emerald-700",
  task_approved: "bg-teal-50 text-teal-700",
  task_rejected: "bg-pink-50 text-pink-700",
  task_pending_approval: "bg-amber-50 text-amber-700",
  task_updated: "bg-indigo-50 text-indigo-700",
  task_status_changed: "bg-cyan-50 text-cyan-700",
  points_awarded: "bg-violet-50 text-violet-700",
  deadline_missed: "bg-rose-50 text-rose-700",
  level_up: "bg-yellow-50 text-yellow-700",
};

function roleLabel(user) {
  if (user.role === "CEO") return "CEO";
  if (user.role === "MANAGER") return "Manager";
  if (user.role === "CLIENT") return "Client";
  return "Employee";
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    socket.on("notification", (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });

    return () => {
      socket.off("notification");
    };
  }, []);

  async function markRead(id) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

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
        <div className="mb-7 flex items-center justify-between">
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary px-3 py-1.5 text-xs font-medium">
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <div className="mb-3 text-4xl">🔔</div>
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="flex max-w-3xl flex-col gap-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                  if (n.taskId) navigate(`/tasks/${n.taskId}`);
                }}
                className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition ${
                  n.read
                    ? "border-slate-200 bg-white opacity-75"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="pt-1 flex-shrink-0">
                  {!n.read ? (
                    <div className="h-2 w-2 rounded-full bg-[#1275e2]" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-transparent" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        TYPE_COLORS[n.type] || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {TYPE_LABELS[n.type] || n.type}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{n.message}</p>
                  {n.taskId && (
                    <p className="mt-1 text-xs text-[#1275e2]">Click to view task →</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
