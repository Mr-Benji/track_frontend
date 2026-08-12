import { apiClient } from '../../lib/apiClient'

export async function fetchForms() {
  return apiClient.get('/forms')
}

export async function createForm({ title, description }) {
  return apiClient.post('/forms', { title, description })
}

export async function updateForm({ formId, ...patch }) {
  return apiClient.patch(`/forms/${formId}`, patch)
}
