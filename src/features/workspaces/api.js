import { apiClient } from '../../lib/apiClient'

export async function fetchWorkspaces() {
  return apiClient.get('/workspaces')
}

export async function createWorkspace({ name }) {
  return apiClient.post('/workspaces', { name })
}
