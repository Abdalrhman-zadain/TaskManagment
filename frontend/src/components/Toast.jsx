import { useEffect } from "react";

export default function Toast({ message, type, onClose }) {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const bgColor =
    {
      success: "bg-emerald-50 border-emerald-200",
      error: "bg-rose-50 border-rose-200",
      info: "bg-blue-50 border-blue-200",
    }[type] || "bg-slate-50 border-slate-200";

  const textColor =
    {
      success: "text-emerald-800",
      error: "text-rose-800",
      info: "text-blue-800",
    }[type] || "text-slate-800";

  const iconColor =
    {
      success: "text-emerald-600",
      error: "text-rose-600",
      info: "text-blue-600",
    }[type] || "text-slate-600";

  const icons = {
    success: "\u2713",
    error: "\u2715",
    info: "\u24D8",
  };

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center gap-3 rounded-lg border px-4 py-3 ${bgColor} shadow-lg animate-in fade-in slide-in-from-bottom-2 z-50`}
    >
      <span className={`text-lg font-bold ${iconColor}`}>{icons[type]}</span>
      <p className={`text-sm font-medium ${textColor}`}>{message}</p>
    </div>
  );
}

