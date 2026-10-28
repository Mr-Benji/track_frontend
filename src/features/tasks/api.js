import { apiClient, saveBlob } from '../../lib/apiClient'
import { shortLabel } from '../../lib/dateUtils'

// The backend already computes `progress` and `overdue` server-side; only
// the short date labels and primary assignee still need deriving here.
function present(task) {
  return {
    ...task,
    start: shortLabel(task.startDate),
    due: shortLabel(task.dueDate),
    assignee: task.assignees?.[0] ?? 'Unassigned',
  }
}

export async function fetchTasks() {
  const tasks = await apiClient.get('/tasks')
  return tasks.map(present)
}

// One task by id, whatever workspace it's in (used for shared/email links).
export async function fetchTask(id) {
  const task = await apiClient.get(`/tasks/${id}`)
  return present(task)
}

export async function updateTaskStatus({ id, status, author }) {
  const task = await apiClient.patch(`/tasks/${id}/status`, { status, author })
  return present(task)
}

export async function updateTask(updated) {
  const { id, ...patch } = updated
  const task = await apiClient.patch(`/tasks/${id}`, patch)
  return present(task)
}

export async function deleteTask(taskId) {
  return apiClient.delete(`/tasks/${taskId}`)
}

export async function createTask({ title, description, projectId, assignees, priority, startDate, dueDate, isDraft, sprintId = null }) {
  const task = await apiClient.post('/tasks', {
    title,
    description: description || '',
    projectId,
    assignees: assignees ?? [],
    priority: priority || 'Medium',
    startDate: startDate || null,
    dueDate,
    sprintId,
    isDraft: !!isDraft,
  })
  return present(task)
}

export async function addAssignee({ taskId, name }) {
  const task = await apiClient.post(`/tasks/${taskId}/assignees`, { name })
  return present(task)
}

export async function removeAssignee({ taskId, name }) {
  const task = await apiClient.delete(`/tasks/${taskId}/assignees/${encodeURIComponent(name)}`)
  return present(task)
}

export async function addComment({ taskId, author, text }) {
  return apiClient.post(`/tasks/${taskId}/comments`, { author, text })
}

export async function toggleSubtask({ taskId, subtaskId }) {
  return apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`)
}

export async function addSubtask({ taskId, text }) {
  return apiClient.post(`/tasks/${taskId}/subtasks`, { text })
}

export async function addLink({ taskId, label, url }) {
  return apiClient.post(`/tasks/${taskId}/links`, { label: label || url, url })
}

export async function removeLink({ taskId, linkId }) {
  const task = await apiClient.delete(`/tasks/${taskId}/links/${linkId}`)
  return present(task)
}

// Uploads the picked File itself (max 10 MB).
export async function addFile({ taskId, file }) {
  const task = await apiClient.upload(`/tasks/${taskId}/files`, file)
  return present(task)
}

// Files added before uploads existed have no content (size is null).
export async function downloadFile({ taskId, file }) {
  const blob = await apiClient.download(`/tasks/${taskId}/files/${file.id}/content`)
  saveBlob(blob, file.name)
}

export async function removeFile({ taskId, fileId }) {
  const task = await apiClient.delete(`/tasks/${taskId}/files/${fileId}`)
  return present(task)
}
