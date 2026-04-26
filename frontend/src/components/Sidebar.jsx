import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/client";
import { socket, disconnectSocket } from "../socket";

function Icon({ path, active, className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${className} ${active ? "text-white" : "text-slate-500"}`}
    >
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  dashboard: "M4 13.5h7v6H4z M13 4h7v6h-7z M13 13.5h7v6h-7z M4 4h7v7.5H4z",
  reporting: "M5 19V6 M11 19V10 M17 19V8 M3 19h18",
  projects: "M3 7h18v12H3z M3 10h18 M8 7V5h8v2",
  tasks:
    "M9 7h11 M9 12h11 M9 17h11 M4.5 7.5l1.5 1.5 2.5-2.5 M4.5 12.5l1.5 1.5 2.5-2.5 M4.5 17.5l1.5 1.5 2.5-2.5",
  calendar:
    "M7 3v3 M17 3v3 M4 8h16 M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1z M8 12h3v3H8z",
  sections: "M4 6h16 M4 12h16 M4 18h16",
  users:
    "M16 20v-1.2a3.8 3.8 0 0 0-3.8-3.8H7.8A3.8 3.8 0 0 0 4 18.8V20 M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M20 20v-1a3 3 0 0 0-2.4-2.9 M16 5.2a3 3 0 0 1 0 5.6",
  assignTask: "M3 12h10 M8 7l5 5-5 5 M17 8h4 M19 6v4",
  team: "M7 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M17 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M3.5 20a4 4 0 0 1 7 0 M13.5 20a4 4 0 0 1 7 0",
  myTasks: "M4 6h16 M4 12h10 M4 18h8 M17 15l2 2 3-3",
  profile: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z M4 20a8 8 0 0 1 16 0",
  notifications:
    "M15 17H5.5a1.5 1.5 0 0 1-1.2-2.4L6 12.5V9a6 6 0 1 1 12 0v3.5l1.7 2.1a1.5 1.5 0 0 1-1.2 2.4H9 M10 17a2 2 0 0 0 4 0",
  signOut: "M14 4h5v16h-5 M10 8l-4 4 4 4 M6 12h9",
  panelClose: "M5 4h4v16H5z M12 4h7 M12 9h7 M12 14h7 M16 8l-3 4 3 4",
  panelOpen: "M15 4h4v16h-4z M5 4h7 M5 9h7 M5 14h7 M8 8l3 4-3 4",
};

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

  const toggleLabel = isCollapsed
    ? isArabic
      ? "فتح القائمة"
      : "Expand Sidebar"
    : isArabic
      ? "طي القائمة"
      : "Collapse Sidebar";

  const navItem = (label, path, iconPath) => {
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
        <Icon path={iconPath} active={active} />
        {!isCollapsed && label}
      </div>
    );
  };

  return (
    <aside
      className={`relative sticky top-0 flex h-screen flex-shrink-0 flex-col border-r border-slate-200 bg-[#fbfdff] pb-4 pt-6 transition-all duration-200 ${
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
            isCollapsed ? "justify-center" : "justify-start"
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
          <button
            type="button"
            onClick={toggleSidebar}
            title={isCollapsed ? toggleLabel : undefined}
            className={`mb-1 flex w-full items-center gap-2.5 rounded-xl py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 ${
              isCollapsed ? "justify-center px-2" : "px-4"
            }`}
          >
            <Icon
              path={isCollapsed ? ICONS.panelOpen : ICONS.panelClose}
              active={false}
            />
            {!isCollapsed && toggleLabel}
          </button>

          {!isCollapsed && (
            <div className="mb-1.5 px-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {t("sidebar.overview")}
            </div>
          )}
          {role === "CEO" &&
            navItem(t("sidebar.dashboard"), "/ceo", ICONS.dashboard)}
          {role === "CEO" &&
            navItem(
              t("sidebar.reporting", { defaultValue: "Reporting" }),
              "/ceo/reports",
              ICONS.reporting,
            )}
          {role === "CEO" &&
            navItem(t("sidebar.projects"), "/projects", ICONS.projects)}
          {role === "CEO" && navItem(t("sidebar.tasks"), "/tasks", ICONS.tasks)}
          {role === "CEO" &&
            navItem(t("sidebar.calendar"), "/calendar", ICONS.calendar)}
          {role === "CEO" &&
            navItem(t("sidebar.sections"), "/sections", ICONS.sections)}
          {role === "CEO" && navItem(t("sidebar.users"), "/users", ICONS.users)}

          {role === "Manager" &&
            navItem(t("sidebar.dashboard"), "/manager", ICONS.dashboard)}
          {role === "Manager" &&
            navItem(t("sidebar.projects"), "/projects", ICONS.projects)}
          {role === "Manager" &&
            navItem(t("sidebar.tasks"), "/tasks", ICONS.tasks)}
          {role === "Manager" &&
            navItem(t("sidebar.calendar"), "/calendar", ICONS.calendar)}
          {role === "Manager" &&
            navItem(t("sidebar.assignTask"), "/tasks/new", ICONS.assignTask)}
          {role === "Manager" &&
            navItem(t("sidebar.team"), "/users", ICONS.team)}

          {role === "Employee" &&
            navItem(t("sidebar.myTasks"), "/employee", ICONS.myTasks)}
          {role === "Employee" &&
            navItem(t("sidebar.tasks"), "/tasks", ICONS.tasks)}
          {role === "Employee" &&
            navItem(t("sidebar.calendar"), "/calendar", ICONS.calendar)}

          {role === "Client" &&
            navItem(t("sidebar.dashboard"), "/client", ICONS.dashboard)}

          {!isCollapsed && (
            <div className="mb-1.5 mt-4 px-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {t("sidebar.account")}
            </div>
          )}
          {navItem(t("sidebar.myProfile"), "/profile", ICONS.profile)}

          <div
            onClick={() => navigate("/notifications")}
            title={isCollapsed ? t("sidebar.notifications") : undefined}
            className={`relative flex cursor-pointer items-center gap-2.5 rounded-xl py-2.5 text-sm font-medium transition ${
              location.pathname === "/notifications"
                ? "bg-[#1275e2] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            } ${isCollapsed ? "justify-center px-2" : "px-4"}`}
          >
            <Icon
              path={ICONS.notifications}
              active={location.pathname === "/notifications"}
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
          className={`flex w-full items-center py-1 text-xs text-slate-500 transition hover:text-[#c55b00] ${
            isCollapsed ? "justify-center" : "gap-2 text-left"
          }`}
        >
          <Icon path={ICONS.signOut} active={false} className="h-4 w-4" />
          {!isCollapsed && t("sidebar.signOut")}
        </button>
      </div>
    </aside>
  );
}
