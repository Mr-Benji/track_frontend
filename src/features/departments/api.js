import { apiClient } from '../../lib/apiClient'

export async function fetchDepartments() {
  return apiClient.get('/departments')
}

export async function createDepartment({ name, lead }) {
  return apiClient.post('/departments', { name, lead })
}

export async function updateDepartment({ departmentId, ...patch }) {
  return apiClient.patch(`/departments/${departmentId}`, patch)
}

export async function deleteDepartment(departmentId) {
  return apiClient.delete(`/departments/${departmentId}`)
}
