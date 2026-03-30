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
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-400">
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
    <div className="flex min-h-screen bg-white text-slate-900">
      <Sidebar role={role} />

      <main className="flex-1 p-7 overflow-y-auto">
        <h1 className="text-xl font-bold mb-7">My Profile</h1>

        <div className="flex gap-5">
          <div className="w-64 flex-shrink-0 bg-white/4 border border-white/8 rounded-xl p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold mb-3 ring-4 ring-blue-500/20">
              {profile.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="font-bold text-base">{profile.name}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {profile.section?.name || "No section"} · {profile.role}
            </div>

            {showsPerformance && (
              <>
                <div
                  className={`w-full mt-5 rounded-xl p-4 border ${
                    profile.level === "GOLD"
                      ? "bg-yellow-500/8 border-yellow-500/20"
                      : profile.level === "SILVER"
                        ? "bg-slate-400/8 border-slate-400/20"
                        : "bg-amber-800/10 border-amber-700/20"
                  }`}
                >
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">
                    Current Level
                  </div>
                  <div
                    className={`text-xl font-bold ${
                      profile.level === "GOLD"
                        ? "text-yellow-400"
                        : profile.level === "SILVER"
                          ? "text-slate-300"
                          : "text-amber-600"
                    }`}
                  >
                    {profile.level}
                  </div>
                  <div className="flex justify-center gap-0.5 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-base ${
                          star <= profile.stars ? "text-yellow-400" : "text-white/10"
                        }`}
                      >
                        *
                      </span>
                    ))}
                  </div>
                </div>

                <div className="w-full border-t border-white/8 mt-5 pt-5">
                  <div className="flex justify-around">
                    {[
                      { value: totalScore, label: "Total Score" },
                      { value: profile.onTimeCount, label: "On Time" },
                      { value: scores.length, label: "Total Tasks" },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <div className="text-lg font-bold">{stat.value}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="text-xs text-slate-500 mt-4">
              Member since{" "}
              {new Date(profile.createdAt).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>

          {showsPerformance ? (
            <div className="flex-1 flex flex-col gap-4">
              <div className="bg-white/4 border border-white/8 rounded-xl p-5">
                <div className="text-sm font-bold mb-4">Score History</div>
                {scores.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No scores yet. Complete tasks to see your scores here.
                  </p>
                ) : (
                  <div className="flex items-end gap-2 h-20">
                    {scores
                      .slice(0, 10)
                      .reverse()
                      .map((score, index) => (
                        <div key={index} className="flex flex-col items-center gap-1 flex-1">
                          <div className="text-[9px] font-semibold text-white">{score.value}</div>
                          <div
                            className={`w-full rounded-t min-h-1 ${
                              score.value >= 8
                                ? "bg-green-400"
                                : score.value >= 5
                                  ? "bg-amber-400"
                                  : "bg-red-400"
                            }`}
                            style={{ height: `${(score.value / 10) * 64}px` }}
                          />
                          <div className="text-[8px] text-slate-500">T{index + 1}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="bg-white/4 border border-white/8 rounded-xl p-5">
                <div className="text-sm font-bold mb-4">Star Milestones</div>
                <div className="h-2 bg-white/8 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-yellow-400 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  {milestones.map((milestone) => (
                    <div key={milestone.tasks} className="text-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mx-auto mb-1 ${
                          profile.onTimeCount >= milestone.tasks
                            ? "bg-yellow-400"
                            : "bg-white/15 border border-white/25"
                        }`}
                      />
                      <div className="text-[9px] text-slate-400">{milestone.tasks} tasks</div>
                      <div className="text-[9px] text-yellow-500">{milestone.label}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-400 mt-3">
                  {nextMilestone ? (
                    <>
                      <strong className="text-white">
                        {nextMilestone.tasks - profile.onTimeCount} more
                      </strong>{" "}
                      on-time tasks to reach the next milestone
                    </>
                  ) : (
                    <span className="text-yellow-400">All milestones reached.</span>
                  )}
                </div>
              </div>

              <div className="bg-white/4 border border-white/8 rounded-xl p-5">
                <div className="text-sm font-bold mb-3">Recent Task Scores</div>
                {scores.length === 0 ? (
                  <p className="text-sm text-slate-400">No completed tasks yet.</p>
                ) : (
                  scores.slice(0, 6).map((score, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 py-2.5 border-b border-white/8 last:border-0"
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          score.isOnTime ? "bg-green-400" : "bg-red-400"
                        }`}
                      />
                      <div className="flex-1 text-sm">{score.task?.title}</div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          score.value >= 8
                            ? "bg-green-500/15 text-green-400"
                            : score.value >= 5
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {score.value}/10
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(score.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-white/8 rounded-xl bg-white/4 p-10">
              <div className="text-slate-400 text-center max-w-xl">
                <div className="text-4xl mb-4 text-white/80">
                  {profile.role === "CLIENT" ? "Client" : "CEO"}
                </div>
                <div className="text-2xl font-bold text-white mb-2">
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
