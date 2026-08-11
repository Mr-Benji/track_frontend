const DEFAULT_STAGES = [
  { id: 1, name: 'To Do', isDefault: true },
  { id: 2, name: 'In Progress', isDefault: true },
  { id: 3, name: 'Done', isDefault: true },
]

let projects = [
  { id: 1, name: 'Task Tracker Platform', departments: ['Development'], leads: ['Uwera Maggy'], status: 'Active', trackingMode: 'Auto', start: '13 Jul 2026', end: '30 Sep 2026', createdAt: '2026-07-01', tasks: 12, completed: 9, archived: false, description: 'Core platform build.', workflowStages: DEFAULT_STAGES, sprintsEnabled: true, files: [{ id: 1, name: 'requirements.pdf' }], accessLevel: 'Full Access' },
  { id: 2, name: 'Member Onboarding Flow', departments: ['Design'], leads: ['M Gentille'], status: 'Active', trackingMode: 'Manual', start: '01 Jul 2026', end: '15 Aug 2026', createdAt: '2026-06-20', tasks: 8, completed: 3, archived: false, description: 'Redesign onboarding.', workflowStages: DEFAULT_STAGES, sprintsEnabled: false, files: [], accessLevel: 'Full Access' },
  { id: 3, name: 'Analytics Dashboard', departments: ['Development'], leads: ['Aaron Ariel', 'Shema Kevin'], status: 'Active', trackingMode: 'Auto', start: '20 Jun 2026', end: '20 Jul 2026', createdAt: '2026-06-05', tasks: 10, completed: 10, archived: false, description: 'Reporting dashboard.', workflowStages: DEFAULT_STAGES, sprintsEnabled: true, files: [], accessLevel: 'Restricted' },
  { id: 4, name: 'User Research Interviews', departments: ['Research'], leads: ['Shema Kevin'], status: 'Overdue', trackingMode: 'Manual', start: '05 May 2026', end: '30 Jun 2026', createdAt: '2026-04-28', tasks: 6, completed: 4, archived: false, description: 'Qualitative research pass.', workflowStages: DEFAULT_STAGES, sprintsEnabled: false, files: [], accessLevel: 'Full Access' },
  { id: 5, name: 'Team Handbook', departments: ['Operations'], leads: ['Umutoni Valerie'], status: 'Planning', trackingMode: 'Manual', start: '01 Aug 2026', end: '30 Aug 2026', createdAt: '2026-07-10', tasks: 5, completed: 0, archived: false, description: 'Internal handbook.', workflowStages: DEFAULT_STAGES, sprintsEnabled: false, files: [], accessLevel: 'Private' },
  { id: 6, name: 'General Workspace Cleanup', departments: [], leads: ['Eric Ndayisaba'], status: 'Active', trackingMode: 'Auto', start: null, end: null, createdAt: '2026-07-12', tasks: 3, completed: 1, archived: false, description: 'Uncategorized housekeeping tasks.', workflowStages: DEFAULT_STAGES, sprintsEnabled: false, files: [], accessLevel: 'Full Access' },
  { id: 7, name: 'Legacy Data Migration', departments: ['Development'], leads: ['Eric Ndayisaba'], status: 'Active', trackingMode: 'Auto', start: '10 Jan 2026', end: '28 Feb 2026', createdAt: '2026-01-05', tasks: 14, completed: 14, archived: true, description: 'Move legacy records.', workflowStages: DEFAULT_STAGES, sprintsEnabled: false, files: [], accessLevel: 'Full Access' },
  { id: 8, name: 'Brand Refresh 2025', departments: ['Design'], leads: ['Alice Uwase'], status: 'Active', trackingMode: 'Manual', start: '01 Oct 2025', end: '20 Dec 2025', createdAt: '2025-09-15', tasks: 9, completed: 9, archived: true, description: 'Brand identity refresh.', workflowStages: DEFAULT_STAGES, sprintsEnabled: false, files: [], accessLevel: 'Full Access' },
]

// Projects belonging to this department are shown in the main section;
// everything else (other departments, or General/uncategorized) is grouped under "Other Projects".
export const HOME_DEPARTMENT = 'Development'

export const ACCESS_LEVELS = ['Full Access', 'Restricted', 'Private']

export async function fetchProjects() {
  await new Promise((r) => setTimeout(r, 600))
  return [...projects]
}

// Match the display format used across the app ("13 Jul 2026") for ISO
// dates coming out of a native <input type="date">.
function formatDisplayDate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-')
  const label = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  return label
}

function findOrThrow(id) {
  const project = projects.find((p) => p.id === id)
  if (!project) throw new Error('Project not found')
  return project
}

export async function createProject({
  name, departments, leads, description, start, end,
  workflowStages, sprintsEnabled, files, accessLevel,
}) {
  await new Promise((r) => setTimeout(r, 900))
  if (projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('A project with this name already exists')
  }
  const newProject = {
    id: Date.now(),
    name,
    departments: departments ?? [],
    leads: leads ?? [],
    description: description || '',
    status: 'Planning',
    trackingMode: 'Manual',
    start: formatDisplayDate(start),
    end: formatDisplayDate(end),
    createdAt: new Date().toISOString().slice(0, 10),
    tasks: 0,
    completed: 0,
    archived: false,
    workflowStages: workflowStages?.length ? workflowStages : DEFAULT_STAGES,
    sprintsEnabled: !!sprintsEnabled,
    files: files ?? [],
    accessLevel: accessLevel || 'Full Access',
  }
  projects.push(newProject)
  return newProject
}

export async function addProjectFile({ projectId, name }) {
  await new Promise((r) => setTimeout(r, 200))
  const project = findOrThrow(projectId)
  const file = { id: Date.now(), name }
  project.files.push(file)
  return file
}

export async function removeProjectFile({ projectId, fileId }) {
  await new Promise((r) => setTimeout(r, 200))
  const project = findOrThrow(projectId)
  project.files = project.files.filter((f) => f.id !== fileId)
  return project
}

export { DEFAULT_STAGES }
