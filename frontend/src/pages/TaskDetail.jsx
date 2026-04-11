import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { i18n } = useTranslation();
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
  const [evidenceNoteInput, setEvidenceNoteInput] = useState("");
  const [activeEvidenceIndex, setActiveEvidenceIndex] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const fileInputRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isArabic = i18n.language?.startsWith("ar");
  const tx = (ar, en) => (isArabic ? ar : en);

  useEffect(() => {
    loadTask();
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function loadTask() {
    try {
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
      setEvidenceNoteInput(res.data.evidenceNote || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function markDone() {
    if (!task.evidenceUrl && !task.evidenceUrls?.length) {
      alert(
        tx(
          "يرجى رفع الإثبات (صورة أو فيديو) قبل تعليم المهمة كمكتملة.",
          "Please upload evidence (photo or video) first before marking the task as complete.",
        ),
      );
      return;
    }

    try {
      await api.patch(`/tasks/${id}/done`);
      alert(
        tx(
          "تم إرسال المهمة كمكتملة وبانتظار الاعتماد.",
          "Task marked as complete. Waiting for approval.",
        ),
      );
      loadTask();
    } catch (err) {
      alert(err.response?.data?.error || tx("حدث خطأ", "Error"));
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
    if (["jpg", "jpeg", "png"].includes(extension))
      return tx("صورة", "Image");
    if (["mp4", "mov"].includes(extension)) return tx("فيديو", "Video");
    if (["ppt", "pptx"].includes(extension))
      return tx("عرض تقديمي", "Presentation");
    if (["xls", "xlsx"].includes(extension))
      return tx("جدول بيانات", "Spreadsheet");
    if (extension === "pdf") return "PDF";
    return tx("ملف", "File");
  }

  function getFileKey(file) {
    return `${file.name}-${file.size}-${file.lastModified}-${file.type}`;
  }

  function getEvidenceTypeLabel(evidenceUrl) {
    if (/^https?:\/\//i.test(evidenceUrl)) return tx("رابط", "Link");
    if (/\.(jpg|jpeg|png)$/i.test(evidenceUrl)) return tx("صورة", "Image");
    if (/\.(mp4|mov)$/i.test(evidenceUrl)) return tx("فيديو", "Video");
    if (/\.(ppt|pptx)$/i.test(evidenceUrl))
      return tx("عرض تقديمي", "Presentation");
    if (/\.(xls|xlsx)$/i.test(evidenceUrl))
      return tx("جدول بيانات", "Spreadsheet");
    if (/\.pdf$/i.test(evidenceUrl)) return "PDF";
    return tx("ملف", "File");
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
    if (type === "Image" || type === "صورة")
      return tx("فتح إثبات الصورة", "Open image evidence");
    if (type === "Video" || type === "فيديو")
      return tx("فتح إثبات الفيديو", "Open video evidence");
    if (type === "PDF") return tx("فتح ملف PDF", "Open PDF evidence");
    if (type === "Presentation" || type === "عرض تقديمي")
      return tx("فتح العرض التقديمي", "Open presentation evidence");
    if (type === "Spreadsheet" || type === "جدول بيانات")
      return tx("فتح جدول البيانات", "Open spreadsheet evidence");
    if (type === "Link" || type === "رابط")
      return tx("فتح الرابط", "Open link");
    return tx("فتح الإثبات", "Open evidence");
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
        alert(
          tx(
            "يرجى إدخال رابط صحيح يبدأ بـ http أو https.",
            "Please enter a valid http or https URL.",
          ),
        );
        return;
      }

      setSelectedLinks((currentLinks) =>
        currentLinks.includes(parsedUrl.toString())
          ? currentLinks
          : [...currentLinks, parsedUrl.toString()],
      );
      setLinkInput("");
    } catch {
      alert(tx("يرجى إدخال رابط صحيح.", "Please enter a valid URL."));
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
    formData.append("note", evidenceNoteInput.trim());
    formData.append("taskId", id);

    setUploading(true);
    try {
      await api.post("/evidence/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(tx("تم رفع الإثبات بنجاح.", "Evidence uploaded successfully!"));
      setSelectedFiles([]);
      setSelectedLinks([]);
      setLinkInput("");
      setEvidenceNoteInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadTask();
    } catch (err) {
      alert(err.response?.data?.error || tx("فشل رفع الإثبات.", "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  async function approveTask() {
    if (
      customScore !== "" &&
      (Number(customScore) < 1 || Number(customScore) > 10)
    ) {
      alert(tx("يجب أن تكون الدرجة بين 1 و 10", "Score must be between 1 and 10"));
      return;
    }

    try {
      const res = await api.patch(`/evidence/${id}/approve`, {
        approvalComment,
        customScore: customScore !== "" ? Number(customScore) : null,
      });
      alert(
        tx(
          `تم اعتماد المهمة! الدرجة: ${res.data.score.value}/10`,
          `Task approved! Score: ${res.data.score.value}/10`,
        ),
      );
      loadTask();
    } catch (err) {
      alert(
        err.response?.data?.error || tx("حدث خطأ أثناء اعتماد المهمة", "Error approving task"),
      );
    }
  }

  async function rejectTask() {
    try {
      await api.patch(`/evidence/${id}/reject`, {
        rejectionReason,
      });
      alert(
        tx(
          "تم رفض المهمة وإعادتها للتعديل.",
          "Task rejected and sent back for revision.",
        ),
      );
      loadTask();
    } catch (err) {
      alert(
        err.response?.data?.error || tx("حدث خطأ أثناء رفض المهمة", "Error rejecting task"),
      );
    }
  }

  async function deleteEvidence() {
    if (
      !window.confirm(
        tx(
          "هل أنت متأكد من حذف هذا الإثبات؟ يمكنك رفع إثبات جديد بعد ذلك.",
          "Are you sure you want to delete this evidence? You can re-upload a new one.",
        ),
      )
    ) {
      return;
    }

    setUploading(true);
    try {
      await api.delete(`/evidence/${id}`);
      alert(
        tx(
          "تم حذف الإثبات. يمكنك الآن رفع إثبات جديد.",
          "Evidence deleted. You can now upload a new one.",
        ),
      );
      setShowEvidenceModal(false);
      setEvidenceNoteInput("");
      loadTask();
    } catch (err) {
      alert(
        err.response?.data?.error || tx("حدث خطأ أثناء حذف الإثبات", "Error deleting evidence"),
      );
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        {tx("جارٍ التحميل...", "Loading...")}
      </div>
    );
  }

  if (!task) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-slate-500">
        {tx("المهمة غير موجودة", "Task not found")}
      </div>
    );
  }

  const isOverdue =
    new Date(task.deadline) < new Date() && task.status !== "DONE";
  const daysLeft = Math.ceil((new Date(task.deadline) - new Date()) / 86400000);
  const deadlineDateTime = new Date(task.deadline);
  const remainingMs = deadlineDateTime.getTime() - nowMs;
  const hasRemainingTime = remainingMs > 0;
  const remainingDays = hasRemainingTime
    ? Math.floor(remainingMs / (1000 * 60 * 60 * 24))
    : 0;
  const remainingHours = String(
    hasRemainingTime
      ? Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      : 0,
  ).padStart(2, "0");
  const remainingMinutes = String(
    hasRemainingTime ? Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)) : 0,
  ).padStart(2, "0");
  const remainingSeconds = String(
    hasRemainingTime ? Math.floor((remainingMs % (1000 * 60)) / 1000) : 0,
  ).padStart(2, "0");
  const remainingTimerLabel = hasRemainingTime
    ? `${remainingDays}${tx("ي ", "d ")}${remainingHours}:${remainingMinutes}:${remainingSeconds}`
    : `00${tx("ي ", "d ")}00:00:00`;
  const deadlineDateLabel = deadlineDateTime.toLocaleDateString(
    isArabic ? "ar-EG" : "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
  const deadlineTimeLabel = deadlineDateTime.toLocaleTimeString(
    isArabic ? "ar-EG" : "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
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
  const statusLabelMap = {
    TODO: tx("قيد البدء", "TODO"),
    IN_PROGRESS: tx("قيد التنفيذ", "IN PROGRESS"),
    PENDING_APPROVAL: tx("بانتظار الاعتماد", "PENDING APPROVAL"),
    DONE: tx("مكتملة", "DONE"),
    LATE: tx("متأخرة", "LATE"),
  };
  const approvalLabelMap = {
    PENDING: tx("قيد الانتظار", "PENDING"),
    APPROVED: tx("معتمد", "APPROVED"),
    REJECTED: tx("مرفوض", "REJECTED"),
  };
  const hasPrGovernmentDetails =
    !!task.prTransactionType &&
    [
      task.prCompanyName,
      task.prGovernmentEntity,
      task.prTransactionType,
      task.prGovernmentEmployee,
      task.prApplicationNumber,
      task.prTaxIdNumber,
      task.prNationalIdNumber,
      task.prNotes,
      task.prUpdates,
    ].some((value) => Boolean(value));

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
          {isArabic ? "→ رجوع" : "← Back"}
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
                  {statusLabelMap[task.status] || task.status.replaceAll("_", " ")}
                </span>
              </div>

              {task.description && (
                <p className="mb-6 text-sm leading-relaxed text-slate-600">
                  {task.description}
                </p>
              )}

              {hasPrGovernmentDetails && (
                <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-sm font-bold text-slate-900">
                    بيانات المعاملات الحكومية
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: "اسم الشركة", value: task.prCompanyName },
                      { label: "الجهة الحكومية", value: task.prGovernmentEntity },
                      { label: "نوع المعاملة", value: task.prTransactionType },
                      {
                        label: "موظف الجهة الحكومية",
                        value: task.prGovernmentEmployee,
                      },
                      { label: "رقم الطلب", value: task.prApplicationNumber },
                      { label: "الرقم الضريبي", value: task.prTaxIdNumber },
                      { label: "الرقم الوطني", value: task.prNationalIdNumber },
                      { label: "الملاحظات", value: task.prNotes },
                      { label: "المستجدات", value: task.prUpdates },
                    ]
                      .filter((item) => item.value)
                      .map((item) => (
                        <div
                          key={item.label}
                          className={
                            item.label === "الملاحظات" ||
                            item.label === "المستجدات"
                              ? "col-span-2"
                              : ""
                          }
                        >
                          <div className="text-xs text-slate-500">
                            {item.label}
                          </div>
                          <div className="mt-1 font-medium text-slate-900">
                            {item.value}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {evidenceFiles.length > 0 && (
                <div className="mb-6 border-b border-slate-200 pb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-900">
                      {tx("الإثبات", "Evidence")}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveEvidenceIndex(0);
                          setShowEvidenceModal(true);
                        }}
                        className="btn-primary px-2 py-1 text-xs"
                      >
                        {tx("عرض كامل", "View Full")}
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
                            {tx("حذف", "Delete")}
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
                          <div className="mb-2 text-3xl">{tx("فيديو", "Video")}</div>
                          <div className="text-sm text-slate-700">
                            {tx("إثبات فيديو", "Video Evidence")}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {tx("اضغط للعرض", "Click to view")}
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
                    {task.evidenceNote && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="text-xs text-slate-500">
                          {tx("ملاحظات الإثبات", "Evidence Note")}
                        </div>
                        <div className="mt-1 text-sm text-slate-800">
                          {task.evidenceNote}
                        </div>
                      </div>
                    )}
                    <div className="mt-2 text-xs text-slate-500">
                      {tx("تم الرفع:", "Uploaded:")}{" "}
                      {new Date(task.evidenceUploadedAt).toLocaleString(
                        isArabic ? "ar-EG" : "en-GB",
                      )}{" "}
                      · {tx("اضغط للتوسيع", "Click to expand")}
                    </div>
                  </div>
                </div>
              )}

              {task.approvalAt && (
                <div className="mb-6 border-b border-slate-200 pb-6">
                  <div className="mb-3 text-sm font-bold text-slate-900">
                    {tx("حالة الاعتماد", "Approval Status")}
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
                      {approvalLabelMap[task.approvalStatus] || task.approvalStatus}
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
                  {tx("سلسلة التفويض", "Delegation chain")}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { name: task.creator?.name, role: task.creator?.role },
                    task.creator?.id !== task.assigneeId && {
                      name: task.assignee?.name,
                      role: tx("المكلّف", "Assignee"),
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
                  { label: tx("المسند إليه", "Assigned to"), value: task.assignee?.name },
                  { label: tx("القسم", "Section"), value: task.section?.name },
                  {
                    label: tx("الأولوية", "Priority"),
                    value: task.priority,
                    color:
                      task.priority === "high"
                        ? "text-rose-600"
                        : task.priority === "medium"
                          ? "text-amber-700"
                          : "text-emerald-700",
                  },
                  {
                    label: tx("تاريخ الإنشاء", "Created"),
                    value: new Date(task.createdAt).toLocaleDateString(
                      isArabic ? "ar-EG" : "en-GB",
                    ),
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
                    {tx("المهام الفرعية", "Subtasks")}
                    <span className="ml-2 font-normal text-slate-500">
                      {task.subtasks.filter((s) => s.status === "DONE").length}/
                      {task.subtasks.length} {tx("مكتملة", "done")}
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
                    {tx("التقييم", "Score")}
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
                      {task.score.isOnTime
                        ? tx("في الموعد", "On time")
                        : tx("متأخر", "Late")}
                    </span>
                    {task.score.adjusted && (
                      <span className="text-xs text-slate-500">
                        {tx("(تم تعديلها يدويًا)", "(manually adjusted)")}
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
                {tx("الموعد النهائي", "Deadline")}
              </div>
              <div className="text-lg font-bold text-slate-900">
                {deadlineDateLabel}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-700">
                {tx("الوقت:", "Time:")} {deadlineTimeLabel}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {tx("\u0627\u0644\u0639\u062f \u0627\u0644\u062a\u0646\u0627\u0632\u0644\u064a:", "Countdown:")} {remainingTimerLabel}
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
                  ? isArabic
                    ? `متأخرة ${Math.abs(daysLeft)} يوم`
                    : `${Math.abs(daysLeft)} days overdue`
                  : daysLeft === 0
                    ? tx("مستحقة اليوم!", "Due today!")
                    : isArabic
                      ? `متبقي ${daysLeft} يوم`
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
                    {tx("رفع الإثبات", "Upload Evidence")}
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
                    {tx(
                      "JPG, PNG, MP4, MOV, PPT, PPTX, XLS, XLSX, PDF (حد أقصى 100MB لكل ملف)",
                      "JPG, PNG, MP4, MOV, PPT, PPTX, XLS, XLSX, PDF (max 100MB per file)",
                    )}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {selectedFiles.length === 1
                      ? tx("تم اختيار ملف واحد", "1 file selected")
                      : isArabic
                        ? `تم اختيار ${selectedFiles.length} ملفات`
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
                                {["Video", "فيديو"].includes(getFileTypeLabel(file))
                                  ? "VID"
                                  : ["Presentation", "عرض تقديمي"].includes(
                                        getFileTypeLabel(file),
                                      )
                                    ? "PPT"
                                    : ["Spreadsheet", "جدول بيانات"].includes(
                                          getFileTypeLabel(file),
                                        )
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
                            {tx("إزالة", "Remove")}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="mb-2 block text-xs font-medium text-slate-700">
                      {tx("رابط خارجي", "External Link")}
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
                        {tx("إضافة رابط", "Add Link")}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-2 block text-xs font-medium text-slate-700">
                      {tx("\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0627\u0644\u0625\u062b\u0628\u0627\u062a", "Evidence Note")}
                    </label>
                    <textarea
                      value={evidenceNoteInput}
                      onChange={(e) => setEvidenceNoteInput(e.target.value)}
                      rows={3}
                      placeholder={tx(
                        "\u0627\u0643\u062a\u0628 \u0645\u0644\u0627\u062d\u0638\u0627\u062a\u0643 \u062d\u0648\u0644 \u0627\u0644\u0625\u062b\u0628\u0627\u062a \u0627\u0644\u0645\u0631\u0641\u0648\u0639",
                        "Write your notes about the uploaded evidence",
                      )}
                      className="app-input resize-none text-sm"
                    />
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
                              {tx("رابط", "Link")}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSelectedLink(link)}
                            className="ml-3 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600 transition hover:bg-rose-500 hover:text-white"
                          >
                            {tx("إزالة", "Remove")}
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
                    {uploading
                      ? tx("جارٍ الرفع...", "Uploading...")
                      : tx("رفع الإثبات", "Upload Evidence")}
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
                    {tx("تعليم كمكتملة وإرسال", "Mark Complete & Submit")}
                  </button>
                  <div className="mt-2 text-center text-xs text-slate-500">
                    {!isOverdue
                      ? tx("سلّم في الوقت لتحصل على تقييم 8-10", "Submit on time for a score of 8-10")
                      : tx("التسليم المتأخر: التقييم سيكون أقل", "Late submission: score will be lower")}
                  </div>
                </div>
              )}

            {isPendingApproval && isCreator && evidenceFiles.length > 0 && (
              <div className="app-panel p-4">
                <div className="mb-3 text-sm font-bold text-slate-900">
                  {tx("اعتماد أو رفض", "Approve or Reject")}
                </div>

                <div className="mb-3">
                  {["CEO", "MANAGER"].includes(user.role) && (
                    <input
                      type="number"
                      min="1"
                      max="10"
                      placeholder={tx(
                        "تقييم مخصص (1-10) ويلغي التقييم التلقائي",
                        "Custom Score (1-10, overrides auto-score)",
                      )}
                      value={customScore}
                      onChange={(e) => setCustomScore(e.target.value)}
                      className="app-input mb-2 text-xs"
                    />
                  )}
                  <textarea
                    placeholder={tx(
                      "ملاحظة الاعتماد (اختياري)",
                      "Approval comment (optional)",
                    )}
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    className="app-input resize-none text-xs"
                    rows={2}
                  />
                  <button
                    onClick={approveTask}
                    className="mt-2 w-full rounded-lg bg-emerald-600 py-2 text-xs font-medium text-white transition hover:bg-emerald-700"
                  >
                    {tx("اعتماد", "Approve")}
                  </button>
                </div>

                <div className="my-3 border-t border-slate-200" />

                <div>
                  <textarea
                    placeholder={tx("سبب الرفض", "Rejection reason")}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="app-input resize-none text-xs"
                    rows={2}
                  />
                  <button
                    onClick={rejectTask}
                    className="mt-2 w-full rounded-lg bg-rose-600 py-2 text-xs font-medium text-white transition hover:bg-rose-700"
                  >
                    {tx("رفض وإرجاع", "Reject & Send Back")}
                  </button>
                </div>
              </div>
            )}

            {task.status !== "DONE" && task.status !== "PENDING_APPROVAL" && (
              <div className="app-panel p-4">
                <div className="mb-3 text-sm font-bold text-slate-900">
                  {tx("معاينة التقييم", "Score Preview")}
                </div>
                {[
                  {
                    label: tx("في الموعد", "On time"),
                    score: "8 - 10",
                    color: "text-emerald-700",
                  },
                  {
                    label: tx("متأخر 1-2 يوم", "1-2 days late"),
                    score: "5 - 7",
                    color: "text-amber-700",
                  },
                  {
                    label: tx("متأخر 3+ أيام", "3+ days late"),
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
                {tx("معلومات المهمة", "Task Info")}
              </div>
              {[
                { label: tx("أنشأها", "Created by"), value: task.creator?.name },
                ...(task.project?.client?.name
                  ? [{ label: tx("العميل", "Client"), value: task.project.client.name }]
                  : []),
                { label: tx("القسم", "Section"), value: task.section?.name },
                {
                  label: tx("المهام الفرعية", "Subtasks"),
                  value: isArabic
                    ? `${task.subtasks?.filter((s) => s.status === "DONE").length || 0} / ${task.subtasks?.length || 0} مكتملة`
                    : `${task.subtasks?.filter((s) => s.status === "DONE").length || 0} / ${task.subtasks?.length || 0} done`,
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
                  {tx("عارض الإثبات", "Evidence Viewer")}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadTask()}
                    title={tx("تحديث الإثبات", "Refresh evidence")}
                    className="btn-primary flex items-center gap-1 px-3 py-1.5 text-xs"
                  >
                    {tx("تحديث", "Refresh")}
                  </button>
                  {isAssignee &&
                    (task.status === "PENDING_APPROVAL" ||
                      task.status === "IN_PROGRESS" ||
                      task.status === "TODO") && (
                      <button
                        onClick={deleteEvidence}
                        disabled={uploading}
                        title={tx("حذف الإثبات وإعادة الرفع", "Delete evidence and re-upload")}
                        className="rounded bg-rose-600 px-3 py-1.5 text-xs text-white transition disabled:opacity-50 hover:bg-rose-700"
                      >
                        {tx("حذف", "Delete")}
                      </button>
                    )}
                  <button
                    onClick={() => {
                      setShowEvidenceModal(false);
                      setActiveEvidenceIndex(0);
                    }}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    {tx("إغلاق", "Close")}
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
                  {tx("السابق", "Previous")}
                </button>
                <div className="min-w-0 text-center">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {activeEvidenceFile.name}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {activeEvidenceIndex + 1} {tx("من", "of")} {evidenceFiles.length} ·{" "}
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
                  {tx("التالي", "Next")}
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
                    {tx(
                      "متصفحك لا يدعم تشغيل الفيديو.",
                      "Your browser does not support video playback.",
                    )}
                  </video>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                    <div className="text-sm font-semibold text-slate-900">
                      {activeEvidenceFile.name}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {tx("المعاينة غير متاحة لهذا الملف.", "Preview not available for this file.")}
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
                    {tx("تم الرفع:", "Uploaded:")}{" "}
                    {new Date(task.evidenceUploadedAt).toLocaleString(
                      isArabic ? "ar-EG" : "en-GB",
                    )}
                  </div>
                  <div>
                    {tx("الاعتماد:", "Approved:")}{" "}
                    {approvalLabelMap[task.approvalStatus] || tx("قيد الانتظار", "Pending")}
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


