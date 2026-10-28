import { apiClient, saveBlob } from '../../lib/apiClient'

const DEFAULT_STAGES = [
  { id: 1, name: 'To Do', isDefault: true },
  { id: 2, name: 'In Progress', isDefault: true },
  { id: 3, name: 'Done', isDefault: true },
]

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

// The form's file list mixes files already on the project ({ id, name }) with
// newly picked ones ({ id, name, file: File }). The JSON request carries only
// the existing ones (the backend removes any left out); the new ones are then
// uploaded one by one.
const existingFiles = (files) => (files ?? []).filter((f) => !f.file)
const newFiles = (files) => (files ?? []).filter((f) => f.file)

async function uploadNewFiles(projectId, files) {
  let project = null
  for (const f of newFiles(files)) {
    try {
      project = await apiClient.upload(`/projects/${projectId}/files`, f.file)
    } catch (err) {
      // `projectSaved` lets the form close instead of inviting a retry that
      // would hit "name already exists" or upload the earlier files twice.
      const error = new Error(`The project was saved, but "${f.name}" couldn't be uploaded: ${err.message}`)
      error.projectSaved = true
      throw error
    }
  }
  return project
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
    files: [],
    accessLevel: accessLevel || 'Full Access',
  })
  const withUploads = await uploadNewFiles(project.id, files)
  return withDisplayDates(withUploads ?? project)
}

export async function updateProject({ projectId, files, ...patch }) {
  // start/end are a tri-state merge-patch on the backend: omitted/null leaves
  // the date untouched, "" clears it, anything else is parsed as a new date.
  // The edit form already sends "" when a date input is cleared, so no
  // conversion is needed here — passing patch through as-is is correct.
  const project = await apiClient.patch(`/projects/${projectId}`, {
    ...patch,
    ...(files !== undefined ? { files: existingFiles(files) } : {}),
  })
  const withUploads = await uploadNewFiles(projectId, files)
  return withDisplayDates(withUploads ?? project)
}

// Files added before uploads existed have no content (size is null).
export async function downloadProjectFile({ projectId, file }) {
  const blob = await apiClient.download(`/projects/${projectId}/files/${file.id}/content`)
  saveBlob(blob, file.name)
}

export async function deleteProject(projectId) {
  return apiClient.delete(`/projects/${projectId}`)
}

export { DEFAULT_STAGES }
