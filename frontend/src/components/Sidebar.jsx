import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/client";

export default function Sidebar({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for unread notifications every 30 seconds
  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await api.get("/notifications");
        setUnreadCount(res.data.filter((n) => !n.read).length);
      } catch {
        // silent — non-critical
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, []);
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  const navItem = (label, path, dot = "bg-slate-500") => {
    const active = location.pathname === path;
    return (
      <div
        onClick={() => navigate(path)}
        className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-sm transition border-l-[3px] ${
          active
            ? "text-blue-300 bg-blue-500/10 border-blue-500"
            : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${active ? "bg-blue-400" : dot}`}
        />
        {label}
      </div>
    );
  };

  return (
    <aside className="w-52 bg-[#162447] border-r border-white/8 flex flex-col py-6 flex-shrink-0 min-h-screen">
      {/* Logo */}
      <div className="px-5 pb-6 border-b border-white/8 mb-5">
        <div className="font-bold text-xl tracking-tight">
          Team<span className="text-blue-400">Task</span>
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{role} Portal</div>
      </div>

      {/* Navigation */}
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-5 mb-1.5">
        Overview
      </div>
      {role === "CEO" && navItem("Dashboard", "/ceo")}
      {role === "CEO" && navItem("Tasks", "/tasks")}
      {role === "CEO" && navItem("Sections", "/sections")}
      {role === "CEO" && navItem("Users", "/users")}

      {role === "Manager" && navItem("Dashboard", "/manager")}
      {role === "Manager" && navItem("Assign Task", "/tasks/new")}

      {role === "Employee" && navItem("My Tasks", "/employee")}

      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-5 mb-1.5 mt-4">
        Account
      </div>
      {navItem("My Profile", "/profile")}

      {/* Notifications link with unread badge */}
      <div
        onClick={() => navigate("/notifications")}
        className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-sm transition border-l-[3px] ${
          location.pathname === "/notifications"
            ? "text-blue-300 bg-blue-500/10 border-blue-500"
            : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${location.pathname === "/notifications" ? "bg-blue-400" : "bg-slate-500"}`}
        />
        Notifications
        {unreadCount > 0 && (
          <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            {unreadCount}
          </span>
        )}
      </div>

      {/* User footer */}
      <div className="mt-auto pt-4 px-4 border-t border-white/8">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-white">{user.name}</div>
            <div className="text-xs text-slate-400">{user.role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-xs text-slate-400 hover:text-red-400 text-left transition py-1"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
