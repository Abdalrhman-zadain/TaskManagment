import { useNavigate } from 'react-router-dom'

const statusStyles = {
  TODO:        'bg-white/8 text-slate-400',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-300',
  DONE:        'bg-green-500/15 text-green-400',
  LATE:        'bg-red-500/15 text-red-400'
}

const statusDot = {
  TODO:        'bg-white/30',
  IN_PROGRESS: 'bg-blue-400',
  DONE:        'bg-green-400',
  LATE:        'bg-red-500'
}

export default function TaskCard({ task, onMarkDone }) {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'DONE'

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="flex items-center gap-3 py-3 border-b border-white/8 last:border-0 cursor-pointer hover:bg-white/3 px-1 rounded transition group"
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[task.status]}`} />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{task.title}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          {task.assignee?.name} · {task.section?.name}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {task.score && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            task.score.value >= 8 ? 'bg-green-500/15 text-green-400' :
            task.score.value >= 5 ? 'bg-amber-500/15 text-amber-400' :
                                    'bg-red-500/15 text-red-400'
          }`}>
            {task.score.value}/10
          </span>
        )}

        <span className={`text-xs ${isOverdue ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
          {isOverdue ? '⚠ ' : ''}
          {new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>

        {/* Mark done button — only for assignee */}
        {user.id === task.assigneeId && task.status !== 'DONE' && (
          <button
            onClick={e => { e.stopPropagation(); onMarkDone && onMarkDone(task.id) }}
            className="text-xs px-2.5 py-1 bg-green-500/12 text-green-400 border border-green-500/25 rounded-full hover:bg-green-500/25 transition opacity-0 group-hover:opacity-100"
          >
            Done
          </button>
        )}
      </div>
    </div>
  )
}
