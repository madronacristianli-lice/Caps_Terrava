import { useCallback, useEffect, useState } from 'react'
import useAutoRefresh from '../hooks/useAutoRefresh.js'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../api/api.js'
import Spinner from '../components/Spinner.jsx'
import { SkeletonTable } from '../components/Skeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Avatar from '../components/Avatar.jsx'
import {
  ShieldCheck, Link2, ExternalLink, Search, X, CreditCard, Receipt, TrendingUp, Clock, CheckCircle, XCircle, Home, User,
  Eye, MapPin, Maximize, Phone, Mail, Landmark, Calendar, Hash, FileText, UserCheck, Building2, Tag, Banknote
} from 'lucide-react'
import { displayBranchName } from '../utils/branches.js'

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [valid, setValid] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [detailTransaction, setDetailTransaction] = useState(null)
  const [transactionPage, setTransactionPage] = useState(1)
  const transactionsPerPage = 10

  const openDetail = (t) => setDetailTransaction(t)
  const closeDetail = () => setDetailTransaction(null)

  const parseReference = (ref = '') => {
    const parts = ref.split('|').map((s) => s.trim())
    return { receiptNumber: parts[0] || ref || '—', branch: parts[1] || '—' }
  }

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleString('en-PH', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const fetchAll = useCallback(() => {
    const fetchTransactions = user?.role === 'admin'
      ? api.get('/transactions').then((res) => setTransactions(res.data))
      : api.get('/transactions/mine').then((res) => setTransactions(res.data))
    const fetches = [fetchTransactions]
    if (user?.role === 'admin') {
      fetches.push(api.get('/blockchain/validate').then((res) => setValid(res.data.valid)))
    }
    Promise.all(fetches).finally(() => setLoading(false))
  }, [user])

  useAutoRefresh(fetchAll, [fetchAll], 30000)

  const q = search.toLowerCase()
  const filteredTransactions = transactions.filter((t) => {
    if (!q) return true
    return (
      (t.listing?.title || '').toLowerCase().includes(q) ||
      (t.buyer?.full_name || '').toLowerCase().includes(q) ||
      (t.seller?.full_name || '').toLowerCase().includes(q) ||
      String(t.amount || '').toLowerCase().includes(q) ||
      (t.status || '').toLowerCase().includes(q) ||
      (t.payment_method || '').toLowerCase().includes(q)
    )
  })
  const totalTransactionPages = Math.max(1, Math.ceil(filteredTransactions.length / transactionsPerPage))
  const paginatedTransactions = filteredTransactions.slice(
    (transactionPage - 1) * transactionsPerPage,
    transactionPage * transactionsPerPage
  )
  useEffect(() => {
    setTransactionPage((page) => Math.min(page, totalTransactionPages))
  }, [totalTransactionPages])

  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const verifiedAmount = transactions.filter((t) => t.status === 'verified').reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const verifiedCount = transactions.filter((t) => t.status === 'verified').length
  const pendingCount = transactions.filter((t) => t.status === 'pending').length

  const statusBadge = (status) => {
    if (status === 'verified') return { bg: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Verified' }
    if (status === 'pending') return { bg: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Pending' }
    return { bg: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header card */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-900 rounded-2xl p-6 text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <CreditCard className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Transactions</h1>
            <p className="text-white/70 mt-0.5 text-sm">
              {user?.role === 'admin'
                ? 'All payment records are backed by the blockchain ledger.'
                : user?.role === 'seller'
                  ? 'Payment records for your assigned branch.'
                : 'Payment records for your listings and purchases.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 min-w-[130px]">
            <p className="text-2xl font-extrabold">₱{verifiedAmount.toLocaleString()}</p>
            <p className="text-xs text-white/70 uppercase tracking-wide font-medium">Verified</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 min-w-[110px]">
            <p className="text-2xl font-extrabold">{transactions.length}</p>
            <p className="text-xs text-white/70 uppercase tracking-wide font-medium">Total</p>
          </div>
          {user?.role === 'admin' && (
            <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold ${valid ? 'bg-green-400/20 text-green-100 border border-green-400/30' : 'bg-red-400/20 text-red-100 border border-red-400/30'}`}>
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm">{valid ? 'Valid' : 'Invalid'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
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
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Receipt className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{transactions.length}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Records</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">₱{totalAmount.toLocaleString()}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Volume</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{verifiedCount}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Verified</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{pendingCount}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending</p>
          </div>
        </div>
      </div>

      {loading ? <SkeletonTable rows={5} cols={9} /> : (
        <>
          {filteredTransactions.length === 0 ? (
            <EmptyState
              title={transactions.length === 0 ? "No transactions yet" : "No matching transactions"}
              message={transactions.length === 0 ? "Once a payment is recorded, it will appear here." : "Try a different search term."}
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-brand-50 border-b border-brand-100">
                    <tr>
                      <th className="px-4 py-3.5 text-xs font-bold text-brand-800 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-brand-800 uppercase tracking-wider">Property</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-brand-800 uppercase tracking-wider">Buyer</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-brand-800 uppercase tracking-wider">Seller</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-brand-800 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-brand-800 uppercase tracking-wider">Status</th>
                      {user?.role === 'admin' && (
                        <>
                          <th className="px-4 py-3.5 text-xs font-bold text-brand-800 uppercase tracking-wider">Block Hash</th>
                          <th className="px-4 py-3.5 text-xs font-bold text-brand-800 uppercase tracking-wider">Ethereum</th>
                        </>
                      )}
                      <th className="px-4 py-3.5 text-xs font-bold text-brand-800 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedTransactions.map((t) => {
                      const { bg, icon: StatusIcon, label } = statusBadge(t.status)
                      return (
                        <tr key={t.id} className="hover:bg-brand-50/30 transition">
                          <td className="px-4 py-4 text-sm font-medium text-gray-500">#{t.id}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Home className="w-4 h-4 text-brand-500 flex-shrink-0" />
                              <span className="text-sm font-semibold text-gray-900">{t.listing?.title || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Avatar url={t.buyer?.photo_url} name={t.buyer?.full_name} sizeClass="w-7 h-7" textClass="text-[10px]" />
                              <span className="text-sm text-gray-600">{t.buyer?.full_name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Avatar url={t.seller?.photo_url} name={t.seller?.full_name} sizeClass="w-7 h-7" textClass="text-[10px]" />
                              <span className="text-sm text-gray-600">{t.seller?.full_name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm font-bold text-brand-600">₱{Number(t.amount).toLocaleString()}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${bg}`}>
                              <StatusIcon className="w-3.5 h-3.5" /> {label}
                            </span>
                          </td>
                          {user?.role === 'admin' && (
                            <>
                              <td className="px-4 py-4 font-mono text-xs text-gray-600">
                                <span className="inline-flex items-center gap-1">
                                  <Link2 className="w-3 h-3 text-brand-500" />
                                  {t.block?.hash ? `${t.block.hash.slice(0, 16)}...` : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                {t.eth_tx_hash ? (
                                  <a
                                    href={`https://sepolia.etherscan.io/tx/${t.eth_tx_hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline font-mono"
                                  >
                                    {t.eth_tx_hash.slice(0, 10)}…
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                            </>
                          )}
                          <td className="px-4 py-4">
                            <button
                              onClick={() => openDetail(t)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-xs font-semibold hover:bg-brand-100 transition"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Showing {((transactionPage - 1) * transactionsPerPage) + 1}–{Math.min(transactionPage * transactionsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionPage((page) => Math.max(1, page - 1))}
                    disabled={transactionPage === 1}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >Previous</button>
                  <span className="min-w-16 text-center text-xs font-semibold text-gray-600">Page {transactionPage} of {totalTransactionPages}</span>
                  <button
                    type="button"
                    onClick={() => setTransactionPage((page) => Math.min(totalTransactionPages, page + 1))}
                    disabled={transactionPage === totalTransactionPages}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >Next</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Transaction Detail Modal */}
      {detailTransaction && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeDetail}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-brand-700 to-brand-900 p-6 text-white">
              <button
                onClick={closeDetail}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Receipt className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Transaction #{detailTransaction.id}</p>
                  <h2 className="text-xl md:text-2xl font-extrabold mt-0.5">
                    {detailTransaction.listing?.title || 'Transaction Details'}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(() => {
                      const { bg, icon: StatusIcon, label } = statusBadge(detailTransaction.status)
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize ${bg}`}>
                          <StatusIcon className="w-3.5 h-3.5" /> {label}
                        </span>
                      )
                    })()}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium">
                      <Calendar className="w-3.5 h-3.5" /> {formatDate(detailTransaction.created_at || detailTransaction.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Amount highlight */}
              <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-brand-50 rounded-2xl p-5 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl shadow-sm">
                    <Banknote className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Amount Paid</p>
                    <p className="text-2xl font-extrabold text-emerald-800">₱{Number(detailTransaction.amount).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Method</p>
                  <p className="text-sm font-bold text-emerald-900 capitalize">{detailTransaction.payment_method || '—'}</p>
                </div>
              </div>

              {/* Reference & Branch */}
              {(() => {
                const { receiptNumber, branch } = parseReference(detailTransaction.reference_number)
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-start gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <Hash className="w-4 h-4 text-brand-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt / Reference No.</p>
                        <p className="text-sm font-bold text-gray-900 font-mono mt-0.5">{receiptNumber}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-start gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <Landmark className="w-4 h-4 text-brand-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch Paid</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{displayBranchName(branch)}</p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Property details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-brand-50/50 px-5 py-3 border-b border-brand-100 flex items-center gap-2">
                  <Home className="w-4 h-4 text-brand-600" />
                  <p className="text-xs font-bold text-brand-800 uppercase tracking-wider">Property Details</p>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{detailTransaction.listing?.location_text || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Maximize className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Area</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{detailTransaction.listing?.area_sqm ? `${Number(detailTransaction.listing.area_sqm).toLocaleString()} sqm` : '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lot / Block</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{detailTransaction.listing?.lot_block_number || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Property Branch</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{detailTransaction.listing?.branch || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Original Price</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">₱{detailTransaction.listing?.price ? Number(detailTransaction.listing.price).toLocaleString() : '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Listing Status</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{detailTransaction.listing?.status || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* People involved */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-brand-50/50 px-5 py-3 border-b border-brand-100 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-brand-600" />
                  <p className="text-xs font-bold text-brand-800 uppercase tracking-wider">People Involved</p>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { label: 'Buyer', user: detailTransaction.buyer, icon: User },
                    { label: 'Seller', user: detailTransaction.seller, icon: User },
                    { label: 'Recorded By', user: detailTransaction.recorder, icon: UserCheck }
                  ].map(({ label, user: u, icon: Icon }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-white p-1.5 rounded-lg shadow-sm">
                          <Icon className="w-4 h-4 text-brand-600" />
                        </div>
                        <p className="text-xs font-bold text-brand-800 uppercase tracking-wider">{label}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar url={u?.photo_url} name={u?.full_name} sizeClass="w-10 h-10" textClass="text-xs" />
                        <p className="text-sm font-bold text-gray-900">{u?.full_name || '—'}</p>
                      </div>
                      {u?.email && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {u.email}
                        </p>
                      )}
                      {u?.phone && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {u.phone}
                        </p>
                      )}
                      {u?.role && label === 'Recorded By' && (
                        <p className="text-xs text-gray-500 mt-1 capitalize">{u.role}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Blockchain ledger */}
              <div className="bg-slate-900 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Link2 className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Blockchain Ledger</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Block Hash</p>
                    <p className="text-xs font-mono text-white mt-2 break-all">{detailTransaction.block?.hash || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
