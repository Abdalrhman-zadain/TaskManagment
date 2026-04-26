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
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );
  const isArabic = currentLang?.startsWith("ar");
  const rolePortalLabelMap = {
    CEO: isArabic ? "بوابة المدير التنفيذي" : "CEO Portal",
    Manager: isArabic ? "بوابة المدير" : "Manager Portal",
    Employee: isArabic ? "بوابة الموظف" : "Employee Portal",
    Client: isArabic ? "بوابة العميل" : "Client Portal",
  };
  const userRoleLabelMap = {
    CEO: isArabic ? "مدير تنفيذي" : "CEO",
    MANAGER: isArabic ? "مدير" : "MANAGER",
    EMPLOYEE: isArabic ? "موظف" : "EMPLOYEE",
    CLIENT: isArabic ? "عميل" : "CLIENT",
  };

  useEffect(() => {
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
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
    setCurrentLang(lang);

    if (lang === "ar") {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    }
  }

  function toggleSidebar() {
    setIsCollapsed((current) => {
      const next = !current;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  }

  const navItem = (label, path, dot = "bg-slate-400") => {
    const active = location.pathname === path;
    return (
      <div
        onClick={() => navigate(path)}
        title={isCollapsed ? label : undefined}
        className={`flex cursor-pointer items-center gap-2.5 rounded-xl py-2.5 text-sm font-medium transition ${
          active
            ? "bg-[#1275e2] text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        } ${isCollapsed ? "justify-center px-2" : "px-4"}`}
      >
        <div className={`h-2 w-2 rounded-full ${active ? "bg-white" : dot}`} />
        {!isCollapsed && label}
      </div>
    );
  };

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-shrink-0 flex-col border-r border-slate-200 bg-[#fbfdff] pb-4 pt-6 transition-all duration-200 ${
        isCollapsed ? "w-20" : "w-56"
      }`}
    >
      <div
        className={`mb-5 shrink-0 border-b border-slate-200 pb-6 ${
          isCollapsed ? "px-3" : "px-5"
        }`}
      >
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "justify-between gap-3"
          }`}
        >
          <div className="text-xl font-bold tracking-tight text-slate-900">
            {isCollapsed ? (
              <>
                T<span className="text-[#1275e2]">T</span>
              </>
            ) : (
              <>
                Team<span className="text-[#1275e2]">Task</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            title={isCollapsed ? "Open sidebar" : "Close sidebar"}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            {isCollapsed ? ">" : "<"}
          </button>
        </div>
        {!isCollapsed && (
          <div className="mt-0.5 text-xs text-slate-500">
            {rolePortalLabelMap[role] ||
              (isArabic ? "بوابة المستخدم" : `${role} Portal`)}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="pb-4">
          {!isCollapsed && (
            <div className="mb-1.5 px-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {t("sidebar.overview")}
            </div>
          )}
          {role === "CEO" && navItem(t("sidebar.dashboard"), "/ceo")}
          {role === "CEO" &&
            navItem(
              t("sidebar.reporting", { defaultValue: "Reporting" }),
              "/ceo/reports",
            )}
          {role === "CEO" && navItem(t("sidebar.projects"), "/projects")}
          {role === "CEO" && navItem(t("sidebar.tasks"), "/tasks")}
          {role === "CEO" && navItem(t("sidebar.calendar"), "/calendar")}
          {role === "CEO" && navItem(t("sidebar.sections"), "/sections")}
          {role === "CEO" && navItem(t("sidebar.users"), "/users")}

          {role === "Manager" && navItem(t("sidebar.dashboard"), "/manager")}
          {role === "Manager" && navItem(t("sidebar.projects"), "/projects")}
          {role === "Manager" && navItem(t("sidebar.tasks"), "/tasks")}
          {role === "Manager" && navItem(t("sidebar.calendar"), "/calendar")}
          {role === "Manager" &&
            navItem(t("sidebar.assignTask"), "/tasks/new")}
          {role === "Manager" && navItem(t("sidebar.team"), "/users")}

          {role === "Employee" && navItem(t("sidebar.myTasks"), "/employee")}
          {role === "Employee" && navItem(t("sidebar.tasks"), "/tasks")}
          {role === "Employee" && navItem(t("sidebar.calendar"), "/calendar")}

          {role === "Client" && navItem(t("sidebar.dashboard"), "/client")}

          {!isCollapsed && (
            <div className="mb-1.5 mt-4 px-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {t("sidebar.account")}
            </div>
          )}
          {navItem(t("sidebar.myProfile"), "/profile")}

          <div
            onClick={() => navigate("/notifications")}
            title={isCollapsed ? t("sidebar.notifications") : undefined}
            className={`relative flex cursor-pointer items-center gap-2.5 rounded-xl py-2.5 text-sm font-medium transition ${
              location.pathname === "/notifications"
                ? "bg-[#1275e2] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            } ${isCollapsed ? "justify-center px-2" : "px-4"}`}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                location.pathname === "/notifications"
                  ? "bg-white"
                  : "bg-slate-400"
              }`}
            />
            {!isCollapsed && t("sidebar.notifications")}
            {unreadCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  location.pathname === "/notifications"
                    ? "bg-white text-[#1275e2]"
                    : "bg-[#1275e2] text-white"
                } ${isCollapsed ? "absolute right-4 top-1" : "ml-auto"}`}
              >
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className={`mt-auto shrink-0 border-t border-slate-200 pt-4 ${
          isCollapsed ? "px-3" : "px-4"
        }`}
      >
        <div
          className={`mb-3 flex items-center gap-2 ${
            isCollapsed ? "flex-col" : ""
          }`}
        >
          <button
            onClick={() => changeLanguage("en")}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
              isCollapsed ? "w-full" : "flex-1"
            } ${
              currentLang === "en"
                ? "bg-[#1275e2] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => changeLanguage("ar")}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
              isCollapsed ? "w-full" : "flex-1"
            } ${
              currentLang === "ar"
                ? "bg-[#1275e2] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            AR
          </button>
        </div>
        <div
          title={isCollapsed ? user.name : undefined}
          className={`app-panel mb-3 flex items-center px-3 py-3 shadow-none ${
            isCollapsed ? "justify-center" : "gap-2.5"
          }`}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1275e2] to-[#5f78a3] text-xs font-bold text-white">
            {user.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          {!isCollapsed && (
            <div>
              <div className="text-sm font-medium text-slate-900">
                {user.name}
              </div>
              <div className="text-xs text-slate-500">
                {userRoleLabelMap[user.role] || user.role}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          title={isCollapsed ? t("sidebar.signOut") : undefined}
          className={`w-full py-1 text-xs text-slate-500 transition hover:text-[#c55b00] ${
            isCollapsed ? "text-center" : "text-left"
          }`}
        >
          {isCollapsed ? "Exit" : t("sidebar.signOut")}
        </button>
      </div>
    </aside>
  );
}
