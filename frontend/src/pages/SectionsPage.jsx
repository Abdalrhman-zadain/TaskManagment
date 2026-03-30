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
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-900">
      <Sidebar role="CEO" />

      <main className="flex-1 p-7 overflow-y-auto">
        <div className="mb-7">
          <h1 className="text-xl font-bold">Sections</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Create sections and assign managers
          </p>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <form
            onSubmit={handleCreate}
            className="col-span-1 bg-white/4 border border-white/8 rounded-xl p-4 h-fit"
          >
            <h2 className="text-sm font-bold mb-3">Create Section</h2>

            <div className="mb-3">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Section Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="Engineering"
              />
            </div>

            <div className="mb-4">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                Manager
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full bg-[#162447] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
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
              {saving ? "Creating..." : "Create Section"}
            </button>
          </form>

          <div className="col-span-2 bg-white/4 border border-white/8 rounded-xl p-4">
            <h2 className="text-sm font-bold mb-3">All Sections</h2>
            {sections.length === 0 && (
              <p className="text-sm text-slate-400">No sections yet</p>
            )}

            {sections.map((section) => (
              <div
                key={section.id}
                className="py-3 border-b border-white/8 last:border-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">{section.name}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Members: {section.members?.length || 0} | Tasks:{" "}
                      {section._count?.tasks || 0}
                    </div>
                  </div>

                  <div className="w-56">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">
                      Manager
                    </label>
                    <select
                      value={section.managerId || ""}
                      onChange={(e) =>
                        updateManager(section.id, e.target.value)
                      }
                      className="w-full bg-[#162447] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
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
