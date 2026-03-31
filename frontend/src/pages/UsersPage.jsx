import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

export default function UsersPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [users, setUsers] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sectionFilter, setSectionFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [sectionId, setSectionId] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, sectionsRes] = await Promise.all([
        api.get("/users"),
        api.get("/sections"),
      ]);
      setUsers(usersRes.data);
      setSections(sectionsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load users data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !role) {
      setError("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      await api.post("/users", {
        name,
        email,
        password,
        role,
        sectionId: sectionId || null,
      });

      setName("");
      setEmail("");
      setPassword("");
      setRole("EMPLOYEE");
      setSectionId("");

      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id, e) {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this user? All their tasks and history will be permanently lost.")) return;

    try {
      await api.delete(`/users/${id}`);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting user");
    }
  }

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const managers = users.filter((u) => u.role === "MANAGER");
  const employees = users.filter((u) => u.role === "EMPLOYEE");
  const clients = users.filter((u) => u.role === "CLIENT");
  const shouldShowSectionPicker = currentUser.role === "CEO" && role !== "CLIENT";
  const listUsers = users.filter((u) => u.id !== currentUser.id);
  const availableSections = sections.filter((section) =>
    listUsers.some((user) => user.section?.id === section.id),
  );
  const filteredUsers = listUsers.filter((user) => {
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const matchesSection =
      sectionFilter === "ALL" || String(user.section?.id || "NONE") === sectionFilter;
    const searchValue = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      user.name.toLowerCase().includes(searchValue) ||
      user.email.toLowerCase().includes(searchValue);

    return matchesRole && matchesSection && matchesSearch;
  });

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role={currentUser.role === "MANAGER" ? "Manager" : "CEO"} />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-7">
          <h1 className="page-title">
            {currentUser.role === "MANAGER" ? "Team Management" : "Users Management"}
          </h1>
          <p className="page-subtitle">
            {currentUser.role === "MANAGER"
              ? "Create employee accounts for your section"
              : "Create manager, employee, and client accounts"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <form onSubmit={createUser} className="app-panel col-span-1 h-fit p-4">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Create User</h2>

            <div className="mb-3">
              <label className="app-label">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="app-input"
                placeholder="User name"
              />
            </div>

            <div className="mb-3">
              <label className="app-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="app-input"
                placeholder="user@teamtask.com"
              />
            </div>

            <div className="mb-3">
              <label className="app-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="app-input"
                placeholder="Minimum 6 characters"
              />
            </div>

            {currentUser.role === "CEO" && (
              <>
                <div className="mb-3">
                  <label className="app-label">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="app-input"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="CLIENT">Client</option>
                  </select>
                </div>

                {shouldShowSectionPicker && (
                  <div className="mb-4">
                    <label className="app-label">Section (optional)</label>
                    <select
                      value={sectionId}
                      onChange={(e) => setSectionId(e.target.value)}
                      className="app-input"
                    >
                      <option value="">Unassigned</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {error && <p className="mb-3 text-xs text-rose-600">{error}</p>}

            <button type="submit" disabled={saving} className="btn-primary w-full py-2 text-sm font-medium">
              {saving ? "Creating..." : "Create User"}
            </button>
          </form>

          <div className="app-panel col-span-2 p-4">
            <h2 className="mb-3 text-sm font-bold text-slate-900">All Users</h2>

            <div className="mb-4 text-xs text-slate-500">
              Managers: <strong className="text-slate-900">{managers.length}</strong> | Employees:{" "}
              <strong className="text-slate-900">{employees.length}</strong> | Clients:{" "}
              <strong className="text-slate-900">{clients.length}</strong>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-3">
              <div>
                <label className="app-label">Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="app-input"
                >
                  <option value="ALL">All Roles</option>
                  <option value="MANAGER">Manager</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="CLIENT">Client</option>
                </select>
              </div>

              <div>
                <label className="app-label">Section</label>
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="app-input"
                >
                  <option value="ALL">All Sections</option>
                  {availableSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                  <option value="NONE">No section</option>
                </select>
              </div>

              <div>
                <label className="app-label">Search</label>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="app-input"
                  placeholder="Search name or email"
                />
              </div>
            </div>

            <div className="mb-4 text-xs text-slate-500">
              Showing <strong className="text-slate-900">{filteredUsers.length}</strong> of{" "}
              <strong className="text-slate-900">{listUsers.length}</strong> users
            </div>

            {filteredUsers.map((user) => {
              const uScores = user.scores || [];
              const totalScore = uScores.reduce((sum, sc) => sum + sc.value, 0);

              return (
                <div
                  key={user.id}
                  onClick={() => navigate(`/users/${user.id}`)}
                  className="mx-[-0.75rem] flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-3 transition hover:bg-slate-50"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{user.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{user.email}</div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    {user.role !== "CEO" && user.role !== "CLIENT" && (
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">
                          {totalScore} <span className="text-[10px] font-normal text-slate-400">Pts</span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-500">{uScores.length} Tasks</div>
                      </div>
                    )}

                    <div className="w-24 text-right">
                      <div className="line-clamp-1 break-words text-xs text-slate-500">
                        {user.section?.name || "No section"}
                      </div>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${
                          user.role === "MANAGER"
                            ? "bg-teal-50 text-teal-700"
                            : user.role === "EMPLOYEE"
                              ? "bg-blue-50 text-blue-700"
                              : user.role === "CLIENT"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>

                    {((currentUser.role === "CEO" && user.role !== "CEO") ||
                      (currentUser.role === "MANAGER" && user.role === "EMPLOYEE")) && (
                      <button
                        onClick={(e) => deleteUser(user.id, e)}
                        className="ml-3 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600 transition hover:bg-rose-500 hover:text-white"
                        title="Delete user"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-500">No users match the current filters.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
