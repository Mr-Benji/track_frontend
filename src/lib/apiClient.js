import { getToken, clearToken } from './token'

const BASE_URL = import.meta.env.VITE_API_URL

const NO_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/activate', '/auth/forgot-password', '/auth/reset-password']

// Fired when the backend says the session is gone (401: expired token,
// suspended or deleted account). App.jsx listens and returns to the login page.
export const SESSION_EXPIRED_EVENT = 'track:session-expired'

function authHeaders(path) {
  if (NO_AUTH_PATHS.includes(path)) return {}
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function send(path, init) {
  const res = await fetch(`${BASE_URL}${path}`, init)

  if (res.status === 401 && !NO_AUTH_PATHS.includes(path)) {
    clearToken()
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  }

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
  return res
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await send(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders(path) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  return res.json()
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),

  // multipart/form-data with the file in the "file" part. No Content-Type
  // header: the browser sets it, including the multipart boundary.
  upload: async (path, file) => {
    const form = new FormData()
    form.append('file', file)
    const res = await send(path, { method: 'POST', headers: authHeaders(path), body: form })
    return res.json()
  },

  // Fetches a protected file (the token can't go in a plain link) as a Blob.
  download: async (path) => {
    const res = await send(path, { headers: authHeaders(path) })
    return res.blob()
  },
}

// Hands a downloaded Blob to the browser as a file save.
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// "2.4 MB" style label for file sizes.
export function formatBytes(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
