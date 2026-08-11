import { isOverdue, shortLabel } from '../../lib/dateUtils'

// Status -> completion percentage, used both for the progress bar and for
// the "50% → 0%" style activity log entries (US-26, US-31).
export const STATUS_PROGRESS = { 'To Do': 0, 'In Progress': 50, Done: 100 }

let tasks = [
  { id: 1, title: 'Fix login validation for empty fields', assignees: ['Uwera Maggy'], priority: 'High', startDate: '2026-08-03', dueDate: '2026-08-03', status: 'To Do', projectId: 1, description: 'Empty email/password should show inline errors instead of a blank failed request.', narrative: '', subtasks: [{ id: 1, text: 'Check empty email', done: true }, { id: 2, text: 'Check empty password', done: false }], comments: [{ id: 1, author: 'Uwera Maggy', text: 'Started looking into this.', timestamp: '2026-08-03T09:00:00' }], files: [], links: [], activityLog: [{ id: 1, type: 'system', change: 'Created', progressChange: null, author: 'Uwera Maggy', timestamp: '2026-08-03T08:00:00' }] },
  { id: 2, title: 'Design the settings page mockup', assignees: ['Alice Uwase'], priority: 'Medium', startDate: '2026-08-03', dueDate: '2026-08-05', status: 'To Do', projectId: 2, description: '', narrative: '', subtasks: [], comments: [], files: [], links: [], activityLog: [{ id: 1, type: 'system', change: 'Created', progressChange: null, author: 'Alice Uwase', timestamp: '2026-08-03T08:00:00' }] },
  { id: 3, title: 'Write onboarding documentation', assignees: ['M Gentille'], priority: 'Low', startDate: '2026-08-05', dueDate: '2026-08-07', status: 'To Do', projectId: 2, description: '', narrative: '', subtasks: [{ id: 1, text: 'Draft outline', done: true }], comments: [], files: [], links: [], activityLog: [{ id: 1, type: 'system', change: 'Created', progressChange: null, author: 'M Gentille', timestamp: '2026-08-03T08:00:00' }] },
  { id: 4, title: 'Connect analytics to real member data', assignees: ['Aaron Ariel', 'Shema Kevin'], priority: 'High', startDate: '2026-08-01', dueDate: '2026-08-02', status: 'In Progress', projectId: 3, description: '', narrative: 'Waiting on API access from the platform team before this can move.', subtasks: [], comments: [{ id: 1, author: 'Aaron Ariel', text: 'Blocked on API access.', timestamp: '2026-08-03T14:00:00' }], files: [], links: [], activityLog: [
    { id: 1, type: 'system', change: 'Created', progressChange: null, author: 'Aaron Ariel', timestamp: '2026-08-01T08:00:00' },
    { id: 2, type: 'system', change: 'To Do → In Progress', progressChange: '0% → 50%', author: 'Aaron Ariel', timestamp: '2026-08-02T10:30:00' },
  ] },
  { id: 5, title: 'Refactor the projects filter toolbar', assignees: ['Shema Kevin'], priority: 'Medium', startDate: '2026-08-02', dueDate: '2026-08-04', status: 'In Progress', projectId: 1, description: '', narrative: '', subtasks: [], comments: [], files: [], links: [], activityLog: [{ id: 1, type: 'system', change: 'Created', progressChange: null, author: 'Shema Kevin', timestamp: '2026-08-03T08:00:00' }] },
  { id: 6, title: 'Set up the Vite and React project', assignees: ['Uwera Maggy'], priority: 'High', startDate: '2026-08-01', dueDate: '2026-08-02', status: 'Done', projectId: 1, description: '', narrative: '', subtasks: [], comments: [], files: [], links: [], activityLog: [{ id: 1, type: 'system', change: 'Created', progressChange: null, author: 'Uwera Maggy', timestamp: '2026-08-01T08:00:00' }] },
  { id: 7, title: 'Build the members invite modal', assignees: ['Uwera Maggy'], priority: 'Medium', startDate: '2026-08-02', dueDate: '2026-08-03', status: 'Done', projectId: null, description: '', narrative: '', subtasks: [], comments: [], files: [], links: [], activityLog: [{ id: 1, type: 'system', change: 'Created', progressChange: null, author: 'Uwera Maggy', timestamp: '2026-08-02T08:00:00' }] },
  { id: 8, title: 'Add department cards with avatars', assignees: ['Umutoni Valerie'], priority: 'Low', startDate: '2026-08-02', dueDate: '2026-08-03', status: 'Done', projectId: null, description: '', narrative: '', subtasks: [], comments: [], files: [], links: [], activityLog: [{ id: 1, type: 'system', change: 'Created', progressChange: null, author: 'Umutoni Valerie', timestamp: '2026-08-02T08:00:00' }] },
  { id: 9, title: 'Draft weekly status report', assignees: ['Eric Ndayisaba'], priority: 'Medium', startDate: '2026-08-03', dueDate: '2026-08-07', status: 'To Do', projectId: null, description: '', narrative: '', subtasks: [], comments: [], files: [], links: [], activityLog: [{ id: 1, type: 'system', change: 'Created', progressChange: null, author: 'Eric Ndayisaba', timestamp: '2026-08-03T08:00:00' }] },
  { id: 10, title: 'Review pull requests from the team', assignees: ['Aaron Ariel'], priority: 'Low', startDate: '2026-08-03', dueDate: '2026-08-03', status: 'In Progress', projectId: 1, description: '', narrative: '', subtasks: [], comments: [], files: [], links: [], activityLog: [
    { id: 1, type: 'system', change: 'Created', progressChange: null, author: 'Aaron Ariel', timestamp: '2026-08-03T08:00:00' },
    { id: 2, type: 'system', change: 'To Do → In Progress', progressChange: '0% → 50%', author: 'Aaron Ariel', timestamp: '2026-08-03T09:15:00' },
  ] },
  { id: 11, title: 'Fix overdue reminder emails', assignees: ['Shema Kevin'], priority: 'Urgent', startDate: '2026-08-01', dueDate: '2026-08-02', status: 'To Do', projectId: 3, description: '', narrative: '', subtasks: [], comments: [], files: [], links: [], activityLog: [{ id: 1, type: 'system', change: 'Created', progressChange: null, author: 'Shema Kevin', timestamp: '2026-08-01T08:00:00' }] },
]

