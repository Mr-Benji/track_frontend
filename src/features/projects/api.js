import { apiClient } from '../../lib/apiClient'

const DEFAULT_STAGES = [
  { id: 1, name: 'To Do', isDefault: true },
  { id: 2, name: 'In Progress', isDefault: true },
  { id: 3, name: 'Done', isDefault: true },
]

// Projects belonging to this department are shown in the main section;
// everything else (other departments, or General/uncategorized) is grouped under "Other Projects".
export const HOME_DEPARTMENT = 'Development'

export const ACCESS_LEVELS = ['Full Access', 'Restricted', 'Private']

// The backend returns/expects project start/end as ISO ("2026-09-01"), but
// the UI displays them as "13 Jul 2026" — match the display format used
// across the app for cards/lists.
function formatDisplayDate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// Keeps the raw ISO dates around as startISO/endISO (needed to prefill a
// <input type="date"> when editing) while start/end become display strings.
function withDisplayDates(project) {
  return {
    ...project,
    startISO: project.start,
    endISO: project.end,
    start: formatDisplayDate(project.start),
    end: formatDisplayDate(project.end),
  }
}

export async function fetchProjects() {
  const projects = await apiClient.get('/projects')
  return projects.map(withDisplayDates)
}

export async function createProject({
  name, departments, leads, description, start, end,
  workflowStages, sprintsEnabled, files, accessLevel,
}) {
  const project = await apiClient.post('/projects', {
    name,
    departments: departments ?? [],
    leads: leads ?? [],
    description: description || '',
    start: start || null,
    end: end || null,
    workflowStages: workflowStages?.length ? workflowStages : DEFAULT_STAGES,
    sprintsEnabled: !!sprintsEnabled,
    files: files ?? [],
    accessLevel: accessLevel || 'Full Access',
  })
  return withDisplayDates(project)
}

export async function updateProject({ projectId, ...patch }) {
  const project = await apiClient.patch(`/projects/${projectId}`, patch)
  return withDisplayDates(project)
}

export async function deleteProject(projectId) {
  return apiClient.delete(`/projects/${projectId}`)
}

export async function addProjectFile({ projectId, name }) {
  return apiClient.post(`/projects/${projectId}/files`, { name })
}

export async function removeProjectFile({ projectId, fileId }) {
  const project = await apiClient.delete(`/projects/${projectId}/files/${fileId}`)
  return withDisplayDates(project)
}

export { DEFAULT_STAGES }
