import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

function isPublicRelationsSectionName(sectionName = "") {
  const normalized = String(sectionName).trim().toLowerCase();
  return normalized === "public relations" || normalized === "العلاقات العامة";
}

function roleLabel(user) {
  if (user.role === "CEO") return "CEO";
  if (user.role === "MANAGER") return "Manager";
  return "Employee";
}

function assigneeLabel(option, currentUser) {
  const suffixes = [];

  if (option.id === currentUser.id) suffixes.push("You");
  if (option.role === "MANAGER") suffixes.push("Manager");
  if (option.role === "CEO") suffixes.push("CEO");

  return suffixes.length ? `${option.name} (${suffixes.join(", ")})` : option.name;
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const weekdayOptions = [
  { value: "SUNDAY", label: "Sunday" },
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
];

const maxRecurringTasks = 120;

function addRepeatInterval(date, repeatType, repeatEvery) {
  const next = new Date(date);

  if (repeatType === "WEEKLY") {
    next.setDate(next.getDate() + repeatEvery * 7);
  }

  return next;
}

function getWeekdayValueFromDate(date) {
  return weekdayOptions[date.getDay()]?.value || "MONDAY";
}

function getWeekStart(date) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
}

function buildWeeklyOccurrencesForWeek(weekStart, anchorDate, repeatDaysOfWeek) {
  return repeatDaysOfWeek
    .map((day) => {
      const targetWeekday = weekdayOptions.findIndex(
        (option) => option.value === day,
      );
      const occurrence = new Date(weekStart);
      occurrence.setDate(weekStart.getDate() + targetWeekday);
      occurrence.setHours(
        anchorDate.getHours(),
        anchorDate.getMinutes(),
        anchorDate.getSeconds(),
        anchorDate.getMilliseconds(),
      );
      return occurrence;
    })
    .sort((a, b) => a - b);
}

function getNextWeeklyOccurrence(startDate, repeatEvery, repeatDaysOfWeek) {
  const startWeek = getWeekStart(startDate);
  let weekOffset = 0;

  while (weekOffset <= maxRecurringTasks) {
    const targetWeekStart = new Date(startWeek);
    targetWeekStart.setDate(startWeek.getDate() + weekOffset * 7);

    const occurrences = buildWeeklyOccurrencesForWeek(
      targetWeekStart,
      startDate,
      repeatDaysOfWeek,
    );
    const nextOccurrence = occurrences.find((occurrence) => occurrence > startDate);
    if (nextOccurrence) return nextOccurrence;

    weekOffset += repeatEvery;
  }

  return null;
}

function countRecurringOccurrences(
  startDate,
  repeatType,
  repeatEvery,
  repeatUntil,
  repeatDayOfWeek,
) {
  let count = 1;
  let nextDate =
    repeatType === "WEEKLY"
      ? getNextWeeklyOccurrence(startDate, repeatEvery, repeatDayOfWeek)
      : addRepeatInterval(startDate, repeatType, repeatEvery);

  while (nextDate <= repeatUntil) {
    count += 1;
    if (count > maxRecurringTasks) return count;
    nextDate = addRepeatInterval(nextDate, repeatType, repeatEvery);
  }

  return count;
}

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function to24HourValue(hours12, period) {
  const parsed = Number(hours12);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 12) return 0;
  if (period === "AM") return parsed === 12 ? 0 : parsed;
  return parsed === 12 ? 12 : parsed + 12;
}

function byName(a, b) {
  return String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
    sensitivity: "base",
  });
}