// Derive display fields (short date labels, live overdue flag, primary
// assignee for compact avatar displays) instead of trusting stored values
// that would otherwise go stale as today's date changes.
function present(task) {
  return {
    ...task,
    start: shortLabel(task.startDate),
    due: shortLabel(task.dueDate),
    overdue: isOverdue(task.dueDate, task.status),
    progress: STATUS_PROGRESS[task.status] ?? 0,
    assignee: task.assignees?.[0] ?? 'Unassigned',
    createdAt: task.createdAt ?? task.activityLog?.[0]?.timestamp ?? null,
  }
}

function findOrThrow(id) {
  const task = tasks.find((t) => t.id === id)
  if (!task) throw new Error('Task not found')
  return task
}

export async function fetchTasks() {
  await new Promise((r) => setTimeout(r, 600))
  return tasks.map(present)
}

export async function updateTaskStatus({ id, status, author }) {
  await new Promise((r) => setTimeout(r, 400))
  const task = findOrThrow(id)
  const fromProgress = STATUS_PROGRESS[task.status] ?? 0
  const toProgress = STATUS_PROGRESS[status] ?? 0
  task.activityLog.push({
    id: Date.now(),
    type: 'system',
    change: `${task.status} → ${status}`,
    progressChange: `${fromProgress}% → ${toProgress}%`,
    author: author || 'Someone',
    timestamp: new Date().toISOString(),
  })
  task.status = status
  return present(task)
}

export async function updateTask(updated) {
  await new Promise((r) => setTimeout(r, 400))
  const idx = tasks.findIndex((t) => t.id === updated.id)
  if (idx === -1) throw new Error('Task not found')
  tasks[idx] = { ...tasks[idx], ...updated }
  return present(tasks[idx])
}

export async function createTask({ title, description, projectId, assignees, priority, startDate, dueDate, isDraft, sprintId = null }) {
  await new Promise((r) => setTimeout(r, 900))
  if (!title?.trim()) throw new Error('Task title is required')
  if (!projectId) throw new Error('Project selection is required')
  if (!dueDate) throw new Error('Due date is required')
  const newTask = {
    id: Date.now(), title,
    createdAt: new Date().toISOString(),
    description: description || '',
    projectId,
    assignees: assignees ?? [],
    priority: priority || 'Medium',
    startDate: startDate || null,
    dueDate,
    sprintId,
    status: 'To Do',
    narrative: '',
    isDraft: !!isDraft,
    subtasks: [], comments: [], files: [], links: [],
    activityLog: [{ id: 1, type: 'system', change: 'Created', progressChange: null, author: assignees?.[0] ?? 'Someone', timestamp: new Date().toISOString() }],
  }
  tasks.push(newTask)
  return present(newTask)
}

export async function addAssignee({ taskId, name }) {
  await new Promise((r) => setTimeout(r, 200))
  const task = findOrThrow(taskId)
  if (!task.assignees.includes(name)) task.assignees.push(name)
  return present(task)
}

export async function removeAssignee({ taskId, name }) {
  await new Promise((r) => setTimeout(r, 200))
  const task = findOrThrow(taskId)
  task.assignees = task.assignees.filter((a) => a !== name)
  return present(task)
}

export async function addComment({ taskId, author, text }) {
  await new Promise((r) => setTimeout(r, 300))
  const task = findOrThrow(taskId)
  const comment = { id: Date.now(), author, text, timestamp: new Date().toISOString() }
  task.comments.push(comment)
  return comment
}

export async function toggleSubtask({ taskId, subtaskId }) {
  await new Promise((r) => setTimeout(r, 200))
  const task = findOrThrow(taskId)
  const sub = task.subtasks.find((s) => s.id === subtaskId)
  if (sub) sub.done = !sub.done
  return task
}

export async function addSubtask({ taskId, text }) {
  await new Promise((r) => setTimeout(r, 200))
  const task = findOrThrow(taskId)
  const sub = { id: Date.now(), text, done: false }
  task.subtasks.push(sub)
  return sub
}

export async function addLink({ taskId, label, url }) {
  await new Promise((r) => setTimeout(r, 200))
  const task = findOrThrow(taskId)
  const link = { id: Date.now(), label: label || url, url }
  task.links.push(link)
  return link
}

export async function removeLink({ taskId, linkId }) {
  await new Promise((r) => setTimeout(r, 200))
  const task = findOrThrow(taskId)
  task.links = task.links.filter((l) => l.id !== linkId)
  return task
}

export async function addFile({ taskId, name }) {
  await new Promise((r) => setTimeout(r, 200))
  const task = findOrThrow(taskId)
  const file = { id: Date.now(), name }
  task.files.push(file)
  return file
}

export async function removeFile({ taskId, fileId }) {
  await new Promise((r) => setTimeout(r, 200))
  const task = findOrThrow(taskId)
  task.files = task.files.filter((f) => f.id !== fileId)
  return task
}
