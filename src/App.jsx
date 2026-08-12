import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import ActivatePage from './pages/ActivatePage'
import DashboardPage from './pages/DashboardPage'
import { clearToken } from './lib/token'

// An invite email links here as "#activate?email=<encoded email>" (see ActivatePage.jsx)
function activateEmailFromHash() {
  const hash = window.location.hash
  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) return ''
  return new URLSearchParams(hash.slice(queryIndex + 1)).get('email') ?? ''
}

export default function App() {
  const [user, setUser] = useState(null)
  const [showActivate, setShowActivate] = useState(() => window.location.hash.startsWith('#activate'))

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
    return <LoginPage onLogin={setUser} />
  }

  return (
    <DashboardPage
      user={user}
      onLogout={() => {
        clearToken()
        setUser(null)
      }}
      onUpdateUser={(patch) => setUser((prev) => ({ ...prev, ...patch }))}
    />
  )
}