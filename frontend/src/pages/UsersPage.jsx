import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1D3A] text-slate-400">
        Loading...
      </div>
    );
  }

  const managers = users.filter((u) => u.role === "MANAGER");
  const employees = users.filter((u) => u.role === "EMPLOYEE");

  return (
    <div className="flex min-h-screen bg-[#0F1D3A]">
      <Sidebar role="CEO" />

      <main className="flex-1 p-7 overflow-y-auto">
        <div className="mb-7">
          <h1 className="text-xl font-bold">Users Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Create manager and employee accounts
          </p>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <form
            onSubmit={createUser}
            className="col-span-1 bg-white/4 border border-white/8 rounded-xl p-4 h-fit"
          >
            <h2 className="text-sm font-bold mb-3">Create User</h2>

            <div className="mb-3">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="User name"
              />
            </div>

            <div className="mb-3">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="user@teamtask.com"
              />
            </div>

            <div className="mb-3">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div className="mb-3">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#162447] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Section (optional)
              </label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full bg-[#162447] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
            >
              {saving ? "Creating..." : "Create User"}
            </button>
          </form>

          <div className="col-span-2 bg-white/4 border border-white/8 rounded-xl p-4">
            <h2 className="text-sm font-bold mb-3">All Users</h2>

            <div className="mb-4 text-xs text-slate-400">
              Managers:{" "}
              <strong className="text-white">{managers.length}</strong> |
              Employees:{" "}
              <strong className="text-white">{employees.length}</strong>
            </div>

            {users.map((user) => (
              <div
                key={user.id}
                className="py-3 border-b border-white/8 last:border-0 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {user.email}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">
                    {user.section?.name || "No section"}
                  </div>
                  <span
                    className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${
                      user.role === "MANAGER"
                        ? "bg-teal-500/15 text-teal-300"
                        : user.role === "EMPLOYEE"
                          ? "bg-blue-500/15 text-blue-300"
                          : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
