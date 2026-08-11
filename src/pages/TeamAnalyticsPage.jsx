import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts'
import { fetchMembers } from '../features/members/api'

const initials = (name) =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const joinsPerMonth = [
  { month: 'Feb', joined: 1 },
  { month: 'Mar', joined: 0 },
  { month: 'Apr', joined: 2 },
  { month: 'May', joined: 1 },
  { month: 'Jun', joined: 4 },
  { month: 'Jul', joined: 2 },
]

const tasksPerDept = [
  { dept: 'Dev', completed: 34, open: 12 },
  { dept: 'Design', completed: 21, open: 6 },
  { dept: 'Data', completed: 15, open: 9 },
  { dept: 'QA', completed: 11, open: 4 },
]

const topContributors = [
  { name: 'Uwera Maggy', score: 119 },
  { name: 'Sylvestre Mukiza', score: 107 },
  { name: 'Josiane Kazanenda', score: 98 },
  { name: 'Benitha Mukatwizeyimana', score: 91 },
]

const PIE_COLORS = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd']

export default function TeamAnalyticsPage() {
  const members = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const all = members.data ?? []

  const active = all.filter((m) => m.status === 'Active').length
  const pending = all.filter((m) => m.status === 'Pending').length
  const admins = all.filter((m) => m.role === 'ADMIN').length

  const roleData = [
    { name: 'Interns', value: all.filter((m) => m.title === 'Intern').length },
    { name: 'Students', value: all.filter((m) => m.title.includes('Student')).length },
    { name: 'Staff', value: all.filter((m) => !['Intern'].includes(m.title) && !m.title.includes('Student')).length },
  ]

  if (members.isLoading) {
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
          <p className="text-3xl font-bold mt-2">+2</p>
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
              <YAxis fontSize={12} />
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
            Top contributors vs target
          </p>
          <div className="space-y-3">
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
            {all.slice(0, 4).map((m) => (
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