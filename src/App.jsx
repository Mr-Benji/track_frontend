import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ActivatePage from './pages/ActivatePage'
import DashboardPage from './pages/DashboardPage'
import { fetchMe, updateMe } from './features/auth/api'
import { clearToken, getToken } from './lib/token'

// An invite email links here as "#activate?email=<encoded email>" (see ActivatePage.jsx)
function activateEmailFromHash() {
  const hash = window.location.hash
  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) return ''
  return new URLSearchParams(hash.slice(queryIndex + 1)).get('email') ?? ''
}

export default function App() {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  // A stored token means a session may still be alive — check it before
  // deciding to show the login page.
  const [restoring, setRestoring] = useState(() => !!getToken())
  const [showActivate, setShowActivate] = useState(() => window.location.hash.startsWith('#activate'))
  const [showRegister, setShowRegister] = useState(() => window.location.hash.startsWith('#register'))

  useEffect(() => {
    if (!getToken()) return
    fetchMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setRestoring(false))
  }, [])

  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    if (showActivate) {
      return (
        <ActivatePage
          initialEmail={activateEmailFromHash()}
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
        onLogin={setUser}
        onCreateAccount={() => {
          window.location.hash = 'register'
          setShowRegister(true)
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
    />
  )
}