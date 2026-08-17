import { useState } from 'react'
import { useRegister } from '../features/auth/hooks/useRegister'

export default function RegisterPage({ onRegistered, onBackToLogin }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')

  const register = useRegister()

  function handleSubmit(e) {
    e.preventDefault()
    if (!fullName.trim()) return setFormError('Please enter your full name.')
    if (!email.includes('@')) return setFormError('Please enter a valid email address.')
    if (password.length < 4) return setFormError('Password must be at least 4 characters.')
    if (password !== confirmPassword) return setFormError('Passwords do not match.')
    setFormError('')
    register.mutate(
      { fullName: fullName.trim(), email, password },
      { onSuccess: (data) => onRegistered(data.user) }
    )
  }

  const loading = register.isPending
  const error = formError || (register.isError ? register.error.message : '')

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-sky-500 to-indigo-700 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">TW</div>
          <span className="font-semibold text-lg">Track Workspace</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Create your account.<br />Start tracking today.
          </h1>
          <p className="text-sky-100 text-sm leading-relaxed max-w-xs">
            A unified workspace to plan, assign, and track your team's work — all in one place.
          </p>
        </div>
        <p className="text-sky-200 text-xs">© {new Date().getFullYear()} Track Workspace. All rights reserved.</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white text-xs">TW</div>
            <span className="font-semibold text-gray-800">Track Workspace</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Create an account</h2>
          <p className="text-sm text-gray-500 mt-1 mb-8">Sign up to start using Track Workspace.</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" /></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
            >
              Already have an account? Sign in instead
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
