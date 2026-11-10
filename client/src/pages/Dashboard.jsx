import { useCallback, useEffect, useState } from 'react'
import useAutoRefresh from '../hooks/useAutoRefresh.js'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import api from '../api/api.js'
import Spinner from '../components/Spinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import AssignBuyerModal from '../components/AssignBuyerModal.jsx'
import RecordPaymentModal from '../components/RecordPaymentModal.jsx'
import Avatar from '../components/Avatar.jsx'
import { FileText, CreditCard, UserCheck, UserX, Eye, PlusCircle, Pencil, Home, BookmarkCheck, Receipt, ShieldCheck, Filter, ChevronDown, ChevronLeft, ChevronRight, Search, X, AlertTriangle, Wallet, Clock, AlertCircle } from 'lucide-react'

const statusColors = {
  available: 'bg-green-100 text-green-700',
  reserved: 'bg-amber-100 text-amber-700',
  sold: 'bg-red-100 text-red-700',
}

const statusCardStyles = {
  available: {
    border: 'border-t-green-500',
    bg: 'bg-gradient-to-br from-green-50/70 to-white',
    icon: 'bg-green-100 text-green-600',
    hover: 'hover:ring-green-200',
  },
  reserved: {
    border: 'border-t-amber-400',
    bg: 'bg-gradient-to-br from-amber-50/70 to-white',
    icon: 'bg-amber-100 text-amber-600',
    hover: 'hover:ring-amber-200',
  },
  sold: {
    border: 'border-t-red-500',
    bg: 'bg-gradient-to-br from-red-50/70 to-white',
    icon: 'bg-red-100 text-red-600',
    hover: 'hover:ring-red-200',
  },
}

const pendingCardStyles = {
  border: 'border-t-slate-400',
  bg: 'bg-gradient-to-br from-slate-50 to-white',
  icon: 'bg-slate-100 text-slate-600',
  hover: 'hover:ring-slate-200',
}

const txStatusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  verified: 'bg-brand-100 text-brand-700',
  rejected: 'bg-red-100 text-red-700',
}

const SectionHeader = ({ icon: Icon, title, action }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-2">
      <div className="bg-brand-100 p-1.5 rounded-lg">
        <Icon className="w-5 h-5 text-brand-700" />
      </div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
    </div>
    {action}
  </div>
)

