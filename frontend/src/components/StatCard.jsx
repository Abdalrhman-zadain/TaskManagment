export default function StatCard({ label, value, sub, color = "blue" }) {
  const colors = {
    blue: "bg-[#1275e2]",
    green: "bg-emerald-500",
    amber: "bg-[#c55b00]",
    red: "bg-rose-500",
    teal: "bg-[#5f78a3]",
    purple: "bg-violet-500",
  };

  return (
    <div className="app-panel relative overflow-hidden p-5">
      <div className={`absolute top-0 left-0 right-0 h-1 ${colors[color]}`} />
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-3xl font-extrabold text-slate-900">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
