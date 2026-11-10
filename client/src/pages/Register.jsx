import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { Eye, EyeOff, ShieldCheck, ArrowRight, Users } from 'lucide-react'
import AuthLayout from '../components/AuthLayout.jsx'
import api from '../api/api.js'
import GoogleSignInButton from '../components/GoogleSignInButton.jsx'

const normalizePhilippinePhone = (value) => {
  const raw = String(value || '').replace(/[\s()-]/g, '')
  if (!raw) return ''
  if (raw.startsWith('+63')) return `+63${raw.slice(3).replace(/\D/g, '')}`
  if (raw.startsWith('0063')) return `+63${raw.slice(4).replace(/\D/g, '')}`
  if (raw.startsWith('0')) return `+63${raw.slice(1).replace(/\D/g, '')}`
  return `+63${raw.replace(/\D/g, '')}`
}

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label} {!required && <span className="text-gray-400 font-normal text-xs">(optional)</span>}
    </label>
    {children}
  </div>
)

export default function Register() {
  const [form, setForm] = useState({
    first_name: '', middle_name: '', last_name: '', extension_name: '',
    email: '', password: '', role: 'buyer',
    phone: '', phone2: '', birthdate: '', address: '', occupation: '',
    spouse_first_name: '', spouse_middle_name: '', spouse_last_name: '', spouse_extension_name: '',
    spouse_email: '', spouse_phone: '', spouse_occupation: ''
  })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [otp, setOtp] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()
  const { addToast } = useToast()

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const normalizePhoneField = (key) => () => setForm((current) => ({ ...current, [key]: normalizePhilippinePhone(current[key]) }))

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter'
    if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return 'Password must contain at least one number or special character'
    return ''
  }

  const handleGoogleCredential = async (response) => {
    try {
      const res = await api.post('/auth/google', { credential: response.credential })
      login(res.data)
      addToast('Account created successfully!', 'success')
      navigate(res.data.user?.role === 'admin' ? '/admin' : '/')
    } catch (err) {
      addToast(err.response?.data?.error || 'Google sign-in failed', 'error')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const pwdError = validatePassword(form.password)
    if (pwdError) {
      setError(pwdError)
      addToast(pwdError, 'error')
      return
    }
    setLoading(true)
    const full_name = [form.first_name, form.middle_name, form.last_name, form.extension_name]
      .filter(Boolean).join(' ')
    try {
      const res = await api.post('/auth/register', { ...form, full_name })
      setVerificationEmail(form.email)
      addToast('Verification code sent to your phone.', 'success')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
      addToast(err.response?.data?.error || 'Registration failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/register/verify', { email: verificationEmail, code: otp })
      login(res.data)
      addToast('Account verified successfully!', 'success')
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed')
      addToast(err.response?.data?.error || 'Verification failed', 'error')
    } finally { setLoading(false) }
  }

  const resendOtp = async () => {
    try {
      await api.post('/auth/register/resend', { email: verificationEmail })
      addToast('A new verification code was sent.', 'success')
    } catch (err) { addToast(err.response?.data?.error || 'Could not resend code', 'error') }
  }

  return (
    <AuthLayout mode="register">
      <div className="w-full max-w-lg mx-auto">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full px-3 py-1.5 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secure Auth
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign up</h1>
          <p className="text-gray-500">Create your Terrava account.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
              !
            </div>
            <div>
              <p className="font-semibold">Registration Failed</p>
              <p className="text-xs text-red-600/80">{error}</p>
            </div>
          </div>
        )}

        <GoogleSignInButton
          text="signup_with"
          onCredential={handleGoogleCredential}
          onUnavailable={() => addToast('Google sign-in needs the Terrava OAuth Client ID in client/.env and server/.env.', 'error')}
        />

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-gray-400">or register manually</span>
          </div>
        </div>

        {verificationEmail ? <form onSubmit={handleVerify} className="space-y-5">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-center">
            <h2 className="font-bold text-gray-900">Verify your phone number</h2>
            <p className="text-sm text-gray-600 mt-1">Enter the 6-digit code sent to your phone.</p>
          </div>
          <Field label="Verification Code" required>
            <input autoFocus inputMode="numeric" maxLength={6} pattern="[0-9]{6}" className="input-field bg-slate-50 rounded-xl text-center tracking-[0.5em] text-xl" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} required />
          </Field>
          <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-emerald-500 text-white py-3 rounded-xl font-semibold disabled:opacity-60">{loading ? 'Verifying…' : 'Verify and Create Account'}</button>
          <button type="button" onClick={resendOtp} className="w-full text-emerald-600 font-semibold text-sm">Resend code</button>
        </form> : <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <input type="text" placeholder="Juan" className="input-field bg-slate-50 rounded-xl" value={form.first_name} onChange={set('first_name')} required />
            </Field>
            <Field label="Middle Name">
              <input type="text" placeholder="Santos" className="input-field bg-slate-50 rounded-xl" value={form.middle_name} onChange={set('middle_name')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Last Name" required>
              <input type="text" placeholder="Dela Cruz" className="input-field bg-slate-50 rounded-xl" value={form.last_name} onChange={set('last_name')} required />
            </Field>
            <Field label="Extension Name">
              <input type="text" placeholder="Jr., Sr., III…" className="input-field bg-slate-50 rounded-xl" value={form.extension_name} onChange={set('extension_name')} />
            </Field>
          </div>

          <div className="border-t border-gray-100 pt-2" />

          <Field label="Email Address" required>
            <input type="email" placeholder="you@example.com" className="input-field bg-slate-50 rounded-xl" value={form.email} onChange={set('email')} required />
          </Field>

          <Field label="Password" required>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="input-field bg-slate-50 rounded-xl pr-12"
                value={form.password}
                onChange={set('password')}
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
            <p className="text-xs text-gray-500 mt-1.5">Must be at least 8 characters with 1 uppercase letter and 1 number or special character.</p>
          </Field>

          <div className="border-t border-gray-100 pt-2" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Number 1" required>
              <input type="tel" inputMode="tel" placeholder="0917 000 0000" className="input-field bg-slate-50 rounded-xl" value={form.phone} onChange={set('phone')} onBlur={normalizePhoneField('phone')} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }} required />
            </Field>
            <Field label="Contact Number 2">
              <input type="text" placeholder="+63 912 000 0001" className="input-field bg-slate-50 rounded-xl" value={form.phone2} onChange={set('phone2')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Birthdate" required>
              <input type="date" className="input-field bg-slate-50 rounded-xl" value={form.birthdate} onChange={set('birthdate')} required />
            </Field>
            <Field label="Occupation" required>
              <input type="text" placeholder="e.g. Teacher, Engineer" className="input-field bg-slate-50 rounded-xl" value={form.occupation} onChange={set('occupation')} required />
            </Field>
          </div>

          <Field label="Home Address" required>
            <input type="text" placeholder="Barangay, City, Province" className="input-field bg-slate-50 rounded-xl" value={form.address} onChange={set('address')} required />
          </Field>

          <div className="border border-gray-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900">Spouse Information</h3>
              <span className="text-xs text-gray-400">(Optional)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Spouse First Name">
                <input type="text" placeholder="Juan" className="input-field bg-white rounded-xl" value={form.spouse_first_name} onChange={set('spouse_first_name')} />
              </Field>
              <Field label="Spouse Middle Name">
                <input type="text" placeholder="Santos" className="input-field bg-white rounded-xl" value={form.spouse_middle_name} onChange={set('spouse_middle_name')} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Spouse Last Name">
                <input type="text" placeholder="Dela Cruz" className="input-field bg-white rounded-xl" value={form.spouse_last_name} onChange={set('spouse_last_name')} />
              </Field>
              <Field label="Spouse Extension Name">
                <input type="text" placeholder="Jr., Sr., III…" className="input-field bg-white rounded-xl" value={form.spouse_extension_name} onChange={set('spouse_extension_name')} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Spouse Email">
                <input type="email" placeholder="spouse@example.com" className="input-field bg-white rounded-xl" value={form.spouse_email} onChange={set('spouse_email')} />
              </Field>
              <Field label="Spouse Contact Number">
                <input type="text" placeholder="+63 912 000 0000" className="input-field bg-white rounded-xl" value={form.spouse_phone} onChange={set('spouse_phone')} />
              </Field>
            </div>
            <Field label="Spouse Occupation">
              <input type="text" placeholder="e.g. Nurse, Accountant" className="input-field bg-white rounded-xl" value={form.spouse_occupation} onChange={set('spouse_occupation')} />
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-white py-3 rounded-xl font-semibold hover:bg-emerald-600 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-60 mt-2"
          >
            {loading ? 'Creating account…' : <>Create Account <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>}

        <p className="text-center mt-6 text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
            Sign in here
          </Link>
        </p>

        <p className="text-center mt-6 text-xs text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          Secured with Blockchain
        </p>
      </div>
    </AuthLayout>
  )
}
