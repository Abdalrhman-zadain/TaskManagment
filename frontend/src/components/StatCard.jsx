export default function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-500',
    green:  'bg-green-500',
    amber:  'bg-amber-500',
    red:    'bg-red-500',
    teal:   'bg-teal-500',
    purple: 'bg-purple-500'
  }
  return (
    <div className="bg-white/4 border border-white/8 rounded-xl p-4 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${colors[color]}`} />
      <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">{label}</div>
      <div className="text-3xl font-bold font-mono">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1.5">{sub}</div>}
    </div>
  )
}
