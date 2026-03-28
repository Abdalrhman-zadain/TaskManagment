import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../api/client";

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [customScore, setCustomScore] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    loadTask();
  }, [id]);

  async function loadTask() {
    try {
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function markDone() {
    try {
      const res = await api.patch(`/tasks/${id}/done`);
      alert("Task marked as complete. Waiting for approval.");
      loadTask();
    } catch (err) {
      alert(err.response?.data?.error || "Error");
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("taskId", id);

    setUploading(true);
    try {
      const res = await api.post("/evidence/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Evidence uploaded successfully!");
      loadTask();
    } catch (err) {
      alert(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function approveTask() {
    if (customScore !== "" && (Number(customScore) < 1 || Number(customScore) > 10)) {
      alert("Score must be between 1 and 10");
      return;
    }

    try {
      const res = await api.patch(`/evidence/${id}/approve`, {
        approvalComment,
        customScore: customScore !== "" ? Number(customScore) : null,
      });
      alert(`Task approved! Score: ${res.data.score.value}/10`);
      loadTask();
    } catch (err) {
      alert(err.response?.data?.error || "Error approving task");
    }
  }

  async function rejectTask() {
    try {
      await api.patch(`/evidence/${id}/reject`, {
        rejectionReason,
      });
      alert("Task rejected and sent back for revision.");
      loadTask();
    } catch (err) {
      alert(err.response?.data?.error || "Error rejecting task");
    }
  }

  async function deleteEvidence() {
    if (
      !window.confirm(
        "Are you sure you want to delete this evidence? You can re-upload a new one.",
      )
    ) {
      return;
    }

    setUploading(true);
    try {
      await api.delete(`/evidence/${id}`);
      alert("Evidence deleted. You can now upload a new one.");
      setShowEvidenceModal(false);
      loadTask();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting evidence");
    } finally {
      setUploading(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1D3A] text-slate-400">
        Loading...
      </div>
    );
  if (!task)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1D3A] text-slate-400">
        Task not found
      </div>
    );

  const isOverdue =
    new Date(task.deadline) < new Date() && task.status !== "DONE";
  const daysLeft = Math.ceil((new Date(task.deadline) - new Date()) / 86400000);
  const isAssignee = user.id === task.assigneeId;
  const isCreator = user.id === task.creatorId;
  const isPendingApproval = task.status === "PENDING_APPROVAL";

  const role =
    user.role === "CEO"
      ? "CEO"
      : user.role === "MANAGER"
        ? "Manager"
        : "Employee";

  return (
    <div className="flex min-h-screen bg-[#0F1D3A]">
      <Sidebar role={role} />
      <main className="flex-1 p-7 overflow-y-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-slate-400 hover:text-white mb-5 inline-flex items-center gap-1 transition"
        >
          ← Back
        </button>

        <div className="grid grid-cols-3 gap-5">
          {/* LEFT: Main task */}
          <div className="col-span-2">
            <div className="bg-white/4 border border-white/8 rounded-xl p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <h1 className="text-xl font-bold leading-snug">{task.title}</h1>
                <span
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 ${task.status === "DONE"
                    ? "bg-green-500/15 text-green-400"
                    : task.status === "PENDING_APPROVAL"
                      ? "bg-amber-500/15 text-amber-400"
                      : task.status === "IN_PROGRESS"
                        ? "bg-blue-500/15 text-blue-400"
                        : task.status === "LATE"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-white/8 text-slate-400"
                    }`}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>

              {task.description && (
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  {task.description}
                </p>
              )}

              {/* Evidence Section */}
              {task.evidenceUrl && (
                <div className="border-b border-white/8 pb-6 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold">📎 Evidence</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowEvidenceModal(true)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition"
                      >
                        📖 View Full
                      </button>
                      {isAssignee && task.status === "PENDING_APPROVAL" && (
                        <button
                          onClick={deleteEvidence}
                          disabled={uploading}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition disabled:opacity-50"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className="bg-white/3 border border-white/10 rounded-lg p-4 cursor-pointer hover:border-white/20 transition"
                    onClick={() => setShowEvidenceModal(true)}
                  >
                    {task.evidenceUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img
                        src={`http://localhost:5000${task.evidenceUrl}`}
                        alt="Evidence"
                        className="max-w-full h-auto rounded"
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center bg-white/5 rounded p-4"
                        style={{ minHeight: "200px" }}
                      >
                        <div className="text-center">
                          <div className="text-3xl mb-2">🎥</div>
                          <div className="text-sm text-slate-300">
                            Video Evidence
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Click to view
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 mt-2">
                      Uploaded:{" "}
                      {new Date(task.evidenceUploadedAt).toLocaleString()} •
                      Click to expand
                    </div>
                  </div>
                </div>
              )}

              {/* Approval History */}
              {task.approvalAt && (
                <div className="border-b border-white/8 pb-6 mb-6">
                  <div className="text-sm font-bold mb-3">
                    ✓ Approval Status
                  </div>
                  <div
                    className={`p-3 rounded-lg text-sm ${task.approvalStatus === "APPROVED"
                      ? "bg-green-500/10 border border-green-500/20"
                      : task.approvalStatus === "REJECTED"
                        ? "bg-red-500/10 border border-red-500/20"
                        : "bg-white/5 border border-white/10"
                      }`}
                  >
                    <div className="font-semibold capitalize">
                      {task.approvalStatus}
                    </div>
                    {task.approvalComment && (
                      <div className="text-xs text-slate-300 mt-1">
                        {task.approvalComment}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Delegation chain */}
              <div className="mb-5">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">
                  Delegation chain
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { name: task.creator?.name, role: task.creator?.role },
                    task.creator?.id !== task.assigneeId && {
                      name: task.assignee?.name,
                      role: "Assignee",
                    },
                  ]
                    .filter(Boolean)
                    .map((node, i, arr) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-xs">
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] font-bold text-blue-300">
                            {node.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium">{node.name}</div>
                            <div className="text-slate-500">{node.role}</div>
                          </div>
                        </div>
                        {i < arr.length - 1 && (
                          <span className="text-slate-500">→</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-4 mb-5 border-t border-white/8 pt-5">
                {[
                  { label: "Assigned to", value: task.assignee?.name },
                  { label: "Section", value: task.section?.name },
                  {
                    label: "Priority",
                    value: task.priority,
                    color:
                      task.priority === "high"
                        ? "text-red-400"
                        : task.priority === "medium"
                          ? "text-amber-400"
                          : "text-green-400",
                  },
                  {
                    label: "Created",
                    value: new Date(task.createdAt).toLocaleDateString(),
                  },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                      {m.label}
                    </div>
                    <div className={`text-sm font-medium ${m.color || ""}`}>
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtasks */}
              {task.subtasks?.length > 0 && (
                <div className="border-t border-white/8 pt-5 mb-5">
                  <div className="text-sm font-bold mb-3">
                    Subtasks
                    <span className="text-slate-400 font-normal ml-2">
                      {task.subtasks.filter((s) => s.status === "DONE").length}/
                      {task.subtasks.length} done
                    </span>
                  </div>
                  {task.subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 py-2 border-b border-white/8 last:border-0"
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border flex-shrink-0 ${sub.status === "DONE"
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-white/20"
                          }`}
                      >
                        {sub.status === "DONE" ? "✓" : ""}
                      </div>
                      <span
                        className={`text-sm flex-1 ${sub.status === "DONE" ? "line-through text-slate-500" : ""}`}
                      >
                        {sub.title}
                      </span>
                      <span className="text-xs text-slate-400">
                        {sub.assignee?.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Score */}
              {task.score && (
                <div className="border-t border-white/8 pt-5">
                  <div className="text-sm font-bold mb-2">Score</div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-4xl font-bold ${task.score.value >= 8
                        ? "text-green-400"
                        : task.score.value >= 5
                          ? "text-amber-400"
                          : "text-red-400"
                        }`}
                    >
                      {task.score.value}
                    </span>
                    <span className="text-slate-400">/10</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ml-2 ${task.score.isOnTime
                        ? "bg-green-500/15 text-green-400"
                        : "bg-red-500/15 text-red-400"
                        }`}
                    >
                      {task.score.isOnTime ? "✓ On time" : "✗ Late"}
                    </span>
                    {task.score.adjusted && (
                      <span className="text-xs text-slate-400">
                        (manually adjusted)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-4">
            {/* Deadline */}
            <div
              className={`border rounded-xl p-4 ${isOverdue ? "bg-red-500/7 border-red-500/20" : "bg-blue-500/7 border-blue-500/20"}`}
            >
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5">
                Deadline
              </div>
              <div className="text-lg font-bold">
                {new Date(task.deadline).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div
                className={`text-xs mt-1 ${isOverdue ? "text-red-400" : daysLeft <= 2 ? "text-amber-400" : "text-blue-400"}`}
              >
                {isOverdue
                  ? `${Math.abs(daysLeft)} days overdue`
                  : daysLeft === 0
                    ? "Due today!"
                    : `${daysLeft} days remaining`}
              </div>
            </div>

            {/* Mark Done / Upload Evidence */}
            {isAssignee &&
              (task.status === "TODO" || task.status === "IN_PROGRESS") && (
                <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                  <button
                    onClick={markDone}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 rounded-lg transition"
                  >
                    ✓ Mark Complete & Submit
                  </button>
                  <div className="text-xs text-slate-400 text-center mt-2">
                    {!isOverdue
                      ? "Submit on time for a score of 8–10"
                      : "Late submission: score will be lower"}
                  </div>
                </div>
              )}

            {/* Evidence Upload */}
            {isPendingApproval && isAssignee && !task.evidenceUrl && (
              <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                <div className="text-sm font-bold mb-3">📎 Upload Evidence</div>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="w-full text-xs text-slate-300 file:bg-blue-600 file:text-white file:border-0 file:rounded-md file:px-3 file:py-1.5 file:cursor-pointer file:hover:bg-blue-700 disabled:opacity-50"
                />
                <div className="text-xs text-slate-400 mt-2">
                  JPG, PNG, MP4, MOV (max 100MB)
                </div>
              </div>
            )}

            {/* Approval Panel (for creator) */}
            {isPendingApproval && isCreator && task.evidenceUrl && (
              <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                <div className="text-sm font-bold mb-3">
                  ✓ Approve or Reject
                </div>

                {/* Approve */}
                <div className="mb-3">
                  {['CEO', 'MANAGER'].includes(user.role) && (
                    <input
                      type="number"
                      min="1"
                      max="10"
                      placeholder="Custom Score (1-10, overrides auto-score)"
                      value={customScore}
                      onChange={(e) => setCustomScore(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-500 mb-2 focus:outline-none focus:border-green-500"
                    />
                  )}
                  <textarea
                    placeholder="Approval comment (optional)"
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-green-500 resize-none"
                    rows={2}
                  />
                  <button
                    onClick={approveTask}
                    className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 rounded-lg transition"
                  >
                    ✓ Approve
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-white/8 my-3"></div>

                {/* Reject */}
                <div>
                  <textarea
                    placeholder="Rejection reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
                    rows={2}
                  />
                  <button
                    onClick={rejectTask}
                    className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 rounded-lg transition"
                  >
                    ✗ Reject & Send Back
                  </button>
                </div>
              </div>
            )}

            {/* Score preview */}
            {task.status !== "DONE" && task.status !== "PENDING_APPROVAL" && (
              <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                <div className="text-sm font-bold mb-3">Score Preview</div>
                {[
                  {
                    label: "On time",
                    score: "8 – 10",
                    color: "text-green-400",
                  },
                  {
                    label: "1–2 days late",
                    score: "5 – 7",
                    color: "text-amber-400",
                  },
                  {
                    label: "3+ days late",
                    score: "1 – 4",
                    color: "text-red-400",
                  },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex justify-between text-xs py-1"
                  >
                    <span className="text-slate-400">{r.label}</span>
                    <span className={`font-semibold ${r.color}`}>
                      {r.score}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Task info */}
            <div className="bg-white/4 border border-white/8 rounded-xl p-4">
              <div className="text-sm font-bold mb-3">Task Info</div>
              {[
                { label: "Created by", value: task.creator?.name },
                { label: "Section", value: task.section?.name },
                {
                  label: "Subtasks",
                  value: `${task.subtasks?.filter((s) => s.status === "DONE").length || 0} / ${task.subtasks?.length || 0} done`,
                },
              ].map((r) => (
                <div
                  key={r.label}
                  className="flex justify-between text-xs py-1.5 border-b border-white/8 last:border-0"
                >
                  <span className="text-slate-400">{r.label}</span>
                  <span className="font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Evidence Modal */}
        {showEvidenceModal && task.evidenceUrl && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEvidenceModal(false)}
          >
            <div
              className="bg-[#1a2a4a] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/8 bg-white/3">
                <div className="text-lg font-bold">📎 Evidence Viewer</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadTask()}
                    title="Refresh evidence"
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition flex items-center gap-1"
                  >
                    🔄 Refresh
                  </button>
                  {isAssignee && task.status === "PENDING_APPROVAL" && (
                    <button
                      onClick={deleteEvidence}
                      disabled={uploading}
                      title="Delete evidence and re-upload"
                      className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition disabled:opacity-50"
                    >
                      🗑️ Delete
                    </button>
                  )}
                  <button
                    onClick={() => setShowEvidenceModal(false)}
                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
                {task.evidenceUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <img
                    src={`http://localhost:5000${task.evidenceUrl}`}
                    alt="Evidence"
                    className="max-w-full max-h-full rounded-lg"
                  />
                ) : (
                  <video
                    controls
                    autoPlay
                    className="max-w-full max-h-full rounded-lg"
                  >
                    <source src={`http://localhost:5000${task.evidenceUrl}`} />
                    Your browser does not support video playback.
                  </video>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/8 bg-white/3 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <div>
                    Uploaded:{" "}
                    {new Date(task.evidenceUploadedAt).toLocaleString()}
                  </div>
                  <div className="text-slate-500">
                    Approved: {task.approvalStatus || "Pending"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
