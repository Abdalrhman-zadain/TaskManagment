import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

const REPORT_TYPES = [
  { value: "EMPLOYEE", label: "Employee Report" },
  { value: "MANAGER_PERSONAL", label: "Manager Report — Personal" },
  { value: "MANAGER_SECTION", label: "Manager Report — Full Section" },
];

const REPORT_DEFAULTS = {
  reportType: "EMPLOYEE",
  userId: "",
  startDate: "",
  endDate: "",
};

function isRejected(task) {
  return task.approvalStatus === "REJECTED";
}

function isLate(task) {
  return (
    task.status === "LATE" ||
    (new Date(task.deadline) < new Date() && task.status !== "DONE")
  );
}

function isPending(task) {
  return (
    ["TODO", "IN_PROGRESS", "PENDING_APPROVAL"].includes(task.status) &&
    !isRejected(task)
  );
}

function average(values) {
  if (!values.length) return 0;
  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1),
  );
}

function percentage(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

export default function CEOReportsPage() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingReport, setExportingReport] = useState(false);
  const [reportFilters, setReportFilters] = useState(REPORT_DEFAULTS);

  useEffect(() => {
    async function load() {
      try {
        const [t, u] = await Promise.all([api.get("/tasks"), api.get("/users")]);
        setTasks(t.data);
        setUsers(u.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const availablePeople = useMemo(() => {
    if (reportFilters.reportType === "EMPLOYEE") {
      return users.filter((user) => user.role === "EMPLOYEE");
    }

    return users.filter((user) => user.role === "MANAGER");
  }, [reportFilters.reportType, users]);

  useEffect(() => {
    if (
      reportFilters.userId &&
      !availablePeople.some((user) => String(user.id) === reportFilters.userId)
    ) {
      setReportFilters((current) => ({ ...current, userId: "" }));
    }
  }, [availablePeople, reportFilters.userId]);

  function updateReportFilter(key, value) {
    setReportFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetReportFilters() {
    setReportFilters(REPORT_DEFAULTS);
  }

  async function exportReport() {
    try {
      if (!reportFilters.userId) {
        alert("Please select a person.");
        return;
      }

      if (!reportFilters.startDate || !reportFilters.endDate) {
        alert("Please select a start date and end date.");
        return;
      }

      if (reportFilters.startDate > reportFilters.endDate) {
        alert("Start date cannot be after end date.");
        return;
      }

      setExportingReport(true);
      const response = await api.get("/reports/ceo", {
        responseType: "blob",
        params: reportFilters,
      });

      const fileUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = "TeamTask-Performance-Report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
    } catch (err) {
      console.error("Failed to export CEO report:", err);
      alert(err.response?.data?.error || "Failed to export the report PDF.");
    } finally {
      setExportingReport(false);
    }
  }

  const selectedUser = users.find(
    (user) => String(user.id) === reportFilters.userId,
  );

  const filteredTasks = tasks.filter((task) => {
    if (!selectedUser) return false;

    const deadlineValue = task.deadline
      ? new Date(task.deadline).toISOString().slice(0, 10)
      : "";

    if (reportFilters.startDate && deadlineValue < reportFilters.startDate) {
      return false;
    }
    if (reportFilters.endDate && deadlineValue > reportFilters.endDate) {
      return false;
    }

    if (reportFilters.reportType === "MANAGER_SECTION") {
      return task.sectionId === selectedUser.section?.id;
    }

    return task.assigneeId === selectedUser.id;
  });

  const scoredTasks = filteredTasks.filter(
    (task) => task.score && typeof task.score.value === "number",
  );

  const previewSummary =
    reportFilters.reportType === "MANAGER_SECTION"
      ? {
          total: filteredTasks.length,
          completed: filteredTasks.filter((task) => task.status === "DONE")
            .length,
          late: filteredTasks.filter(isLate).length,
          approvalRate: percentage(
            filteredTasks.filter((task) => task.approvalStatus === "APPROVED")
              .length,
            filteredTasks.filter(
              (task) =>
                task.approvalStatus !== "PENDING" ||
                task.status === "PENDING_APPROVAL",
            ).length,
          ),
        }
      : {
          total: filteredTasks.length,
          completed: filteredTasks.filter((task) => task.status === "DONE")
            .length,
          late: filteredTasks.filter(isLate).length,
          approvalRate: percentage(
            scoredTasks.filter((task) => task.score.isOnTime).length,
            scoredTasks.length,
          ),
        };

  const performanceStats = {
    pending: filteredTasks.filter(isPending).length,
    rejected: filteredTasks.filter(isRejected).length,
    averageScore: average(scoredTasks.map((task) => task.score.value)),
    level: selectedUser?.level || "-",
  };

  const reportDescription =
    reportFilters.reportType === "EMPLOYEE"
      ? "Generate a PDF for one employee with assigned tasks, outcomes, scores, and performance level."
      : reportFilters.reportType === "MANAGER_PERSONAL"
        ? "Generate a PDF for one manager with their personal task performance and score summary."
        : "Generate a PDF for one manager that includes personal performance plus full section health and employee breakdowns.";

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role="CEO" />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-7">
          <h1 className="page-title">Reporting</h1>
          <p className="page-subtitle">
            Generate focused PDF reports for one employee or one manager at a
            time.
          </p>
        </div>

        <section className="app-panel overflow-hidden p-0">
          <div className="bg-gradient-to-r from-[#0d2f63] via-[#1275e2] to-[#25a5f7] px-6 py-5 text-white">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Report Builder</h2>
                <p className="max-w-2xl text-sm text-blue-50/90">
                  {reportDescription}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm lg:flex lg:gap-6">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-blue-100">
                    Tasks
                  </div>
                  <div className="text-2xl font-semibold">
                    {previewSummary.total}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-blue-100">
                    Completed
                  </div>
                  <div className="text-2xl font-semibold">
                    {previewSummary.completed}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-blue-100">
                    Late
                  </div>
                  <div className="text-2xl font-semibold">
                    {previewSummary.late}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-blue-100">
                    {reportFilters.reportType === "MANAGER_SECTION"
                      ? "Approval Rate"
                      : "On-Time Rate"}
                  </div>
                  <div className="text-2xl font-semibold">
                    {previewSummary.approvalRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-6 py-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
              Report Type
              <select
                value={reportFilters.reportType}
                onChange={(e) =>
                  updateReportFilter("reportType", e.target.value)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#1275e2]"
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
              Person
              <select
                value={reportFilters.userId}
                onChange={(e) => updateReportFilter("userId", e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#1275e2]"
              >
                <option value="">
                  {reportFilters.reportType === "EMPLOYEE"
                    ? "Select Employee"
                    : "Select Manager"}
                </option>
                {availablePeople.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
              Start Date
              <input
                type="date"
                value={reportFilters.startDate}
                onChange={(e) =>
                  updateReportFilter("startDate", e.target.value)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#1275e2]"
              />
            </label>

            <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
              End Date
              <input
                type="date"
                value={reportFilters.endDate}
                onChange={(e) => updateReportFilter("endDate", e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#1275e2]"
              />
            </label>
          </div>

          <div className="grid gap-4 border-t border-slate-200 bg-slate-50/80 px-6 py-5 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Pending
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {performanceStats.pending}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Rejected
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {performanceStats.rejected}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Average Score
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {performanceStats.averageScore}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Level
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {performanceStats.level}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              One person per report. The PDF is generated on the Node.js backend
              and reflects the selected date range.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={resetReportFilters}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Reset
              </button>
              <button
                onClick={exportReport}
                disabled={exportingReport}
                className="rounded-xl bg-[#1275e2] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0f67ca] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingReport ? "Generating PDF..." : "Generate PDF"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
