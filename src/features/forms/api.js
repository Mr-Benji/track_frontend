import { apiClient } from '../../lib/apiClient'

// Each form comes with its questions (`fields`), plus `canManage` (you own it
// or are an Admin) and `respondedByMe`.
export async function fetchForms() {
  return apiClient.get('/forms')
}

// fields: [{ id?, label, type: 'text' | 'paragraph' | 'choice', required, options }]
export async function createForm({ title, description, target, fields }) {
  return apiClient.post('/forms', { title, description, target, fields: fields ?? [] })
}

// Any of { title, description, status, target, fields }. fields replaces the
// whole question list; keep an existing question's id to edit it in place.
export async function updateForm({ formId, ...patch }) {
  return apiClient.patch(`/forms/${formId}`, patch)
}

// answers: [{ fieldId, value }]
export async function submitFormResponse({ formId, answers }) {
  return apiClient.post(`/forms/${formId}/responses`, { answers })
}

export async function fetchFormResponses(formId) {
  return apiClient.get(`/forms/${formId}/responses`)
}

export async function fetchMyResponses() {
  return apiClient.get('/forms/responses/mine')
}
