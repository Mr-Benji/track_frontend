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

export async function registerRequest({ fullName, email, password }) {
  const data = await apiClient.post('/auth/register', { fullName, email, password })
  setToken(data.token)
  return data
}

// Always resolves with the same message, whether or not the email exists.
export async function forgotPasswordRequest({ email }) {
  return apiClient.post('/auth/forgot-password', { email })
}

// token comes from the emailed "#reset?token=..." link; logs the user in.
export async function resetPasswordRequest({ token, password }) {
  const data = await apiClient.post('/auth/reset-password', { token, password })
  setToken(data.token)
  return data
}

// Restores the session from a stored token after a page reload.
export async function fetchMe() {
  return apiClient.get('/me')
}

// Any of { name, email, emailNotifications, workspaceId }. The backend
// returns a fresh token because the token is tied to the email address.
export async function updateMe(patch) {
  const data = await apiClient.patch('/me', patch)
  setToken(data.token)
  return data.user
}
