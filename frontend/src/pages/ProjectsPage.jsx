import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

function roleLabel(user) {
  if (user.role === "CEO") return "CEO";
  if (user.role === "MANAGER") return "Manager";
  return "Employee";
}

export default function ProjectsPage() {
  const { t } = useTranslation();
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
  const [sectionId, setSectionId] = useState(
    user.sectionId ? String(user.sectionId) : "",
  );
  const [managerId, setManagerId] = useState(
    user.role === "MANAGER" ? String(user.id) : "",
  );
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

  const clients = useMemo(
    () => users.filter((entry) => entry.role === "CLIENT"),
    [users],
  );
  const managers = useMemo(
    () => users.filter((entry) => entry.role === "MANAGER"),
    [users],
  );
  const filteredManagers = useMemo(() => {
    if (user.role === "MANAGER")
      return managers.filter((entry) => entry.id === user.id);
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
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role={roleLabel(user)} />
      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-7">
          <h1 className="page-title">{t("projects.title")}</h1>
          <p className="page-subtitle">{t("projects.subtitle")}</p>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <form
            onSubmit={createProject}
            className="app-panel col-span-1 h-fit p-4"
          >
            <h2 className="mb-3 text-sm font-bold text-slate-900">
              {t("projects.createNew")}
            </h2>

            <label className="app-label">{t("projects.projectName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="app-input mb-3"
            />

            <label className="app-label">{t("projects.client")}</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="app-input mb-3"
            >
              <option value="">{t("common.search")}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            {user.role === "CEO" && (
              <>
                <label className="app-label">{t("users.section")}</label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  required
                  className="app-input mb-3"
                >
                  <option value="">{t("common.search")}</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>

                <label className="app-label">{t("projects.manager")}</label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  required
                  className="app-input mb-3"
                >
                  <option value="">{t("common.search")}</option>
                  {filteredManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label className="app-label">{t("projects.budget")}</label>
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="$25,000"
              className="app-input mb-3"
            />

            <label className="app-label">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="app-input mb-3"
            />

            <label className="app-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="app-input mb-3"
            />

            {error && <p className="mb-3 text-xs text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full py-2 text-sm font-medium"
            >
              {saving ? "Creating..." : "Create Project"}
            </button>
          </form>

          <div className="app-panel col-span-2 p-4">
            <h2 className="mb-3 text-sm font-bold text-slate-900">
              Active Projects
            </h2>
            <div className="flex flex-col gap-3">
              {projects.map((project) => {
                const totalTasks = project.tasks?.length || 0;
                const doneTasks =
                  project.tasks?.filter((task) => task.status === "DONE")
                    .length || 0;
                const progress = totalTasks
                  ? Math.round((doneTasks / totalTasks) * 100)
                  : 0;
                return (
                  <div
                    key={project.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {project.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Client: {project.client?.name} · Manager:{" "}
                          {project.manager?.name} · Section:{" "}
                          {project.section?.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                          {project.status}
                        </span>
                        {user.role === "CEO" &&
                          project.status !== "COMPLETED" && (
                            <button
                              onClick={() => completeProject(project.id)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white transition hover:bg-emerald-700"
                            >
                              Finish Project
                            </button>
                          )}
                      </div>
                    </div>
                    {project.description && (
                      <p className="mt-3 text-sm text-slate-600">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-3 text-xs text-slate-500">
                      Budget: {project.budget || "Not set"} · Deadline:{" "}
                      {project.deadline
                        ? new Date(project.deadline).toLocaleDateString()
                        : "Not set"}
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>Task Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[#1275e2]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {projects.length === 0 && (
                <p className="text-sm text-slate-500">No projects yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
