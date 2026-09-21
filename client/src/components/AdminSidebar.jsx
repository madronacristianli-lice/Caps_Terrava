import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  LayoutDashboard, Map, Globe, Users, Link2,
  ChevronLeft, ChevronRight, Store, ListChecks, CreditCard,
  Menu, X
} from 'lucide-react'

const NAV_ITEMS = [
  { key: 'overview', to: '/admin', label: 'Overview Analytics', icon: LayoutDashboard },
  { key: 'lands', to: '/admin', label: 'Land Inventory', icon: Map },
  { key: 'mapview', to: '/admin', label: 'Global Map View', icon: Globe },
  { key: 'users', to: '/admin/users', label: 'User Directory', icon: Users },
  { key: 'blockchain', to: '/admin', label: 'Blockchain Ledger', icon: Link2 },
  { key: 'branches', to: '/admin/branches', label: 'Branch Monitoring', icon: Store },
  { key: 'verifications', to: '/admin/verifications', label: 'Verifications', icon: ListChecks },
  { key: 'sales', to: '/admin/sales', label: 'Sales Report', icon: CreditCard }
]

export default function AdminSidebar({ mobileOpen, onMobileToggle }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('adminSidebarCollapsed') === 'true')

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('adminSidebarCollapsed', String(next))
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'SA'

  const isActive = (to) => {
    if (to === '/admin') return pathname === '/admin'
    return pathname === to || pathname.startsWith(`${to}/`)
  }

  const SidebarContent = ({ mobile = false }) => (
    <>
      {/* Logo */}
      <div className={`border-b border-white/10 ${collapsed && !mobile ? 'p-4' : 'p-5'}`}>
        <div className={`flex items-center gap-3 ${collapsed && !mobile ? 'justify-center' : ''}`}>
          <div className={`relative bg-white p-1.5 flex items-center justify-center shadow-lg shadow-emerald-900/50 ring-2 ring-white/20 ${collapsed && !mobile ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl'}`}>
            <img src="/terrava-logo.png" alt="Terrava" className="w-full h-full object-contain rounded-lg" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-emerald-900" />
          </div>
          {(!collapsed || mobile) && (
            <div className="leading-tight">
              <span className="block text-xl font-extrabold tracking-tight text-white">Terrava</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-200 font-semibold uppercase tracking-widest">Admin Portal</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ key, to, label, icon: Icon }) => {
          const active = isActive(to)
          return (
            <Link
              key={key}
              to={to}
              onClick={() => mobile && onMobileToggle?.(false)}
              title={label}
              className={`w-full flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'bg-white text-emerald-900 shadow-md'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              } ${collapsed && !mobile ? 'justify-center px-3 py-3' : 'px-4 py-3'}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {(!collapsed || mobile) && <span className="whitespace-nowrap">{label}</span>}
              {(!collapsed || mobile) && active && <span className="ml-auto w-2 h-2 bg-emerald-500 rounded-full" />}
            </Link>
          )
        })}
      </nav>

      {/* Admin profile + footer */}
      {(!collapsed || mobile) && (
        <div className="p-4 border-t border-white/10">
          <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-4 flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white/20">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.full_name || 'System Administrator'}</p>
              <p className="text-xs text-emerald-200 capitalize truncate">{user?.role || 'Admin'}</p>
              <p className="text-[10px] text-white/50 truncate">{user?.email || 'admin@terra.com'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-semibold py-2.5 hover:bg-red-500/20 transition"
          >
            Log Out
          </button>
          <p className="text-[11px] text-center text-white/40 font-medium mt-3">© 2026 Terrava</p>
          <p className="text-[10px] text-center text-white/30 mt-0.5">Multi-branch Land Portal</p>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`md:sticky md:top-0 md:h-screen hidden md:flex flex-col flex-shrink-0 md:overflow-y-auto overflow-x-hidden transition-all duration-300 ${collapsed ? 'md:w-20' : 'md:w-72'}`}
        style={{ background: 'linear-gradient(180deg, #064e3b 0%, #065f46 100%)' }}
      >
        {/* Sidebar toggle */}
        <button
          onClick={toggleCollapsed}
          className={`hidden md:flex fixed top-1/2 -translate-y-1/2 z-50 w-8 h-20 rounded-r-xl items-center justify-center text-white shadow-lg border-l border-white/10 hover:brightness-110 hover:scale-105 transition-all duration-300 ${collapsed ? 'left-[4rem]' : 'left-[17rem]'}`}
          style={{ background: 'linear-gradient(180deg, #065f46 0%, #047857 100%)' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 text-white border-b border-white/10 px-4 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(90deg, #064e3b 0%, #065f46 100%)' }}
      >
        <div className="flex items-center gap-2">
          <img src="/terrava-logo.png" alt="Terrava" className="w-8 h-8 rounded-md" />
          <span className="font-bold text-sm">Terrava Admin</span>
        </div>
        <button onClick={() => onMobileToggle?.(!mobileOpen)} className="p-1 rounded-lg hover:bg-white/10 transition">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 text-white pt-14 flex flex-col"
          style={{ background: 'linear-gradient(180deg, #064e3b 0%, #065f46 100%)' }}
        >
          <SidebarContent mobile />
        </div>
      )}
    </>
  )
}