export default function Dashboard() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [listings, setListings] = useState([])
  const [transactions, setTransactions] = useState([])
  const [installments, setInstallments] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignTarget, setAssignTarget] = useState(null)
  const [recordTarget, setRecordTarget] = useState(null)
  const [unassignConfirm, setUnassignConfirm] = useState({ open: false, listingId: null, buyerName: '' })
  const [statusFilter, setStatusFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [listingPage, setListingPage] = useState(1)
  const listingsPerPage = 9

  const fetchListings = useCallback(() =>
    api.get('/listings?all=true').then((res) =>
      setListings(res.data)
    ), [user])

  const fetchTransactions = useCallback(() =>
    api.get('/transactions/mine').then((res) => setTransactions(res.data)), [])

  const fetchInstallments = useCallback(() =>
    api.get('/installments/mine').then((res) => setInstallments(res.data)).catch(() => {}), [])

  const fetchAll = useCallback(() => {
    const fetches = [fetchTransactions(), fetchInstallments()]
    if (user?.role === 'seller') fetches.push(fetchListings())
    Promise.all(fetches)
      .catch((err) => {
        addToast(err.response?.data?.error || 'Unable to refresh listing data. Please try again.', 'error')
      })
      .finally(() => setLoading(false))
  }, [addToast, fetchListings, fetchTransactions, fetchInstallments, user])

  const openUnassignModal = (listing) => {
    if (hasPayments(listing.id)) {
      addToast('Cannot unassign buyer: payments have already been recorded for this listing.', 'error')
      return
    }
    setUnassignConfirm({
      open: true,
      listingId: listing.id,
      buyerName: listing.assignedBuyer?.full_name || 'this buyer'
    })
  }

  const closeUnassignModal = () => setUnassignConfirm({ open: false, listingId: null, buyerName: '' })

  const confirmUnassign = async () => {
    try {
      await api.delete(`/listings/${unassignConfirm.listingId}/assign`)
      closeUnassignModal()
      fetchListings()
    } catch (err) {
      console.error(err)
      addToast(err.response?.data?.error || 'Failed to unassign buyer', 'error')
    }
  }

  const hasPayments = (listingId) => transactions.some((t) => String(t.listing_id) === String(listingId))

  useAutoRefresh(fetchAll, [fetchAll], 30000)

  const q = search.toLowerCase()
  const filteredListings = listings.filter((l) => {
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter
    const matchesVerification = verificationFilter === 'all' ||
      (verificationFilter === 'verified' && l.is_verified) ||
      (verificationFilter === 'pending' && !l.is_verified)
    const matchesSearch = !q ||
      (l.title || '').toLowerCase().includes(q) ||
      (l.location_text || '').toLowerCase().includes(q) ||
      (l.assignedBuyer?.full_name || '').toLowerCase().includes(q)
    return matchesStatus && matchesVerification && matchesSearch
  })

  useEffect(() => {
    setListingPage(1)
  }, [search, statusFilter, verificationFilter, listings.length])

  const listingPageCount = Math.max(1, Math.ceil(filteredListings.length / listingsPerPage))
  const currentListingPage = Math.min(listingPage, listingPageCount)
  const visibleListings = filteredListings.slice(
    (currentListingPage - 1) * listingsPerPage,
    currentListingPage * listingsPerPage
  )

  // The listings view uses all verified payments for shared payment progress,
  // but "My Transactions" must only show payments collected by this seller.
  const myRecordedTransactions = user?.role === 'seller'
    ? transactions.filter((t) => String(t.recorded_by || t.recorder?.id) === String(user.id))
    : transactions

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  if (user?.role === 'admin') return <Navigate to="/admin" replace />

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

      {/* Welcome */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-900 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-brand-200 text-sm font-semibold uppercase tracking-wider mb-1">
          {user?.role} Portal
        </p>
        <h1 className="text-2xl md:text-3xl font-extrabold">Welcome, {user?.full_name}!</h1>
        <p className="text-white/60 mt-1 text-sm">{user?.email}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {user?.role === 'seller' && (
          <>
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Home className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900">{listings.length}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Listings</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookmarkCheck className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900">
                  {listings.filter((l) => l.status === 'reserved').length}
                </p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Reserved</p>
              </div>
            </div>
          </>
        )}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Receipt className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{transactions.length}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Transactions</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">
              {transactions.filter((t) => t.status === 'verified').length}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Verified</p>
          </div>
        </div>
      </div>

      {/* Seller — My Listings */}
      {user?.role === 'seller' && (
        <section>
          <SectionHeader
            icon={FileText}
            title="My Listings"
            action={
              <Link to="/create-listing" className="btn-primary text-sm py-2 px-4">
                <PlusCircle className="w-4 h-4" /> New Listing
              </Link>
            }
          />

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or location..."
                className="w-full pl-11 pr-10 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative min-w-[180px]">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none pl-9 pr-10 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative min-w-[180px]">
              <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="w-full appearance-none pl-9 pr-10 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm cursor-pointer"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending Admin Review</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {filteredListings.length === 0 ? (
            <EmptyState
              title={listings.length === 0 ? "No listings yet" : search ? "No listings match your search" : "No listings match this filter"}
              message={(() => {
                if (listings.length === 0) return "Post your first property to start selling."
                if (search) return "Try a different search term."
                const parts = []
                if (statusFilter !== 'all') parts.push(statusFilter)
                if (verificationFilter === 'pending') parts.push('pending admin review')
                if (verificationFilter === 'verified') parts.push('verified')
                return parts.length > 0
                  ? `You have no ${parts.join(' · ')} listings at the moment.`
                  : "Adjust your filters to see more listings."
              })()}
            />
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleListings.map((l) => {
                const isOwner = String(l.seller_id) === String(user.id)
                // Seller listings are shared across branches so any authenticated
                // seller can coordinate buyers and maintain the listing.
                const canManage = user?.role === 'seller'
                const isPendingReview = !l.is_verified
                const cardStyle = isPendingReview ? pendingCardStyles : (statusCardStyles[l.status] || {})
                const canRecordPayment = user?.role === 'seller'
                const paidAmount = transactions
                  .filter((t) => String(t.listing_id) === String(l.id) && t.status === 'verified')
                  .reduce((sum, t) => sum + Number(t.amount || 0), 0)
                const listingPrice = Number(l.price || 0)
                const remainingAmount = Math.max(listingPrice - paidAmount, 0)
                return (
                <div key={l.id} className={`rounded-2xl shadow-card border border-gray-200 border-t-4 p-5 hover:shadow-card-hover transition-all duration-200 flex flex-col h-full ${cardStyle.bg || 'bg-white'} ${cardStyle.border || 'border-t-gray-400'}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-gray-900 line-clamp-1 flex-1">{l.title}</h3>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${isPendingReview ? 'bg-slate-200 text-slate-700' : (statusColors[l.status] || 'bg-gray-100 text-gray-600')}`}>
                      {isPendingReview ? 'Pending Review' : l.status}
                    </span>
                  </div>
                  <p className="text-brand-600 font-extrabold text-lg">₱{Number(l.price).toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l.area_sqm} sqm · {l.location_text}</p>

                  {paidAmount > 0 && (
                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-blue-800">Payment progress</span>
                        <span className="font-bold text-blue-900">{remainingAmount === 0 ? 'Fully paid' : 'In progress'}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-blue-700">
                        <span>Paid: ₱{paidAmount.toLocaleString()}</span>
                        <span>Remaining: ₱{remainingAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {l.assigned_buyer_id && l.assignedBuyer && (
                    <div className="mt-3 flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2 text-sm">
                      <UserCheck className="w-4 h-4 text-brand-600 flex-shrink-0" />
                      <span className="text-brand-700 font-medium truncate flex-1">{l.assignedBuyer.full_name}</span>
                      {!hasPayments(l.id) && (
                        <button
                          onClick={() => openUnassignModal(l)}
                          title="Unassign buyer"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition flex-shrink-0"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${l.is_verified ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {l.is_verified ? 'Verified' : 'Pending Review'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-auto pt-4">
                    <Link to={`/listing/${l.id}`}
                      className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 border border-brand-200 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition w-full justify-center">
                      <Eye className="w-3.5 h-3.5" /> View
                    </Link>
                    {canManage && !hasPayments(l.id) ? (
                      <Link to={`/edit-listing/${l.id}`} state={{ from: '/dashboard' }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 border border-amber-200 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition w-full justify-center">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Link>
                    ) : (
                      <div />
                    )}
                    {canManage && !isPendingReview && l.status === 'available' && !l.assigned_buyer_id ? (
                      <button
                        onClick={() => setAssignTarget(l)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition w-full justify-center"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Assign
                      </button>
                    ) : canRecordPayment && l.assigned_buyer_id ? (
                      <button
                        onClick={() => setRecordTarget(l)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition w-full justify-center"
                      >
                        <Receipt className="w-3.5 h-3.5" /> Record Payment
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                </div>
                )
              })}
            </div>
            {filteredListings.length > listingsPerPage && (
              <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-bold text-gray-700">{(currentListingPage - 1) * listingsPerPage + 1}</span>
                  {' '}to{' '}
                  <span className="font-bold text-gray-700">{Math.min(currentListingPage * listingsPerPage, filteredListings.length)}</span>
                  {' '}of <span className="font-bold text-gray-700">{filteredListings.length}</span> listings
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setListingPage((page) => Math.max(1, page - 1))}
                    disabled={currentListingPage <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <span className="min-w-[5.5rem] text-center text-sm font-bold text-gray-700">
                    Page {currentListingPage} of {listingPageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setListingPage((page) => Math.min(listingPageCount, page + 1))}
                    disabled={currentListingPage >= listingPageCount}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </section>
      )}

      {/* Transactions */}
      <section>
        <SectionHeader icon={CreditCard} title="My Transactions" />
        {myRecordedTransactions.length === 0 ? (
          <EmptyState title="No transactions" message="Payments you record will appear here." />
        ) : (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-50 border-b border-brand-100">
                  <tr>
                    <th className="px-5 py-3.5 font-bold text-gray-700">Property</th>
                    <th className="px-5 py-3.5 font-bold text-gray-700">Amount</th>
                    <th className="px-5 py-3.5 font-bold text-gray-700">Date & Time</th>
                    <th className="px-5 py-3.5 font-bold text-gray-700">Buyer</th>
                    <th className="px-5 py-3.5 font-bold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {myRecordedTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4 font-medium text-gray-900">{t.listing?.title || '—'}</td>
                      <td className="px-5 py-4 font-bold text-brand-600">₱{Number(t.amount).toLocaleString()}</td>
                      <td className="px-5 py-4 text-gray-600">{
                        (t.created_at || t.createdAt)
                          ? new Date(t.created_at || t.createdAt).toLocaleString()
                          : '—'
                      }</td>
                      <td className="px-5 py-4 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Avatar url={t.buyer?.photo_url} name={t.buyer?.full_name} sizeClass="w-7 h-7" textClass="text-[10px]" />
                          <span>{t.buyer?.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${txStatusColors[t.status] || 'bg-gray-100 text-gray-600'}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Installment Accounts */}
      {installments.length > 0 && (
        <section>
          <SectionHeader icon={Wallet} title="Installment Accounts" />
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-50 border-b border-brand-100">
                  <tr>
                    <th className="px-5 py-3.5 font-bold text-gray-700">Property</th>
                    <th className="px-5 py-3.5 font-bold text-gray-700">Buyer</th>
                    <th className="px-5 py-3.5 font-bold text-gray-700">Monthly</th>
                    <th className="px-5 py-3.5 font-bold text-gray-700">Next Due</th>
                    <th className="px-5 py-3.5 font-bold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {installments.map((a) => {
                    const statusColors = {
                      active: 'bg-emerald-100 text-emerald-700',
                      grace_period: 'bg-amber-100 text-amber-700',
                      overdue: 'bg-orange-100 text-orange-700',
                      delinquent: 'bg-red-100 text-red-700',
                      defaulted: 'bg-gray-100 text-gray-700',
                      paid_off: 'bg-blue-100 text-blue-700'
                    }
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4 font-medium text-gray-900">{a.listing?.title || '—'}</td>
                        <td className="px-5 py-4 text-gray-600">{a.buyer?.full_name || '—'}</td>
                        <td className="px-5 py-4 font-bold text-brand-600">₱{Number(a.monthly_payment_amount || 0).toLocaleString()}</td>
                        <td className="px-5 py-4 text-gray-600">{a.next_due_date ? new Date(a.next_due_date).toLocaleDateString() : '—'}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${statusColors[a.status] || 'bg-gray-100 text-gray-600'}`}>
                            {a.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Assign Buyer Modal */}
      {assignTarget && (
        <AssignBuyerModal
          listing={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={fetchListings}
        />
      )}

      {/* Record Payment Modal */}
      {recordTarget && (
        <RecordPaymentModal
          listing={recordTarget}
          transactions={transactions}
          paymentBranch={user?.branch}
          onClose={() => setRecordTarget(null)}
          onRecorded={() => {
            fetchAll()
          }}
        />
      )}

      {/* Unassign Buyer Confirmation Modal */}
      {unassignConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 text-center">
            <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unassign Buyer?</h3>
            <p className="text-sm text-gray-600 mb-6">
              You are about to unassign <span className="font-semibold text-gray-900">{unassignConfirm.buyerName}</span>. This will remove the reservation and the buyer will no longer be tied to this listing.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={closeUnassignModal}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnassign}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition shadow-lg shadow-red-200"
              >
                Yes, Unassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