function byTitle(a, b) {
  return String(a?.title || "").localeCompare(String(b?.title || ""), undefined, {
    sensitivity: "base",
  });
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
  const [deadlineTimeEnabled, setDeadlineTimeEnabled] = useState(false);
  const [deadlineHours, setDeadlineHours] = useState("12");
  const [deadlineMinutes, setDeadlineMinutes] = useState("00");
  const [deadlinePeriod, setDeadlinePeriod] = useState("AM");
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatDaysOfWeek, setRepeatDaysOfWeek] = useState([]);
  const [repeatUntilDate, setRepeatUntilDate] = useState("");
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
  const todayInputValue = useMemo(() => formatDateInputValue(new Date()), []);

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
      return sections.filter((s) => s.id === user.sectionId).sort(byName);
    return [...sections].sort(byName);
  }, [sections, user.role, user.sectionId]);

  const clientOptions = useMemo(
    () =>
      Array.from(
        new Map(
          projects
            .filter((project) => project.client?.id && project.client?.name)
            .map((project) => [project.client.id, project.client]),
        ).values(),
      ).sort(byName),
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
      prTransactionType.trim().length > 0,
    [isPublicRelationsSection, prTransactionType],
  );

  const assigneeOptions = useMemo(() => {
    if (user.role === "CEO") {
      if (!sectionId) return [];
      return users
        .filter(
          (u) =>
            u.id === user.id ||
            (u.section?.id === Number(sectionId) &&
              (u.role === "MANAGER" || u.role === "EMPLOYEE")),
        )
        .sort((a, b) =>
          assigneeLabel(a, user).localeCompare(assigneeLabel(b, user), undefined, {
            sensitivity: "base",
          }),
        );
    }

    const eligible = users.filter(
      (u) => u.role === "EMPLOYEE" || u.id === user.id,
    );
    if (!sectionId) return eligible.sort((a, b) => byName(a, b));
    return eligible
      .filter((u) => u.id === user.id || u.section?.id === Number(sectionId))
      .sort((a, b) =>
        assigneeLabel(a, user).localeCompare(assigneeLabel(b, user), undefined, {
          sensitivity: "base",
        }),
      );
  }, [users, sectionId, user.role, user]);

  const projectOptions = useMemo(() => {
    if (!clientId) return [];
    return projects
      .filter((project) => {
        const matchesClient = project.client?.id === Number(clientId);
        const matchesSection =
          !sectionId || project.sectionId === Number(sectionId);
        return matchesClient && matchesSection;
      })
      .sort(byName);
  }, [projects, clientId, sectionId]);

  const sectionOptions = useMemo(() => {
    if (!selectedProject) return allowedSections;
    return allowedSections
      .filter((section) => section.id === selectedProject.sectionId)
      .sort(byName);
  }, [allowedSections, selectedProject]);

  const parentTaskOptions = useMemo(() => {
    if (user.role !== "MANAGER" || !sectionId || !projectId) return [];
    return tasks
      .filter(
        (t) =>
          t.sectionId === Number(sectionId) &&
          t.project?.id === Number(projectId) &&
          !t.parentId &&
          t.assigneeId === user.id &&
          t.creator?.role === "CEO",
      )
      .sort(byTitle);
  }, [tasks, sectionId, projectId, user.role, user.id]);

  const repeatType = repeatEnabled ? "WEEKLY" : "NONE";

  useEffect(() => {
    if (!deadlineDate || !repeatEnabled) return;

    const [year, month, day] = deadlineDate.split("-").map(Number);
    const parsedDate = new Date(year, (month || 1) - 1, day || 1);
    if (Number.isNaN(parsedDate.getTime())) return;

    setRepeatDaysOfWeek((current) =>
      current.length > 0 ? current : [getWeekdayValueFromDate(parsedDate)],
    );
  }, [deadlineDate, repeatEnabled]);

  function toggleRepeatDay(dayValue) {
    setRepeatDaysOfWeek((current) => {
      if (current.includes(dayValue)) {
        return current.filter((day) => day !== dayValue);
      }
      return [...current, dayValue];
    });
  }

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

    const hours = deadlineTimeEnabled
      ? to24HourValue(deadlineHours, deadlinePeriod)
      : 0;
    const minutes = deadlineTimeEnabled ? Number(deadlineMinutes) : 0;

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
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
      0,
      0,
    );

    if (Number.isNaN(deadlineDateObj.getTime())) {
      setError("Invalid deadline date/time");
      return;
    }
    if (deadlineDateObj < new Date()) {
      setError("Deadline date/time cannot be in the past");
      return;
    }

    const deadline = deadlineDateObj.toISOString();
    const selectedRepeatType = repeatEnabled ? "WEEKLY" : "NONE";
    const repeatEveryValue = 1;
    let repeatUntil = null;

    if (selectedRepeatType !== "NONE") {
      if (!repeatUntilDate) {
        setError("Repeat until date is required");
        return;
      }

      if (repeatDaysOfWeek.length === 0) {
        setError("Please select at least one day");
        return;
      }

      const [untilYear, untilMonth, untilDay] = repeatUntilDate
        .split("-")
        .map(Number);
      const repeatUntilDateObj = new Date(
        untilYear,
        (untilMonth || 1) - 1,
        untilDay || 1,
        hours,
        minutes,
        0,
        0,
      );

      if (
        Number.isNaN(repeatUntilDateObj.getTime()) ||
        repeatUntilDateObj < deadlineDateObj
      ) {
        setError("Repeat until date must be after the first deadline");
        return;
      }

      const nextOccurrenceDate = getNextWeeklyOccurrence(
        deadlineDateObj,
        repeatEveryValue,
        repeatDaysOfWeek,
      );

      if (!nextOccurrenceDate) {
        setError("Please select at least one future repeat day");
        return;
      }

      if (repeatUntilDateObj < nextOccurrenceDate) {
        setError(
          `Repeat until must be on or after ${formatDisplayDate(
            nextOccurrenceDate,
          )} to create at least one repeated task`,
        );
        return;
      }

      const recurrenceCount = countRecurringOccurrences(
        deadlineDateObj,
        selectedRepeatType,
        repeatEveryValue,
        repeatUntilDateObj,
        repeatDaysOfWeek,
      );

      if (recurrenceCount > maxRecurringTasks) {
        setError(`Repeat settings can create at most ${maxRecurringTasks} tasks`);
        return;
      }

      repeatUntil = repeatUntilDateObj.toISOString();
    }

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

    if (
      Number(assigneeId) === user.id &&
      !window.confirm("Are you sure you want to create this task for yourself?")
    ) {
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
        repeatType: selectedRepeatType,
        repeatEvery: 1,
        repeatDaysOfWeek:
          selectedRepeatType === "WEEKLY" ? repeatDaysOfWeek : [],
        repeatUntil,
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
                    ? "Select yourself, manager, or employee"
                    : "Select yourself or employee"}
                </option>
                {assigneeOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {assigneeLabel(u, user)}
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
                Public Relations
              </div>

              <div>
                <label className="app-label">نوع المعاملة</label>
                <input
                  value={prTransactionType}
                  onChange={(e) => setPrTransactionType(e.target.value)}
                  className="app-input"
                  placeholder="اكتب نوع المعاملة"
                />
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
                min={todayInputValue}
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
                <option value="high">High</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={deadlineTimeEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDeadlineTimeEnabled(checked);
                  if (!checked) {
                    setDeadlineHours("12");
                    setDeadlineMinutes("00");
                    setDeadlinePeriod("AM");
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-[#1275e2]"
              />
              Do you want to set a deadline time?
            </label>

            {deadlineTimeEnabled && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <label className="app-label">Hour</label>
                  <select
                    value={deadlineHours}
                    onChange={(e) => setDeadlineHours(e.target.value)}
                    className="app-input"
                  >
                    {Array.from({ length: 12 }, (_, index) => {
                      const value = String(index + 1).padStart(2, "0");
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="app-label">Minute</label>
                  <select
                    value={deadlineMinutes}
                    onChange={(e) => setDeadlineMinutes(e.target.value)}
                    className="app-input"
                  >
                    {Array.from({ length: 60 }, (_, index) => {
                      const value = String(index).padStart(2, "0");
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="app-label">AM / PM</label>
                  <select
                    value={deadlinePeriod}
                    onChange={(e) => setDeadlinePeriod(e.target.value)}
                    className="app-input"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={repeatEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRepeatEnabled(checked);
                  if (!checked) {
                    setRepeatDaysOfWeek([]);
                    setRepeatUntilDate("");
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-[#1275e2]"
              />
              Do you want to repeat this task?
            </label>

            {repeatEnabled && (
              <>
                <div className="mt-4">
                  <div>
                    <label className="app-label">Repeats until</label>
                    <input
                      type="date"
                      value={repeatUntilDate}
                      min={deadlineDate || todayInputValue}
                      onChange={(e) => setRepeatUntilDate(e.target.value)}
                      className="app-input"
                      required
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="app-label">Select days</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {weekdayOptions.map((option) => {
                      const active = repeatDaysOfWeek.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleRepeatDay(option.value)}
                          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                            active
                              ? "border-[#1275e2] bg-[#1275e2] text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-[#1275e2] hover:text-[#1275e2]"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Repeats on{" "}
                  {repeatDaysOfWeek.length
                    ? repeatDaysOfWeek
                        .map(
                          (day) =>
                            weekdayOptions.find((option) => option.value === day)
                              ?.label,
                        )
                        .filter(Boolean)
                        .join(", ")
                    : "no days selected"}
                  {deadlineTimeEnabled
                    ? ` at ${deadlineHours}:${deadlineMinutes} ${deadlinePeriod}`
                    : ""}
                  . This creates separate tasks for each occurrence, so scoring
                  and completion stay independent.
                </p>
              </>
            )}
          </div>

          {!repeatEnabled && (
            <p className="text-xs text-slate-500">
              This task will be created once.
            </p>
          )}

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
