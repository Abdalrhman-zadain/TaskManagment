import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

export default function Profile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role =
    user.role === "CEO"
      ? "CEO"
      : user.role === "MANAGER"
        ? "Manager"
        : user.role === "CLIENT"
          ? "Client"
          : "Employee";

  useEffect(() => {
    api
      .get(id ? `/users/${id}` : "/users/me")
      .then((res) => setProfile(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!profile) return null;

  const scores = profile.scores || [];
  const showsPerformance = profile.role === "MANAGER" || profile.role === "EMPLOYEE";
  const totalScore = scores.reduce((sum, score) => sum + score.value, 0);

  const milestones = [
    { tasks: 5, stars: 1, label: "1 Star" },
    { tasks: 10, stars: 2, label: "2 Stars" },
    { tasks: 20, stars: 3, label: "3 Stars" },
    { tasks: 25, stars: 4, label: "4 Stars" },
    { tasks: 30, stars: 5, label: "5 Stars" },
  ];

  const nextMilestone = milestones.find((milestone) => profile.onTimeCount < milestone.tasks);
  const progressPercent = nextMilestone
    ? Math.min(100, Math.round((profile.onTimeCount / nextMilestone.tasks) * 100))
    : 100;

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role={role} />

      <main className="flex-1 overflow-y-auto p-7">
        <h1 className="page-title mb-7">My Profile</h1>

        <div className="flex gap-5">
          <div className="app-panel flex w-64 flex-shrink-0 flex-col items-center p-6 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#1275e2] to-[#5f78a3] text-2xl font-bold text-white ring-4 ring-blue-100">
              {profile.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="text-base font-bold text-slate-900">{profile.name}</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {profile.section?.name || "No section"} · {profile.role}
            </div>

            {showsPerformance && (
              <>
                <div
                  className={`mt-5 w-full rounded-xl border p-4 ${
                    profile.level === "GOLD"
                      ? "border-yellow-200 bg-yellow-50"
                      : profile.level === "SILVER"
                        ? "border-slate-200 bg-slate-50"
                        : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">
                    Current Level
                  </div>
                  <div
                    className={`text-xl font-bold ${
                      profile.level === "GOLD"
                        ? "text-yellow-600"
                        : profile.level === "SILVER"
                          ? "text-slate-600"
                          : "text-amber-700"
                    }`}
                  >
                    {profile.level}
                  </div>
                  <div className="mt-2 flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-base ${
                          star <= profile.stars ? "text-yellow-500" : "text-slate-200"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 w-full border-t border-slate-200 pt-5">
                  <div className="flex justify-around">
                    {[
                      { value: totalScore, label: "Total Score" },
                      { value: profile.onTimeCount, label: "On Time" },
                      { value: scores.length, label: "Total Tasks" },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <div className="text-lg font-bold text-slate-900">{stat.value}</div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="mt-4 text-xs text-slate-500">
              Member since{" "}
              {new Date(profile.createdAt).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>

          {showsPerformance ? (
            <div className="flex flex-1 flex-col gap-4">
              <div className="app-panel p-5">
                <div className="mb-4 text-sm font-bold text-slate-900">Score History</div>
                {scores.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No scores yet. Complete tasks to see your scores here.
                  </p>
                ) : (
                  <div className="flex h-20 items-end gap-2">
                    {scores
                      .slice(0, 10)
                      .reverse()
                      .map((score, index) => (
                        <div key={index} className="flex flex-1 flex-col items-center gap-1">
                          <div className="text-[9px] font-semibold text-slate-700">{score.value}</div>
                          <div
                            className={`min-h-1 w-full rounded-t ${
                              score.value >= 8
                                ? "bg-emerald-400"
                                : score.value >= 5
                                  ? "bg-amber-400"
                                  : "bg-rose-400"
                            }`}
                            style={{ height: `${(score.value / 10) * 64}px` }}
                          />
                          <div className="text-[8px] text-slate-500">T{index + 1}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="app-panel p-5">
                <div className="mb-4 text-sm font-bold text-slate-900">Star Milestones</div>
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1275e2] to-[#c55b00] transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  {milestones.map((milestone) => (
                    <div key={milestone.tasks} className="text-center">
                      <div
                        className={`mx-auto mb-1 h-2.5 w-2.5 rounded-full ${
                          profile.onTimeCount >= milestone.tasks
                            ? "bg-yellow-500"
                            : "border border-slate-300 bg-slate-100"
                        }`}
                      />
                      <div className="text-[9px] text-slate-500">{milestone.tasks} tasks</div>
                      <div className="text-[9px] text-amber-700">{milestone.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {nextMilestone ? (
                    <>
                      <strong className="text-slate-900">
                        {nextMilestone.tasks - profile.onTimeCount} more
                      </strong>{" "}
                      on-time tasks to reach the next milestone
                    </>
                  ) : (
                    <span className="text-yellow-600">All milestones reached.</span>
                  )}
                </div>
              </div>

              <div className="app-panel p-5">
                <div className="mb-3 text-sm font-bold text-slate-900">Recent Task Scores</div>
                {scores.length === 0 ? (
                  <p className="text-sm text-slate-500">No completed tasks yet.</p>
                ) : (
                  scores.slice(0, 6).map((score, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0"
                    >
                      <div
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${
                          score.isOnTime ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      <div className="flex-1 text-sm text-slate-800">{score.task?.title}</div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          score.value >= 8
                            ? "bg-emerald-50 text-emerald-700"
                            : score.value >= 5
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {score.value}/10
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(score.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="app-panel flex flex-1 items-center justify-center p-10">
              <div className="max-w-xl text-center text-slate-500">
                <div className="mb-4 text-4xl text-slate-400">
                  {profile.role === "CLIENT" ? "Client" : "CEO"}
                </div>
                <div className="mb-2 text-2xl font-bold text-slate-900">
                  {profile.role === "CLIENT" ? "Client Account" : "CEO Overview"}
                </div>
                <div className="text-base leading-relaxed">
                  {profile.role === "CLIENT"
                    ? "This account can sign in with email and password and access the client dashboard."
                    : "As the CEO, you have full administrative control and do not participate in the scoring system."}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
