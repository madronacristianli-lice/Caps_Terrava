import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  Home, CreditCard, LayoutDashboard, Heart,
  ChevronLeft, ChevronRight, Map, Landmark, Users, MessageCircle
} from 'lucide-react'

export default function Sidebar({ mobileOpen, onMobileToggle }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true')

  if (!user) return null

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebarCollapsed', String(next))
  }

  const initials = user.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  const buyerNav = [
    { to: '/', icon: Home, label: 'Listings' },
    { to: '/map', icon: Map, label: 'View Map' },
    { to: '/favorites', icon: Heart, label: 'Favorites' },
    { to: '/my-lands', icon: Landmark, label: 'My Lands' },
    { to: '/inquiries', icon: MessageCircle, label: 'Messages' },
  ]

  const sellerNav = [
    { to: '/', icon: Home, label: 'Listings' },
    { to: '/map', icon: Map, label: 'Map View' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'My Listings' },
    { to: '/registered-users', icon: Users, label: 'Registered Users' },
    { to: '/transactions', icon: CreditCard, label: 'Transactions' },
    { to: '/inquiries', icon: MessageCircle, label: 'Messages' },
  ]

  const navItems = user.role === 'seller' ? sellerNav : buyerNav

  const NavItem = ({ to, icon: Icon, label, badge, isMobile = false }) => {
    const isCollapsed = collapsed && !isMobile
    const active = pathname === to || (to !== '/' && pathname.startsWith(to))
    return (
      <Link
        to={to}
        onClick={() => onMobileToggle?.(false)}
        title={label}
        className={`group flex items-center gap-3 rounded-xl transition-all duration-200 ${
          active
            ? 'bg-white text-brand-900 font-bold shadow-md'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        } ${isCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-3'}`}
      >
        <div className="relative flex-shrink-0">
          <Icon className={`w-5 h-5 transition ${active ? 'text-brand-700' : 'group-hover:text-white'}`} />
          {badge > 0 && isCollapsed && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>
          )}
        </div>
        {!isCollapsed && <span className="text-sm whitespace-nowrap">{label}</span>}
        {!isCollapsed && badge > 0 && (
          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{badge > 9 ? '9+' : badge}</span>
        )}
        {!isCollapsed && !badge && active && <span className="ml-auto w-2 h-2 bg-brand-500 rounded-full" />}
      </Link>
    )
  }

  const SidebarContent = ({ isMobile = false }) => (
    <>
      {/* Logo header */}
      <div className={`border-b border-white/10 ${collapsed && !isMobile ? 'p-4' : 'p-5'}`}>
        <div className={`flex items-center gap-2.5 ${collapsed && !isMobile ? 'justify-center' : ''}`}>
          <img src="/terrava-logo.png" alt="Terrava" className="w-9 h-9 rounded-lg flex-shrink-0 shadow-sm" />
          {(!collapsed || isMobile) && (
            <div>
              <span className="text-lg font-extrabold text-white whitespace-nowrap">Terrava</span>
              <p className="text-xs text-white/40 capitalize leading-none mt-0.5">{user.role} Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} isMobile={isMobile} />
        ))}
      </nav>

      {/* User card + footer text */}
      <div className="p-3 border-t border-white/10">
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-3 px-3 py-3 mb-3 bg-white/10 rounded-xl border border-white/10">
            <div className="w-9 h-9 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.full_name}</p>
              <p className="text-xs text-white/50 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        {(!collapsed || isMobile) && (
          <div className="px-3 text-center">
            <p className="text-[10px] text-white/30 leading-tight">@ 2026 Terrava Land Selling System</p>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`sticky top-0 h-screen hidden md:flex flex-col flex-shrink-0 z-30 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
        style={{ background: 'linear-gradient(180deg, #064e3b 0%, #065f46 100%)' }}>
        <SidebarContent />
      </aside>

      {/* Sidebar toggle button */}
      <button
        onClick={toggleCollapsed}
        className={`hidden md:flex fixed top-1/2 -translate-y-1/2 z-50 w-8 h-20 rounded-r-xl items-center justify-center text-white shadow-lg border-l border-white/10 hover:brightness-110 hover:scale-105 transition-all duration-300 ${collapsed ? 'left-[4rem]' : 'left-[15rem]'}`}
        style={{ background: 'linear-gradient(180deg, #065f46 0%, #047857 100%)' }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[29] text-white pt-20 flex flex-col" style={{ backgroundColor: '#064e3b' }}>
          <SidebarContent isMobile />
        </div>
      )}
    </>
  )
}
