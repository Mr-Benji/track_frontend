import { apiClient } from '../../lib/apiClient'

export async function fetchSprints() {
  return apiClient.get('/sprints')
}

// start/end are "YYYY-MM-DD"; "" means no date.
export async function createSprint({ name, goal, start, end }) {
  return apiClient.post('/sprints', { name, goal, start: start || null, end: end || null })
}

// start/end follow the project-date rule: omitted leaves them, "" clears them.
export async function updateSprint({ sprintId, ...patch }) {
  return apiClient.patch(`/sprints/${sprintId}`, patch)
}

export async function deleteSprint(sprintId) {
  return apiClient.delete(`/sprints/${sprintId}`)
}
