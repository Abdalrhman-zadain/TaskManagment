import Sidebar from "../components/Sidebar";

export default function CalendarPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}"); //

  const role =
    user.role === "CEO"
      ? "CEO"
      : user.role === "MANAGER"
        ? "Manager"
        : "Employee";

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role={role} />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#5f78a3]">
            Planning
          </div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Calendar</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            This is the first step of the calendar feature. In the next step, we
            will load real tasks and place them on their deadline dates.
          </p>
        </div>

        <section className="app-panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Month View
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Placeholder layout for the upcoming task calendar.
              </div>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#1275e2]">
              Step 1
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {day}
              </div>
            ))}

            {Array.from({ length: 35 }, (_, index) => (
              <div
                key={index}
                className="min-h-[120px] rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="text-xs font-medium text-slate-400">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
