import { useNavigate } from "react-router-dom";

const statusStyles = {
  TODO: "bg-slate-100 text-slate-500",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  DONE: "bg-emerald-50 text-emerald-700",
  LATE: "bg-rose-50 text-rose-700",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700",
};

const statusDot = {
  TODO: "bg-slate-300",
  IN_PROGRESS: "bg-[#1275e2]",
  DONE: "bg-emerald-500",
  LATE: "bg-rose-500",
  PENDING_APPROVAL: "bg-[#c55b00]",
};

const repeatLabels = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export default function TaskCard({ task, onMarkDone }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isOverdue = new Date(task.deadline) < new Date() && task.status !== "DONE";

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusDot[task.status] || "bg-slate-300"}`} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-slate-900">{task.title}</div>
        <div className="mt-0.5 text-sm text-slate-500">
          {task.assignee?.name} · {task.section?.name}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[task.status] || "bg-slate-100 text-slate-500"}`}>
          {String(task.status).replaceAll("_", " ")}
        </span>

        {task.score && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">
            {task.score.value}/10
          </span>
        )}

        {task.repeatType && task.repeatType !== "NONE" && (
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
            {repeatLabels[task.repeatType] || "Repeats"}
          </span>
        )}

        <span className={`text-sm ${isOverdue ? "font-semibold text-rose-600" : "text-slate-500"}`}>
          {new Date(task.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>

        {user.id === task.assigneeId && task.status !== "DONE" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkDone && onMarkDone(task.id);
            }}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 opacity-0 transition group-hover:opacity-100"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
