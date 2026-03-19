import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
  return (
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
            <Protected>
              <TaskDetail />
            </Protected>
          }
        />

        <Route
          path="/tasks"
          element={
            <Protected>
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
          path="/users"
          element={
            <Protected roles={["CEO"]}>
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
          path="/notifications"
          element={
            <Protected>
              <NotificationsPage />
            </Protected>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
