import { useState } from 'react'
import HomePage from './HomePage'
import MembersPage from './MembersPage'
import DepartmentsPage from './Departmentspage'
import ProjectsPage from './ProjectsPage'
import SprintsPage from './SprintsPage'
import TasksPage from './TasksPage'
import FormsPage from './FormsPage'
import TeamAnalyticsPage from './TeamAnalyticsPage'

const INITIAL_WORKSPACES = ['Health Intelligence Center', 'Demo Workspace']

const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

// US-51 — switch the active workspace from a dropdown near the top of the app.
function WorkspaceSwitcher({ workspace, workspaces, onChange, onCreate }) {
  const [open, setOpen] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')

  function createWorkspace() {
    const cleanName = name.trim()
    if (!cleanName) return
    onCreate(cleanName)
    setName('')
    setShowNew(false)
    setOpen(false)
  }
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50"
      >
        <span className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold">TW</span>
        {workspace}
        <span className="text-gray-400 text-xs">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl border border-gray-100 shadow-lg z-20 py-1.5">
            {workspaces.map((w) => (
              <button
                key={w}
                onClick={() => { onChange(w); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${w === workspace ? 'text-sky-600 font-semibold' : 'text-gray-700'}`}
              >
                {w}
              </button>
            ))}
            <div className="mx-2 mt-1 border-t border-gray-100 pt-1">
              <button
                onClick={() => setShowNew(true)}
                className="w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-sky-600 hover:bg-sky-50"
              >
                + New workspace
              </button>
            </div>
          </div>
        </>
      )}
      {showNew && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={() => setShowNew(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">New workspace</h2>
            <p className="mt-1 text-sm text-gray-400">Create a separate place for another team or organisation.</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createWorkspace() }}
              placeholder="Workspace name"
              className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={createWorkspace} disabled={!name.trim()} className="rounded-xl bg-sky-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

// Edit display name — the one thing the profile menu previously couldn't do.
function ProfileModal({ user, onClose, onSave }) {
  const [name, setName] = useState(user.name)
  return (
    <ModalShell title="Profile" subtitle="Update how your name appears across the workspace." onClose={onClose}>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
        <input
          value={user.email}
          disabled
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-400"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={() => { onSave({ name: name.trim() || user.name }); onClose() }}
          disabled={!name.trim()}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
        >
          Save changes
        </button>
      </div>
    </ModalShell>
  )
}

function SettingsModal({ user, onClose, onSave }) {
  const [email, setEmail] = useState(user.email)
  const [emailNotifications, setEmailNotifications] = useState(user.emailNotifications ?? true)
  return (
    <ModalShell title="Settings" subtitle="Manage your account settings." onClose={onClose}>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={emailNotifications}
          onChange={(e) => setEmailNotifications(e.target.checked)}
          className="accent-sky-500"
        />
        Email me about task and project updates
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 border border-gray-200 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={() => { onSave({ email: email.trim() || user.email, emailNotifications }); onClose() }}
          disabled={!email.trim()}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50"
        >
          Save changes
        </button>
      </div>
    </ModalShell>
  )
}

// US-53 — name + role visible at all times in the top-right corner, with a
// Profile/Settings/Logout dropdown.
function ProfileMenu({ user, onLogout, onUpdateUser }) {
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState(null) // 'profile' | 'settings' | null
  const role = user.role ?? 'User'
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 hover:bg-gray-50 rounded-full pr-1">
        <div className="text-right leading-none">
          <p className="text-sm font-semibold text-gray-800">{user.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{role}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
          {initials(user.name)}
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl border border-gray-100 shadow-lg z-20 py-1.5">
            <button onClick={() => { setModal('profile'); setOpen(false) }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Profile
            </button>
            <button onClick={() => { setModal('settings'); setOpen(false) }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Settings
            </button>
            <button onClick={onLogout} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50">Logout</button>
          </div>
        </>
      )}

      {modal === 'profile' && (
        <ProfileModal user={user} onClose={() => setModal(null)} onSave={onUpdateUser} />
      )}
      {modal === 'settings' && (
        <SettingsModal user={user} onClose={() => setModal(null)} onSave={onUpdateUser} />
      )}
    </div>
  )
}

export default function DashboardPage({ user, onLogout, onUpdateUser }) {
  // Which screen is showing right now — the heart of navigation.
  // A shared task link ("#task-123", see TaskDetailModal's Share button)
  // should land straight on Tasks so the deep-linked task can open.
  const [page, setPage] = useState(() => (window.location.hash.startsWith('#task-') ? 'Tasks' : 'Home'))
  const [workspaces, setWorkspaces] = useState(INITIAL_WORKSPACES)
  const [workspace, setWorkspace] = useState(INITIAL_WORKSPACES[0])

  function addWorkspace(name) {
    setWorkspaces((current) => current.includes(name) ? current : [...current, name])
    setWorkspace(name)
  }

  // One entry per sidebar item
  const nav = ['Home', 'Members', 'Departments', 'Projects', 'Sprints', 'Tasks', 'Forms', 'Team Analytics']

  // Map page name → what to render
  const pages = {
    Home: <HomePage user={user} />,
    Members: <MembersPage />,
    Departments: <DepartmentsPage />,
    Projects: <ProjectsPage />,
    Sprints: <SprintsPage />,
    Tasks: <TasksPage user={user} />,
    Forms: <FormsPage />,
    'Team Analytics': <TeamAnalyticsPage />,
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* ---------- Sidebar — pinned to the viewport, never scrolls with the page ---------- */}
      <aside className="w-56 flex flex-col py-6 px-3 bg-white border-r border-gray-100 overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-sm">
            TW
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">Track Workspace</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Health Intelligence Center</p>
          </div>
        </div>

        {/* Nav buttons — one per item, highlight the active one (US-52) */}
        <nav className="space-y-1 flex-1">
          {nav.map((item) => (
            <button
              key={item}
              onClick={() => setPage(item)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition border-l-2 ${
                page === item
                  ? 'bg-sky-50 text-sky-600 border-sky-500'
                  : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* ---------- Main column ---------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ---------- Top bar (US-51, US-53) ---------- */}
        <header className="shrink-0 flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
          <WorkspaceSwitcher workspace={workspace} workspaces={workspaces} onChange={setWorkspace} onCreate={addWorkspace} />
          <ProfileMenu user={user} onLogout={onLogout} onUpdateUser={onUpdateUser} />
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          {pages[page]}
        </main>
      </div>
    </div>
  )
}
