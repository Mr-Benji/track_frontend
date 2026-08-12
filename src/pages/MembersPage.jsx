import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMembers, inviteMember, updateMember, suspendMember, ROLES } from '../features/members/api'
import { fetchDepartments } from '../features/departments/api'

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

const statusStyle = {
  Active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-600 border-amber-200',
  Suspended: 'bg-red-50 text-red-500 border-red-200',
}

const STATUS_TABS = ['Active', 'Pending', 'Suspended']
const PAGE_SIZE = 5

function MemberCard({ m, onEdit, onSuspend }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-xl ${avatarColor(m.name)} flex items-center justify-center font-bold text-sm shrink-0`}>
            {initials(m.name)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 truncate">{m.name}</p>
            <p className="text-xs text-gray-400 truncate">{m.email}</p>
          </div>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle[m.status]}`}>
          {m.status}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">{m.title}</span>
        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-sky-50 text-sky-600">{m.role}</span>
        {m.department && <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-violet-50 text-violet-600">{m.department}</span>}
      </div>

      <p className="text-xs text-gray-400 pt-3 border-t border-gray-50">Joined {m.joined}</p>

      <div className="flex gap-2 pt-3 border-t border-gray-50">
        <button
          onClick={() => onEdit(m)}
          className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition"
        >
          Edit
        </button>
        {m.status !== 'Suspended' && (
          <button
            onClick={() => onSuspend(m)}
            className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg text-red-500 border border-red-200 hover:bg-red-50 transition"
          >
            Suspend
          </button>
        )}
      </div>
    </div>
  )
}

function EditMemberModal({ member, departmentOptions, onClose, onSave, saving, error }) {
  const [title, setTitle] = useState(member.title ?? '')
  const [role, setRole] = useState(member.role)
  const [department, setDepartment] = useState(member.department || '')

  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center bg-gray-900/40 backdrop-blur-sm overflow-y-auto py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 mx-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Edit member</h2>
          <p className="text-sm text-gray-400 mt-0.5">{member.name}</p>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Job title"
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">No department</option>
          {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
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
            onClick={() => onSave({ title, role, department })}
            disabled={saving}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MembersPage() {
  const [tab, setTab] = useState('Active')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showInvite, setShowInvite] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDepartment, setNewDepartment] = useState('')
  const [editingMember, setEditingMember] = useState(null)
  const [suspendError, setSuspendError] = useState('')

  const queryClient = useQueryClient()
  const members = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const departments = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments })

  const invite = useMutation({
    mutationFn: inviteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setShowInvite(false)
      setNewName('')
      setNewEmail('')
      setNewTitle('')
      setNewDepartment('')
    },
  })

  const edit = useMutation({
    mutationFn: updateMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setEditingMember(null)
    },
  })

  const suspend = useMutation({
    mutationFn: suspendMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setSuspendError('')
    },
    onError: (err) => setSuspendError(err.message),
  })

  function handleSuspend(m) {
    if (window.confirm(`Suspend ${m.name}? They'll lose access until reactivated.`)) {
      suspend.mutate(m.id)
    }
  }

  const all = useMemo(() => members.data ?? [], [members.data])
  const counts = {
    Active: all.filter((m) => m.status === 'Active').length,
    Pending: all.filter((m) => m.status === 'Pending').length,
    Suspended: all.filter((m) => m.status === 'Suspended').length,
  }

  const filtered = useMemo(() => {
    return all.filter(
      (m) =>
        m.status === tab &&
        (roleFilter === '' || m.role === roleFilter) &&
        (m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))
    )
  }, [all, tab, roleFilter, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  function changeTab(t) {
    setTab(t)
    setPage(1)
  }
  function changeSearch(v) {
    setSearch(v)
    setPage(1)
  }
  function changeRole(v) {
    setRoleFilter(v)
    setPage(1)
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Members <span className="text-gray-300 font-medium text-lg">({all.length})</span>
          </h1>
          <p className="text-gray-500 mt-1">Manage your workspace members, roles, and permissions</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 shadow-sm shadow-sky-200 transition"
        >
          + Invite member
        </button>
      </div>

      {/* US-46 — status tabs with count badges */}
      <div className="flex gap-6 border-b border-gray-200 mt-6 mb-5">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => changeTab(t)}
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

      {/* US-47 — search + role filter */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          placeholder="Search members..."
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 w-72"
        />
        <select
          value={roleFilter}
          onChange={(e) => changeRole(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">Filter by role</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {suspendError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-5">{suspendError}</p>
      )}

      {members.isLoading && (
        <p className="text-center py-12 text-sm text-gray-400">Loading members...</p>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((m) => (
          <MemberCard key={m.id} m={m} onEdit={setEditingMember} onSuspend={handleSuspend} />
        ))}
      </div>

      {!members.isLoading && filtered.length === 0 && (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
          <p className="font-semibold text-gray-700">No members found</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search or invite someone new.</p>
        </div>
      )}

      {/* US-48 — pagination footer */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-6 text-sm text-gray-500">
          <p>
            Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            {[...Array(pageCount)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-medium ${
                  currentPage === i + 1 ? 'bg-sky-500 text-white' : 'border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage === pageCount}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showInvite && (
        <div
          className="fixed inset-0 z-20 flex items-start justify-center bg-gray-900/40 backdrop-blur-sm overflow-y-auto py-8"
          onClick={(e) => { if (e.target === e.currentTarget) setShowInvite(false) }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 mx-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Invite member</h2>
              <p className="text-sm text-gray-400 mt-0.5">They'll join with Pending status until they accept.</p>
            </div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email address"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Job title (optional)"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <select
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-gray-700"
            >
              <option value="" disabled>Select department</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
            {invite.isError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{invite.error.message}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowInvite(false)}
                className="px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => invite.mutate({ name: newName, email: newEmail, title: newTitle, department: newDepartment })}
                disabled={invite.isPending || !newName || !newEmail || !newDepartment}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
              >
                {invite.isPending ? 'Inviting...' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          departmentOptions={(departments.data ?? []).map((d) => d.name)}
          onClose={() => setEditingMember(null)}
          onSave={(patch) => edit.mutate({ memberId: editingMember.id, ...patch })}
          saving={edit.isPending}
          error={edit.isError ? edit.error.message : null}
        />
      )}
    </div>
  )
}
