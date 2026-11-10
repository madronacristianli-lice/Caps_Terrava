import { useCallback, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../api/api.js'
import EmptyState from '../../components/EmptyState.jsx'
import useAutoRefresh from '../../hooks/useAutoRefresh.js'
import {
  Store, LayoutList, Users, CreditCard, Clock,
  TrendingUp, MapPin, BarChart3,
  CheckCircle2, AlertCircle, ArrowUpRight,
  Search, RefreshCw
} from 'lucide-react'
import { displayBranchName } from '../../utils/branches.js'
import PesoIcon from '../../components/PesoIcon.jsx'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell
} from 'recharts'

const BRANCHES = [
  { name: 'Main Tagum', hours: 'Monday - Saturday: 8:00 AM - 5:00 PM', color: '#059669', manager: 'Terrava Main Office' },
  { name: 'Panabo', hours: 'Monday - Saturday: 8:00 AM - 5:00 PM', color: '#0ea5e9', manager: 'Panabo Field Office' },
  { name: 'Sto. Tomas', hours: 'Monday - Saturday: 8:00 AM - 5:00 PM', color: '#8b5cf6', manager: 'Sto. Tomas Satellite' },
  { name: 'Davao City', hours: 'Monday - Saturday: 8:00 AM - 5:00 PM', color: '#f59e0b', manager: 'Davao City Office' },
  { name: 'Mati City', hours: 'Monday - Saturday: 8:00 AM - 5:00 PM', color: '#ec4899', manager: 'Mati City Office' },
  { name: 'Digos City', hours: 'Monday - Saturday: 8:00 AM - 5:00 PM', color: '#6366f1', manager: 'Digos City Office' }
]

const formatPeso = (n) => `₱${Number(n || 0).toLocaleString()}`

