import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/config";
import { LanguageProvider } from "./i18n/LanguageContext";
import Login from "./pages/Login";
import CEODashboard from "./pages/CEODashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import TaskDetail from "./pages/TaskDetail";
import Profile from "./pages/Profile";
import TasksPage from "./pages/TasksPage";
import TaskCreate from "./pages/TaskCreate";
import SectionsPage from "./pages/SectionsPage";
import UsersPage from "./pages/UsersPage";
import NotificationsPage from "./pages/NotificationsPage";
import ClientDashboard from "./pages/ClientDashboard";
import ProjectsPage from "./pages/ProjectsPage";
import CalendarPage from "./pages/CalendarPage";

import { useEffect } from "react";
import { connectSocket, disconnectSocket } from "./socket";

// Helper: read logged-in user from localStorage
function getUser() {
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

// Redirect to correct dashboard based on role
function RoleRoute() {
  const user = getUser();
  if (!user) return <Navigate to="/login" />;
  if (user.role === "CEO") return <Navigate to="/ceo" />;
  if (user.role === "MANAGER") return <Navigate to="/manager" />;
  if (user.role === "EMPLOYEE") return <Navigate to="/employee" />;
  if (user.role === "CLIENT") return <Navigate to="/client" />;
  return <Navigate to="/login" />;
}

// Protect a route — redirect to login if not logged in
function Protected({ children, roles }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  useEffect(() => {
    const user = getUser();
    if (user) {
      connectSocket(user.id);
    }

    // Set document direction based on saved language
    const savedLang = localStorage.getItem("language") || "en";
    if (savedLang === "ar") {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    }

    return () => disconnectSocket();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RoleRoute />} />

            <Route
              path="/ceo"
              element={
                <Protected roles={["CEO"]}>
                  <CEODashboard />
                </Protected>
              }
            />

            <Route
              path="/manager"
              element={
                <Protected roles={["MANAGER"]}>
                  <ManagerDashboard />
                </Protected>
              }
            />

            <Route
              path="/employee"
              element={
                <Protected roles={["EMPLOYEE"]}>
                  <EmployeeDashboard />
                </Protected>
              }
            />

            <Route
              path="/tasks/:id"
              element={
                <Protected roles={["CEO", "MANAGER", "EMPLOYEE"]}>
                  <TaskDetail />
                </Protected>
              }
            />

            <Route
              path="/tasks"
              element={
                <Protected roles={["CEO", "MANAGER", "EMPLOYEE"]}>
                  <TasksPage />
                </Protected>
              }
            />

            <Route
              path="/tasks/new"
              element={
                <Protected roles={["CEO", "MANAGER"]}>
                  <TaskCreate />
                </Protected>
              }
            />

            <Route
              path="/sections"
              element={
                <Protected roles={["CEO"]}>
                  <SectionsPage />
                </Protected>
              }
            />

            <Route
              path="/projects"
              element={
                <Protected roles={["CEO", "MANAGER"]}>
                  <ProjectsPage />
                </Protected>
              }
            />

            <Route
              path="/calendar"
              element={
                <Protected roles={["CEO", "MANAGER", "EMPLOYEE"]}>
                  <CalendarPage />
                </Protected>
              }
            />

            <Route
              path="/users"
              element={
                <Protected roles={["CEO", "MANAGER"]}>
                  <UsersPage />
                </Protected>
              }
            />

            <Route
              path="/profile"
              element={
                <Protected>
                  <Profile />
                </Protected>
              }
            />

            <Route
              path="/users/:id"
              element={
                <Protected roles={["CEO", "MANAGER"]}>
                  <Profile />
                </Protected>
              }
            />

            <Route
              path="/notifications"
              element={
                <Protected>
                  <NotificationsPage />
                </Protected>
              }
            />

            <Route
              path="/client"
              element={
                <Protected roles={["CLIENT"]}>
                  <ClientDashboard />
                </Protected>
              }
            />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </I18nextProvider>
  );
}
