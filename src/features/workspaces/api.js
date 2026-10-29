import { apiClient } from '../../lib/apiClient'

// The workspaces you belong to (Admins: all), each with `members` (count),
// `createdBy` and `canManage` (you created it or are an Admin).
export async function fetchWorkspaces() {
  return apiClient.get('/workspaces')
}

// You become its first member and can manage its members.
export async function createWorkspace({ name }) {
  return apiClient.post('/workspaces', { name })
}

export async function fetchWorkspaceMembers(workspaceId) {
  return apiClient.get(`/workspaces/${workspaceId}/members`)
}

// Both return the updated member list.
export async function addWorkspaceMember({ workspaceId, name }) {
  return apiClient.post(`/workspaces/${workspaceId}/members`, { name })
}

export async function removeWorkspaceMember({ workspaceId, userId }) {
  return apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`)
}
