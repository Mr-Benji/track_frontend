import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ActivatePage from './pages/ActivatePage'
import DashboardPage from './pages/DashboardPage'
import PasswordResetPage from './pages/PasswordResetPage'
import { fetchMe, updateMe } from './features/auth/api'
import { clearToken, getToken } from './lib/token'
import { SESSION_EXPIRED_EVENT } from './lib/apiClient'

// Emails link here as "#activate?email=..." (invites) and "#reset?token=..."
// (password resets); read one query parameter from the hash.
function hashParam(name) {
  const hash = window.location.hash
  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) return ''
  return new URLSearchParams(hash.slice(queryIndex + 1)).get(name) ?? ''
}

export default function App() {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  // A stored token means a session may still be alive — check it before
  // deciding to show the login page.
  const [restoring, setRestoring] = useState(() => !!getToken())
  const [showActivate, setShowActivate] = useState(() => window.location.hash.startsWith('#activate'))
  const [showRegister, setShowRegister] = useState(() => window.location.hash.startsWith('#register'))
  const [showReset, setShowReset] = useState(() => window.location.hash.startsWith('#reset'))
  const [sessionNotice, setSessionNotice] = useState('')

  useEffect(() => {
    if (!getToken()) return
    fetchMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setRestoring(false))
  }, [])

  // The backend answered 401 (token expired, account suspended or removed):
  // back to the login page, with nothing of the old session left in the cache.
  useEffect(() => {
    function onExpired() {
      setUser(null)
      queryClient.clear()
      setSessionNotice('Your session has ended. Please sign in again.')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [queryClient])

  function backToLogin() {
    window.location.hash = ''
    setShowActivate(false)
    setShowRegister(false)
    setShowReset(false)
  }

  // Re-reads the signed-in user (role, department…) after an admin edits
  // their own member record or department.
  async function refreshUser() {
    setUser(await fetchMe())
  }

  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    if (showReset) {
      return (
        <PasswordResetPage
          token={hashParam('token')}
          onReset={(u) => {
            window.location.hash = ''
            setShowReset(false)
            setUser(u)
          }}
          onBackToLogin={backToLogin}
        />
      )
    }
    if (showActivate) {
      return (
        <ActivatePage
          initialEmail={hashParam('email')}
          onActivated={(u) => {
            window.location.hash = ''
            setUser(u)
          }}
          onBackToLogin={() => {
            window.location.hash = ''
            setShowActivate(false)
          }}
        />
      )
    }
    if (showRegister) {
      return (
        <RegisterPage
          onRegistered={(u) => {
            window.location.hash = ''
            setUser(u)
          }}
          onBackToLogin={() => {
            window.location.hash = ''
            setShowRegister(false)
          }}
        />
      )
    }
    return (
      <LoginPage
        notice={sessionNotice}
        onLogin={(u) => {
          setSessionNotice('')
          setUser(u)
        }}
        onCreateAccount={() => {
          window.location.hash = 'register'
          setShowRegister(true)
        }}
        onForgotPassword={() => {
          window.location.hash = 'reset'
          setShowReset(true)
        }}
      />
    )
  }

  return (
    <DashboardPage
      user={user}
      onLogout={() => {
        clearToken()
        setUser(null)
        // Lists are filtered per user (drafts, project access), so don't
        // let the next person to log in see this user's cached data.
        queryClient.clear()
      }}
      onUpdateUser={async (patch) => setUser(await updateMe(patch))}
      onRefreshUser={refreshUser}
    />
  )
}