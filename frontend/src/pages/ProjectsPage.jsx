import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

function roleLabel(user) {
  if (user.role === "CEO") return "CEO";
  if (user.role === "MANAGER") return "Manager";
  return "Employee";
}

export default function ProjectsPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [sectionId, setSectionId] = useState(user.sectionId ? String(user.sectionId) : "");
  const [managerId, setManagerId] = useState(user.role === "MANAGER" ? String(user.id) : "");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const requests = [api.get("/projects"), api.get("/users")];
      if (user.role === "CEO") {
        requests.push(api.get("/sections"));
      }
      const [projectsRes, usersRes, sectionsRes] = await Promise.all(requests);
      setProjects(projectsRes.data);
      setUsers(usersRes.data);
      setSections(sectionsRes?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const clients = useMemo(() => users.filter((entry) => entry.role === "CLIENT"), [users]);
  const managers = useMemo(() => users.filter((entry) => entry.role === "MANAGER"), [users]);
  const filteredManagers = useMemo(() => {
    if (user.role === "MANAGER") return managers.filter((entry) => entry.id === user.id);
    if (!sectionId) return managers;
    return managers.filter((entry) => entry.section?.id === Number(sectionId));
  }, [managers, sectionId, user.role, user.id]);

  async function createProject(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/projects", {
        name,
        description,
        clientId,
        sectionId: user.role === "CEO" ? sectionId : user.sectionId,
        managerId: user.role === "CEO" ? managerId : user.id,
        deadline: deadline || null,
        budget: budget || null,
      });

      setName("");
      setDescription("");
      setClientId("");
      if (user.role === "CEO") {
        setSectionId("");
        setManagerId("");
      }
      setDeadline("");
      setBudget("");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create project");
    } finally {
      setSaving(false);
    }
  }

  async function completeProject(projectId) {
    setError("");
    try {
      await api.patch(`/projects/${projectId}/complete`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to finish project");
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-slate-400">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-900">
      <Sidebar role={roleLabel(user)} />
      <main className="flex-1 p-7 overflow-y-auto">
        <div className="mb-7">
          <h1 className="text-xl font-bold">Projects</h1>
          <p className="text-sm text-slate-400 mt-0.5">Create client-linked projects and track their delivery.</p>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <form onSubmit={createProject} className="col-span-1 bg-white/4 border border-white/8 rounded-xl p-4 h-fit">
            <h2 className="text-sm font-bold mb-3">Create Project</h2>

            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Project Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full mb-3 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />

            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="w-full mb-3 bg-[#162447] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>

            {user.role === "CEO" && (
              <>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Section</label>
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} required className="w-full mb-3 bg-[#162447] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Select section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>{section.name}</option>
                  ))}
                </select>

                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Manager</label>
                <select value={managerId} onChange={(e) => setManagerId(e.target.value)} required className="w-full mb-3 bg-[#162447] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Select manager</option>
                  {filteredManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>{manager.name}</option>
                  ))}
                </select>
              </>
            )}

            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Budget</label>
            <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="$25,000" className="w-full mb-3 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />

            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Deadline</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full mb-3 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />

            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full mb-3 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />

            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

            <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition">
              {saving ? "Creating..." : "Create Project"}
            </button>
          </form>

          <div className="col-span-2 bg-white/4 border border-white/8 rounded-xl p-4">
            <h2 className="text-sm font-bold mb-3">Active Projects</h2>
            <div className="flex flex-col gap-3">
              {projects.map((project) => {
                const totalTasks = project.tasks?.length || 0;
                const doneTasks = project.tasks?.filter((task) => task.status === "DONE").length || 0;
                const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
                return (
                  <div key={project.id} className="border border-white/8 rounded-xl p-4 bg-white/3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{project.name}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Client: {project.client?.name} · Manager: {project.manager?.name} · Section: {project.section?.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs rounded-full px-2 py-1 bg-blue-500/15 text-blue-300">{project.status}</span>
                        {user.role === "CEO" && project.status !== "COMPLETED" && (
                          <button
                            onClick={() => completeProject(project.id)}
                            className="text-xs rounded-lg px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white transition"
                          >
                            Finish Project
                          </button>
                        )}
                      </div>
                    </div>
                    {project.description && <p className="text-sm text-slate-300 mt-3">{project.description}</p>}
                    <div className="mt-3 text-xs text-slate-400">Budget: {project.budget || "Not set"} · Deadline: {project.deadline ? new Date(project.deadline).toLocaleDateString() : "Not set"}</div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Task Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {projects.length === 0 && <p className="text-sm text-slate-400">No projects yet.</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
