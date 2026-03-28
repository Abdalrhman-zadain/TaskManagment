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
  task_assigned: "bg-blue-500/20 text-blue-300",
  task_done: "bg-green-500/20 text-green-300",
  task_approved: "bg-teal-500/20 text-teal-300",
  task_rejected: "bg-pink-500/20 text-pink-300",
  task_pending_approval: "bg-amber-500/20 text-amber-300",
  task_updated: "bg-indigo-500/20 text-indigo-300",
  task_status_changed: "bg-cyan-500/20 text-cyan-300",
  points_awarded: "bg-purple-500/20 text-purple-300",
  deadline_missed: "bg-red-500/20 text-red-300",
  level_up: "bg-yellow-500/20 text-yellow-300",
};

function roleLabel(user) {
  if (user.role === "CEO") return "CEO";
  if (user.role === "MANAGER") return "Manager";
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
      <div className="min-h-screen flex items-center justify-center bg-[#0F1D3A] text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0F1D3A]">
      <Sidebar role={roleLabel(user)} />

      <main className="flex-1 p-7 overflow-y-auto">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-bold">Notifications</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-blue-400 hover:text-blue-300 border border-blue-400/30 px-3 py-1.5 rounded-lg transition"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center text-slate-500 py-20">
            <div className="text-4xl mb-3">🔔</div>
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-w-3xl">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                  if (n.taskId) navigate(`/tasks/${n.taskId}`);
                }}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition ${n.read
                    ? "bg-white/3 border-white/5 opacity-60"
                    : "bg-white/5 border-white/10 hover:bg-white/8"
                  }`}
              >
                {/* Unread indicator */}
                <div className="pt-1 flex-shrink-0">
                  {!n.read ? (
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-transparent" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[n.type] || "bg-slate-500/20 text-slate-300"
                        }`}
                    >
                      {TYPE_LABELS[n.type] || n.type}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200">{n.message}</p>
                  {n.taskId && (
                    <p className="text-xs text-blue-400 mt-1">
                      Click to view task →
                    </p>
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
