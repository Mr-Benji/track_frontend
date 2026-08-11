import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchProjects, createProject, HOME_DEPARTMENT, ACCESS_LEVELS, DEFAULT_STAGES } from '../features/projects/api'
import RichTextEditor from '../components/RichTextEditor'

const AVATAR_COLORS = [
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
]

const DEPT_OPTIONS = ['Development', 'Design', 'Research', 'Operations', 'General']

const initials = (name) =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const avatarColor = (name) => {
  let hash = 0
  for (const ch of name) hash += ch.charCodeAt(0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

const statusStyle = {
  Active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  Overdue: 'bg-red-50 text-red-500 border-red-200',
  Planning: 'bg-sky-50 text-sky-600 border-sky-200',
}

const deptStyle = {
  Development: 'bg-violet-50 text-violet-600',
  Design: 'bg-amber-50 text-amber-600',
  Research: 'bg-sky-50 text-sky-600',
  Operations: 'bg-emerald-50 text-emerald-600',
  General: 'bg-gray-100 text-gray-600',
}

const SORT_FIELDS = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'name', label: 'Name' },
  { value: 'start', label: 'Start Date' },
]

function dateRange(p) {
  if (!p.start || !p.end) return '— - —'
  return `${p.start} - ${p.end}`
}

function DepartmentPills({ departments }) {
  if (!departments || departments.length === 0) {
    return <span className="text-xs text-gray-400 italic">No departments assigned</span>
  }
  return departments.map((d) => (
    <span key={d} className={`px-2.5 py-1 rounded-md text-xs font-medium ${deptStyle[d] ?? 'bg-gray-100 text-gray-600'}`}>
      {d}
    </span>
  ))
}

function LeadAvatars({ leads }) {
  if (!leads || leads.length === 0) {
    return <p className="text-xs text-gray-400 italic">No lead assigned</p>
  }
  return (
    <>
      <div className="flex -space-x-2">
        {leads.map((l) => (
          <div key={l} title={l} className={`w-7 h-7 rounded-full border-2 border-white ${avatarColor(l)} flex items-center justify-center text-[10px] font-bold`}>
            {initials(l)}
          </div>
        ))}
      </div>
      <div className="text-xs min-w-0">
        <p className="text-gray-400">{leads.length > 1 ? 'Project leads' : 'Project lead'}</p>
        <p className="font-semibold text-gray-700 truncate">{leads.join(', ')}</p>
      </div>
    </>
  )
}

function ProjectMeta({ p }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">{p.trackingMode}</span>
      {p.sprintsEnabled && (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-50 text-violet-600">Sprints</span>
      )}
      {(p.files ?? []).length > 0 && (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
          {p.files.length} {p.files.length === 1 ? 'file' : 'files'}
        </span>
      )}
      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">{p.accessLevel}</span>
    </div>
  )
}

function ProjectCard({ p }) {
  const progress = p.tasks === 0 ? 0 : Math.round((p.completed / p.tasks) * 100)
  const barColor = p.status === 'Overdue' ? 'bg-red-400' : progress === 100 ? 'bg-emerald-500' : 'bg-sky-500'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-gray-900 leading-snug">{p.name}</p>
          <p className="text-xs text-gray-400 mt-1">{dateRange(p)}</p>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle[p.status]}`}>
          {p.status}
        </span>
      </div>

      <ProjectMeta p={p} />

      <div className="flex items-center gap-2 flex-wrap">
        <DepartmentPills departments={p.departments} />
      </div>

      <div className="flex items-center gap-2">
        <LeadAvatars leads={p.leads} />
      </div>

      <div className="mt-auto">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-400">{p.completed} of {p.tasks} tasks done</span>
          <span className="font-bold text-gray-700">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  )
}

function ProjectListRow({ p }) {
  const progress = p.tasks === 0 ? 0 : Math.round((p.completed / p.tasks) * 100)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3.5 flex items-center gap-4 hover:shadow-md transition">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-gray-900 truncate">{p.name}</p>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyle[p.status]}`}>{p.status}</span>
          <ProjectMeta p={p} />
          <DepartmentPills departments={p.departments} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{dateRange(p)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <LeadAvatars leads={p.leads} />
      </div>
      <div className="w-40 shrink-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">{p.completed}/{p.tasks} tasks</span>
          <span className="font-bold text-gray-700">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full ${p.status === 'Overdue' ? 'bg-red-400' : progress === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  )
}

