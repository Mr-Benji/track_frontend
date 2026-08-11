const AVATAR_COLORS = [
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
]

const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const avatarColor = (name = '') => {
  let hash = 0
  for (const ch of name) hash += ch.charCodeAt(0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

const priorityStyle = {
  Urgent: 'bg-red-100 text-red-600 border-red-300',
  High: 'bg-red-50 text-red-500 border-red-200',
  Medium: 'bg-amber-50 text-amber-600 border-amber-200',
  Low: 'bg-gray-50 text-gray-500 border-gray-200',
}

const progressColor = { 'To Do': 'bg-gray-300', 'In Progress': 'bg-sky-500', Done: 'bg-emerald-500' }

// A quick, read-mostly glance at a task (US-25) — deliberately lighter than
// TaskDetailModal, with an explicit escape hatch to the full editable view.
export default function TaskPreviewPopover({ task, onClose, onOpenFull }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-gray-900 leading-snug">{task.title}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm shrink-0">✕</button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${priorityStyle[task.priority]}`}>
            {task.priority}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {task.status}
          </span>
          <span className={`text-xs font-medium ${task.overdue ? 'text-red-500' : 'text-gray-400'}`}>
            {task.overdue ? 'Overdue · ' : 'Due '}{task.due}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full ${avatarColor(task.assignee)} flex items-center justify-center text-[10px] font-bold`}>
            {initials(task.assignee)}
          </div>
          <p className="text-sm text-gray-600">{task.assignee}</p>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">Progress</span>
            <span className="font-semibold text-gray-700">{task.progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${progressColor[task.status] ?? 'bg-gray-300'}`} style={{ width: `${task.progress}%` }} />
          </div>
        </div>

        <button
          onClick={onOpenFull}
          className="w-full px-4 py-2 text-sm font-semibold rounded-xl bg-sky-500 text-white hover:bg-sky-600"
        >
          Open full details →
        </button>
      </div>
    </div>
  )
}
