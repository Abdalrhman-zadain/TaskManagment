import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api, { getBackendUrl } from "../api/client";

function statusBadge(status) {
  if (status === "DONE") return "bg-emerald-50 text-emerald-700";
  if (status === "PENDING_APPROVAL") return "bg-amber-50 text-amber-700";
  if (status === "IN_PROGRESS") return "bg-blue-50 text-blue-700";
  if (status === "LATE") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [linkInput, setLinkInput] = useState("");
  const [activeEvidenceIndex, setActiveEvidenceIndex] = useState(0);
  const fileInputRef = useRef(null);
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
    if (!task.evidenceUrl && !task.evidenceUrls?.length) {
      alert(
        "Please upload evidence (photo or video) first before marking the task as complete.",
      );
      return;
    }

    try {
      await api.patch(`/tasks/${id}/done`);
      alert("Task marked as complete. Waiting for approval.");
      loadTask();
    } catch (err) {
      alert(err.response?.data?.error || "Error");
    }
  }

  function formatFileSize(size) {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size} B`;
  }

  function getFileExtension(name = "") {
    const parts = name.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  }

  function getFileTypeLabel(file) {
    const extension = getFileExtension(file.name);
    if (["jpg", "jpeg", "png"].includes(extension)) return "Image";
    if (["mp4", "mov"].includes(extension)) return "Video";
    if (["ppt", "pptx"].includes(extension)) return "Presentation";
    if (["xls", "xlsx"].includes(extension)) return "Spreadsheet";
    if (extension === "pdf") return "PDF";
    return "File";
  }

  function getFileKey(file) {
    return `${file.name}-${file.size}-${file.lastModified}-${file.type}`;
  }

  function getEvidenceTypeLabel(evidenceUrl) {
    if (/^https?:\/\//i.test(evidenceUrl)) return "Link";
    if (/\.(jpg|jpeg|png)$/i.test(evidenceUrl)) return "Image";
    if (/\.(mp4|mov)$/i.test(evidenceUrl)) return "Video";
    if (/\.(ppt|pptx)$/i.test(evidenceUrl)) return "Presentation";
    if (/\.(xls|xlsx)$/i.test(evidenceUrl)) return "Spreadsheet";
    if (/\.pdf$/i.test(evidenceUrl)) return "PDF";
    return "File";
  }

  function getEvidenceFileName(evidenceUrl) {
    return evidenceUrl.split("/").pop() || evidenceUrl;
  }

  function canPreviewImage(evidenceUrl) {
    return (
      !/^https?:\/\//i.test(evidenceUrl) &&
      /\.(jpg|jpeg|png)$/i.test(evidenceUrl)
    );
  }

  function canPreviewVideo(evidenceUrl) {
    return (
      !/^https?:\/\//i.test(evidenceUrl) && /\.(mp4|mov)$/i.test(evidenceUrl)
    );
  }

  function getEvidenceHref(evidenceUrl) {
    return /^https?:\/\//i.test(evidenceUrl)
      ? evidenceUrl
      : `${getBackendUrl()}${evidenceUrl}`;
  }

  function getEvidenceLinkLabel(evidenceUrl) {
    const type = getEvidenceTypeLabel(evidenceUrl);
    if (type === "Image") return "Open image evidence";
    if (type === "Video") return "Open video evidence";
    if (type === "PDF") return "Open PDF evidence";
    if (type === "Presentation") return "Open presentation evidence";
    if (type === "Spreadsheet") return "Open spreadsheet evidence";
    if (type === "Link") return "Open link";
    return "Open evidence";
  }

  function handleFileSelection(e) {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((currentFiles) => {
      const fileMap = new Map(
        currentFiles.map((file) => [getFileKey(file), file]),
      );
      files.forEach((file) => {
        fileMap.set(getFileKey(file), file);
      });
      return Array.from(fileMap.values());
    });
    e.target.value = "";
  }

  function removeSelectedFile(indexToRemove) {
    setSelectedFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== indexToRemove),
    );
  }

  function addLink() {
    const trimmedLink = linkInput.trim();
    if (!trimmedLink) return;

    try {
      const parsedUrl = new URL(trimmedLink);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        alert("Please enter a valid http or https URL.");
        return;
      }

      setSelectedLinks((currentLinks) =>
        currentLinks.includes(parsedUrl.toString())
          ? currentLinks
          : [...currentLinks, parsedUrl.toString()],
      );
      setLinkInput("");
    } catch {
      alert("Please enter a valid URL.");
    }
  }

  function removeSelectedLink(linkToRemove) {
    setSelectedLinks((currentLinks) =>
      currentLinks.filter((link) => link !== linkToRemove),
    );
  }

  async function handleFileUpload() {
    if (selectedFiles.length === 0 && selectedLinks.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("links", JSON.stringify(selectedLinks));
    formData.append("taskId", id);

    setUploading(true);
    try {
      await api.post("/evidence/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Evidence uploaded successfully!");
      setSelectedFiles([]);
      setSelectedLinks([]);
      setLinkInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadTask();
    } catch (err) {
      alert(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function approveTask() {
    if (
      customScore !== "" &&
      (Number(customScore) < 1 || Number(customScore) > 10)
    ) {
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

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!task) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        Task not found
      </div>
    );
  }

  const isOverdue =
    new Date(task.deadline) < new Date() && task.status !== "DONE";
  const daysLeft = Math.ceil((new Date(task.deadline) - new Date()) / 86400000);
  const isAssignee = user.id === task.assigneeId;
  const isCreator = user.id === task.creatorId;
  const isPendingApproval = task.status === "PENDING_APPROVAL";
  const evidenceFiles = task.evidenceUrls?.length
    ? task.evidenceUrls.map((url) => ({
        url,
        name: getEvidenceFileName(url),
        type: getEvidenceTypeLabel(url),
      }))
    : task.evidenceUrl
      ? [
          {
            url: task.evidenceUrl,
            name: getEvidenceFileName(task.evidenceUrl),
            type: getEvidenceTypeLabel(task.evidenceUrl),
          },
        ]
      : [];
  const activeEvidenceFile =
    evidenceFiles[activeEvidenceIndex] || evidenceFiles[0] || null;

  const role =
    user.role === "CEO"
      ? "CEO"
      : user.role === "MANAGER"
        ? "Manager"
        : user.role === "CLIENT"
          ? "Client"
          : "Employee";

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar role={role} />
      <main className="flex-1 overflow-y-auto p-7">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-1 text-xs text-slate-500 transition hover:text-slate-900"
        >
          ← Back
        </button>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <div className="app-panel p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <h1 className="text-xl font-bold leading-snug text-slate-900">
                  {task.title}
                </h1>
                <span
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${statusBadge(task.status)}`}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>

              {task.description && (
                <p className="mb-6 text-sm leading-relaxed text-slate-600">
                  {task.description}
                </p>
              )}

              {evidenceFiles.length > 0 && (
                <div className="mb-6 border-b border-slate-200 pb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-900">
                      Evidence
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveEvidenceIndex(0);
                          setShowEvidenceModal(true);
                        }}
                        className="btn-primary px-2 py-1 text-xs"
                      >
                        View Full
                      </button>
                      {isAssignee &&
                        (task.status === "PENDING_APPROVAL" ||
                          task.status === "IN_PROGRESS" ||
                          task.status === "TODO") && (
                          <button
                            onClick={deleteEvidence}
                            disabled={uploading}
                            className="rounded bg-rose-600 px-2 py-1 text-xs text-white transition disabled:opacity-50 hover:bg-rose-700"
                          >
                            Delete
                          </button>
                        )}
                    </div>
                  </div>
                  <div
                    className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300"
                    onClick={() => {
                      setActiveEvidenceIndex(0);
                      setShowEvidenceModal(true);
                    }}
                  >
                    {canPreviewImage(evidenceFiles[0]?.url || "") ? (
                      <img
                        src={getEvidenceHref(evidenceFiles[0].url)}
                        alt={evidenceFiles[0].name}
                        className="h-auto max-w-full rounded"
                      />
                    ) : canPreviewVideo(evidenceFiles[0]?.url || "") ? (
                      <div
                        className="flex items-center justify-center rounded bg-slate-100 p-4"
                        style={{ minHeight: "200px" }}
                      >
                        <div className="text-center">
                          <div className="mb-2 text-3xl">Video</div>
                          <div className="text-sm text-slate-700">
                            Video Evidence
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Click to view
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                        {evidenceFiles[0]?.name}
                      </div>
                    )}
                    <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                      {evidenceFiles.map((file, index) => (
                        <div
                          key={`${file.url}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900">
                              {file.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {file.type}
                            </div>
                          </div>
                          <a
                            href={getEvidenceHref(file.url)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0 text-xs font-medium text-[#1275e2] hover:text-[#0f63c0]"
                          >
                            {getEvidenceLinkLabel(file.url)}
                          </a>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Uploaded:{" "}
                      {new Date(task.evidenceUploadedAt).toLocaleString()} ·
                      Click to expand
                    </div>
                  </div>
                </div>
              )}

              {task.approvalAt && (
                <div className="mb-6 border-b border-slate-200 pb-6">
                  <div className="mb-3 text-sm font-bold text-slate-900">
                    Approval Status
                  </div>
                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      task.approvalStatus === "APPROVED"
                        ? "border-emerald-200 bg-emerald-50"
                        : task.approvalStatus === "REJECTED"
                          ? "border-rose-200 bg-rose-50"
                          : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="font-semibold capitalize text-slate-900">
                      {task.approvalStatus}
                    </div>
                    {task.approvalComment && (
                      <div className="mt-1 text-xs text-slate-600">
                        {task.approvalComment}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-5">
                <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">
                  Delegation chain
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-[#1275e2]">
                            {node.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              {node.name}
                            </div>
                            <div className="text-slate-500">{node.role}</div>
                          </div>
                        </div>
                        {i < arr.length - 1 && (
                          <span className="text-slate-400">→</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                {[
                  { label: "Assigned to", value: task.assignee?.name },
                  { label: "Section", value: task.section?.name },
                  {
                    label: "Priority",
                    value: task.priority,
                    color:
                      task.priority === "high"
                        ? "text-rose-600"
                        : task.priority === "medium"
                          ? "text-amber-700"
                          : "text-emerald-700",
                  },
                  {
                    label: "Created",
                    value: new Date(task.createdAt).toLocaleDateString(),
                  },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">
                      {m.label}
                    </div>
                    <div
                      className={`text-sm font-medium ${m.color || "text-slate-900"}`}
                    >
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              {task.subtasks?.length > 0 && (
                <div className="mb-5 border-t border-slate-200 pt-5">
                  <div className="mb-3 text-sm font-bold text-slate-900">
                    Subtasks
                    <span className="ml-2 font-normal text-slate-500">
                      {task.subtasks.filter((s) => s.status === "DONE").length}/
                      {task.subtasks.length} done
                    </span>
                  </div>
                  {task.subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 border-b border-slate-100 py-2 last:border-0"
                    >
                      <div
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] ${
                          sub.status === "DONE"
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {sub.status === "DONE" ? "✓" : ""}
                      </div>
                      <span
                        className={`flex-1 text-sm ${sub.status === "DONE" ? "text-slate-400 line-through" : "text-slate-800"}`}
                      >
                        {sub.title}
                      </span>
                      <span className="text-xs text-slate-500">
                        {sub.assignee?.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {task.score && (
                <div className="border-t border-slate-200 pt-5">
                  <div className="mb-2 text-sm font-bold text-slate-900">
                    Score
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-4xl font-bold ${
                        task.score.value >= 8
                          ? "text-emerald-600"
                          : task.score.value >= 5
                            ? "text-amber-600"
                            : "text-rose-600"
                      }`}
                    >
                      {task.score.value}
                    </span>
                    <span className="text-slate-500">/10</span>
                    <span
                      className={`ml-2 rounded-full px-2 py-1 text-xs ${
                        task.score.isOnTime
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {task.score.isOnTime ? "On time" : "Late"}
                    </span>
                    {task.score.adjusted && (
                      <span className="text-xs text-slate-500">
                        (manually adjusted)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div
              className={`rounded-xl border p-4 ${isOverdue ? "border-rose-200 bg-rose-50" : "border-blue-200 bg-blue-50"}`}
            >
              <div className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-500">
                Deadline
              </div>
              <div className="text-lg font-bold text-slate-900">
                {new Date(task.deadline).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div
                className={`mt-1 text-xs ${
                  isOverdue
                    ? "text-rose-600"
                    : daysLeft <= 2
                      ? "text-amber-700"
                      : "text-blue-700"
                }`}
              >
                {isOverdue
                  ? `${Math.abs(daysLeft)} days overdue`
                  : daysLeft === 0
                    ? "Due today!"
                    : `${daysLeft} days remaining`}
              </div>
            </div>

            {isAssignee &&
              (task.status === "TODO" ||
                task.status === "IN_PROGRESS" ||
                task.status === "PENDING_APPROVAL") &&
              evidenceFiles.length === 0 && (
                <div className="app-panel p-4">
                  <div className="mb-3 text-sm font-bold text-slate-900">
                    Upload Evidence
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.mp4,.mov,.ppt,.pptx,.xls,.xlsx,.pdf"
                    multiple
                    onChange={handleFileSelection}
                    disabled={uploading}
                    className="w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#1275e2] file:px-3 file:py-1.5 file:text-white hover:file:bg-[#0f63c0] disabled:opacity-50"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    JPG, PNG, MP4, MOV, PPT, PPTX, XLS, XLSX, PDF (max 100MB per
                    file)
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {selectedFiles.length === 1
                      ? "1 file selected"
                      : `${selectedFiles.length} files selected`}
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${file.size}-${index}`}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-[#1275e2]">
                                {getFileTypeLabel(file) === "Video"
                                  ? "VID"
                                  : getFileTypeLabel(file) === "Presentation"
                                    ? "PPT"
                                    : getFileTypeLabel(file) === "Spreadsheet"
                                      ? "XLS"
                                      : getFileTypeLabel(file) === "PDF"
                                        ? "PDF"
                                        : "IMG"}
                              </span>
                              <span className="truncate">{file.name}</span>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {formatFileSize(file.size)} ·{" "}
                              {getFileTypeLabel(file)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(index)}
                            className="ml-3 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600 transition hover:bg-rose-500 hover:text-white"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="mb-2 block text-xs font-medium text-slate-700">
                      External Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="https://example.com/file"
                        className="app-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={addLink}
                        className="btn-primary px-4 py-2 text-xs"
                      >
                        Add Link
                      </button>
                    </div>
                  </div>
                  {selectedLinks.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {selectedLinks.map((link) => (
                        <div
                          key={link}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-[#1275e2]">
                                LNK
                              </span>
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate text-[#1275e2] hover:text-[#0f63c0]"
                              >
                                {link}
                              </a>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Link
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSelectedLink(link)}
                            className="ml-3 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600 transition hover:bg-rose-500 hover:text-white"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleFileUpload}
                    disabled={
                      uploading ||
                      (selectedFiles.length === 0 && selectedLinks.length === 0)
                    }
                    className="mt-3 w-full rounded-lg bg-[#1275e2] py-2.5 text-sm font-medium text-white transition hover:bg-[#0f63c0] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? "Uploading..." : "Upload Evidence"}
                  </button>
                </div>
              )}

            {isAssignee &&
              (task.status === "TODO" || task.status === "IN_PROGRESS") && (
                <div className="app-panel p-4">
                  <button
                    onClick={markDone}
                    className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                  >
                    Mark Complete & Submit
                  </button>
                  <div className="mt-2 text-center text-xs text-slate-500">
                    {!isOverdue
                      ? "Submit on time for a score of 8-10"
                      : "Late submission: score will be lower"}
                  </div>
                </div>
              )}

            {isPendingApproval && isCreator && evidenceFiles.length > 0 && (
              <div className="app-panel p-4">
                <div className="mb-3 text-sm font-bold text-slate-900">
                  Approve or Reject
                </div>

                <div className="mb-3">
                  {["CEO", "MANAGER"].includes(user.role) && (
                    <input
                      type="number"
                      min="1"
                      max="10"
                      placeholder="Custom Score (1-10, overrides auto-score)"
                      value={customScore}
                      onChange={(e) => setCustomScore(e.target.value)}
                      className="app-input mb-2 text-xs"
                    />
                  )}
                  <textarea
                    placeholder="Approval comment (optional)"
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    className="app-input resize-none text-xs"
                    rows={2}
                  />
                  <button
                    onClick={approveTask}
                    className="mt-2 w-full rounded-lg bg-emerald-600 py-2 text-xs font-medium text-white transition hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                </div>

                <div className="my-3 border-t border-slate-200" />

                <div>
                  <textarea
                    placeholder="Rejection reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="app-input resize-none text-xs"
                    rows={2}
                  />
                  <button
                    onClick={rejectTask}
                    className="mt-2 w-full rounded-lg bg-rose-600 py-2 text-xs font-medium text-white transition hover:bg-rose-700"
                  >
                    Reject & Send Back
                  </button>
                </div>
              </div>
            )}

            {task.status !== "DONE" && task.status !== "PENDING_APPROVAL" && (
              <div className="app-panel p-4">
                <div className="mb-3 text-sm font-bold text-slate-900">
                  Score Preview
                </div>
                {[
                  {
                    label: "On time",
                    score: "8 - 10",
                    color: "text-emerald-700",
                  },
                  {
                    label: "1-2 days late",
                    score: "5 - 7",
                    color: "text-amber-700",
                  },
                  {
                    label: "3+ days late",
                    score: "1 - 4",
                    color: "text-rose-700",
                  },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex justify-between py-1 text-xs"
                  >
                    <span className="text-slate-500">{r.label}</span>
                    <span className={`font-semibold ${r.color}`}>
                      {r.score}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="app-panel p-4">
              <div className="mb-3 text-sm font-bold text-slate-900">
                Task Info
              </div>
              {[
                { label: "Created by", value: task.creator?.name },
                ...(task.project?.client?.name
                  ? [{ label: "Client", value: task.project.client.name }]
                  : []),
                { label: "Section", value: task.section?.name },
                {
                  label: "Subtasks",
                  value: `${task.subtasks?.filter((s) => s.status === "DONE").length || 0} / ${task.subtasks?.length || 0} done`,
                },
              ].map((r) => (
                <div
                  key={r.label}
                  className="flex justify-between border-b border-slate-100 py-1.5 text-xs last:border-0"
                >
                  <span className="text-slate-500">{r.label}</span>
                  <span className="font-medium text-slate-900">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showEvidenceModal && activeEvidenceFile && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => {
              setShowEvidenceModal(false);
              setActiveEvidenceIndex(0);
            }}
          >
            <div
              className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-lg font-bold text-slate-900">
                  Evidence Viewer
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadTask()}
                    title="Refresh evidence"
                    className="btn-primary flex items-center gap-1 px-3 py-1.5 text-xs"
                  >
                    Refresh
                  </button>
                  {isAssignee &&
                    (task.status === "PENDING_APPROVAL" ||
                      task.status === "IN_PROGRESS" ||
                      task.status === "TODO") && (
                      <button
                        onClick={deleteEvidence}
                        disabled={uploading}
                        title="Delete evidence and re-upload"
                        className="rounded bg-rose-600 px-3 py-1.5 text-xs text-white transition disabled:opacity-50 hover:bg-rose-700"
                      >
                        Delete
                      </button>
                    )}
                  <button
                    onClick={() => {
                      setShowEvidenceModal(false);
                      setActiveEvidenceIndex(0);
                    }}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <button
                  onClick={() =>
                    setActiveEvidenceIndex((current) =>
                      Math.max(current - 1, 0),
                    )
                  }
                  disabled={activeEvidenceIndex === 0}
                  className="btn-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="min-w-0 text-center">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {activeEvidenceFile.name}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {activeEvidenceIndex + 1} of {evidenceFiles.length} ·{" "}
                    {activeEvidenceFile.type}
                  </div>
                </div>
                <button
                  onClick={() =>
                    setActiveEvidenceIndex((current) =>
                      Math.min(current + 1, evidenceFiles.length - 1),
                    )
                  }
                  disabled={activeEvidenceIndex === evidenceFiles.length - 1}
                  className="btn-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
                {canPreviewImage(activeEvidenceFile.url) ? (
                  <img
                    src={getEvidenceHref(activeEvidenceFile.url)}
                    alt={activeEvidenceFile.name}
                    className="max-h-full max-w-full rounded-lg"
                  />
                ) : canPreviewVideo(activeEvidenceFile.url) ? (
                  <video
                    controls
                    autoPlay
                    className="max-h-full max-w-full rounded-lg"
                  >
                    <source src={getEvidenceHref(activeEvidenceFile.url)} />
                    Your browser does not support video playback.
                  </video>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                    <div className="text-sm font-semibold text-slate-900">
                      {activeEvidenceFile.name}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Preview not available for this file.
                    </div>
                    <a
                      href={getEvidenceHref(activeEvidenceFile.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block text-sm font-medium text-[#1275e2] hover:text-[#0f63c0]"
                    >
                      {getEvidenceLinkLabel(activeEvidenceFile.url)}
                    </a>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <div>
                    Uploaded:{" "}
                    {new Date(task.evidenceUploadedAt).toLocaleString()}
                  </div>
                  <div>Approved: {task.approvalStatus || "Pending"}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