function ProjectGroup({ title, subtitle, items, layout }) {
  if (items.length === 0) return null
  return (
    <div className="mb-8">
      <div className="mb-4">
        <p className="font-semibold text-gray-800 text-sm">
          {title} <span className="text-gray-400 font-medium">({items.length})</span>
        </p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {layout === 'Grid' ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((p) => <ProjectCard key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => <ProjectListRow key={p.id} p={p} />)}
        </div>
      )}
    </div>
  )
}

const todayISO = () => new Date().toISOString().slice(0, 10)

function NewProjectModal({ onClose, onCreate, creating, error }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [departments, setDepartments] = useState([])
  const [leads, setLeads] = useState([])
  const [leadInput, setLeadInput] = useState('')
  const [start, setStart] = useState(todayISO())
  const [end, setEnd] = useState(todayISO())
  const [stages, setStages] = useState(DEFAULT_STAGES)
  const [stageInput, setStageInput] = useState('')
  const [sprintsEnabled, setSprintsEnabled] = useState(false)
  const [files, setFiles] = useState([])
  const [accessLevel, setAccessLevel] = useState(ACCESS_LEVELS[0])

  function toggleDept(d) {
    setDepartments((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  function addLead() {
    const name = leadInput.trim()
    if (name && !leads.includes(name)) setLeads((prev) => [...prev, name])
    setLeadInput('')
  }

  function addStage() {
    const name = stageInput.trim()
    if (name && !stages.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setStages((prev) => [...prev, { id: Date.now(), name, isDefault: false }])
    }
    setStageInput('')
  }

  function addFiles(fileList) {
    const picked = Array.from(fileList ?? []).map((f) => ({ id: Date.now() + Math.random(), name: f.name }))
    setFiles((prev) => [...prev, ...picked])
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center bg-gray-900/40 backdrop-blur-sm overflow-y-auto py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 mx-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">New project</h2>
          <p className="text-sm text-gray-400 mt-0.5">It will start in Planning status.</p>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
          <RichTextEditor value={description} onChange={setDescription} placeholder="Describe this project..." />
        </div>

        {/* US-15 — multi-department assignment */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Departments</label>
          <div className="flex flex-wrap gap-2">
            {DEPT_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDept(d)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                  departments.includes(d) ? 'bg-sky-500 border-sky-500 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          {departments.length === 0 && <p className="text-xs text-gray-400 italic mt-1.5">No departments assigned</p>}
        </div>

        {/* US-16 — multiple project leads */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project leads</label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {leads.map((l) => (
              <span key={l} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-600">
                {l}
                <button type="button" onClick={() => setLeads((prev) => prev.filter((x) => x !== l))} className="hover:text-sky-800">✕</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={leadInput}
              onChange={(e) => setLeadInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLead())}
              placeholder="Lead name"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button type="button" onClick={addLead} className="px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">Add</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start date</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              {start && <button type="button" onClick={() => setStart('')} className="text-gray-400 hover:text-gray-600 text-xs shrink-0" title="Clear">✕</button>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">End date</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              {end && <button type="button" onClick={() => setEnd('')} className="text-gray-400 hover:text-gray-600 text-xs shrink-0" title="Clear">✕</button>}
            </div>
          </div>
        </div>

        {/* US-13 — configurable workflow stages */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Workflow stages</label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {stages.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {s.name}
                {s.isDefault ? (
                  <span className="text-[10px] text-gray-400">Default</span>
                ) : (
                  <button type="button" onClick={() => setStages((prev) => prev.filter((x) => x.id !== s.id))} className="hover:text-gray-800">✕</button>
                )}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={stageInput}
              onChange={(e) => setStageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStage())}
              placeholder="Custom status name"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button type="button" onClick={addStage} className="px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
              Add New Status
            </button>
          </div>
        </div>

        {/* US-14 — enable sprints */}
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={sprintsEnabled} onChange={(e) => setSprintsEnabled(e.target.checked)} className="accent-sky-500" />
          Enable Sprints
        </label>

        {/* US-17 — project files */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Files ({files.length})</label>
          <div className="space-y-1.5">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                <span className="text-xs text-gray-700 truncate">{f.name}</span>
                <button type="button" onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))} className="text-gray-400 hover:text-red-500 text-xs shrink-0">✕</button>
              </div>
            ))}
            {files.length === 0 && <p className="text-xs text-gray-400">No files uploaded</p>}
            <label className="block text-center text-xs font-semibold text-sky-600 border border-dashed border-sky-200 rounded-lg py-1.5 cursor-pointer hover:bg-sky-50">
              + Add file
              <input type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
            </label>
          </div>
        </div>

        {/* US-18 — access level */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Access level</label>
          <select
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {ACCESS_LEVELS.map((a) => <option key={a}>{a}</option>)}
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
            onClick={() => onCreate({
              name, description, departments, leads, start, end,
              workflowStages: stages, sprintsEnabled, files, accessLevel,
            })}
            disabled={creating || !name}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const [tab, setTab] = useState('Ongoing')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [layout, setLayout] = useState('Grid')
  const [showNew, setShowNew] = useState(false)

  const queryClient = useQueryClient()
  const projects = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })

  const create = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowNew(false)
    },
  })

  const all = projects.data ?? []
  const counts = {
    Ongoing: all.filter((p) => !p.archived).length,
    Archived: all.filter((p) => p.archived).length,
  }

  const visible = useMemo(() => {
    let list = all.filter(
      (p) =>
        (tab === 'Ongoing' ? !p.archived : p.archived) &&
        p.name.toLowerCase().includes(search.toLowerCase())
    )
    if (dateFrom) list = list.filter((p) => (p.createdAt ?? '') >= dateFrom)
    if (dateTo) list = list.filter((p) => (p.createdAt ?? '') <= dateTo)

    const factor = sortDir === 'asc' ? 1 : -1
    list = [...list].sort((a, b) => {
      const av = a[sortField] ?? ''
      const bv = b[sortField] ?? ''
      if (av < bv) return -1 * factor
      if (av > bv) return 1 * factor
      return 0
    })
    return list
  }, [all, tab, search, dateFrom, dateTo, sortField, sortDir])

  // US-11 — split into "home department" projects vs. everything else.
  const homeGroup = visible.filter((p) => (p.departments ?? []).includes(HOME_DEPARTMENT))
  const otherGroup = visible.filter((p) => !(p.departments ?? []).includes(HOME_DEPARTMENT))

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Projects <span className="text-gray-300 font-medium text-lg">({all.length})</span>
          </h1>
          <p className="text-gray-500 mt-1">Manage your projects and track progress</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 shadow-sm shadow-sky-200 transition"
        >
          + New project
        </button>
      </div>

      <div className="flex gap-6 border-b border-gray-200 mt-6 mb-5">
        {['Ongoing', 'Archived'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2.5 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px transition ${
              tab === t
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t}
            <span className={`px-2 py-0.5 rounded-full text-xs ${tab === t ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500'}`}>
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar (US-08, US-09) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 flex-1 min-w-[180px]"
        />

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <span className="text-gray-300 text-sm">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          {SORT_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <button
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          className="px-3 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
          title="Toggle sort direction"
        >
          {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>

        <div className="flex rounded-xl border border-gray-200 p-0.5 bg-gray-50">
          {['Grid', 'List'].map((v) => (
            <button
              key={v}
              onClick={() => setLayout(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                layout === v ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {projects.isLoading && (
        <p className="text-center py-12 text-sm text-gray-400">Loading projects...</p>
      )}

      {!projects.isLoading && (
        <>
          <ProjectGroup title={`${HOME_DEPARTMENT} Projects`} items={homeGroup} layout={layout} />
          <ProjectGroup
            title="Other Projects"
            subtitle="Projects from other departments or general projects"
            items={otherGroup}
            layout={layout}
          />
        </>
      )}

      {!projects.isLoading && visible.length === 0 && (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
          <p className="font-semibold text-gray-700">No projects here</p>
          <p className="text-sm text-gray-400 mt-1">Try another tab or create a new project.</p>
        </div>
      )}

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreate={(payload) => create.mutate(payload)}
          creating={create.isPending}
          error={create.isError ? create.error.message : null}
        />
      )}
    </div>
  )
}
