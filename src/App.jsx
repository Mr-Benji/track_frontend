import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import { clearToken } from './lib/token'

export default function App() {
  const [user, setUser] = useState(null)

  if (!user) {
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