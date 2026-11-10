import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import Avatar from '../components/Avatar.jsx'
import { LogOut, Menu, User, Bell, Building2, Banknote, LandPlot, MessageCircle, Info, ChevronLeft, ChevronRight } from 'lucide-react'

const pageTitles = {
  '/': 'Listings',
  '/favorites': 'My Favorites',
  '/map': 'Map View',
  '/my-lands': 'My Lands',
  '/branches': 'Branches',
  '/dashboard': 'My Listings',
  '/registered-users': 'Registered Users',
  '/transactions': 'Transactions',
  '/compare': 'Compare Listings',
  '/create-listing': 'Create Listing',
  '/edit-listing': 'Edit Listing',
  '/profile': 'Profile',
  '/listing': 'Listing Details',
  '/inquiries': 'Messages'
}

function getPageTitle(pathname) {
  if (pathname === '/') return 'Listings'
  for (const [prefix, title] of Object.entries(pageTitles)) {
    if (prefix !== '/' && pathname.startsWith(prefix)) return title
  }
  return 'Dashboard'
}

const notificationFilters = [
  { id: 'all', label: 'All' },
  { id: 'payments', label: 'Payments' },
  { id: 'listing', label: 'Listing approval' },
  { id: 'messages', label: 'Messages' },
  { id: 'system', label: 'System' }
]

const getNotificationCategory = (notification) => {
  if (notification.data?.category === 'message') return 'messages'
  if (notification.type === 'transaction') return 'payments'
  if (notification.type === 'listing') return 'listing'
  return 'system'
}

export default function DashboardHeader({ onMenuToggle }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const dropdownRef = useRef(null)
  const notifRef = useRef(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notificationFilter, setNotificationFilter] = useState('all')
  const [notificationPage, setNotificationPage] = useState(1)
  const notificationsPerPage = 5
  const availableNotificationFilters = user?.role === 'buyer'
    ? notificationFilters.filter((filter) => filter.id !== 'listing')
    : notificationFilters
  const title = getPageTitle(pathname)

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

  const handleLogout = () => {
    logout()
    navigate('/login')
    setDropdownOpen(false)
  }

  useEffect(() => {
    setNotificationPage(1)
    if (user?.role === 'buyer' && notificationFilter === 'listing') {
      setNotificationFilter('all')
    }
  }, [notifications.length, notificationFilter])

  const filteredNotifications = notificationFilter === 'all'
    ? notifications
    : notifications.filter((notification) => getNotificationCategory(notification) === notificationFilter)
  const notificationPageCount = Math.max(1, Math.ceil(filteredNotifications.length / notificationsPerPage))
  const currentNotificationPage = Math.min(notificationPage, notificationPageCount)
  const visibleNotifications = filteredNotifications.slice(
    (currentNotificationPage - 1) * notificationsPerPage,
    currentNotificationPage * notificationsPerPage
  )

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-full hover:bg-gray-100 transition text-gray-600"
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
                <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 py-2" role="tablist" aria-label="Notification categories">
                  {availableNotificationFilters.map((filter) => {
                    const count = filter.id === 'all'
                      ? notifications.length
                      : notifications.filter((notification) => getNotificationCategory(notification) === filter.id).length
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        role="tab"
                        aria-selected={notificationFilter === filter.id}
                        onClick={() => setNotificationFilter(filter.id)}
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                          notificationFilter === filter.id
                            ? 'bg-brand-100 text-brand-800'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                      >
                        {filter.label}
                        {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                      </button>
                    )
                  })}
                </div>
                {filteredNotifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-500 text-center">No {notificationFilter === 'all' ? '' : `${notificationFilter} `}notifications yet</p>
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
                          const category = getNotificationCategory(n)
                          const { Icon, bg } = category === 'payments'
                            ? { Icon: Banknote, bg: 'bg-emerald-100 text-emerald-600' }
                            : category === 'listing'
                              ? { Icon: LandPlot, bg: 'bg-blue-100 text-blue-600' }
                              : category === 'messages'
                                ? { Icon: MessageCircle, bg: 'bg-violet-100 text-violet-600' }
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
                {filteredNotifications.length > notificationsPerPage && (
                  <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/80 px-3 py-2">
                    <p className="text-[10px] text-gray-500">
                      {((currentNotificationPage - 1) * notificationsPerPage) + 1}-{Math.min(currentNotificationPage * notificationsPerPage, filteredNotifications.length)} of {filteredNotifications.length}
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
              className="flex items-center gap-2 sm:gap-3 pl-1 pr-2 sm:pr-3 py-1 rounded-full hover:bg-gray-100 transition"
            >
              <Avatar url={user?.photo_url} name={user?.full_name} sizeClass="w-8 h-8 sm:w-9 sm:h-9" textClass="text-xs" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-gray-900 leading-tight max-w-[140px] truncate">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize leading-tight">{user?.role || 'buyer'}</p>
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100 mb-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Signed in as</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs bg-brand-100 text-brand-700 font-semibold capitalize">
                    {user?.role}
                  </span>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition"
                >
                  <User className="w-4 h-4" /> Profile
                </Link>
                {user?.role === 'buyer' && (
                  <Link
                    to="/branches"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition"
                  >
                    <Building2 className="w-4 h-4" /> Branches
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition w-full text-left"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
