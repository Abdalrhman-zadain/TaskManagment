import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

const GOVERNMENT_TRANSACTION_TYPE_AR = "معاملات حكومية";

function isPublicRelationsSectionName(sectionName = "") {
  const normalized = String(sectionName).trim().toLowerCase();
  return normalized === "public relations" || normalized === "العلاقات العامة";
}

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
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [sectionId, setSectionId] = useState(
    user.sectionId ? String(user.sectionId) : "",
  );
  const [parentId, setParentId] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineHours, setDeadlineHours] = useState("00");
  const [deadlineMinutes, setDeadlineMinutes] = useState("00");
  const [deadlineSeconds, setDeadlineSeconds] = useState("00");
  const [priority, setPriority] = useState("medium");
  const [prTransactionType, setPrTransactionType] = useState("");
  const [prCompanyName, setPrCompanyName] = useState("");
  const [prGovernmentEntity, setPrGovernmentEntity] = useState("");
  const [prGovernmentEmployee, setPrGovernmentEmployee] = useState("");
  const [prApplicationNumber, setPrApplicationNumber] = useState("");
  const [prTaxIdNumber, setPrTaxIdNumber] = useState("");
  const [prNationalIdNumber, setPrNationalIdNumber] = useState("");
  const [prNotes, setPrNotes] = useState("");
  const [prUpdates, setPrUpdates] = useState("");

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
        const [usersRes, sectionsRes, tasksRes, projectsRes] =
          await Promise.all([
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
        setError(
          err.response?.data?.error || "Failed to load users and sections",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allowedSections = useMemo(() => {
    if (user.role === "MANAGER")
      return sections.filter((s) => s.id === user.sectionId);
    return sections;
  }, [sections, user.role, user.sectionId]);

  const clientOptions = useMemo(
    () =>
      Array.from(
        new Map(
          projects
            .filter((project) => project.client?.id && project.client?.name)
            .map((project) => [project.client.id, project.client]),
        ).values(),
      ),
    [projects],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(projectId)) || null,
    [projects, projectId],
  );
  const selectedSection = useMemo(
    () => sections.find((section) => section.id === Number(sectionId)) || null,
    [sections, sectionId],
  );
  const isPublicRelationsSection = useMemo(
    () => isPublicRelationsSectionName(selectedSection?.name),
    [selectedSection],
  );
  const shouldShowGovernmentFields = useMemo(
    () =>
      isPublicRelationsSection &&
      prTransactionType === GOVERNMENT_TRANSACTION_TYPE_AR,
    [isPublicRelationsSection, prTransactionType],
  );

  const assigneeOptions = useMemo(() => {
    if (user.role === "CEO") {
      if (!sectionId) return [];
      return users.filter(
        (u) =>
          u.section?.id === Number(sectionId) &&
          (u.role === "MANAGER" || u.role === "EMPLOYEE"),
      );
    }

    const eligible = users.filter((u) => u.role === "EMPLOYEE");
    if (!sectionId) return eligible;
    return eligible.filter((u) => u.section?.id === Number(sectionId));
  }, [users, sections, sectionId, user.role]);

  const projectOptions = useMemo(() => {
    if (!clientId) return [];
    return projects.filter((project) => {
      const matchesClient = project.client?.id === Number(clientId);
      const matchesSection =
        !sectionId || project.sectionId === Number(sectionId);
      return matchesClient && matchesSection;
    });
  }, [projects, clientId, sectionId]);

  const sectionOptions = useMemo(() => {
    if (!selectedProject) return allowedSections;
    return allowedSections.filter(
      (section) => section.id === selectedProject.sectionId,
    );
  }, [allowedSections, selectedProject]);

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

    if (!title || !assigneeId || !sectionId || !projectId || !deadlineDate) {
      setError("Please fill all required fields");
      return;
    }

    if (
      shouldShowGovernmentFields &&
      (!prCompanyName.trim() || !prGovernmentEntity.trim())
    ) {
      setError("Company Name and Government Entity are required");
      return;
    }

    const hours = Number(deadlineHours);
    const minutes = Number(deadlineMinutes);
    const seconds = Number(deadlineSeconds);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      Number.isNaN(seconds) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59 ||
      seconds < 0 ||
      seconds > 59
    ) {
      setError("Invalid deadline time");
      return;
    }

    const [year, month, day] = deadlineDate.split("-").map(Number);
    const deadlineDateObj = new Date(
      year,
      (month || 1) - 1,
      day || 1,
      hours,
      minutes,
      seconds,
      0,
    );

    if (Number.isNaN(deadlineDateObj.getTime())) {
      setError("Invalid deadline date/time");
      return;
    }

    const deadline = deadlineDateObj.toISOString();

    const selectedProjectForValidation = projects.find(
      (project) => project.id === Number(projectId),
    );
    if (
      selectedProjectForValidation &&
      selectedProjectForValidation.sectionId !== Number(sectionId)
    ) {
      setError("Project must belong to the selected section");
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
        parentId: user.role === "MANAGER" ? parentId || null : null,
        prGovernmentData: shouldShowGovernmentFields
          ? {
              companyName: prCompanyName,
              governmentEntity: prGovernmentEntity,
              transactionType: prTransactionType,
              governmentEmployee: prGovernmentEmployee,
              applicationNumber: prApplicationNumber,
              taxIdNumber: prTaxIdNumber,
              nationalIdNumber: prNationalIdNumber,
              notes: prNotes,
              updates: prUpdates,
            }
          : null,
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

        <form
          onSubmit={handleSubmit}
          className="app-panel flex max-w-3xl flex-col gap-4 p-6"
        >
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
              <label className="app-label">Client</label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setProjectId("");
                  setSectionId(user.sectionId ? String(user.sectionId) : "");
                  setAssigneeId("");
                  setParentId("");
                }}
                className="app-input"
                required
              >
                <option value="">Select client</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="app-label">Project</label>
              <select
                value={projectId}
                onChange={(e) => {
                  const nextProjectId = e.target.value;
                  const nextProject = projects.find(
                    (project) => project.id === Number(nextProjectId),
                  );
                  setProjectId(nextProjectId);
                  setSectionId(
                    nextProject?.sectionId ? String(nextProject.sectionId) : "",
                  );
                  setParentId("");
                  setAssigneeId("");
                  setPrTransactionType("");
                }}
                className="app-input"
                required
              >
                <option value="">
                  {clientId ? "Select project" : "Select a client first"}
                </option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="app-label">Section</label>
              <select
                value={sectionId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  setProjectId("");
                  setAssigneeId("");
                  setParentId("");
                  setPrTransactionType("");
                }}
                className="app-input"
                required
              >
                <option value="">Select section</option>
                {sectionOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
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
                  {user.role === "CEO"
                    ? "Select manager or employee"
                    : "Select employee"}
                </option>
                {assigneeOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.role === "MANAGER" ? " (Manager)" : ""}
                  </option>
                ))}
              </select>
              {user.role === "CEO" &&
                projectId &&
                assigneeOptions.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    No eligible assignee found in this section.
                  </p>
                )}
            </div>
          </div>

          {isPublicRelationsSection && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-900">
                Public Relations - معاملات حكومية
              </div>

              <div>
                <label className="app-label">نوع المعاملة</label>
                <select
                  value={prTransactionType}
                  onChange={(e) => setPrTransactionType(e.target.value)}
                  className="app-input"
                >
                  <option value="">اختر نوع المعاملة</option>
                  <option value={GOVERNMENT_TRANSACTION_TYPE_AR}>
                    {GOVERNMENT_TRANSACTION_TYPE_AR}
                  </option>
                </select>
              </div>

              {shouldShowGovernmentFields && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="app-label">اسم الشركة</label>
                    <input
                      value={prCompanyName}
                      onChange={(e) => setPrCompanyName(e.target.value)}
                      className="app-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="app-label">الجهة الحكومية</label>
                    <input
                      value={prGovernmentEntity}
                      onChange={(e) => setPrGovernmentEntity(e.target.value)}
                      className="app-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="app-label">موظف الجهة الحكومية</label>
                    <input
                      value={prGovernmentEmployee}
                      onChange={(e) => setPrGovernmentEmployee(e.target.value)}
                      className="app-input"
                    />
                  </div>

                  <div>
                    <label className="app-label">رقم الطلب</label>
                    <input
                      value={prApplicationNumber}
                      onChange={(e) => setPrApplicationNumber(e.target.value)}
                      className="app-input"
                    />
                  </div>

                  <div>
                    <label className="app-label">الرقم الضريبي</label>
                    <input
                      value={prTaxIdNumber}
                      onChange={(e) => setPrTaxIdNumber(e.target.value)}
                      className="app-input"
                    />
                  </div>

                  <div>
                    <label className="app-label">الرقم الوطني</label>
                    <input
                      value={prNationalIdNumber}
                      onChange={(e) => setPrNationalIdNumber(e.target.value)}
                      className="app-input"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="app-label">الملاحظات</label>
                    <textarea
                      value={prNotes}
                      onChange={(e) => setPrNotes(e.target.value)}
                      rows={3}
                      className="app-input"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="app-label">المستجدات</label>
                    <textarea
                      value={prUpdates}
                      onChange={(e) => setPrUpdates(e.target.value)}
                      rows={3}
                      className="app-input"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {user.role === "MANAGER" && (
            <div>
              <label className="app-label">Parent Main Task (from CEO)</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="app-input"
              >
                <option value="">Optional</option>
                {parentTaskOptions.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              {parentTaskOptions.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">
                  No CEO main task found for your section yet.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="app-label">Deadline (Date)</label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="app-label">Hours</label>
              <input
                type="number"
                min="0"
                max="23"
                value={deadlineHours}
                onChange={(e) => {
                  const val = Math.max(
                    0,
                    Math.min(23, Number(e.target.value) || 0),
                  );
                  setDeadlineHours(String(val));
                }}
                className="app-input"
              />
            </div>

            <div>
              <label className="app-label">Minutes</label>
              <input
                type="number"
                min="0"
                max="59"
                value={deadlineMinutes}
                onChange={(e) => {
                  const val = Math.max(
                    0,
                    Math.min(59, Number(e.target.value) || 0),
                  );
                  setDeadlineMinutes(String(val));
                }}
                className="app-input"
              />
            </div>

            <div>
              <label className="app-label">Seconds</label>
              <input
                type="number"
                min="0"
                max="59"
                value={deadlineSeconds}
                onChange={(e) => {
                  const val = Math.max(
                    0,
                    Math.min(59, Number(e.target.value) || 0),
                  );
                  setDeadlineSeconds(String(val));
                }}
                className="app-input"
              />
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-4 py-2 text-sm font-medium"
            >
              {saving ? "Creating..." : "Create Task"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/tasks")}
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
