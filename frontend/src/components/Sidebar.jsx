import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/client";
import { socket, disconnectSocket } from "../socket";

export default function Sidebar({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentLang, setCurrentLang] = useState(i18n.language);

  useEffect(() => {
    // Sync language state with i18n
    setCurrentLang(i18n.language);
    
    async function fetchUnread() {
      try {
        const res = await api.get("/notifications");
        setUnreadCount(res.data.filter((n) => !n.read).length);
      } catch {
        // Non-critical.
      }
    }

    fetchUnread();

    socket.on("notification", () => {
      setUnreadCount((prev) => prev + 1);
    });

    // Listen to language changes
    const handleLanguageChanged = (lang) => {
      setCurrentLang(lang);
    };
    
    i18n.on("languageChanged", handleLanguageChanged);

    const interval = setInterval(fetchUnread, 30_000);
    return () => {
      socket.off("notification");
      i18n.off("languageChanged", handleLanguageChanged);
      clearInterval(interval);
    };
  }, [i18n]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    disconnectSocket();
    navigate("/login");
  }

  function changeLanguage(lang) {
    // Change language in i18n
    i18n.changeLanguage(lang);
    
    // Save to localStorage
    localStorage.setItem("language", lang);
    
    // Update current language state
    setCurrentLang(lang);
    
    // Update document direction and language attribute
    if (lang === "ar") {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    }
  }

  const navItem = (label, path, dot = "bg-slate-400") => {
    const active = location.pathname === path;
    return (
      <div
        onClick={() => navigate(path)}
        className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
          active
            ? "bg-[#1275e2] text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        <div className={`h-2 w-2 rounded-full ${active ? "bg-white" : dot}`} />
        {label}
      </div>
    );
  };

  return (
    <aside className="sticky top-0 flex h-screen w-56 flex-shrink-0 flex-col border-r border-slate-200 bg-[#fbfdff] pt-6 pb-4">
      <div className="mb-5 shrink-0 border-b border-slate-200 px-5 pb-6">
        <div className="text-xl font-bold tracking-tight text-slate-900">
          Team<span className="text-[#1275e2]">Task</span>
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{role} Portal</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="pb-4">
          <div className="mb-1.5 px-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {t("sidebar.overview")}
          </div>
          {role === "CEO" && navItem(t("sidebar.dashboard"), "/ceo")}
          {role === "CEO" && navItem(t("sidebar.projects"), "/projects")}
          {role === "CEO" && navItem(t("sidebar.tasks"), "/tasks")}
          {role === "CEO" && navItem(t("sidebar.calendar"), "/calendar")}
          {role === "CEO" && navItem(t("sidebar.sections"), "/sections")}
          {role === "CEO" && navItem(t("sidebar.users"), "/users")}

          {role === "Manager" && navItem(t("sidebar.dashboard"), "/manager")}
          {role === "Manager" && navItem(t("sidebar.projects"), "/projects")}
          {role === "Manager" && navItem(t("sidebar.tasks"), "/tasks")}
          {role === "Manager" && navItem(t("sidebar.calendar"), "/calendar")}
          {role === "Manager" && navItem(t("sidebar.assignTask"), "/tasks/new")}
          {role === "Manager" && navItem(t("sidebar.team"), "/users")}

          {role === "Employee" && navItem(t("sidebar.myTasks"), "/employee")}
          {role === "Employee" && navItem(t("sidebar.tasks"), "/tasks")}
          {role === "Employee" && navItem(t("sidebar.calendar"), "/calendar")}

          {role === "Client" && navItem(t("sidebar.dashboard"), "/client")}

          <div className="mt-4 mb-1.5 px-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {t("sidebar.account")}
          </div>
          {navItem(t("sidebar.myProfile"), "/profile")}

          <div
            onClick={() => navigate("/notifications")}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              location.pathname === "/notifications"
                ? "bg-[#1275e2] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${location.pathname === "/notifications" ? "bg-white" : "bg-slate-400"}`}
            />
            {t("sidebar.notifications")}
            {unreadCount > 0 && (
              <span
                className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  location.pathname === "/notifications"
                    ? "bg-white text-[#1275e2]"
                    : "bg-[#1275e2] text-white"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto shrink-0 border-t border-slate-200 px-4 pt-4">
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => changeLanguage("en")}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
              currentLang === "en"
                ? "bg-[#1275e2] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => changeLanguage("ar")}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
              currentLang === "ar"
                ? "bg-[#1275e2] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            AR
          </button>
        </div>
        <div className="app-panel mb-3 flex items-center gap-2.5 px-3 py-3 shadow-none">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1275e2] to-[#5f78a3] text-xs font-bold text-white">
            {user.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">
              {user.name}
            </div>
            <div className="text-xs text-slate-500">{user.role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full py-1 text-left text-xs text-slate-500 transition hover:text-[#c55b00]"
        >
          {t("sidebar.signOut")}
        </button>
      </div>
    </aside>
  );
}
