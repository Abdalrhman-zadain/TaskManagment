import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

export default function SectionsPage() {
  const [sections, setSections] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [sectionsRes, usersRes] = await Promise.all([
        api.get("/sections"),
        api.get("/users"),
      ]);
      setSections(sectionsRes.data);
      setManagers(usersRes.data.filter((u) => u.role === "MANAGER"));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load sections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/sections", { name, managerId: managerId || null });
      setName("");
      setManagerId("");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to create section");
    } finally {
      setSaving(false);
    }
  }

  async function updateManager(sectionId, newManagerId) {
    try {
      await api.patch(`/sections/${sectionId}`, {
        managerId: newManagerId || null,
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to update manager");
    }
  }

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role="CEO" />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-7">
          <h1 className="page-title">Sections</h1>
          <p className="page-subtitle">Create sections and assign managers</p>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <form onSubmit={handleCreate} className="app-panel col-span-1 h-fit p-4">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Create Section</h2>

            <div className="mb-3">
              <label className="app-label">Section Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="app-input"
                placeholder="Engineering"
              />
            </div>

            <div className="mb-4">
              <label className="app-label">Manager</label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="app-input"
              >
                <option value="">Unassigned</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="mb-3 text-xs text-rose-600">{error}</p>}

            <button type="submit" disabled={saving} className="btn-primary w-full py-2 text-sm font-medium">
              {saving ? "Creating..." : "Create Section"}
            </button>
          </form>

          <div className="app-panel col-span-2 p-4">
            <h2 className="mb-3 text-sm font-bold text-slate-900">All Sections</h2>
            {sections.length === 0 && <p className="text-sm text-slate-500">No sections yet</p>}

            {sections.map((section) => (
              <div key={section.id} className="border-b border-slate-100 py-3 last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{section.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Members: {section.members?.length || 0} | Tasks: {section._count?.tasks || 0}
                    </div>
                  </div>

                  <div className="w-56">
                    <label className="app-label">Manager</label>
                    <select
                      value={section.managerId || ""}
                      onChange={(e) => updateManager(section.id, e.target.value)}
                      className="app-input"
                    >
                      <option value="">Unassigned</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
