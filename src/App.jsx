import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
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
  const [showRegister, setShowRegister] = useState(() => window.location.hash.startsWith('#register'))

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
      }}
      onUpdateUser={(patch) => setUser((prev) => ({ ...prev, ...patch }))}
    />
  )
}