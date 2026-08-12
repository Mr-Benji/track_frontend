import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTasks, updateTaskStatus, createTask } from '../features/tasks/api'
import { fetchProjects } from '../features/projects/api'
import { fetchMembers } from '../features/members/api'
import TaskDetailModal from '../components/TaskDetailModal'
import TaskPreviewPopover from '../components/TaskPreviewPopover'
import RichTextEditor from '../components/RichTextEditor'
import AssigneePicker from '../components/AssigneePicker'
import DashboardCalendar from '../components/DashboardCalendar'

const AVATAR_COLORS = [
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
]

const initials = (name) =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const avatarColor = (name) => {
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

const columnAccent = {
  'To Do': 'border-t-gray-300',
  'In Progress': 'border-t-sky-400',
  Done: 'border-t-emerald-400',
}

const statusStyle = {
  'To Do': 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-sky-100 text-sky-600',
  Done: 'bg-emerald-100 text-emerald-600',
}

const STATUSES = ['To Do', 'In Progress', 'Done']
const VIEWS = ['Kanban', 'Table', 'Calendar']

const progressColor = { 'To Do': 'bg-gray-300', 'In Progress': 'bg-sky-500', Done: 'bg-emerald-500' }

function TaskCard({ t, onStatusChange, changingStatus, onOpen }) {
  return (
    <div
      onClick={() => onOpen(t)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition flex flex-col gap-3 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-900 text-sm leading-snug">{t.title}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {t.isDraft && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
              Draft
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${priorityStyle[t.priority]}`}>
            {t.priority}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full ${avatarColor(t.assignee)} flex items-center justify-center text-[9px] font-bold`}>
          {initials(t.assignee)}
        </div>
        <p className="text-xs text-gray-500 truncate">
          {t.assignee}{t.assignees?.length > 1 && ` +${t.assignees.length - 1}`}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className={`font-medium ${t.overdue ? 'text-red-500' : 'text-gray-400'}`}>
            {t.overdue ? 'Overdue · ' : 'Due '}{t.due}
          </span>
          <span className="font-semibold text-gray-500">{t.progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full ${progressColor[t.status] ?? 'bg-gray-300'}`} style={{ width: `${t.progress}%` }} />
        </div>
      </div>

      <select
        value={t.status}
        disabled={changingStatus}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onStatusChange(t, e.target.value)}
        className="w-full text-xs font-semibold rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  )
}

// US-44 — tabular list of tasks: Task, Status, Assignee, Due Date, Priority.
function TaskTable({ items, onOpen }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">No tasks match your filters.</p>
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
            <th className="px-4 py-3 font-semibold">Task</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Assignee</th>
            <th className="px-4 py-3 font-semibold">Due Date</th>
            <th className="px-4 py-3 font-semibold">Priority</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} onClick={() => onOpen(t)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer">
              <td className="px-4 py-3 font-medium text-gray-800">
                {t.title}
                {t.isDraft && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                    Draft
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[t.status] ?? 'bg-gray-100 text-gray-500'}`}>{t.status}</span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {t.assignee}{t.assignees?.length > 1 && ` +${t.assignees.length - 1}`}
              </td>
              <td className="px-4 py-3">
                <span className={t.overdue ? 'text-red-500 font-medium' : 'text-gray-500'}>{t.due}</span>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityStyle[t.priority]}`}>{t.priority}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const ASSIGNEE_ANY = ''
const ASSIGNEE_NONE = '__none__'

// US-38, 41, 42 — filter bar (Project/Assignee/Status/Priority + clearable
// chips), the My Tasks quick pill, and the workspace/archived-scope checkboxes.
function FilterBar({
  search, onSearch,
  filters, onFilterChange,
  projects, members,
  myTasksOnly, onToggleMyTasks,
  includeArchived, onToggleArchived,
  sortDir, onToggleSort,
}) {
  const chips = []
  if (filters.projectId) {
    const p = projects.find((p) => String(p.id) === String(filters.projectId))
    chips.push({ key: 'projectId', label: `Project: ${p?.name ?? ''}` })
  }
  if (filters.assignee) {
    chips.push({ key: 'assignee', label: filters.assignee === ASSIGNEE_NONE ? 'No Assignee' : filters.assignee })
  }
  if (filters.status) chips.push({ key: 'status', label: `Status: ${filters.status}` })
  if (filters.priority) chips.push({ key: 'priority', label: `Priority: ${filters.priority}` })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search tasks..."
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 flex-1 min-w-[160px]"
        />
        <button
          onClick={() => onToggleMyTasks(!myTasksOnly)}
          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${
            myTasksOnly ? 'bg-sky-500 border-sky-500 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          My Tasks
        </button>

        <select
          value={filters.projectId}
          onChange={(e) => onFilterChange('projectId', e.target.value)}
          className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={filters.assignee}
          onChange={(e) => onFilterChange('assignee', e.target.value)}
          className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value={ASSIGNEE_ANY}>All Assignees</option>
          <option value={ASSIGNEE_NONE}>No Assignee</option>
          {members.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>

        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filters.priority}
          onChange={(e) => onFilterChange('priority', e.target.value)}
          className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">All Priorities</option>
          <option>Urgent</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <button
          onClick={onToggleSort}
          className="px-3 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
          title="Sort by Created At"
        >
          Created At {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={!myTasksOnly} onChange={(e) => onToggleMyTasks(!e.target.checked)} className="accent-sky-500" />
          Show all workspace tasks
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={includeArchived} onChange={(e) => onToggleArchived(e.target.checked)} className="accent-sky-500" />
          Include archived projects
        </label>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {c.label}
              <button onClick={() => onFilterChange(c.key, '')} className="hover:text-gray-900">✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const todayISO = () => new Date().toISOString().slice(0, 10)

function NewTaskModal({ onClose, onSubmit, creating, error }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [assignees, setAssignees] = useState([])
  const [startDate, setStartDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState(todayISO())

  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const membersQ = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const projects = projectsQ.data ?? []
  const members = membersQ.data ?? []

  const canSubmit = title.trim() && projectId && dueDate

  function buildPayload() {
    return {
      title: title.trim(),
      description,
      projectId: Number(projectId),
      priority,
      assignees,
      startDate,
      dueDate,
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">New task</h2>
          <p className="text-sm text-gray-400 mt-0.5">It will start in the To Do column.</p>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title *"
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
          <RichTextEditor value={description} onChange={setDescription} placeholder="Describe this task..." />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project *</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="">Select a project...</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option>Urgent</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Assignees</label>
          <AssigneePicker
            assignees={assignees}
            members={members}
            onAdd={(name) => setAssignees((prev) => [...prev, name])}
            onRemove={(name) => setAssignees((prev) => prev.filter((a) => a !== name))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(buildPayload(), 'edit')}
            disabled={creating || !canSubmit}
            title="Saves as a draft and opens it for further editing"
            className="px-4 py-2.5 text-sm font-semibold rounded-xl text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            Save and Edit
          </button>
          <button
            onClick={() => onSubmit(buildPayload(), 'close')}
            disabled={creating || !canSubmit}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TasksPage({ user }) {
  const [view, setView] = useState('Kanban')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  // US-34 — a shared task link looks like "#task-123"; open straight to it.
  const [selectedId, setSelectedId] = useState(() => {
    const match = /^#task-(\d+)/.exec(window.location.hash)
    return match ? Number(match[1]) : null
  })
  const [previewId, setPreviewId] = useState(null)
  const [filters, setFilters] = useState({ projectId: '', assignee: '', status: '', priority: '' })
  const [sortDir, setSortDir] = useState('desc')
  const [myTasksOnly, setMyTasksOnly] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)

  const queryClient = useQueryClient()
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks })
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const membersQ = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const projects = useMemo(() => projectsQ.data ?? [], [projectsQ.data])
  const members = membersQ.data ?? []

  const advance = useMutation({
    mutationFn: updateTaskStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const create = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setShowNew(false)
    },
  })

  const all = useMemo(() => tasks.data ?? [], [tasks.data])
  const overdueCount = all.filter((t) => t.overdue).length
  const selectedTask = all.find((t) => t.id === selectedId)
  const previewTask = all.find((t) => t.id === previewId)

  const archivedProjectIds = useMemo(
    () => new Set(projects.filter((p) => p.archived).map((p) => p.id)),
    [projects]
  )

  // US-38, 39, 40, 41, 42 — the full filter/sort/scope pipeline.
  const visible = useMemo(() => {
    let list = all.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))

    if (!includeArchived) list = list.filter((t) => !t.projectId || !archivedProjectIds.has(t.projectId))
    if (myTasksOnly && user?.name) list = list.filter((t) => t.assignees?.includes(user.name))
    if (filters.projectId) list = list.filter((t) => String(t.projectId) === String(filters.projectId))
    if (filters.assignee === ASSIGNEE_NONE) list = list.filter((t) => !t.assignees || t.assignees.length === 0)
    else if (filters.assignee) list = list.filter((t) => t.assignees?.includes(filters.assignee))
    if (filters.status) list = list.filter((t) => t.status === filters.status)
    if (filters.priority) list = list.filter((t) => t.priority === filters.priority)

    const factor = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => factor * ((a.createdAt ?? '') < (b.createdAt ?? '') ? -1 : (a.createdAt ?? '') > (b.createdAt ?? '') ? 1 : 0))
  }, [all, search, includeArchived, archivedProjectIds, myTasksOnly, user, filters, sortDir])

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tasks <span className="text-gray-300 font-medium text-lg">({all.length})</span>
          </h1>
          <p className="text-gray-500 mt-1">
            Create, assign, and track tasks
            {overdueCount > 0 && <span className="text-red-500 font-medium"> · {overdueCount} overdue</span>}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 shadow-sm shadow-sky-200 transition"
        >
          + New task
        </button>
      </div>

      {/* US-36 — Table / Kanban / Calendar toggle */}
      <div className="flex rounded-xl border border-gray-200 p-0.5 bg-gray-50 w-fit mt-6 mb-5">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              view === v ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        filters={filters}
        onFilterChange={updateFilter}
        projects={projects}
        members={members}
        myTasksOnly={myTasksOnly}
        onToggleMyTasks={setMyTasksOnly}
        includeArchived={includeArchived}
        onToggleArchived={setIncludeArchived}
        sortDir={sortDir}
        onToggleSort={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
      />

      {tasks.isLoading && (
        <p className="text-center py-12 text-sm text-gray-400">Loading tasks...</p>
      )}

      {!tasks.isLoading && view === 'Kanban' && (
        <div className="grid md:grid-cols-3 gap-4 items-start">
          {STATUSES.map((st) => {
            const items = visible.filter((t) => t.status === st)
            return (
              <div key={st} className={`bg-gray-50/80 rounded-2xl border border-gray-100 border-t-4 ${columnAccent[st]} p-3`}>
                <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                  <p className="text-sm font-bold text-gray-700">{st}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-white border border-gray-200 text-gray-500 font-semibold">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map((t) => (
                    <TaskCard
                      key={t.id}
                      t={t}
                      changingStatus={advance.isPending && advance.variables?.id === t.id}
                      onStatusChange={(task, status) => advance.mutate({ id: task.id, status, author: user?.name })}
                      onOpen={(task) => setPreviewId(task.id)}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">No tasks</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!tasks.isLoading && view === 'Table' && (
        <TaskTable items={visible} onOpen={(task) => setPreviewId(task.id)} />
      )}

      {!tasks.isLoading && view === 'Calendar' && (
        <DashboardCalendar tasks={visible} />
      )}

      {showNew && (
        <NewTaskModal
          onClose={() => setShowNew(false)}
          onSubmit={(payload, mode) => create.mutate({ ...payload, isDraft: mode === 'edit' }, {
            onSuccess: (newTask) => { if (mode === 'edit') setSelectedId(newTask.id) },
          })}
          creating={create.isPending}
          error={create.isError ? create.error.message : null}
        />
      )}

      {previewTask && (
        <TaskPreviewPopover
          task={previewTask}
          onClose={() => setPreviewId(null)}
          onOpenFull={() => { setSelectedId(previewTask.id); setPreviewId(null) }}
        />
      )}

      {selectedTask && (
        <TaskDetailModal task={selectedTask} user={user} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
