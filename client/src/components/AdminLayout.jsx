import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AdminSidebar from './AdminSidebar.jsx'
import { Banknote, Bell, ChevronDown, ChevronLeft, ChevronRight, Info, LandPlot, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import Avatar from './Avatar.jsx'
import AdminSettingsModal from './AdminSettingsModal.jsx'

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { user, login, logout } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const navigate = useNavigate()
  const notificationsPerPage = 5
  const notificationPageCount = Math.max(1, Math.ceil(notifications.length / notificationsPerPage))
  const [notificationPage, setNotificationPage] = useState(1)
  const currentNotificationPage = Math.min(notificationPage, notificationPageCount)
  const visibleNotifications = notifications.slice(
    (currentNotificationPage - 1) * notificationsPerPage,
    currentNotificationPage * notificationsPerPage
  )
  const { pathname } = useLocation()
  const pageTitle = pathname.includes('edit-listing') ? 'Edit Listing'
    : pathname.includes('users') ? 'User Directory'
      : pathname.includes('branches') ? 'Branch Monitoring'
        : pathname.includes('verifications') ? 'Verifications'
          : pathname.includes('sales') ? 'Sales Report'
            : pathname.includes('blockchain') ? 'Blockchain Ledger'
              : 'Admin Portal'

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row bg-brand-50/30">
      <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={setMobileOpen} />
      <main className="flex-1 min-h-screen overflow-auto pt-14 md:pt-0 bg-emerald-50/30">
        <header className="sticky top-0 z-40 flex-shrink-0 border-b border-gray-200 bg-white/95 px-4 py-[22px] shadow-sm backdrop-blur-md sm:px-6">
          <div className="flex h-11 items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold leading-tight text-gray-900 sm:text-2xl">{pageTitle}</h1>
              <p className="text-xs leading-tight text-gray-500">Terrava Administrator Portal</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 transition hover:bg-gray-100"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 z-50 mt-2 max-h-[28rem] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-gray-100 bg-white py-2 shadow-xl">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
                      <p className="text-sm font-bold text-gray-900">Notifications</p>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-gray-500">No notifications yet</p>
                    ) : (
                      visibleNotifications.map((notification) => {
                        const Icon = notification.type === 'listing'
                          ? LandPlot
                          : notification.type === 'transaction' ? Banknote : Info
                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              if (!notification.is_read) markAsRead(notification.id)
                              if (notification.type === 'listing') navigate('/admin', { state: { tab: 'lands' } })
                              setNotificationsOpen(false)
                            }}
                            className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition last:border-0 hover:bg-gray-50 ${notification.is_read ? 'bg-white' : 'bg-emerald-50/40'}`}
                          >
                            <span className={`mt-0.5 rounded-lg p-1.5 ${notification.type === 'listing' ? 'bg-blue-100 text-blue-700' : notification.type === 'transaction' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block text-sm ${notification.is_read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>{notification.title}</span>
                              <span className="mt-0.5 block line-clamp-2 text-xs text-gray-500">{notification.message}</span>
                              <span className="mt-1 block text-[10px] text-gray-400">{new Date(notification.created_at).toLocaleString()}</span>
                              {!notification.is_read && <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Unread</span>}
                            </span>
                          </button>
                        )
                      })
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
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Previous notifications"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[3.5rem] text-center text-[10px] font-bold text-gray-600">{currentNotificationPage} / {notificationPageCount}</span>
                          <button
                            type="button"
                            onClick={() => setNotificationPage((page) => Math.min(notificationPageCount, page + 1))}
                            disabled={currentNotificationPage >= notificationPageCount}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex h-11 items-center justify-center gap-2.5 rounded-xl pl-1.5 pr-3 transition hover:bg-gray-100 sm:pr-3.5"
                  aria-expanded={profileOpen}
                  aria-label="Open administrator profile menu"
                >
                  <Avatar
                    url={user?.photo_url}
                    name={user?.full_name}
                    sizeClass="h-9 w-9"
                    textClass="text-sm"
                    fallbackClass="bg-emerald-600"
                    className="ring-2 ring-emerald-100"
                  />
                  <span className="hidden max-w-[160px] truncate text-left leading-tight sm:block">
                    <span className="block truncate text-sm font-bold text-gray-900">{user?.full_name || 'Administrator'}</span>
                    <span className="block text-xs capitalize text-gray-500">{user?.role || 'admin'}</span>
                  </span>
                  <ChevronDown className="hidden h-5 w-5 text-gray-500 sm:block" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-gray-100 bg-white py-2 shadow-xl">
                    <div className="mb-1 border-b border-gray-100 px-4 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Signed in as</p>
                      <p className="truncate text-sm font-bold text-gray-900">{user?.full_name || 'Administrator'}</p>
                      <span className="mt-0.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold capitalize text-emerald-700">{user?.role || 'admin'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); setSettingsOpen(true) }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => { logout(); setProfileOpen(false) }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <div className="min-h-[calc(100vh-4rem)]">
          {children || <Outlet />}
        </div>
      </main>
      {settingsOpen && (
        <AdminSettingsModal
          user={user}
          onClose={() => setSettingsOpen(false)}
          onUserUpdated={(updatedUser) => {
            login({ user: updatedUser, token: localStorage.getItem('token') })
            setSettingsOpen(false)
          }}
        />
      )}
    </div>
  )
}
