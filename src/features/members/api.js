import { apiClient } from '../../lib/apiClient'

export const ROLES = ['Admin', 'User']

export async function fetchMembers() {
  return apiClient.get('/members')
}

export async function inviteMember({ name, email, title, department }) {
  return apiClient.post('/members/invite', { name, email, title, department })
}

export async function updateMember({ memberId, ...patch }) {
  return apiClient.patch(`/members/${memberId}`, patch)
}

// Soft-delete: the backend flips status to SUSPENDED rather than removing the record.
export async function suspendMember(memberId) {
  return apiClient.delete(`/members/${memberId}`)
}
