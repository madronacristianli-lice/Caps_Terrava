import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { Eye, EyeOff, Mail, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react'
import AuthLayout from '../components/AuthLayout.jsx'
import api from '../api/api.js'
import GoogleSignInButton from '../components/GoogleSignInButton.jsx'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()
  const { addToast } = useToast()

  const handleGoogleCredential = useCallback(async (response) => {
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/google', { credential: response.credential })
      login(res.data)
      addToast('Welcome to Terrava!', 'success')
      navigate(res.data.user?.role === 'admin' ? '/admin' : '/')
    } catch (err) {
      const message = err.response?.data?.error
        || (err.request ? 'Terrava server is unavailable. Start the backend, then try again.' : 'Google sign-in failed. Please try again.')
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast, login, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      login(res.data)
      addToast('Welcome back!', 'success')
      navigate(res.data.user?.role === 'admin' ? '/admin' : '/')
    } catch (err) {
      const message = err.response?.data?.error
        || (err.request ? 'Terrava server is unavailable. Start the backend, then try again.' : 'Login failed. Please try again.')
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AuthLayout mode="login">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full px-3 py-1.5 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secure Auth
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h1>
          <p className="text-gray-500">Access your Terrava account.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
              !
            </div>
            <div>
              <p className="font-semibold">Login Failed</p>
              <p className="text-xs text-red-600/80">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="you@gmail.com"
                className="input-field rounded-xl border-gray-200 bg-white pl-11 shadow-sm"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-emerald-600 font-medium hover:underline">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="input-field rounded-xl border-gray-200 bg-white pr-12 shadow-sm"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 focus:outline-none transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-white py-3 rounded-xl font-semibold hover:bg-emerald-600 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-gray-400">or</span>
          </div>
        </div>

        <GoogleSignInButton
          onCredential={handleGoogleCredential}
          onUnavailable={() => addToast('Google sign-in needs the Terrava OAuth Client ID in client/.env and server/.env.', 'error')}
        />
        <p className="mt-2 text-center text-xs text-gray-500">
          Choose your Google account to sign in securely. No Google password is shared with Terrava.
        </p>

        <p className="text-center mt-5 text-sm text-gray-500">
          No account?{' '}
          <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
            Sign up
          </Link>
        </p>

        <p className="text-center mt-6 text-xs text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          Secured with Blockchain
        </p>
      </div>

      </AuthLayout>

      {/* Keep the overlay outside AuthLayout so it is centered against the viewport. */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
            <div className="relative mx-auto mb-5 h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <h3 className="mb-1 text-lg font-bold text-gray-900">Signing you in</h3>
            <p className="text-sm text-gray-500">Securing your Terrava session…</p>
          </div>
        </div>
      )}
    </>
  )
}