export default function AdminBranches() {
  const { addToast } = useToast()
  const [listings, setListings] = useState([])
  const [transactions, setTransactions] = useState([])
  const [users, setUsers] = useState([])
  const [activeBranch, setActiveBranch] = useState('Main Tagum')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchBranchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [listingResponse, transactionResponse, userResponse] = await Promise.all([
        api.get('/listings?all=true'),
        api.get('/transactions'),
        api.get('/admin/users?archived=false')
      ])
      setListings(listingResponse.data)
      setTransactions(transactionResponse.data)
      setUsers(userResponse.data)
      setLastUpdated(new Date())
    } catch {
      addToast('Failed to load branch data', 'error')
    } finally {
      setRefreshing(false)
    }
  }, [addToast])

  // Keep branch performance and payment accountability current while the page is open.
  useAutoRefresh(fetchBranchData, [], 30000)

  const getBranch = (item) => {
    if (item?.branch) return item.branch
    const loc = (item?.location_text || '').toLowerCase()
    if (loc.includes('panabo')) return 'Panabo'
    if (loc.includes('sto. tomas') || loc.includes('sto tomas') || loc.includes('santo tomas')) return 'Sto. Tomas'
    if (loc.includes('davao city') || loc.includes('davao')) return 'Davao City'
    if (loc.includes('mati city') || loc.includes('mati')) return 'Mati City'
    if (loc.includes('digos city') || loc.includes('digos')) return 'Digos City'
    if (loc.includes('tagum')) return 'Main Tagum'
    return 'Other'
  }

  const getTransactionBranch = (transaction) => (
    transaction?.recorder?.branch ||
    transaction?.branch ||
    getBranch(transaction?.listing || {})
  )

  const branchData = useMemo(() => {
    return BRANCHES.map(({ name, hours, color, manager }) => {
      const branchListings = listings.filter((l) => getBranch(l) === name)
      const branchTransactions = transactions.filter((t) => getTransactionBranch(t) === name)
      const branchSales = branchTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
      const branchUsers = users.filter((u) => u.branch === name).length
      const totalLots = branchListings.length
      const available = branchListings.filter((l) => l.status === 'available').length
      const sold = branchListings.filter((l) => l.status === 'sold').length
      const pending = branchListings.filter((l) => !l.is_verified).length
      const occupancy = totalLots > 0 ? Math.round((sold / totalLots) * 100) : 0
      return {
        branch: name,
        hours,
        color,
        manager,
        listings: totalLots,
        available,
        sold,
        pending,
        transactions: branchTransactions.length,
        users: branchUsers,
        sales: branchSales,
        occupancy
      }
    })
  }, [listings, transactions, users])

  const activeMeta = branchData.find((b) => b.branch === activeBranch) || branchData[0]

  const activeListings = useMemo(() => {
    return listings
      .filter((l) => getBranch(l) === activeBranch)
      .filter((l) => {
        const q = search.toLowerCase()
        const matchesSearch = !q || (l.title || '').toLowerCase().includes(q) || (l.location_text || '').toLowerCase().includes(q)
        const matchesStatus = statusFilter === 'all' || l.status === statusFilter || (statusFilter === 'unverified' && !l.is_verified)
        return matchesSearch && matchesStatus
      })
  }, [listings, activeBranch, search, statusFilter])

  const activeTransactions = useMemo(() => {
    return transactions
      .filter((t) => getTransactionBranch(t) === activeBranch)
      .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
  }, [transactions, activeBranch])

  const salesChartData = useMemo(() => {
    return branchData.map((b) => ({ name: b.branch.replace('Main ', ''), sales: b.sales, color: b.color }))
  }, [branchData])

  const handleRefresh = async () => {
    await fetchBranchData()
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
            {/* Page intro */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 px-6 py-7 text-white shadow-xl shadow-emerald-900/10 md:px-8">
              <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,0.15)]" /> Live branch view
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Branch performance at a glance</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-100">
                    Review listings, payment activity, verification workload, and branch accountability across Terrava.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-200">Last updated</p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Updating…'}
                    </p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-emerald-800 shadow-lg transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-70"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Updating…' : 'Refresh data'}
                  </button>
                </div>
              </div>
            </section>

            {/* Branch cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {branchData.map((b) => {
                const isActive = activeBranch === b.branch
                return (
                  <button
                    key={b.branch}
                    onClick={() => setActiveBranch(b.branch)}
                    className={`relative text-left group rounded-2xl bg-white border transition-all duration-200 overflow-hidden hover:-translate-y-0.5 ${
                      isActive
                        ? 'shadow-card-hover ring-2 ring-emerald-500 border-emerald-500'
                        : 'shadow-card border-gray-100 hover:border-emerald-200'
                    }`}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ background: b.color }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: b.color }}>
                            <Store className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{displayBranchName(b.branch)}</h3>
                            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" /> {b.hours}
                            </p>
                          </div>
                        </div>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-gray-50 rounded-xl p-2.5">
                          <p className="text-[10px] text-gray-500 font-medium">Lots</p>
                          <p className="text-lg font-extrabold text-gray-900">{b.listings}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2.5">
                          <p className="text-[10px] text-gray-500 font-medium">Sold</p>
                          <p className="text-lg font-extrabold text-emerald-600">{b.sold}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2.5">
                          <p className="text-[10px] text-gray-500 font-medium">Sales</p>
                          <p className="text-sm font-extrabold text-emerald-700 leading-tight">{formatPeso(b.sales)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{b.available} available</span>
                        <span className="font-semibold text-emerald-600 flex items-center gap-0.5">
                          {b.occupancy}% sold <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${b.occupancy}%`, background: b.color }}
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </section>

            {/* Active branch metrics */}
            <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Listings', value: activeMeta.listings, icon: LayoutList, color: 'text-gray-900' },
                { label: 'Available', value: activeMeta.available, icon: CheckCircle2, color: 'text-emerald-600' },
                { label: 'Sold', value: activeMeta.sold, icon: TrendingUp, color: 'text-blue-600' },
                { label: 'Pending', value: activeMeta.pending, icon: AlertCircle, color: 'text-amber-600' },
                { label: 'Users', value: activeMeta.users, icon: Users, color: 'text-purple-600' },
                { label: 'Total Sales', value: formatPeso(activeMeta.sales), icon: PesoIcon, color: 'text-emerald-700' }
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl shadow-card border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                  </div>
                  <p className={`text-xl font-extrabold ${color}`}>{value}</p>
                </div>
              ))}
            </section>

            {/* Chart + branch info */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-emerald-600" /> Cross-Branch Sales
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">Total sales value per branch</p>
                  </div>
                </div>
                {salesChartData.every((d) => d.sales === 0) ? (
                  <EmptyState title="No branch sales yet" message="Branch sales will appear once transactions are recorded." />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesChartData} margin={{ top: 8, right: 8, bottom: 8, left: -8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v) => formatPeso(v)} cursor={{ fill: '#f0fdf4' }} />
                        <Bar dataKey="sales" radius={[8, 8, 0, 0]}>
                          {salesChartData.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <Store className="w-5 h-5 text-emerald-600" /> {displayBranchName(activeBranch)}
                </h2>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-xs text-emerald-700 font-semibold mb-1">Branch Manager</p>
                    <p className="text-sm font-bold text-gray-900">{activeMeta.manager}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Operating Hours</p>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600" /> {activeMeta.hours}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Occupancy Rate</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${activeMeta.occupancy}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-900">{activeMeta.occupancy}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Listings + Transactions */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Listings */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <LayoutList className="w-5 h-5 text-emerald-600" /> {displayBranchName(activeBranch)} Listings
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search listings..."
                        className="pl-8 pr-3 h-8 rounded-lg text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-40"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-8 px-2 rounded-lg text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="all">All</option>
                      <option value="available">Available</option>
                      <option value="sold">Sold</option>
                      <option value="unverified">Pending Verify</option>
                    </select>
                  </div>
                </div>

                {activeListings.length === 0 ? (
                  <EmptyState title="No listings found" message={`No listings match your filters for ${displayBranchName(activeBranch)}.`} />
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {activeListings.map((l) => (
                      <div key={l.id} className="flex items-center justify-between p-3.5 border border-gray-100 rounded-xl hover:bg-emerald-50/30 transition group">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{l.title}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {l.location_text || '—'}
                          </p>
                          <p className="text-xs font-bold text-emerald-700 mt-1">{formatPeso(l.price)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                            l.status === 'sold'
                              ? 'bg-blue-100 text-blue-700'
                              : l.status === 'available'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}>
                            {l.status}
                          </span>
                          {!l.is_verified && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                              Unverified
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transactions */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-emerald-600" /> {displayBranchName(activeBranch)} Transactions
                  </h2>
                  <span className="text-xs font-bold text-gray-500">{activeTransactions.length} total</span>
                </div>

                {activeTransactions.length === 0 ? (
                  <EmptyState title="No transactions" message={`No transactions recorded for ${displayBranchName(activeBranch)}.`} />
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {activeTransactions.map((t) => (
                      <div key={t.id} className="p-3.5 border border-gray-100 rounded-xl hover:bg-emerald-50/30 transition">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-gray-900 truncate">{t.listing?.title || 'Land Payment'}</p>
                          <span className="font-bold text-emerald-700 whitespace-nowrap">{formatPeso(t.amount)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">{t.buyer?.full_name || 'Buyer'} → {t.seller?.full_name || 'Seller'}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            t.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-700'
                              : t.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {t.status}
                          </span>
                          <span className="text-[10px] text-gray-400">{new Date(t.created_at || t.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
      </div>
    </div>
  )
}
