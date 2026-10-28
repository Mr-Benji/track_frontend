import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { forgotPasswordRequest, resetPasswordRequest } from '../features/auth/api'

const inputClass = 'w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition'

// Two steps of "Forgot password?": without a token, ask for the email and
// send a reset link; with the token from that link ("#reset?token=..."),
// choose a new password, which also logs the user in.
export default function PasswordResetPage({ token, onReset, onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')

  const request = useMutation({ mutationFn: forgotPasswordRequest })
  const reset = useMutation({ mutationFn: resetPasswordRequest })

  function handleSubmit(e) {
    e.preventDefault()
    if (!token) {
      if (!email.includes('@')) return setFormError('Please enter a valid email address.')
      setFormError('')
      return request.mutate({ email })
    }
    if (password.length < 4) return setFormError('Password must be at least 4 characters.')
    if (password !== confirmPassword) return setFormError('Passwords do not match.')
    setFormError('')
    reset.mutate({ token, password }, { onSuccess: (data) => onReset(data.user) })
  }

  const active = token ? reset : request
  const error = formError || (active.isError ? active.error.message : '')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white text-xs">TW</div>
          <span className="font-semibold text-gray-800">Track Workspace</span>
        </div>

        <h2 className="text-2xl font-bold text-gray-900">{token ? 'Choose a new password' : 'Reset your password'}</h2>
        <p className="text-sm text-gray-500 mt-1 mb-8">
          {token ? 'Enter a new password for your account.' : "Enter your email and we'll send you a link to reset your password."}
        </p>

        {!token && request.isSuccess ? (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            {request.data.message} Check your inbox — the link works once, for one hour.
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {!token ? (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">New password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
                </div>
              </>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</div>
            )}

            <button
              type="submit"
              disabled={active.isPending}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white text-sm font-semibold transition"
            >
              {active.isPending ? 'Please wait…' : token ? 'Set new password' : 'Send reset link'}
            </button>
          </form>
        )}

        <button type="button" onClick={onBackToLogin} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-5">
          Back to sign in
        </button>
      </div>
    </div>
  )
}
