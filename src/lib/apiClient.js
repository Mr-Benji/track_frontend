import { getToken } from './token'

const BASE_URL = import.meta.env.VITE_API_URL

const NO_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/activate']

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  if (!NO_AUTH_PATHS.includes(path)) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    let message = text
    try {
      message = JSON.parse(text).message ?? text
    } catch {
      // plain-text error body, use as-is
    }
    throw new Error(message || `Request failed with status ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
