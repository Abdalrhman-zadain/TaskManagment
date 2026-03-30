import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

function roleLabel(user) {
  if (user.role === "CEO") return "CEO";
  if (user.role === "MANAGER") return "Manager";
  return "Employee";
}

export default function TaskCreate() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [sectionId, setSectionId] = useState(user.sectionId ? String(user.sectionId) : "");
  const [parentId, setParentId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("medium");

  const [users, setUsers] = useState([]);
  const [sections, setSections] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, sectionsRes, tasksRes, projectsRes] = await Promise.all([
          api.get("/users"),
          api.get("/sections"),
          api.get("/tasks"),
          api.get("/projects"),
        ]);
        setUsers(usersRes.data);
        setSections(sectionsRes.data);
        setTasks(tasksRes.data);
        setProjects(projectsRes.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load users and sections");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allowedSections = useMemo(() => {
    if (user.role === "MANAGER") return sections.filter((s) => s.id === user.sectionId);
    return sections;
  }, [sections, user.role, user.sectionId]);

  const assigneeOptions = useMemo(() => {
    if (user.role === "CEO") {
      if (!sectionId) return [];
      const selectedSection = sections.find((s) => s.id === Number(sectionId));
      if (!selectedSection?.managerId) return [];
      return users.filter((u) => u.id === selectedSection.managerId);
    }

    const eligible = users.filter((u) => u.role === "EMPLOYEE");
    if (!sectionId) return eligible;
    return eligible.filter((u) => u.section?.id === Number(sectionId));
  }, [users, sections, sectionId, user.role]);

  const projectOptions = useMemo(() => {
    if (!sectionId) return [];
    return projects.filter((project) => project.sectionId === Number(sectionId));
  }, [projects, sectionId]);

  const parentTaskOptions = useMemo(() => {
    if (user.role !== "MANAGER" || !sectionId || !projectId) return [];
    return tasks.filter(
      (t) =>
        t.sectionId === Number(sectionId) &&
        t.project?.id === Number(projectId) &&
        !t.parentId &&
        t.assigneeId === user.id &&
        t.creator?.role === "CEO",
    );
  }, [tasks, sectionId, projectId, user.role, user.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!title || !assigneeId || !sectionId || !projectId || !deadline) {
      setError("Please fill all required fields");
      return;
    }

    if (user.role === "MANAGER" && !parentId) {
      setError("Please select a parent main task from CEO");
      return;
    }

    setSaving(true);
    try {
      await api.post("/tasks", {
        title,
        description,
        assigneeId,
        sectionId,
        projectId,
        deadline,
        priority,
        parentId: user.role === "MANAGER" ? parentId : null,
      });
      navigate("/tasks");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to create task");
    } finally {
      setSaving(false);
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
      <Sidebar role={roleLabel(user)} />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-7">
          <h1 className="page-title">Create Task</h1>
          <p className="page-subtitle">Assign work to your team</p>
        </div>

        <form onSubmit={handleSubmit} className="app-panel flex max-w-3xl flex-col gap-4 p-6">
          <div>
            <label className="app-label">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="app-input"
              placeholder="Task title"
              required
            />
          </div>

          <div>
            <label className="app-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="app-input"
              placeholder="Optional details"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="app-label">Section</label>
              <select
                value={sectionId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  setProjectId("");
                  setAssigneeId("");
                  setParentId("");
                }}
                className="app-input"
                required
              >
                <option value="">Select section</option>
                {allowedSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="app-label">Project</label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setParentId("");
                }}
                className="app-input"
                required
              >
                <option value="">Select project</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="app-label">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="app-input"
                required
              >
                <option value="">
                  {user.role === "CEO" ? "Select section manager" : "Select employee"}
                </option>
                {assigneeOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.role === "MANAGER" ? " (Manager)" : ""}
                  </option>
                ))}
              </select>
              {user.role === "CEO" && projectId && assigneeOptions.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">
                  This project's section has no assigned manager. Assign one in Projects or Sections first.
                </p>
              )}
            </div>
          </div>

          {user.role === "MANAGER" && (
            <div>
              <label className="app-label">Parent Main Task (from CEO)</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="app-input"
                required
              >
                <option value="">Select main task</option>
                {parentTaskOptions.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              {parentTaskOptions.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">No CEO main task found for your section yet.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="app-label">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="app-input"
                required
              />
            </div>

            <div>
              <label className="app-label">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="app-input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm font-medium">
              {saving ? "Creating..." : "Create Task"}
            </button>
            <button type="button" onClick={() => navigate("/tasks")} className="text-sm text-slate-500 hover:text-slate-900">
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
