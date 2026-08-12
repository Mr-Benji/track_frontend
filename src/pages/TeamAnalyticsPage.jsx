import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts'
import { fetchMembers } from '../features/members/api'
import { fetchTasks } from '../features/tasks/api'
import { fetchProjects } from '../features/projects/api'

const initials = (name) =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const PIE_COLORS = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd']

// Members joined per month, for whichever months are actually present in the data.
function buildJoinsPerMonth(members) {
  const counts = new Map()
  for (const m of members) {
    if (!m.joined) continue
    const key = m.joined.slice(0, 7) // "YYYY-MM"
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, joined]) => ({ month: MONTH_ABBR[Number(key.slice(5, 7)) - 1], joined }))
}

// Tasks grouped by their project's primary department (or "Unassigned").
function buildTasksPerDept(tasks, projects) {
  const deptByProject = new Map(projects.map((p) => [p.id, p.departments?.[0] || 'Unassigned']))
  const byDept = new Map()
  for (const t of tasks) {
    const dept = deptByProject.get(t.projectId) ?? 'Unassigned'
    if (!byDept.has(dept)) byDept.set(dept, { dept, completed: 0, open: 0 })
    const entry = byDept.get(dept)
    if (t.status === 'Done') entry.completed += 1
    else entry.open += 1
  }
  return [...byDept.values()]
}

// Completion rate per assignee, ranked, top 4.
function buildTopContributors(tasks) {
  const stats = new Map()
  for (const t of tasks) {
    for (const name of t.assignees ?? []) {
      if (!stats.has(name)) stats.set(name, { total: 0, done: 0 })
      const s = stats.get(name)
      s.total += 1
      if (t.status === 'Done') s.done += 1
    }
  }
  return [...stats.entries()]
    .map(([name, s]) => ({ name, score: Math.round((s.done / s.total) * 100) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
}

export default function TeamAnalyticsPage() {
  const members = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks })
  const projects = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })

  const all = members.data ?? []
  const allTasks = tasks.data ?? []
  const allProjects = projects.data ?? []

  const active = all.filter((m) => m.status === 'Active').length
  const pending = all.filter((m) => m.status === 'Pending').length
  const admins = all.filter((m) => m.role === 'Admin').length

  const thisMonthKey = new Date().toISOString().slice(0, 7)
  const newThisMonth = all.filter((m) => m.joined?.startsWith(thisMonthKey)).length

  const roleData = [
    { name: 'Interns', value: all.filter((m) => m.title === 'Intern').length },
    { name: 'Students', value: all.filter((m) => (m.title ?? '').includes('Student')).length },
    { name: 'Staff', value: all.filter((m) => m.title !== 'Intern' && !(m.title ?? '').includes('Student')).length },
  ]

  const joinsPerMonth = buildJoinsPerMonth(all)
  const tasksPerDept = buildTasksPerDept(allTasks, allProjects)
  const topContributors = buildTopContributors(allTasks)
  const recentlyJoined = [...all].sort((a, b) => (b.joined ?? '').localeCompare(a.joined ?? '')).slice(0, 4)

  if (members.isLoading || tasks.isLoading || projects.isLoading) {
    return <p className="text-gray-400 text-sm py-10">Loading analytics...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Team Analytics</h1>
        <p className="text-gray-500 mt-1">Key figures for your workspace team</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase">Total members</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{all.length}</p>
          <p className="text-xs text-gray-400 mt-1">across all departments</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase">Active</p>
          <p className="text-3xl font-bold text-sky-600 mt-2">{active}</p>
          <p className="text-xs text-gray-400 mt-1">{pending} pending invite</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase">Admins</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{admins}</p>
          <p className="text-xs text-gray-400 mt-1">with full permissions</p>
        </div>
        {/* highlighted card */}
        <div className="rounded-xl p-5 bg-gradient-to-br from-sky-600 to-sky-700 text-white">
          <p className="text-xs uppercase text-sky-200">New this month</p>
          <p className="text-3xl font-bold mt-2">+{newThisMonth}</p>
          <p className="text-xs text-sky-200 mt-1">team is growing</p>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-700 text-sm mb-4">
            Tasks by department
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tasksPerDept}>
              <XAxis dataKey="dept" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="completed" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="open" fill="#bae6fd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-700 text-sm mb-4">
            Members by role
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={roleData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {roleData.map((entry, i) => (
                  <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-700 text-sm mb-4">
            Members joined per month
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={joinsPerMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="joined"
                stroke="#0ea5e9"
                fill="#bae6fd"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BOTTOM LISTS */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-700 text-sm mb-4">
            Top contributors (task completion rate)
          </p>
          <div className="space-y-3">
            {topContributors.length === 0 && (
              <p className="text-xs text-gray-400 italic">No assigned tasks yet</p>
            )}
            {topContributors.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold">
                  {initials(c.name)}
                </div>
                <p className="flex-1 text-sm font-medium text-gray-700">{c.name}</p>
                <span className={`text-sm font-bold ${c.score >= 100 ? 'text-sky-600' : 'text-gray-500'}`}>
                  {c.score}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-700 text-sm mb-4">
            Recently joined
          </p>
          <div className="space-y-3">
            {recentlyJoined.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold">
                  {initials(m.name)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.title}</p>
                </div>
                <span className="text-xs text-gray-400">{m.joined}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
