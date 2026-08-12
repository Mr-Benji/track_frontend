import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSprints, createSprint, updateSprint, deleteSprint } from '../features/sprints/api'
import { fetchTasks, createTask } from '../features/tasks/api'
import { fetchProjects } from '../features/projects/api'

const statusStyle = {
  Active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  Planning: 'bg-sky-50 text-sky-600 border-sky-200',
  Completed: 'bg-gray-50 text-gray-500 border-gray-200',
}

const columnAccent = {
  Planning: 'border-t-sky-400',
  Active: 'border-t-emerald-400',
  Completed: 'border-t-gray-300',
}

function SprintCard({ s, compact, onOpenTasks, onEdit, onDelete, taskCount, doneCount }) {
  const pct = taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 100)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenTasks(s)}
      onKeyDown={(e) => e.key === 'Enter' && onOpenTasks(s)}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-sky-200 transition cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 leading-snug">{s.name}</p>
          <p className="text-xs text-gray-400 mt-1">{s.start} - {s.end}</p>
        </div>
        {!compact && (
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle[s.status]}`}>
            {s.status}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-3 leading-relaxed">{s.goal}</p>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-400">{doneCount} of {taskCount} tasks</span>
          <span className="font-bold text-gray-700">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
            style={{ width: `${pct}%` }}
          ></div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
        <span>Velocity: <span className="font-semibold text-gray-600">{s.velocity} pts</span></span>
        <span>{taskCount - doneCount} remaining</span>
      </div>
      <p className="mt-3 text-xs font-semibold text-sky-600">View sprint tasks →</p>
      <div className="flex gap-2 pt-3 mt-3 border-t border-gray-50" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onEdit(s)}
          className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(s)}
          className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg text-red-500 border border-red-200 hover:bg-red-50 transition"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function EditSprintModal({ sprint, onClose, onSave, saving, error }) {
  const [name, setName] = useState(sprint.name)
  const [goal, setGoal] = useState(sprint.goal ?? '')
  const [status, setStatus] = useState(sprint.status)

  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center bg-gray-900/40 backdrop-blur-sm overflow-y-auto py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 mx-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Edit sprint</h2>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sprint name"
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Sprint goal"
          rows={3}
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
        />
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="Planning">Planning</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
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
            onClick={() => onSave({ name, goal, status })}
            disabled={saving || !name}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SprintTaskCreator({ sprint }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10))
  const queryClient = useQueryClient()
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const create = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setTitle('')
      setProjectId('')
      setOpen(false)
    },
  })

  function submit(e) {
    e.preventDefault()
    create.mutate({ title: title.trim(), projectId: Number(projectId), startDate: dueDate, dueDate, sprintId: sprint.id })
  }

  return (
    <div className="mt-4">
      <button onClick={() => setOpen((value) => !value)} className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-600">
        + New task
      </button>
      {open && (
        <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
          <p className="text-sm font-semibold text-gray-800">Create a task in this sprint</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title *" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          <div className="grid grid-cols-2 gap-3">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
              <option value="">Select project *</option>
              {(projectsQuery.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          {create.isError && <p className="text-xs text-red-600">{create.error.message}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-white">Cancel</button>
            <button type="submit" disabled={create.isPending || !title.trim() || !projectId || !dueDate} className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50">{create.isPending ? 'Creating...' : 'Create task'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

function SprintTasksModal({ sprint, tasks, onClose }) {
  if (!sprint) return null
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900">{sprint.name}</p>
            <p className="mt-0.5 text-xs text-gray-400">{sprint.start} – {sprint.end} · {tasks.length} linked tasks</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700">✕</button>
        </div>
        <SprintTaskCreator sprint={sprint} />
        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-800">{task.title}</p>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500 border border-gray-200">{task.status}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">{task.assignee} · Due {task.due} · {task.progress}% complete</p>
            </div>
          ))}
          {tasks.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No tasks have been added to this sprint yet.</p>}
        </div>
      </div>
    </div>
  )
}

export default function SprintsPage() {
  const [tab, setTab] = useState('All')
  const [view, setView] = useState('List')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGoal, setNewGoal] = useState('')
  const [selectedSprint, setSelectedSprint] = useState(null)
  const [editingSprint, setEditingSprint] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const queryClient = useQueryClient()
  const sprints = useQuery({ queryKey: ['sprints'], queryFn: fetchSprints })
  const tasksQuery = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks })

  const create = useMutation({
    mutationFn: createSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] })
      setShowNew(false)
      setNewName('')
      setNewGoal('')
    },
  })

  const edit = useMutation({
    mutationFn: updateSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] })
      setEditingSprint(null)
    },
  })

  const remove = useMutation({
    mutationFn: deleteSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] })
      setDeleteError('')
    },
    onError: (err) => setDeleteError(err.message),
  })

  function handleDelete(s) {
    if (window.confirm(`Delete "${s.name}"? This can't be undone.`)) {
      remove.mutate(s.id)
    }
  }

  const all = sprints.data ?? []
  const tasks = tasksQuery.data ?? []
  const tasksForSprint = (sprint) => tasks.filter((task) => task.sprintId === sprint.id)
  const taskSummary = (sprint) => {
    const sprintTasks = tasksForSprint(sprint)
    return {
      taskCount: sprintTasks.length,
      doneCount: sprintTasks.filter((task) => task.status === 'Done').length,
    }
  }
  const statuses = ['Planning', 'Active', 'Completed']
  const counts = { All: all.length }
  statuses.forEach((st) => {
    counts[st] = all.filter((s) => s.status === st).length
  })

  const visible = all.filter(
    (s) =>
      (tab === 'All' || s.status === tab) &&
      s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sprints</h1>
          <p className="text-gray-500 mt-1">Manage your sprints and track team velocity</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 shadow-sm shadow-sky-200 transition"
        >
          + New sprint
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mt-6 mb-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sprints..."
          className="px-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400 w-64"
        />
        <div className="ml-auto flex rounded-xl border border-gray-200 overflow-hidden">
          {['List', 'Board'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium transition ${
                view === v ? 'bg-sky-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'List' && (
        <div className="flex gap-6 border-b border-gray-200 mb-5">
          {['All', ...statuses].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2.5 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px transition ${
                tab === t ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t}
              <span className={`px-2 py-0.5 rounded-full text-xs ${tab === t ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500'}`}>
                {counts[t]}
              </span>
            </button>
          ))}
        </div>
      )}

      {deleteError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-5">{deleteError}</p>
      )}

      {sprints.isLoading && (
        <p className="text-center py-12 text-sm text-gray-400">Loading sprints...</p>
      )}

      {view === 'List' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((s) => (
            <SprintCard key={s.id} s={s} onOpenTasks={setSelectedSprint} onEdit={setEditingSprint} onDelete={handleDelete} {...taskSummary(s)} />
          ))}
        </div>
      )}

      {view === 'Board' && !sprints.isLoading && (
        <div className="grid md:grid-cols-3 gap-4 items-start">
          {statuses.map((st) => {
            const items = all.filter(
              (s) => s.status === st && s.name.toLowerCase().includes(search.toLowerCase())
            )
            return (
              <div key={st} className={`bg-gray-50/80 rounded-2xl border border-gray-100 border-t-4 ${columnAccent[st]} p-3`}>
                <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                  <p className="text-sm font-bold text-gray-700">{st}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-white border border-gray-200 text-gray-500 font-semibold">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map((s) => (
                    <SprintCard key={s.id} s={s} compact onOpenTasks={setSelectedSprint} onEdit={setEditingSprint} onDelete={handleDelete} {...taskSummary(s)} />
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">No sprints</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'List' && !sprints.isLoading && visible.length === 0 && (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
          <p className="font-semibold text-gray-700">No sprints found</p>
          <p className="text-sm text-gray-400 mt-1">Try another tab or create a new sprint.</p>
        </div>
      )}

      {showNew && (
        <div
          className="fixed inset-0 z-20 flex items-start justify-center bg-gray-900/40 backdrop-blur-sm overflow-y-auto py-8"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false) }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 mx-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">New sprint</h2>
              <p className="text-sm text-gray-400 mt-0.5">It will start in Planning status.</p>
            </div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Sprint name (e.g. Sprint 5)"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <textarea
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Sprint goal"
              rows={3}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
            {create.isError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{create.error.message}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => create.mutate({ name: newName, goal: newGoal })}
                disabled={create.isPending || !newName}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
              >
                {create.isPending ? 'Creating...' : 'Create sprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SprintTasksModal sprint={selectedSprint} tasks={selectedSprint ? tasksForSprint(selectedSprint) : []} onClose={() => setSelectedSprint(null)} />

      {editingSprint && (
        <EditSprintModal
          sprint={editingSprint}
          onClose={() => setEditingSprint(null)}
          onSave={(patch) => edit.mutate({ sprintId: editingSprint.id, ...patch })}
          saving={edit.isPending}
          error={edit.isError ? edit.error.message : null}
        />
      )}
    </div>
  )
}
