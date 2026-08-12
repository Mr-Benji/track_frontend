import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTasks } from '../features/tasks/api'
import { fetchProjects } from '../features/projects/api'
import { fetchMembers } from '../features/members/api'
import { fetchSprints } from '../features/sprints/api'
import { fetchMeetings, createMeeting, updateMeeting, deleteMeeting } from '../features/meetings/api'
import DashboardCalendar from '../components/DashboardCalendar'
import { isWithinWeek, sameDay } from '../lib/dateUtils'

const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const avatarColors = [
  'bg-sky-100 text-sky-600',
  'bg-violet-100 text-violet-600',
  'bg-emerald-100 text-emerald-600',
  'bg-amber-100 text-amber-600',
  'bg-rose-100 text-rose-600',
  'bg-indigo-100 text-indigo-600',
]
const avatarColor = (name = '') =>
  avatarColors[name.charCodeAt(0) % avatarColors.length]

const priorityStyle = {
  Urgent: 'bg-red-100 text-red-600 border-red-300',
  High: 'bg-red-50 text-red-500 border-red-200',
  Medium: 'bg-amber-50 text-amber-600 border-amber-200',
  Low: 'bg-gray-50 text-gray-500 border-gray-200',
}

const statusStyle = {
  'To Do': 'bg-gray-100 text-gray-500',
  'In Progress': 'bg-sky-100 text-sky-600',
  Done: 'bg-emerald-100 text-emerald-600',
  Blocked: 'bg-red-100 text-red-500',
}

