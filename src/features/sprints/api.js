import { apiClient } from '../../lib/apiClient'

export async function fetchSprints() {
  return apiClient.get('/sprints')
}

export async function createSprint({ name, goal }) {
  return apiClient.post('/sprints', { name, goal })
}

export async function updateSprint({ sprintId, ...patch }) {
  return apiClient.patch(`/sprints/${sprintId}`, patch)
}

export async function deleteSprint(sprintId) {
  return apiClient.delete(`/sprints/${sprintId}`)
}
