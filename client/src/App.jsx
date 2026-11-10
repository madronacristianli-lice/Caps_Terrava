import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './context/AuthContext.jsx'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Sidebar from './components/Sidebar.jsx'
import DashboardHeader from './components/DashboardHeader.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import Home from './pages/Home.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ListingDetail from './pages/ListingDetail.jsx'
import CreateListing from './pages/CreateListing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminBranches from './pages/admin/AdminBranches.jsx'
import AdminVerifications from './pages/admin/AdminVerifications.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import AdminSales from './pages/admin/AdminSales.jsx'
import Transactions from './pages/Transactions.jsx'
import BlockchainExplorer from './pages/BlockchainExplorer.jsx'
import Profile from './pages/Profile.jsx'
import Compare from './pages/Compare.jsx'
import MapExplore from './pages/MapExplore.jsx'
import MyLands from './pages/MyLands.jsx'
import Favorites from './pages/Favorites.jsx'
import Inquiries from './pages/Inquiries.jsx'
import Branches from './pages/Branches.jsx'
import RegisteredUsers from './pages/RegisteredUsers.jsx'
import EditListing from './pages/EditListing.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const isAdminRoute = pathname.startsWith('/admin')
  const isAuthRoute = pathname === '/login' || pathname === '/register'

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route path="branches" element={<AdminBranches />} />
          <Route path="verifications" element={<AdminVerifications />} />
          {/* Keep User Directory on the canonical admin dashboard UI. */}
          <Route path="users" element={<Navigate to="/admin" state={{ tab: 'users' }} replace />} />
          <Route path="sales" element={<AdminSales />} />
          <Route path="blockchain" element={<BlockchainExplorer />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    )
  }

  // Keep admin-only listing edits inside the admin shell instead of using the
  // seller sidebar/header that wraps the shared edit route.
  if (user?.role === 'admin' && pathname.startsWith('/edit-listing/')) {
    return <AdminLayout><EditListing /></AdminLayout>
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col ${isAuthRoute ? 'bg-slate-50' : ''}`}>
        {!isAuthRoute && <Navbar />}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        {!isAuthRoute && <Footer />}
      </div>
    )
  }

  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-b from-emerald-50/80 via-white to-emerald-50/40">
      <Sidebar mobileOpen={mobileOpen} onMobileToggle={setMobileOpen} />
      <div className="flex-1 flex flex-col min-h-screen">
        <DashboardHeader onMenuToggle={() => setMobileOpen((v) => !v)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Routes>
          {/* Keep the buyer workspace on the original Listings page. The
              public landing page is still shown at / when logged out. */}
          <Route path="/" element={<Home />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/create-listing" element={
            <ProtectedRoute roles={['seller', 'admin']}>
              <CreateListing />
            </ProtectedRoute>
          } />
          <Route path="/edit-listing/:id" element={
            <ProtectedRoute roles={['seller', 'admin']}>
              <EditListing />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute roles={['seller', 'admin']}>
              <Transactions />
            </ProtectedRoute>
          } />
          <Route path="/blockchain" element={
            <ProtectedRoute roles={['admin']}>
              <BlockchainExplorer />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/compare" element={
            <ProtectedRoute>
              <Compare />
            </ProtectedRoute>
          } />
          <Route path="/map" element={
            <ProtectedRoute>
              <MapExplore />
            </ProtectedRoute>
          } />
          <Route path="/my-lands" element={
            <ProtectedRoute roles={['buyer']}>
              <MyLands />
            </ProtectedRoute>
          } />
          <Route path="/favorites" element={
            <ProtectedRoute roles={['buyer', 'admin']}>
              <Favorites />
            </ProtectedRoute>
          } />
          <Route path="/branches" element={
            <ProtectedRoute>
              <Branches />
            </ProtectedRoute>
          } />
          <Route path="/registered-users" element={
            <ProtectedRoute roles={['seller', 'admin']}>
              <RegisteredUsers />
            </ProtectedRoute>
          } />
          <Route path="/inquiries" element={
            <ProtectedRoute>
              <Inquiries />
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  </div>
  )
}
