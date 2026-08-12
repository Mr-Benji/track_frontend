import { apiClient } from '../../lib/apiClient'
import { setToken } from '../../lib/token'

export async function loginRequest({ email, password }) {
  const data = await apiClient.post('/auth/login', { email, password })
  setToken(data.token)
  return data
}

export async function activateRequest({ email, password }) {
  const data = await apiClient.post('/auth/activate', { email, password })
  setToken(data.token)
  return data
}
