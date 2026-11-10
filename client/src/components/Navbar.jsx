import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { MapPin, LogOut, User, Menu, X, ChevronDown, ChevronLeft, ChevronRight, LandPlot, BarChart3, Building2, Bell, Shield, Banknote, Info } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext.jsx'
import Avatar from '../components/Avatar.jsx'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notificationPage, setNotificationPage] = useState(1)
  const notificationsPerPage = 5
  const dropdownRef = useRef(null)
  const notifRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
    setMobileOpen(false)
    setDropdownOpen(false)
  }

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const publicLinks = [
    { label: 'About', href: '#about' },
    { label: 'Features', href: '#features' },
    { label: 'Branches', href: '#branches' },
    { label: 'Contact', href: '#contact' },
  ]

  const scrollTo = (id) => {
    const el = document.getElementById(id.replace('#', ''))
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    setMobileOpen(false)
  }

  useEffect(() => {
    setNotificationPage(1)
  }, [notifications.length])

  const notificationPageCount = Math.max(1, Math.ceil(notifications.length / notificationsPerPage))
  const currentNotificationPage = Math.min(notificationPage, notificationPageCount)
  const visibleNotifications = notifications.slice(
    (currentNotificationPage - 1) * notificationsPerPage,
    currentNotificationPage * notificationsPerPage
  )

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 font-extrabold text-xl text-brand-800 flex-shrink-0">
            <img src="/terrava-logo.png" alt="Terrava" className="w-9 h-9 rounded-lg shadow-sm" />
            Terrava
          </Link>

          {/* Desktop — public nav links (only on landing) */}
          {!user && pathname === '/' && (
            <div className="hidden md:flex items-center gap-6">
              {publicLinks.map((l) => (
                <button
                  key={l.label}
                  onClick={() => scrollTo(l.href)}
                  className="text-sm font-medium text-gray-600 hover:text-brand-700 transition"
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}

          {/* Desktop — right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative p-2 rounded-xl hover:bg-brand-50 transition text-gray-600 hover:text-brand-700"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50 max-h-[28rem] overflow-y-auto">
                      <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900">Notifications</p>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllAsRead()}
                            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-500 text-center">No notifications yet</p>
                      ) : (
                        visibleNotifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => {
                              if (!n.is_read) markAsRead(n.id)
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 ${
                              n.is_read ? 'bg-white' : 'bg-brand-50/40'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {(() => {
                                const { Icon, bg } = n.type === 'transaction'
                                  ? { Icon: Banknote, bg: 'bg-emerald-100 text-emerald-600' }
                                  : n.type === 'listing'
                                    ? { Icon: LandPlot, bg: 'bg-blue-100 text-blue-600' }
                                    : { Icon: Info, bg: 'bg-gray-100 text-gray-500' }
                                return (
                                  <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${bg}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                )
                              })()}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${n.is_read ? 'text-gray-500 font-normal' : 'text-gray-900 font-bold'}`}>
                                  {n.title}
                                </p>
                                <p className={`text-xs mt-0.5 line-clamp-2 ${n.is_read ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>
                                  {n.message}
                                </p>
                                <p className={`text-[10px] mt-1 ${n.is_read ? 'text-gray-300' : 'text-gray-500'}`}>
                                  {(() => {
                                    const raw = n.created_at || n.createdAt
                                    if (!raw || isNaN(new Date(raw).getTime())) return '—'
                                    return new Date(raw).toLocaleString('en-PH', {
                                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                                      hour: '2-digit', minute: '2-digit'
                                    })
                                  })()}
                                </p>
                              </div>
                              {!n.is_read && (
                                <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700" title="Unread notification">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                  Unread
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                      {notifications.length > notificationsPerPage && (
                        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/80 px-3 py-2">
                          <p className="text-[10px] text-gray-500">
                            {((currentNotificationPage - 1) * notificationsPerPage) + 1}-{Math.min(currentNotificationPage * notificationsPerPage, notifications.length)} of {notifications.length}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setNotificationPage((page) => Math.max(1, page - 1))}
                              disabled={currentNotificationPage <= 1}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Previous notifications"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[3.5rem] text-center text-[10px] font-bold text-gray-600">
                              {currentNotificationPage} / {notificationPageCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => setNotificationPage((page) => Math.min(notificationPageCount, page + 1))}
                              disabled={currentNotificationPage >= notificationPageCount}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Next notifications"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-brand-50 transition group"
                  >
                  <Avatar url={user?.photo_url} name={user?.full_name} sizeClass="w-8 h-8" textClass="text-xs" />
                  <span className="text-sm font-semibold text-gray-800 max-w-[120px] truncate">{user.full_name}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{user.full_name}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs bg-brand-100 text-brand-700 font-semibold capitalize">{user.role}</span>
                    </div>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition"
                      >
                        <Shield className="w-4 h-4" /> Admin Dashboard
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition"
                    >
                      <User className="w-4 h-4" /> View Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition w-full text-left"
                    >
                      <LogOut className="w-4 h-4" /> Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-gray-700 hover:text-brand-700 px-4 py-2 rounded-lg hover:bg-brand-50 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-bold bg-brand-600 text-white px-5 py-2.5 rounded-xl hover:bg-brand-700 transition shadow-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-brand-700 rounded-lg hover:bg-brand-50 transition"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1">
          {!user && pathname === '/' && publicLinks.map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.href)}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg transition"
            >
              {l.label}
            </button>
          ))}

          {user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 mb-2">
                <Avatar url={user?.photo_url} name={user?.full_name} sizeClass="w-9 h-9" textClass="text-sm" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <Bell className="w-4 h-4" /> Notifications
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => { markAllAsRead(); setMobileOpen(false) }}
                    className="text-xs text-brand-600 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {user.role === 'admin' && (
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-brand-50 rounded-lg transition">
                  <Shield className="w-4 h-4" /> Admin Dashboard
                </Link>
              )}
              <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-brand-50 rounded-lg transition">
                <User className="w-4 h-4" /> View Profile
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition w-full text-left">
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="text-center text-sm font-semibold text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition">
                Login
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="text-center text-sm font-bold bg-brand-600 text-white px-4 py-2.5 rounded-xl hover:bg-brand-700 transition">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