// US-01/02/03 — tinted dashboard widgets: today's tasks, this week's deadlines, overdue.
function TintedStatCard({ label, value, sub, tone, warn }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-3 ${tones[tone]} ${warn ? 'ring-1 ring-red-200' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
        {warn && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Warning
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold mt-0.5">{value}</p>
        <p className="text-xs mt-1 opacity-70">{sub}</p>
      </div>
    </div>
  )
}

// US-05 — dashboard views the user can switch between to tailor Home to
// what's relevant to them right now.
const DASHBOARD_VIEWS = ['Projects & Meetings', 'Tasks Focus', 'Projects Focus']

function SectionHeader({ title, count }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="font-semibold text-gray-800 text-sm">{title}</p>
      {count != null && (
        <span className="text-xs bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  )
}

function formatMeetingDate(iso) {
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// The "Projects & Meetings" dashboard view's one distinguishing section —
// otherwise that view looked identical to the default layout.
function EditMeetingModal({ meeting, onClose, onSave, saving, error }) {
  const [title, setTitle] = useState(meeting.title)
  const [date, setDate] = useState(meeting.date)
  const [time, setTime] = useState(meeting.time ?? '')

  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center bg-gray-900/40 backdrop-blur-sm overflow-y-auto py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 mx-4">
        <h2 className="text-lg font-bold text-gray-900">Edit meeting</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meeting title"
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="e.g. 10:00 AM"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => onSave({ title, date, time })}
            disabled={saving || !title || !date}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MeetingsPanel({ meetings, now }) {
  const queryClient = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [editingMeeting, setEditingMeeting] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const create = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      setShowNew(false)
      setTitle('')
      setDate('')
      setTime('')
    },
  })

  const edit = useMutation({
    mutationFn: updateMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      setEditingMeeting(null)
    },
  })

  const remove = useMutation({
    mutationFn: deleteMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      setDeleteError('')
    },
    onError: (err) => setDeleteError(err.message),
  })

  function handleDelete(m) {
    if (window.confirm(`Delete "${m.title}"? This can't be undone.`)) {
      remove.mutate(m.id)
    }
  }

  const thisWeekCount = meetings.filter((m) => isWithinWeek(m.date, now)).length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-1">
        <p className="font-semibold text-gray-800 text-sm">Meetings</p>
        <button
          onClick={() => setShowNew(true)}
          className="text-xs font-semibold text-sky-600 hover:text-sky-700 border border-sky-200 rounded-lg px-2.5 py-1"
        >
          + Create Meeting
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">{meetings.length} upcoming · {thisWeekCount} this week</p>

      {deleteError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{deleteError}</p>
      )}

      <div className="space-y-2.5">
        {meetings.map((m) => (
          <div key={m.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{m.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatMeetingDate(m.date)}{m.time && ` · ${m.time}`}</p>
                {m.attendees.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-1 truncate">{m.attendees.join(', ')}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setEditingMeeting(m)} className="text-xs text-sky-500 hover:text-sky-700 font-medium">
                  Edit
                </button>
                <button onClick={() => handleDelete(m)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {meetings.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No upcoming meetings.</p>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">Create meeting</h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <input
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 10:00 AM"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            {create.isError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{create.error.message}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowNew(false)} className="px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => create.mutate({ title, date, time })}
                disabled={create.isPending || !title || !date}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
              >
                {create.isPending ? 'Creating...' : 'Create meeting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingMeeting && (
        <EditMeetingModal
          meeting={editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onSave={(patch) => edit.mutate({ meetingId: editingMeeting.id, ...patch })}
          saving={edit.isPending}
          error={edit.isError ? edit.error.message : null}
        />
      )}
    </div>
  )
}

export default function HomePage({ user }) {
  const [dashboardView, setDashboardView] = useState(DASHBOARD_VIEWS[0])

  const tasksQ    = useQuery({ queryKey: ['tasks'],    queryFn: fetchTasks })
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const membersQ  = useQuery({ queryKey: ['members'],  queryFn: fetchMembers })
  const sprintsQ  = useQuery({ queryKey: ['sprints'],  queryFn: fetchSprints })
  const meetingsQ = useQuery({ queryKey: ['meetings'], queryFn: fetchMeetings })

  const tasks    = tasksQ.data    ?? []
  const projects = projectsQ.data ?? []
  const members  = membersQ.data  ?? []
  const sprints  = sprintsQ.data  ?? []
  const meetings = meetingsQ.data ?? []

  const now = new Date()

  const overdueTasks   = tasks.filter((t) => t.overdue)
  const activeProjects = projects.filter((p) => p.status === 'Active' && !p.archived)
  const activeSprint   = sprints.find((s) => s.status === 'Active')

  // US-01 — tasks due today (excluding completed work).
  const todayTasks = tasks.filter((t) => t.status !== 'Done' && t.dueDate && sameDay(t.dueDate, now))
  // US-02 — tasks due within the current Sun–Sat week.
  const weekTasks = tasks.filter((t) => t.status !== 'Done' && t.dueDate && isWithinWeek(t.dueDate, now))

  const urgentTasks = [...tasks]
    .filter((t) => t.status !== 'Done')
    .sort((a, b) => Number(b.overdue) - Number(a.overdue))
    .slice(0, 5)

  const isLoading = tasksQ.isLoading || projectsQ.isLoading || membersQ.isLoading || sprintsQ.isLoading || meetingsQ.isLoading

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-7">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">{today}</p>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {getGreeting()}, {user?.name ?? 'there'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here's your workspace overview for today.</p>
          <label className="inline-flex items-center gap-2 mt-3 bg-white border border-gray-200 rounded-full pl-3 pr-2 py-1.5 text-xs font-medium text-gray-600">
            Choose your dashboard
            <select
              value={dashboardView}
              onChange={(e) => setDashboardView(e.target.value)}
              className="bg-transparent font-semibold text-gray-800 focus:outline-none"
            >
              {DASHBOARD_VIEWS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        </div>
        {activeSprint && (
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            {activeSprint.name} · Active
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-32" />
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── Stat cards (US-01, US-02, US-03) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TintedStatCard
              tone="blue"
              label="Today's Tasks"
              value={todayTasks.length}
              sub={`${overdueTasks.length} overdue`}
            />
            <TintedStatCard
              tone="amber"
              label="Week Deadlines"
              value={weekTasks.length}
              sub="Due this week"
            />
            <TintedStatCard
              tone="red"
              label="Overdue Tasks"
              value={overdueTasks.length}
              sub="Need attention"
              warn={overdueTasks.length > 0}
            />
          </div>

          {/* ── Dashboard calendar preview (US-04) ── */}
          <DashboardCalendar tasks={tasks} />

          {/* ── Main grid — layout responds to the chosen dashboard view (US-05) ── */}
          <div className={`grid gap-4 ${dashboardView === 'Projects & Meetings' ? 'lg:grid-cols-5' : ''}`}>

            {/* Needs attention */}
            {dashboardView !== 'Projects Focus' && (
              <div className={`${dashboardView === 'Projects & Meetings' ? 'lg:col-span-3' : ''} bg-white rounded-2xl border border-gray-100 shadow-sm p-5`}>
                <SectionHeader title="Needs Attention" count={urgentTasks.length} />
                <div className="space-y-2">
                  {urgentTasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(t.assignee)}`}>
                        {initials(t.assignee)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[11px] font-medium ${t.overdue ? 'text-red-500' : 'text-gray-400'}`}>
                            {t.overdue ? 'Overdue · ' : 'Due '}{t.due}
                          </span>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${statusStyle[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {t.status}
                          </span>
                        </div>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${priorityStyle[t.priority]}`}>
                        {t.priority}
                      </span>
                    </div>
                  ))}
                  {urgentTasks.length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-sm text-gray-400">Nothing urgent — great work!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active projects */}
            {dashboardView !== 'Tasks Focus' && (
              <div className={`${dashboardView === 'Projects & Meetings' ? 'lg:col-span-2' : ''} bg-white rounded-2xl border border-gray-100 shadow-sm p-5`}>
                <SectionHeader title="Active Projects" count={activeProjects.length} />
                <div className="space-y-4">
                  {activeProjects.map((p) => {
                    const pct = p.tasks === 0 ? 0 : Math.round((p.completed / p.tasks) * 100)
                    return (
                      <div key={p.id} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-medium text-gray-700 truncate max-w-[70%]">{p.name}</p>
                          <span className="text-xs font-semibold text-gray-500">{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct > 60 ? 'bg-sky-500' : pct > 30 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">{p.completed} of {p.tasks} tasks done</p>
                      </div>
                    )
                  })}
                  {activeProjects.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">No active projects right now.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Meetings — the one section unique to "Projects & Meetings" ── */}
          {dashboardView === 'Projects & Meetings' && (
            <MeetingsPanel meetings={meetings} now={now} />
          )}

          {/* ── Team strip ── */}
          {members.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionHeader title="Team Members" count={members.length} />
              <div className="flex flex-wrap gap-3">
                {members.slice(0, 12).map((m) => (
                  <div key={m.id} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${avatarColor(m.name)}`}>
                      {initials(m.name)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700 leading-none">{m.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{m.role ?? m.department ?? 'Member'}</p>
                    </div>
                  </div>
                ))}
                {members.length > 12 && (
                  <div className="flex items-center justify-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs text-gray-400 font-medium">
                    +{members.length - 12} more
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 13) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
