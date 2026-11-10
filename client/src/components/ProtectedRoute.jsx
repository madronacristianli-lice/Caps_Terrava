import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Spinner from './Spinner.jsx'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50/60 p-6">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-7 shadow-card border border-emerald-100">
        <Spinner size="lg" />
        <p className="text-sm font-semibold text-gray-600">Loading Terrava…</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return children
}
