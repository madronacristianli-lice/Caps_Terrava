import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useAutoRefresh from '../../hooks/useAutoRefresh.js'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNotifications } from '../../context/NotificationContext.jsx'
import api from '../../api/api.js'
import Spinner from '../../components/Spinner.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import LandDetailsModal from '../../components/LandDetailsModal.jsx'
import MapView from '../../components/MapView.jsx'
import CreateListingForm from '../../components/CreateListingForm.jsx'
import Avatar from '../../components/Avatar.jsx'
import PesoIcon from '../../components/PesoIcon.jsx'
import AdminSettingsModal from '../../components/AdminSettingsModal.jsx'
import EditUserProfileModal from '../../components/EditUserProfileModal.jsx'
import {
  LayoutDashboard, Users, List, CreditCard, Link2, Map, Globe, ShieldCheck,
  Shield, Lock, Search, Trash2, Edit3, CheckCircle2, X, Banknote, LandPlot, Info,
  Filter, Eye, EyeOff, AlertCircle, TrendingUp, Activity, CheckCircle, Calendar,
  FileText, Building2, LayoutList, MapPin, Maximize, Tag, User, Store,
  Bell, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, LogOut, Settings, Plus,
  ExternalLink, Trophy, Clock, XCircle, Archive, RotateCcw, Image as ImageIcon,
  Wallet
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const TABS = [
  { key: 'overview', label: 'Overview Analytics', icon: LayoutDashboard },
  { key: 'lands', label: 'Land Inventory', icon: Map },
  { key: 'mapview', label: 'Map View', icon: Globe },
  { key: 'users', label: 'User Directory', icon: Users },
  { key: 'transactions', label: 'Transactions', icon: CreditCard },
  { key: 'installments', label: 'Installment Accounts', icon: Wallet },
  { key: 'blockchain', label: 'Blockchain Ledger', icon: Link2 }
]

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#064e3b']

function ProfileField({ label, value, wide = false }) {
  const hasValue = value !== null && value !== undefined && value !== ''

  return (
    <div className={`rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold break-words ${hasValue ? 'text-gray-900' : 'text-gray-400 italic font-medium'}`}>
        {hasValue ? value : 'Not provided'}
      </p>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { user, login, logout } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [activeTab, setActiveTab] = useState('overview')
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const profileRef = useRef(null)
  const notifRef = useRef(null)
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [chain, setChain] = useState([])
  const [valid, setValid] = useState(null)
  const [contract, setContract] = useState(null)
  const [listings, setListings] = useState([])
  const [transactions, setTransactions] = useState([])
  const [installments, setInstallments] = useState([])
  const [installmentFilter, setInstallmentFilter] = useState('all')
  const [installmentSearch, setInstallmentSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [userFilter, setUserFilter] = useState('all')
  const [userBranchFilter, setUserBranchFilter] = useState('all')
  const [userArchiveFilter, setUserArchiveFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [selectedLand, setSelectedLand] = useState(null)
  const [landStatusFilter, setLandStatusFilter] = useState('all')
  const [landBranchFilter, setLandBranchFilter] = useState('all')
  const [landArchiveFilter, setLandArchiveFilter] = useState('active')
  const [landActionTarget, setLandActionTarget] = useState(null)
  const [landActionLoading, setLandActionLoading] = useState(false)
  const [selectedTxn, setSelectedTxn] = useState(null)
  const [txnSearch, setTxnSearch] = useState('')
  const [txnStatusFilter, setTxnStatusFilter] = useState('all')
  const [txnBranchFilter, setTxnBranchFilter] = useState('all')
  const [txnPage, setTxnPage] = useState(1)
  const txnPerPage = 10
  const [blockchainSearch, setBlockchainSearch] = useState('')
  const [blockchainPage, setBlockchainPage] = useState(1)
  const [ledgerPassword, setLedgerPassword] = useState('')
  const [showLedgerPassword, setShowLedgerPassword] = useState(false)
  const [ledgerError, setLedgerError] = useState('')
  const [unlockingLedger, setUnlockingLedger] = useState(false)
  const [ledgerUnlocked, setLedgerUnlocked] = useState(false)
  const blocksPerPage = 10
  const [roleEditUser, setRoleEditUser] = useState(null)
  const [roleEditValue, setRoleEditValue] = useState('')
  const [editProfileUser, setEditProfileUser] = useState(null)
  const [viewUser, setViewUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletingUser, setDeletingUser] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [addLandOpen, setAddLandOpen] = useState(false)
  const [addLandLoading, setAddLandLoading] = useState(false)
  const [landView, setLandView] = useState('list')
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('adminDashboardSidebarCollapsed') === 'true')
  const [mapSelected, setMapSelected] = useState(null)
  const [mapPanelOpen, setMapPanelOpen] = useState(true)
  const [mapDetailsMinimized, setMapDetailsMinimized] = useState(false)
  const [mapExpandedBranch, setMapExpandedBranch] = useState(null)
  const [mapFlyTo, setMapFlyTo] = useState(null)
  const [mapBranchFilter, setMapBranchFilter] = useState('all')

  // Export filter modal state
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')
  const [exportFormat, setExportFormat] = useState('csv')
  const [exportCategory, setExportCategory] = useState('all')

  const fetchListings = useCallback(async () => {
    const archivedParam = landArchiveFilter === 'archived' ? 'true' : landArchiveFilter === 'all' ? 'all' : 'false'
    const res = await api.get(`/listings?all=true&archived=${archivedParam}`)
    setListings(res.data)
  }, [landArchiveFilter])

  const fetchAdminData = useCallback(() => {
    Promise.all([
      api.get('/admin/dashboard').then((res) => setStats(res.data)),
      api.get(`/admin/users?archived=${userArchiveFilter === 'archived' ? 'true' : 'false'}`).then((res) => setUsers(res.data)),
      fetchListings(),
      api.get('/transactions').then((res) => setTransactions(res.data)),
      api.get('/installments').then((res) => setInstallments(res.data))
    ])
      .catch((err) => addToast(err.response?.data?.error || 'Failed to load admin data', 'error'))
      .finally(() => setLoading(false))
  }, [addToast, fetchListings, userArchiveFilter])

  const loadBlockchain = async () => {
    const [chainResponse, validationResponse, contractResponse] = await Promise.all([
      api.get('/blockchain/chain'),
      api.get('/blockchain/validate'),
      api.get('/blockchain/contract')
    ])
    setChain(chainResponse.data)
    setValid(validationResponse.data.valid)
    setContract(contractResponse.data)
  }

  const selectTab = (tab) => {
    if (tab === 'blockchain') {
      sessionStorage.removeItem('blockchainLedgerToken')
      setLedgerUnlocked(false)
      setLedgerError('')
    }
    setActiveTab(tab)
  }

  const unlockLedger = async (event) => {
    event.preventDefault()
    setLedgerError('')
    setUnlockingLedger(true)
    try {
      const response = await api.post('/auth/blockchain-ledger/unlock', { password: ledgerPassword })
      sessionStorage.setItem('blockchainLedgerToken', response.data.ledgerToken)
      await loadBlockchain()
      setLedgerPassword('')
      setLedgerUnlocked(true)
    } catch (error) {
      sessionStorage.removeItem('blockchainLedgerToken')
      setLedgerUnlocked(false)
      setLedgerError(error.response?.data?.error || 'Unable to unlock the blockchain ledger')
    } finally {
      setUnlockingLedger(false)
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    setBlockchainPage(1)
  }, [chain.length, blockchainSearch])

  useEffect(() => {
    if (activeTab !== 'blockchain' || !ledgerUnlocked) return

    loadBlockchain().catch((error) => {
      sessionStorage.removeItem('blockchainLedgerToken')
      setLedgerUnlocked(false)
      setLedgerError(error.response?.data?.error || 'Ledger access has expired. Enter your password again.')
    })
  }, [activeTab, ledgerUnlocked])

  useAutoRefresh(fetchAdminData, [fetchAdminData], 30000)

  const landModalInitialData = useMemo(() => {
    if (!selectedLand) return {}
    const coords = selectedLand.polygon_geojson?.coordinates?.[0] || []
    const points = coords.length > 1
      ? coords.slice(0, -1).map(([lng, lat]) => [lat, lng])
      : coords.map(([lng, lat]) => [lat, lng])
    return {
      title: selectedLand.title || '',
      description: selectedLand.description || '',
      total_area_sqm: selectedLand.area_sqm || '',
      total_contract_price: selectedLand.price || '',
      latitude: points[0]?.[0] || '',
      longitude: points[0]?.[1] || '',
      polygon_points: points,
      lot_block_number: selectedLand.lot_block_number || '',
      zoning_classification: selectedLand.zoning_classification || '',
      land_title_status: selectedLand.land_title_status || '',
      reservation_fee: selectedLand.reservation_fee || '',
      minimum_down_payment_pct: selectedLand.minimum_down_payment_pct || '',
      cash_term_enabled: selectedLand.cash_term_enabled || false,
      cash_term_discount_pct: selectedLand.cash_term_discount_pct || '',
      in_house_financing_enabled: selectedLand.in_house_financing_enabled || false,
      in_house_max_term_years: selectedLand.in_house_max_term_years || '',
      in_house_interest_rate_pct: selectedLand.in_house_interest_rate_pct || '',
      bank_government_loan_enabled: selectedLand.bank_government_loan_enabled || false,
      terrain_topography: selectedLand.terrain_topography || '',
      utilities: {
        electricity_ready: selectedLand.utilities?.electricity_ready || false,
        water_ready: selectedLand.utilities?.water_ready || false,
        telecom_ready: selectedLand.utilities?.telecom_ready || false
      }
    }
  }, [selectedLand])

  const landModalExistingPhotos = useMemo(() => selectedLand?.photos || [], [selectedLand?.photos])

  if (loading) return (
    <div className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  )

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('adminDashboardSidebarCollapsed', String(next))
  }

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

  const branches = ['Main Tagum', 'Panabo', 'Sto. Tomas', 'Davao City', 'Mati City', 'Digos City'].map((branch) => {
    const branchListings = listings.filter((l) => getBranch(l) === branch)
    const branchTransactions = transactions.filter((t) => {
      const fullListing = listings.find((l) => l.id === t.listing_id) || t.listing
      return getBranch(fullListing) === branch
    })
    return {
      branch,
      listings: branchListings.length,
      available: branchListings.filter((l) => l.status === 'available').length,
      sold: branchListings.filter((l) => l.status === 'sold').length,
      transactions: branchTransactions.length,
      sales: branchTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    }
  })

  const branchChart = branches.map((b) => ({ name: b.branch.replace('Main ', ''), sales: b.sales, listings: b.listings }))
  const topBranch = branches.reduce((max, b) => (b.sales > max.sales ? b : max), branches[0] || {})
  const totalBranchSales = branches.reduce((sum, b) => sum + b.sales, 0)
  const totalBranchTransactions = branches.reduce((sum, b) => sum + b.transactions, 0)
  const rankedBranches = [...branches].sort((a, b) => b.sales - a.sales)

  const milestoneData = [
    { name: 'Verified', value: transactions.filter((t) => t.status === 'verified').length },
    { name: 'Pending', value: transactions.filter((t) => t.status === 'pending').length },
    { name: 'Rejected', value: transactions.filter((t) => t.status === 'rejected').length }
  ].filter((d) => d.value > 0)

  const formatPeso = (n) => `₱${Number(n || 0).toLocaleString()}`
  const formatDate = (d) => d ? new Date(d).toLocaleString() : '—'

  const filteredUsers = users.filter((u) => {
    const matchesRole = userFilter === 'all' || u.role === userFilter
    const matchesBranch = userBranchFilter === 'all' || (u.branch || getBranch(u)) === userBranchFilter
    const q = search.toLowerCase()
    const matchesSearch = !q || (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    return matchesRole && matchesBranch && matchesSearch
  })

  const filteredListings = listings.filter((l) => {
    const matchesStatus = landStatusFilter === 'all' || l.status === landStatusFilter || (landStatusFilter === 'unverified' && !l.is_verified)
    const matchesBranch = landBranchFilter === 'all' || getBranch(l) === landBranchFilter
    const q = search.toLowerCase()
    const matchesSearch = !q || (l.title || '').toLowerCase().includes(q) || (l.location_text || '').toLowerCase().includes(q)
    return matchesStatus && matchesBranch && matchesSearch
  })

  const handleArchiveAction = async () => {
    if (!deleteTarget) return
    setDeletingUser(true)
    try {
      const isArchiving = userArchiveFilter === 'active'
      await api.put(`/admin/users/${deleteTarget.id}/${isArchiving ? 'archive' : 'restore'}`)
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      addToast(isArchiving ? 'Buyer archived successfully' : 'Buyer restored successfully', 'success')
      setDeleteTarget(null)
    } catch (err) {
      addToast(err.response?.data?.error || 'Action failed', 'error')
    } finally {
      setDeletingUser(false)
    }
  }

  const downloadCsv = (filename, headers, rows) => {
    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExport = () => {
    setExportStartDate('')
    setExportEndDate('')
    setExportFormat('csv')
    setExportCategory('all')
    setExportModalOpen(true)
  }

  const inDateRange = (dateString) => {
    if (!dateString) return false
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return false
    const start = exportStartDate ? new Date(exportStartDate) : null
    const end = exportEndDate ? new Date(exportEndDate) : null
    if (start) start.setHours(0, 0, 0, 0)
    if (end) end.setHours(23, 59, 59, 999)
    if (start && d < start) return false
    if (end && d > end) return false
    return true
  }

  const exportAsCsv = (filename, headers, rows) => {
    downloadCsv(filename, headers, rows)
  }

  const exportAsPdf = (title, headers, rows) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const emerald = [5, 150, 105]
    const emeraldLight = [236, 253, 245]
    const dark = [31, 41, 55]
    const gray = [107, 114, 128]

    const drawHeader = () => {
      doc.setFillColor(...emerald)
      doc.rect(0, 0, pageWidth, 32, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text(title, 16, 20)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const generated = `Generated: ${new Date().toLocaleString()}`
      doc.text(generated, 16, 27)
      const dateRangeText = [exportStartDate && `From: ${exportStartDate}`, exportEndDate && `To: ${exportEndDate}`].filter(Boolean).join('  |  ')
      if (dateRangeText) {
        doc.text(dateRangeText, pageWidth - 16, 27, { align: 'right' })
      }
    }

    drawHeader()

    let cursorY = 42

    if (title === 'Admin Summary' && rows.length > 0) {
      doc.setTextColor(...dark)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Dashboard Overview', 16, cursorY)
      cursorY += 8

      const cardW = 63
      const cardH = 22
      const gap = 6
      const cols = 4
      rows.forEach((row, idx) => {
        const col = idx % cols
        const rowNum = Math.floor(idx / cols)
        const x = 16 + col * (cardW + gap)
        const y = cursorY + rowNum * (cardH + gap)
        doc.setFillColor(...emeraldLight)
        doc.setDrawColor(...emerald)
        doc.setLineWidth(0.3)
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD')
        doc.setTextColor(...gray)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(String(row[0]), x + 4, y + 7)
        doc.setTextColor(...emerald)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text(String(row[1]), x + 4, y + 16)
      })
      const cardRows = Math.ceil(rows.length / cols)
      cursorY = cursorY + cardRows * (cardH + gap) + 8
    }

    if (title !== 'Admin Summary' || rows.length > 0) {
      doc.setTextColor(...dark)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Detailed Records', 16, cursorY)
      cursorY += 6

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: cursorY,
        theme: 'grid',
        headStyles: {
          fillColor: emerald,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: {
          textColor: dark,
          fontSize: 8,
          cellPadding: 2.5
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        styles: {
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          overflow: 'linebreak'
        },
        margin: { left: 16, right: 16 }
      })
    }

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(...gray)
      doc.setFont('helvetica', 'normal')
      doc.text('Terrava Land Chain Admin System', 16, pageHeight - 10)
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 16, pageHeight - 10, { align: 'right' })
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.2)
      doc.line(16, pageHeight - 14, pageWidth - 16, pageHeight - 14)
    }

    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const exportDataset = (filenameBase, title, headers, rows) => {
    if (rows.length === 0) return false
    if (exportFormat === 'pdf') {
      exportAsPdf(title, headers, rows)
    } else {
      exportAsCsv(`${filenameBase}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
    }
    return true
  }

  const executeExport = () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const category = exportCategory

      const filteredUsers = users.filter((u) => !exportStartDate && !exportEndDate ? true : inDateRange(u.created_at))
      const filteredListings = listings.filter((l) => !exportStartDate && !exportEndDate ? true : inDateRange(l.created_at))
      const filteredTransactions = transactions.filter((t) => !exportStartDate && !exportEndDate ? true : inDateRange(t.created_at))
      const filteredChain = chain.filter((b) => !exportStartDate && !exportEndDate ? true : inDateRange(b.timestamp))

      let anyExported = false

      if (activeTab === 'overview' && category === 'all') {
        const summaryRows = [
          ['Total Users', users.length],
          ['Total Listings', listings.length],
          ['Verified Listings', listings.filter((l) => l.is_verified).length],
          ['Pending Verification', listings.filter((l) => !l.is_verified).length],
          ['Reserved / Pending Payment', listings.filter((l) => l.status === 'reserved').length],
          ['Sold', listings.filter((l) => l.status === 'sold').length],
          ['Total Transactions', transactions.length],
          ['Verified Transactions', transactions.filter((t) => t.status === 'verified').length],
          ['Pending Transactions', transactions.filter((t) => t.status === 'pending').length],
          ['Rejected Transactions', transactions.filter((t) => t.status === 'rejected').length],
          ['Blockchain Valid', valid ? 'Yes' : 'No'],
          ['Total Blocks', chain.length]
        ]
        exportDataset('admin-summary', 'Admin Summary', ['Metric', 'Value'], summaryRows)
        anyExported = true
        if (filteredUsers.length > 0) exportDataset('admin-users', 'Users', ['ID', 'Name', 'Email', 'Role', 'Branch', 'Phone', 'Joined'], filteredUsers.map((u) => [u.id, u.full_name, u.email, u.role, u.branch || '—', u.phone || '—', u.created_at ? new Date(u.created_at).toLocaleDateString() : '—']))
        if (filteredListings.length > 0) exportDataset('admin-lands', 'Land Listings', ['ID', 'Title', 'Status', 'Verified', 'Branch', 'Price', 'Area', 'Location', 'Seller'], filteredListings.map((l) => [l.id, l.title, l.status, l.is_verified ? 'Yes' : 'No', getBranch(l), formatPeso(l.price), l.area_sqm, l.location_text || '—', l.seller?.full_name || '—']))
        if (filteredTransactions.length > 0) exportDataset('admin-transactions', 'Transactions', ['ID', 'Reference', 'Property', 'Branch', 'Buyer', 'Seller', 'Amount', 'Method', 'Status', 'Date'], filteredTransactions.map((t) => [t.id, t.reference_number || `TXN-${t.id}`, t.listing?.title || '—', t.listing ? getBranch(t.listing) : (t.seller?.branch || '—'), t.buyer?.full_name || '—', t.seller?.full_name || '—', formatPeso(t.amount), t.payment_method || '—', t.status || 'pending', t.created_at ? new Date(t.created_at).toLocaleString() : '—']))
        if (filteredChain.length > 0) exportDataset('admin-blockchain', 'Blockchain', ['Index', 'Timestamp', 'Reference', 'Hash', 'Previous Hash'], filteredChain.map((b) => [b.index, b.timestamp, b.transaction?.reference_number || 'Genesis', b.hash, b.previousHash || '—']))
      } else if (activeTab === 'users' || (activeTab === 'overview' && category === 'users')) {
        anyExported = exportDataset('users-report', 'Users', ['ID', 'Name', 'Email', 'Role', 'Branch', 'Phone', 'Joined'], filteredUsers.map((u) => [u.id, u.full_name, u.email, u.role, u.branch || '—', u.phone || '—', u.created_at ? new Date(u.created_at).toLocaleDateString() : '—']))
      } else if (activeTab === 'lands' || (activeTab === 'overview' && category === 'land_listings')) {
        anyExported = exportDataset('land-inventory-report', 'Land Listings', ['ID', 'Title', 'Status', 'Verified', 'Branch', 'Price', 'Area', 'Location', 'Seller'], filteredListings.map((l) => [l.id, l.title, l.status, l.is_verified ? 'Yes' : 'No', getBranch(l), formatPeso(l.price), l.area_sqm, l.location_text || '—', l.seller?.full_name || '—']))
      } else if (activeTab === 'transactions' || (activeTab === 'overview' && category === 'payments')) {
        anyExported = exportDataset('transactions-report', 'Transactions', ['ID', 'Reference', 'Property', 'Branch', 'Buyer', 'Seller', 'Amount', 'Method', 'Status', 'Date'], filteredTransactions.map((t) => [t.id, t.reference_number || `TXN-${t.id}`, t.listing?.title || '—', t.listing ? getBranch(t.listing) : (t.seller?.branch || '—'), t.buyer?.full_name || '—', t.seller?.full_name || '—', formatPeso(t.amount), t.payment_method || '—', t.status || 'pending', t.created_at ? new Date(t.created_at).toLocaleString() : '—']))
      } else if (activeTab === 'blockchain') {
        anyExported = exportDataset('blockchain-report', 'Blockchain', ['Index', 'Timestamp', 'Reference', 'Hash', 'Previous Hash'], filteredChain.map((b) => [b.index, b.timestamp, b.transaction?.reference_number || 'Genesis', b.hash, b.previousHash || '—']))
      }

      if (!anyExported) {
        addToast('No records match the selected filters', 'error')
        return
      }

      addToast('Report exported successfully', 'success')
      setExportModalOpen(false)
    } catch (err) {
      console.error('Export failed:', err)
      addToast('Failed to export report', 'error')
    }
  }

  const handleUpdateSeller = (user) => {
    setEditProfileUser(user)
  }

  const handleProfileSaved = (updatedUser) => {
    setUsers((prev) => prev.map((u) => u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
  }

  const handleSaveRole = async () => {
    if (!roleEditUser) return
    try {
      await api.put(`/admin/users/${roleEditUser.id}/role`, { role: roleEditValue })
      setUsers((prev) => prev.map((u) => u.id === roleEditUser.id ? { ...u, role: roleEditValue } : u))
      addToast(`Role updated for ${roleEditUser.full_name}`, 'success')
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update role', 'error')
    } finally {
      setRoleEditUser(null)
    }
  }

  const handleAddLandSubmit = async (payload) => {
    setAddLandLoading(true)
    const data = new FormData()
    data.append('title', payload.title || '')
    data.append('description', payload.description || '')
    data.append('price', payload.total_contract_price || payload.price || '')
    data.append('area_sqm', payload.area_sqm || '')
    data.append('location_text', payload.location_text || '')
    data.append('branch', payload.branch || '')
    if (payload.polygon_geojson) {
      data.append('polygon_geojson', JSON.stringify(payload.polygon_geojson))
    }
    const extraData = {
      zoning_classification: payload.zoning_classification,
      land_title_status: payload.land_title_status,
      total_contract_price: payload.total_contract_price,
      reservation_fee: payload.reservation_fee,
      minimum_down_payment_pct: payload.minimum_down_payment_pct,
      cash_term_enabled: payload.cash_term_enabled,
      cash_term_discount_pct: payload.cash_term_discount_pct,
      in_house_financing_enabled: payload.in_house_financing_enabled,
      in_house_max_term_years: payload.in_house_max_term_years,
      in_house_interest_rate_pct: payload.in_house_interest_rate_pct,
      bank_government_loan_enabled: payload.bank_government_loan_enabled,
      terrain_topography: payload.terrain_topography,
      lot_configuration: payload.lot_configuration,
      utilities: payload.utilities,
      lot_block_number: payload.lot_block_number
    }
    data.append('extra_data', JSON.stringify(extraData))
    if (payload.photos && payload.photos.length > 0) {
      payload.photos.forEach((file) => data.append('photos', file))
    }
    try {
      await api.post('/listings', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      addToast('Land listing added successfully', 'success')
      setAddLandOpen(false)
      await fetchListings()
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to add land listing', 'error')
    } finally {
      setAddLandLoading(false)
    }
  }

  const handleVerifyListing = async (id) => {
    try {
      const form = new FormData()
      form.append('is_verified', 'true')
      await api.put(`/listings/${id}`, form)
      setListings(listings.map((l) => l.id === id ? { ...l, is_verified: true } : l))
      addToast('Listing verified successfully', 'success')
    } catch (err) {
      addToast(err.response?.data?.error || 'Verification failed', 'error')
    }
  }

  const handleLandArchiveAction = async () => {
    if (!landActionTarget) return
    setLandActionLoading(true)
    try {
      const isArchiving = !landActionTarget.archived
      await api.put(`/admin/listings/${landActionTarget.id}/${isArchiving ? 'archive' : 'restore'}`)
      setListings((prev) => prev.filter((l) => l.id !== landActionTarget.id))
      addToast(isArchiving ? 'Listing archived successfully' : 'Listing restored successfully', 'success')
      setLandActionTarget(null)
    } catch (err) {
      addToast(err.response?.data?.error || 'Action failed', 'error')
    } finally {
      setLandActionLoading(false)
    }
  }

  const handleSaveListing = async (form) => {
    if (!selectedLand) return
    try {
      const fd = new FormData()
      // Core fields expected by the backend listing controller
      fd.append('title', form.title || '')
      fd.append('description', form.description || '')
      fd.append('price', form.total_contract_price || selectedLand.price || '')
      fd.append('area_sqm', form.total_area_sqm || selectedLand.area_sqm || '')
      fd.append('location_text', selectedLand.location_text || '')
      fd.append('status', selectedLand.status || 'available')

      // Rebuild polygon_geojson if boundary points were edited
      if (form.polygon_points && form.polygon_points.length >= 3) {
        fd.append('polygon_geojson', JSON.stringify({
          type: 'Polygon',
          coordinates: [[...form.polygon_points, form.polygon_points[0]].map(([lat, lng]) => [Number(lng), Number(lat)])]
        }))
      } else if (selectedLand.polygon_geojson) {
        fd.append('polygon_geojson', JSON.stringify(selectedLand.polygon_geojson))
      }

      // Extra data used by the backend for remaining fields
      const extraData = {
        total_contract_price: form.total_contract_price,
        reservation_fee: form.reservation_fee,
        minimum_down_payment_pct: form.minimum_down_payment_pct,
        cash_term_enabled: form.cash_term_enabled,
        cash_term_discount_pct: form.cash_term_discount_pct,
        in_house_financing_enabled: form.in_house_financing_enabled,
        in_house_max_term_years: form.in_house_max_term_years,
        in_house_interest_rate_pct: form.in_house_interest_rate_pct,
        bank_government_loan_enabled: form.bank_government_loan_enabled,
        terrain_topography: form.terrain_topography,
        lot_block_number: form.lot_block_number,
        zoning_classification: form.zoning_classification,
        land_title_status: form.land_title_status,
        utilities: form.utilities
      }
      fd.append('extra_data', JSON.stringify(extraData))
      if (form.removedExistingPhotos?.length > 0) {
        fd.append('removed_existing_photos', JSON.stringify(form.removedExistingPhotos))
      }
      if (form.photos && form.photos.length > 0) {
        form.photos.forEach((file) => fd.append('photos', file))
      }

      await api.put(`/listings/${selectedLand.id}`, fd)
      addToast('Listing updated successfully', 'success')
      setSelectedLand(null)
      await fetchListings()
    } catch (err) {
      addToast(err.response?.data?.error || 'Update failed', 'error')
    }
  }

  const roleBadge = (role) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-700',
      seller: 'bg-emerald-100 text-emerald-700',
      buyer: 'bg-blue-100 text-blue-700'
    }
    return <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${styles[role] || 'bg-gray-100'}`}>{role}</span>
  }

  const branchBadge = (branch) => (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
      <MapPin className="w-3 h-3" /> {branch || 'Unassigned'}
    </span>
  )

  const renderOverview = () => {
    const pendingListings = listings.filter((l) => !l.is_verified)
    const verifiedCount = transactions.filter((t) => t.status === 'verified').length
    const pendingCount = transactions.filter((t) => t.status === 'pending').length
    const rejectedCount = transactions.filter((t) => t.status === 'rejected').length
    const verifiedAmount = transactions.filter((t) => t.status === 'verified').reduce((sum, t) => sum + Number(t.amount), 0)
    const pendingAmount = transactions.filter((t) => t.status === 'pending').reduce((sum, t) => sum + Number(t.amount), 0)
    const rejectedAmount = transactions.filter((t) => t.status === 'rejected').reduce((sum, t) => sum + Number(t.amount), 0)
    const totalTxnCount = verifiedCount + pendingCount + rejectedCount

    const branchColors = {
      'Main Tagum': { color: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
      'Panabo': { color: '#0ea5e9', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700' },
      'Sto. Tomas': { color: '#8b5cf6', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
      'Davao City': { color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
      'Mati City': { color: '#ec4899', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
      'Digos City': { color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' }
    }
    const getBranchStyle = (branch) => branchColors[branch] || branchColors['Main Tagum']

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Hero header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">Overview Analytics</h1>
              <p className="text-emerald-100 text-sm mt-0.5">Real-time system performance and records</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setLoading(true)
                Promise.all([
                  api.get('/admin/dashboard').then((res) => setStats(res.data)),
                  api.get(`/admin/users?archived=${userArchiveFilter === 'archived' ? 'true' : 'false'}`).then((res) => setUsers(res.data)),
                  api.get('/blockchain/validate').then((res) => setValid(res.data.valid)),
                  api.get('/blockchain/chain').then((res) => setChain(res.data)),
                  api.get('/blockchain/contract').then((res) => setContract(res.data)),
                  fetchListings(),
                  api.get('/transactions').then((res) => setTransactions(res.data)),
                  api.get('/installments').then((res) => setInstallments(res.data))
                ]).catch(() => addToast('Failed to refresh dashboard data', 'error')).finally(() => setLoading(false))
              }}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition text-white"
            >
              <Activity className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-bold bg-white text-emerald-800 hover:bg-emerald-50 transition shadow-sm"
            >
              <FileText className="w-4 h-4" /> Export Report
            </button>
            <div className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-bold ${valid ? 'bg-emerald-400/20 text-emerald-50 border border-emerald-400/30' : 'bg-red-400/20 text-red-50 border border-red-400/30'}`}>
              <ShieldCheck className="w-4 h-4" /> {valid ? 'Blockchain Valid' : 'Chain Invalid'}
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: PesoIcon, label: 'Total Sales Value', value: formatPeso(stats?.totalSales), color: 'bg-emerald-100 text-emerald-700', sub: `${stats?.transactions || 0} verified transactions`, trend: 'up' },
            { icon: ShieldCheck, label: 'Safe Blockchain Blocks', value: chain.length, color: 'bg-emerald-100 text-emerald-700', sub: valid ? 'Chain verified' : 'Validation failed', trend: 'up' },
            { icon: LayoutList, label: 'Available Lots', value: listings.filter((l) => l.status === 'available').length, color: 'bg-emerald-100 text-emerald-700', sub: `${listings.filter((l) => l.status === 'sold').length} sold`, trend: 'up' },
            { icon: Users, label: 'Active Users', value: stats?.users || 0, color: 'bg-emerald-100 text-emerald-700', sub: `${users.filter((u) => u.role === 'buyer').length} buyers, ${users.filter((u) => u.role === 'seller').length} sellers`, trend: 'up' }
          ].map(({ icon: Icon, label, value, color, sub }) => (
            <div key={label} className="group bg-white rounded-2xl shadow-card border border-gray-100 p-5 hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <TrendingUp className="w-4 h-4 text-gray-300 group-hover:text-emerald-400 transition" />
              </div>
              <p className="text-xs text-gray-500 font-medium mt-4">{label}</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Quick action tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {[
            { label: 'Pending Verifications', value: stats?.pendingListings || 0, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', hover: 'hover:bg-amber-100', onClick: () => { setLandStatusFilter('unverified'); setActiveTab('lands') } },
            { label: 'Verified Listings', value: stats?.verifiedListings || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', hover: 'hover:bg-emerald-100', onClick: () => { setLandStatusFilter('available'); setActiveTab('lands') } },
            { label: 'Reserved / Pending Payment', value: listings.filter((l) => l.status === 'reserved').length, icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', hover: 'hover:bg-orange-100', onClick: () => { setLandStatusFilter('reserved'); setActiveTab('lands') } },
            { label: 'Total Sellers', value: users.filter((u) => u.role === 'seller').length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', hover: 'hover:bg-blue-100', onClick: () => { setUserFilter('seller'); setActiveTab('users') } },
            { label: 'Recent Transactions', value: transactions.length, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', hover: 'hover:bg-purple-100', onClick: () => selectTab('blockchain') },
            { label: 'Delinquent Accounts', value: installments.filter((a) => a.status === 'delinquent').length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', hover: 'hover:bg-red-100', onClick: () => { setInstallmentFilter('delinquent'); setActiveTab('installments') } },
            { label: 'Defaulted Accounts', value: installments.filter((a) => a.status === 'defaulted').length, icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', hover: 'hover:bg-gray-100', onClick: () => { setInstallmentFilter('defaulted'); setActiveTab('installments') } }
          ].map(({ label, value, icon: Icon, color, bg, border, hover, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className={`text-left rounded-2xl p-4 border ${bg} ${border} ${hover} transition hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">{label}</span>
                <div className={`p-1.5 rounded-lg bg-white/80 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-xl font-extrabold ${color}`}>{value}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-xl"><Trophy className="w-5 h-5 text-emerald-700" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Branch Leaderboard</h2>
                  <p className="text-xs text-gray-500">See which branch leads in sales, listings, and transactions</p>
                </div>
              </div>
            </div>
            {branchChart.every((b) => b.sales === 0) ? (
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-8">
                <EmptyState title="No branch sales yet" message="Branch sales will appear once transactions are recorded." />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Total Branch Sales</p>
                    <p className="text-xl font-extrabold text-emerald-800 mt-1">{formatPeso(totalBranchSales)}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Top Branch</p>
                    <p className="text-lg font-extrabold text-amber-800 mt-1 truncate">{topBranch?.branch || '—'}</p>
                    <p className="text-xs text-amber-700 font-semibold">{formatPeso(topBranch?.sales || 0)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Total Transactions</p>
                    <p className="text-xl font-extrabold text-blue-800 mt-1">{totalBranchTransactions}</p>
                  </div>
                </div>

                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => formatPeso(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="sales" fill="url(#salesGradient)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rankedBranches.map((b, i) => {
                    const isTop = i === 0
                    return (
                      <div key={b.branch} className={`rounded-xl border p-4 flex items-center gap-3 transition ${isTop ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${isTop ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {isTop ? <Trophy className="w-4 h-4" /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{b.branch}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                            <span className="font-semibold text-emerald-600">{formatPeso(b.sales)}</span>
                            <span>{b.transactions} txns</span>
                            <span>{b.sold} sold</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-xl"><List className="w-5 h-5 text-purple-700" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Payment Milestones</h2>
                  <p className="text-xs text-gray-500">Transaction status breakdown with value</p>
                </div>
              </div>
            </div>
            {milestoneData.length === 0 ? (
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-8">
                <EmptyState title="No transaction data" message="Payment milestones will appear once payments are recorded." />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-emerald-100 rounded-lg"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /></div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Verified</p>
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-800">{verifiedCount}</p>
                    <p className="text-xs text-emerald-700 mt-1">{formatPeso(verifiedAmount)}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-amber-100 rounded-lg"><Clock className="w-3.5 h-3.5 text-amber-700" /></div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Pending</p>
                    </div>
                    <p className="text-2xl font-extrabold text-amber-800">{pendingCount}</p>
                    <p className="text-xs text-amber-700 mt-1">{formatPeso(pendingAmount)}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-red-100 rounded-lg"><XCircle className="w-3.5 h-3.5 text-red-700" /></div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-red-600">Rejected</p>
                    </div>
                    <p className="text-2xl font-extrabold text-red-800">{rejectedCount}</p>
                    <p className="text-xs text-red-700 mt-1">{formatPeso(rejectedAmount)}</p>
                  </div>
                </div>

                <div className="h-56 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={milestoneData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        innerRadius={60}
                        paddingAngle={4}
                        stroke="none"
                      >
                        {milestoneData.map((entry, index) => {
                          const statusColors = { Verified: '#10b981', Pending: '#f59e0b', Rejected: '#ef4444' }
                          return <Cell key={`cell-${index}`} fill={statusColors[entry.name] || COLORS[index % COLORS.length]} />
                        })}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                      <Legend iconType="circle" verticalAlign="bottom" height={24} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Total</p>
                    <p className="text-2xl font-extrabold text-gray-900">{totalTxnCount}</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending verifications */}
          <section className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-xl"><AlertCircle className="w-5 h-5 text-amber-700" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Pending Listing Verifications</h2>
                  <p className="text-xs text-gray-500">Seller listings waiting for review</p>
                </div>
              </div>
              {pendingListings.length > 0 && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700">{pendingListings.length} pending</span>
              )}
            </div>
            {pendingListings.length === 0 ? (
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-8">
                <EmptyState title="No pending listings" message="All seller listings have been reviewed." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-emerald-50 border-b border-emerald-100">
                    <tr>
                      <th className="px-4 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Property</th>
                      <th className="px-4 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Branch</th>
                      <th className="px-4 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Seller</th>
                      <th className="px-4 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Price</th>
                      <th className="px-4 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pendingListings.slice(0, 5).map((l) => (
                      <tr key={l.id} className="hover:bg-emerald-50/30 transition">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="font-semibold text-gray-900">{l.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">{branchBadge(getBranch(l))}</td>
                        <td className="px-4 py-3.5 text-gray-600">{l.seller?.full_name || '—'}</td>
                        <td className="px-4 py-3.5 font-bold text-emerald-600">{formatPeso(l.price)}</td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => handleVerifyListing(l.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                          >
                            <CheckCircle className="w-3 h-3" /> Verify
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent transactions */}
          <section className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-xl"><Activity className="w-5 h-5 text-emerald-700" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
                  <p className="text-xs text-gray-500">Latest payment activity</p>
                </div>
              </div>
            </div>
            {transactions.length === 0 ? (
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-8">
                <EmptyState title="No transactions" message="Payments will appear here once recorded." />
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {transactions.slice(0, 8).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTxn(t)}
                    className="w-full text-left border border-gray-100 rounded-xl p-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-sm font-bold text-gray-900 truncate">{t.listing?.title || 'Land Payment'}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
                        t.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                        t.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{t.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 pl-10">{t.buyer?.full_name || 'Buyer'} → {t.seller?.full_name || 'Seller'}</p>
                    <p className="text-sm font-extrabold text-emerald-700 mt-1 pl-10">{formatPeso(t.amount)}</p>
                    <p className="text-[11px] text-gray-400 mt-1 pl-10 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(t.created_at || t.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Branch performance cards */}
        <section className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-emerald-100 p-2 rounded-xl"><TrendingUp className="w-5 h-5 text-emerald-700" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Branch Performance Summary</h2>
              <p className="text-xs text-gray-500">Listings, sales, and revenue per branch</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b) => {
              const style = getBranchStyle(b.branch)
              return (
                <div key={b.branch} className={`border-l-4 ${style.border.replace('border', 'border-l')} rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition group`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-lg ${style.bg} flex items-center justify-center`}>
                        <Building2 className={`w-4 h-4 ${style.text}`} />
                      </div>
                      <h3 className="font-bold text-gray-900">{b.branch}</h3>
                    </div>
                    <TrendingUp className={`w-4 h-4 ${style.text} opacity-0 group-hover:opacity-100 transition`} />
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div><span className="text-gray-500 text-xs">Listings</span><p className="font-bold text-gray-900">{b.listings}</p></div>
                    <div><span className="text-gray-500 text-xs">Available</span><p className="font-bold text-emerald-600">{b.available}</p></div>
                    <div><span className="text-gray-500 text-xs">Sold</span><p className="font-bold text-blue-600">{b.sold}</p></div>
                    <div><span className="text-gray-500 text-xs">Revenue</span><p className="font-bold text-emerald-700">{formatPeso(b.sales)}</p></div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-emerald-100 p-2 rounded-xl"><CheckCircle2 className="w-5 h-5 text-emerald-700" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Blockchain Integrity</h2>
              <p className="text-xs text-gray-500">Ledger validation status</p>
            </div>
          </div>
          <div className={`rounded-xl p-6 flex items-center gap-5 border ${valid ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${valid ? 'bg-emerald-600' : 'bg-red-600'}`}>
              {valid ? <Shield className="w-8 h-8 text-white" /> : <X className="w-8 h-8 text-white" />}
            </div>
            <div className="flex-1">
              <p className="text-xl font-bold text-gray-900">{valid ? 'Chain Verified & Immutable' : 'Chain Validation Failed'}</p>
              <p className="text-sm text-gray-500">{chain.length} block{chain.length === 1 ? '' : 's'} in the local ledger</p>
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-bold ${valid ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
              {valid ? 'Secure' : 'Action Required'}
            </div>
          </div>
        </section>
      </div>
    )
  }

  const renderUsers = () => {
    const buyerCount = users.filter((u) => u.role === 'buyer').length
    const sellerCount = users.filter((u) => u.role === 'seller').length
    const adminCount = users.filter((u) => u.role === 'admin').length

    const userAvatar = (u) => {
      const colors = {
        admin: 'bg-purple-100 text-purple-700 ring-purple-200',
        seller: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        buyer: 'bg-blue-100 text-blue-700 ring-blue-200'
      }
      return (
        <Avatar
          url={u.photo_url}
          name={u.full_name}
          sizeClass="w-10 h-10"
          textClass="text-xs"
          fallbackClass={colors[u.role] || 'bg-gray-100 text-gray-700 ring-gray-200'}
          className="ring-2"
        />
      )
    }

    const rolePill = (role) => {
      const styles = {
        admin: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', icon: Shield },
        seller: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: Store },
        buyer: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: User }
      }
      const s = styles[role] || styles.buyer
      const Icon = s.icon
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full border ${s.bg} ${s.text} ${s.border} capitalize`}>
          <Icon className="w-3.5 h-3.5" /> {role}
        </span>
      )
    }

    return (
      <div className="space-y-5 animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold">User Directory</h2>
              <p className="text-emerald-100 text-sm mt-0.5">Manage buyers, sellers, and administrators</p>
            </div>
          </div>
          <button
            onClick={() => handleExport()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-emerald-800 hover:bg-emerald-50 transition shadow-sm"
          >
            <FileText className="w-4 h-4" /> Export
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: users.length, icon: Users, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Buyers', value: buyerCount, icon: User, color: 'bg-blue-100 text-blue-700' },
            { label: 'Sellers', value: sellerCount, icon: Store, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Admins', value: adminCount, icon: Shield, color: 'bg-purple-100 text-purple-700' }
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
              </select>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={userBranchFilter}
                onChange={(e) => setUserBranchFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer min-w-[170px]"
              >
                <option value="all">All Branches</option>
                {['Main Tagum', 'Panabo', 'Sto. Tomas', 'Davao City', 'Mati City', 'Digos City'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="inline-flex p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setUserArchiveFilter('active')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition ${userArchiveFilter === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Active
              </button>
              <button
                onClick={() => setUserArchiveFilter('archived')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition ${userArchiveFilter === 'archived' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Archives
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-50 border-b border-emerald-100">
                <tr>
                  <th className="px-5 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">User</th>
                  <th className="px-5 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Branch</th>
                  <th className="px-5 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Contact</th>
                  <th className="px-5 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Joined</th>
                  <th className="px-5 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400"><EmptyState title="No users found" message="Try adjusting your search or filters." /></td></tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-emerald-50/30 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {userAvatar(u)}
                          <div>
                            <p className="font-bold text-gray-900">{u.full_name || '—'}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">{rolePill(u.role)}</td>
                      <td className="px-5 py-4">{u.role === 'seller' ? branchBadge(u.branch) : <span className="text-gray-400">—</span>}</td>
                      <td className="px-5 py-4 text-gray-600">{u.phone || '—'}</td>
                      <td className="px-5 py-4 text-gray-500 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          {(u.role === 'seller' || u.role === 'buyer') && (
                            <button
                              onClick={() => handleUpdateSeller(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                            </button>
                          )}
                          {u.role === 'buyer' && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${userArchiveFilter === 'active' ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}
                            >
                              {userArchiveFilter === 'active' ? <><Archive className="w-3.5 h-3.5" /> Archive</> : <><RotateCcw className="w-3.5 h-3.5" /> Restore</>}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredUsers.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500">Showing {filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'}</p>
              <p className="text-xs text-gray-400">Click a row to view full profile details</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderTransactions = () => {
    const query = txnSearch.trim().toLowerCase()
    const filteredTxn = transactions.filter((t) => {
      const matchesSearch = !query || [
        t.reference_number,
        `TXN-${t.id}`,
        t.listing?.title,
        t.listing?.location_text,
        t.buyer?.full_name,
        t.buyer?.email,
        t.seller?.full_name,
        t.seller?.email,
        t.payment_method,
        String(t.amount)
      ].some((v) => String(v ?? '').toLowerCase().includes(query))
      const status = t.status || 'pending'
      const matchesStatus = txnStatusFilter === 'all' || status === txnStatusFilter
      const branch = t.listing ? getBranch(t.listing) : (t.seller?.branch || 'Main Tagum')
      const matchesBranch = txnBranchFilter === 'all' || branch === txnBranchFilter
      return matchesSearch && matchesStatus && matchesBranch
    })

    const totalAmount = filteredTxn.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const verifiedCount = filteredTxn.filter((t) => t.status === 'verified').length
    const pendingCount = filteredTxn.filter((t) => t.status === 'pending').length

    const sortedTxn = [...filteredTxn].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    const totalPages = Math.ceil(sortedTxn.length / txnPerPage) || 1
    const start = (txnPage - 1) * txnPerPage
    const paginatedTxn = sortedTxn.slice(start, start + txnPerPage)

    return (
      <div className="space-y-5 animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl"><CreditCard className="w-7 h-7 text-white" /></div>
            <div>
              <h2 className="text-2xl font-extrabold">Transactions</h2>
              <p className="text-emerald-100 text-sm mt-0.5">Full payment transparency across all branches</p>
            </div>
          </div>
          <button
            onClick={() => handleExport()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-emerald-800 hover:bg-emerald-50 transition shadow-sm"
          >
            <FileText className="w-4 h-4" /> Export
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Transactions', value: filteredTxn.length, icon: List, color: 'bg-emerald-100 text-emerald-700', accent: 'border-t-emerald-500' },
            { label: 'Total Amount', value: formatPeso(totalAmount), icon: PesoIcon, color: 'bg-blue-100 text-blue-700', accent: 'border-t-blue-500' },
            { label: 'Verified', value: verifiedCount, icon: CheckCircle2, color: 'bg-green-100 text-green-700', accent: 'border-t-green-500' },
            { label: 'Pending', value: pendingCount, icon: AlertCircle, color: 'bg-amber-100 text-amber-700', accent: 'border-t-amber-500' }
          ].map(({ label, value, icon: Icon, color, accent }) => (
            <div key={label} className={`bg-white/95 rounded-2xl shadow-md border border-gray-100 border-t-4 p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${accent}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reference, buyer, seller, property or amount..."
              value={txnSearch}
              onChange={(e) => { setTxnSearch(e.target.value); setTxnPage(1) }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={txnStatusFilter}
                onChange={(e) => { setTxnStatusFilter(e.target.value); setTxnPage(1) }}
                className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer min-w-[160px]"
              >
                <option value="all">All Statuses</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={txnBranchFilter}
                onChange={(e) => { setTxnBranchFilter(e.target.value); setTxnPage(1) }}
                className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer min-w-[170px]"
              >
                <option value="all">All Branches</option>
                {['Main Tagum', 'Panabo', 'Sto. Tomas', 'Davao City', 'Mati City', 'Digos City'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-50 border-b border-emerald-100">
                <tr>
                  <th className="px-5 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Reference</th>
                  <th className="px-5 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Property</th>
                  <th className="px-5 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Buyer</th>
                  <th className="px-5 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Seller</th>
                  <th className="px-5 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedTxn.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400"><EmptyState title="No transactions found" message="Try adjusting your search or filters." /></td></tr>
                ) : (
                  paginatedTxn.map((t) => {
                    const branch = t.listing ? getBranch(t.listing) : (t.seller?.branch || 'Main Tagum')
                    return (
                      <tr key={t.id} className="hover:bg-emerald-50/30 transition">
                        <td className="px-5 py-4 font-bold text-gray-900">{t.reference_number || `TXN-${t.id}`}</td>
                        <td className="px-5 py-4">
                          <div className="max-w-[10rem]">
                            <p className="font-semibold text-gray-900 truncate" title={t.listing?.title}>{t.listing?.title || '—'}</p>
                            <p className="text-xs text-gray-500 truncate" title={t.listing?.location_text}>{t.listing?.location_text || branch}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{t.buyer?.full_name || '—'}</p>
                            <p className="text-xs text-gray-500">{t.buyer?.email || ''}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{t.seller?.full_name || '—'}</p>
                            <p className="text-xs text-gray-500">{t.seller?.email || ''}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(t.created_at || t.createdAt)}</td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setSelectedTxn(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Showing {start + 1}-{Math.min(start + txnPerPage, sortedTxn.length)} of {sortedTxn.length} transactions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTxnPage((p) => Math.max(p - 1, 1))}
                  disabled={txnPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="text-xs font-medium text-gray-600 px-2">Page {txnPage} of {totalPages}</span>
                <button
                  onClick={() => setTxnPage((p) => Math.min(p + 1, totalPages))}
                  disabled={txnPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderBlockchain = () => {
    if (!ledgerUnlocked) {
      return (
        <div className="max-w-md mx-auto py-12">
          <form onSubmit={unlockLedger} className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Lock className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Unlock Blockchain Ledger</h1>
              <p className="text-sm text-gray-500 mt-1">Enter your admin password to view protected payment audit records.</p>
            </div>
            <div>
              <label htmlFor="ledger-password" className="block text-sm font-semibold text-gray-700 mb-1.5">Admin Password</label>
              <div className="relative">
                <input id="ledger-password" type={showLedgerPassword ? 'text' : 'password'} value={ledgerPassword} onChange={(event) => setLedgerPassword(event.target.value)} autoComplete="current-password" required className="w-full rounded-xl border border-gray-300 px-3 py-2.5 pr-11 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                <button type="button" onClick={() => setShowLedgerPassword((visible) => !visible)} aria-label={showLedgerPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-emerald-700">
                  {showLedgerPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {ledgerError && <p className="text-sm text-red-600">{ledgerError}</p>}
            <button type="submit" disabled={unlockingLedger} className="w-full rounded-xl bg-emerald-700 text-white py-2.5 font-bold hover:bg-emerald-800 disabled:opacity-60 transition">{unlockingLedger ? 'Verifying...' : 'Unlock Ledger'}</button>
          </form>
        </div>
      )
    }

    const query = blockchainSearch.trim().toLowerCase()
    const filteredChain = chain.filter((block) => {
      if (!query) return true

      const txn = block.transaction
      const searchableValues = [
        block.index,
        block.timestamp,
        block.hash,
        block.previous_hash,
        txn?.id,
        txn?.reference_number,
        txn?.eth_tx_hash,
        txn?.amount,
        txn?.payment_method,
        txn?.listing?.title,
        txn?.listing?.location_text,
        txn?.buyer?.full_name,
        txn?.buyer?.email,
        txn?.seller?.full_name,
        txn?.seller?.email
      ]

      return searchableValues.some((value) => String(value ?? '').toLowerCase().includes(query))
    })
    const sortedChain = [...filteredChain].sort((a, b) => b.index - a.index)
    const totalPages = Math.ceil(sortedChain.length / blocksPerPage) || 1
    const start = (blockchainPage - 1) * blocksPerPage
    const paginatedBlocks = sortedChain.slice(start, start + blocksPerPage)

    return (
      <div className="space-y-5 animate-fadeIn">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 flex items-center gap-3 border bg-emerald-900/5 border-emerald-900/10">
            <div className="w-10 h-10 rounded-full bg-emerald-900 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">Immutable Blockchain Audit Active</p>
              <p className="text-xs text-emerald-700">Cryptographically sealed records</p>
            </div>
          </div>
          <div className="rounded-xl p-4 border bg-white border-gray-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-emerald-700" /></div>
            <div>
              <p className="text-xs text-gray-500">Chain Status</p>
              <p className={`text-lg font-extrabold ${valid ? 'text-emerald-600' : 'text-red-600'}`}>{valid ? 'Verified' : 'Invalid'}</p>
            </div>
          </div>
          <div className="rounded-xl p-4 border bg-white border-gray-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><Link2 className="w-5 h-5 text-emerald-700" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Blocks</p>
              <p className="text-lg font-extrabold text-gray-900">{chain.length}</p>
            </div>
          </div>
          {contract?.explorerUrl && (
            <a
              href={contract.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl p-4 border bg-white border-gray-200 flex items-center gap-3 hover:bg-emerald-50 transition"
            >
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center"><ExternalLink className="w-5 h-5 text-brand-700" /></div>
              <div>
                <p className="text-xs text-gray-500">Ethereum Contract</p>
                <p className="text-sm font-extrabold text-brand-700 truncate max-w-[10rem]">{contract.address.slice(0, 10)}…{contract.address.slice(-6)}</p>
              </div>
            </a>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 w-full sm:max-w-2xl">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="search"
                placeholder="Search block, hash, reference, property, or user..."
                value={blockchainSearch}
                onChange={(e) => setBlockchainSearch(e.target.value)}
                className="outline-none text-sm bg-transparent w-full"
              />
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-500 whitespace-nowrap">
                {filteredChain.length} of {chain.length} block{chain.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => handleExport()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
              >
                <FileText className="w-4 h-4" /> Export
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-900 text-white">
                <tr>
                  <th className="px-5 py-3 font-bold">Block ID</th>
                  <th className="px-5 py-3 font-bold">Timestamp</th>
                  <th className="px-5 py-3 font-bold">Transaction Reference</th>
                  <th className="px-5 py-3 font-bold">Cryptographic Hash</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedBlocks.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400"><EmptyState title={query ? "No matching blocks found" : "No blocks in the chain"} /></td></tr>
                ) : (
                  paginatedBlocks.map((block) => {
                    const txn = block.transaction
                    return (
                      <tr key={block.index} className="hover:bg-gray-50 transition font-mono">
                        <td className="px-5 py-3 font-bold text-emerald-700">#{block.index}</td>
                        <td className="px-5 py-3 text-gray-600">{formatDate(block.timestamp)}</td>
                        <td className="px-5 py-3 text-gray-800">
                          {txn ? (txn.reference_number || `TXN-${txn.id}`) : 'Genesis / System'}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 truncate max-w-xs">{block.hash}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {txn?.eth_tx_hash ? (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${txn.eth_tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition"
                            >
                              <ExternalLink className="w-3 h-3" /> Etherscan
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Showing {start + 1}-{Math.min(start + blocksPerPage, sortedChain.length)} of {sortedChain.length} matching blocks
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBlockchainPage((p) => Math.max(p - 1, 1))}
                  disabled={blockchainPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="text-xs font-medium text-gray-600 px-2">Page {blockchainPage} of {totalPages}</span>
                <button
                  onClick={() => setBlockchainPage((p) => Math.min(p + 1, totalPages))}
                  disabled={blockchainPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderMapExplorer = ({ data, title, subtitle, branchFilter, setBranchFilter }) => {
    const selected = mapSelected

    const visibleData = branchFilter && branchFilter !== 'all'
      ? data.filter((l) => getBranch(l) === branchFilter && l.status === 'available')
      : data

    const grouped = visibleData.reduce((acc, l) => {
      const b = getBranch(l)
      if (!acc[b]) acc[b] = []
      acc[b].push(l)
      return acc
    }, {})

    const handleSelect = (l) => {
      setMapSelected(l)
      setMapFlyTo(l)
      setMapExpandedBranch(getBranch(l))
      setMapPanelOpen(true)
    }

    const branchStyles = {
      'Main Tagum': { bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100', text: 'text-emerald-800', badge: 'bg-emerald-200 text-emerald-800', border: 'border-emerald-100' },
      'Panabo': { bg: 'bg-sky-50', hover: 'hover:bg-sky-100', text: 'text-sky-800', badge: 'bg-sky-200 text-sky-800', border: 'border-sky-100' },
      'Sto. Tomas': { bg: 'bg-violet-50', hover: 'hover:bg-violet-100', text: 'text-violet-800', badge: 'bg-violet-200 text-violet-800', border: 'border-violet-100' },
      'Davao City': { bg: 'bg-amber-50', hover: 'hover:bg-amber-100', text: 'text-amber-800', badge: 'bg-amber-200 text-amber-800', border: 'border-amber-100' },
      'Mati City': { bg: 'bg-pink-50', hover: 'hover:bg-pink-100', text: 'text-pink-800', badge: 'bg-pink-200 text-pink-800', border: 'border-pink-100' },
      'Digos City': { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', text: 'text-indigo-800', badge: 'bg-indigo-200 text-indigo-800', border: 'border-indigo-100' }
    }
    const getStyle = (branch) => branchStyles[branch] || branchStyles['Main Tagum']

    return (
      <div className="space-y-5 animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold">{title}</h2>
              <p className="text-emerald-100 text-sm mt-0.5">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {setBranchFilter && (
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={branchFilter}
                  onChange={(e) => {
                    const b = e.target.value
                    setBranchFilter(b)
                    if (b !== 'all') setMapFlyTo({ branch: b })
                  }}
                  className="pl-9 pr-8 py-2.5 rounded-xl text-sm bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 appearance-none cursor-pointer min-w-[170px]"
                >
                  <option value="all" className="text-gray-900">All Branches</option>
                  {['Main Tagum', 'Panabo', 'Sto. Tomas', 'Davao City', 'Mati City', 'Digos City'].map((b) => (
                    <option key={b} value={b} className="text-gray-900">{b}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 pointer-events-none" />
              </div>
            )}
            <button
              onClick={() => setAddLandOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-emerald-800 hover:bg-emerald-50 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Land
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-0 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-card h-[28rem] lg:h-[32rem]">
          {/* Listing panel */}
          <div className={`flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 ${mapPanelOpen ? 'w-full lg:w-80 h-48 lg:h-auto' : 'w-0 h-0 lg:h-auto overflow-hidden'}`}>
            <div className="p-4 bg-gradient-to-r from-emerald-700 to-emerald-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Listings</h3>
                <p className="text-xs text-emerald-100">{visibleData.length} properties</p>
              </div>
              <button onClick={() => setMapPanelOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition text-white/80 lg:hidden">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {visibleData.length === 0 ? (
                <EmptyState title="No listings" message="No land listings match the current filters." />
              ) : (
                Object.entries(grouped).map(([branch, items]) => {
                  const style = getStyle(branch)
                  const isExpanded = mapExpandedBranch === branch
                  return (
                    <div key={branch} className={`rounded-xl border ${style.border} overflow-hidden bg-white shadow-sm`}>
                      <button
                        onClick={() => setMapExpandedBranch(isExpanded ? null : branch)}
                        className={`w-full flex items-center justify-between px-4 py-3 ${style.bg} ${style.hover} transition text-sm font-bold ${style.text}`}
                      >
                        <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> {branch}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${style.badge} px-2.5 py-1 rounded-full`}>{items.length}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="p-2 space-y-2">
                          {items.map((l) => {
                            const active = selected?.id === l.id
                            return (
                              <button
                                key={l.id}
                                onClick={() => handleSelect(l)}
                                className={`w-full text-left rounded-xl overflow-hidden border transition group ${active ? 'border-emerald-600 ring-2 ring-emerald-600 shadow-md' : 'border-gray-100 hover:border-emerald-300 hover:shadow-sm'}`}
                              >
                                <div className="h-28 bg-gray-100 relative overflow-hidden">
                                  <MapView
                                    singleListing={l}
                                    height="100%"
                                    dragging={false}
                                    scrollWheelZoom={false}
                                    zoomControl={false}
                                    doubleClickZoom={false}
                                    showLayersControl={false}
                                    showAttribution={false}
                                  />
                                  <span className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm backdrop-blur-sm ${style.bg} ${style.text}`}>
                                    {getBranch(l)}
                                  </span>
                                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm backdrop-blur-sm ${l.is_verified ? 'bg-emerald-600/90 text-white' : 'bg-amber-500/90 text-white'}`}>
                                    {l.is_verified ? 'Verified' : 'Unverified'}
                                  </span>
                                </div>
                                <div className="p-3 space-y-1.5 bg-white">
                                  <h4 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition">{l.title}</h4>
                                  <p className="text-emerald-600 font-bold text-sm">{formatPeso(l.price)}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded-lg">{l.area_sqm} sqm</span>
                                    <span className="line-clamp-1 flex items-center gap-1">
                                      <MapPin className="w-3 h-3 flex-shrink-0 text-emerald-600" /> {l.location_text || getBranch(l)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-400">Seller: {l.seller?.full_name || '—'}</p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Toggle panel button */}
          {!mapPanelOpen && (
            <button
              onClick={() => setMapPanelOpen(true)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-emerald-600 text-white px-2 py-4 rounded-r-xl shadow-lg hover:bg-emerald-700 transition hidden lg:flex items-center gap-1"
              title="Show listings panel"
            >
              <LayoutList className="w-4 h-4" />
              <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            </button>
          )}

          {/* Map */}
          <div className="flex-1 relative min-h-0">
            <MapView listings={visibleData} height="100%" flyTo={mapFlyTo} onSelectListing={handleSelect} selectedListingId={mapSelected?.id} />
            {selected && (
              <div className="absolute bottom-3 left-3 right-3 md:left-4 md:right-auto md:w-[22rem] bg-white/95 backdrop-blur border border-gray-200/80 shadow-2xl rounded-2xl p-4 z-20 max-h-[70vh] overflow-y-auto animate-fadeIn">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-t-2xl" />
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize">
                        <Building2 className="w-3 h-3" /> {getBranch(selected)}
                      </span>
                      <h3 className="font-bold text-gray-900 text-sm leading-tight">{selected.title}</h3>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 line-clamp-1">
                      <MapPin className="w-3 h-3 flex-shrink-0 text-emerald-600" /> {selected.location_text || getBranch(selected)}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => setMapDetailsMinimized((v) => !v)}
                      className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition"
                      aria-label={mapDetailsMinimized ? 'Expand details' : 'Collapse details'}
                      title={mapDetailsMinimized ? 'Expand details' : 'Collapse details'}
                    >
                      {mapDetailsMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setMapSelected(null)} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {!mapDetailsMinimized && (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100 overflow-hidden">
                        <PesoIcon className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" />
                        <p className="text-[10px] text-gray-500">Price</p>
                        <p className="text-[10px] font-bold text-gray-900 truncate">{formatPeso(selected.price)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                        <Maximize className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" />
                        <p className="text-[10px] text-gray-500">Area</p>
                        <p className="text-xs font-bold text-gray-900">{Number(selected.area_sqm).toLocaleString()}m²</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                        <Tag className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" />
                        <p className="text-[10px] text-gray-500">Status</p>
                        <p className="text-xs font-bold text-gray-900 capitalize">{selected.status}</p>
                      </div>
                    </div>

                    {selected.description && (
                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{selected.description}</p>
                    )}

                    {selected.photos?.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Property Photos
                          </h4>
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            {selected.photos.length}
                          </span>
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-transparent">
                          {selected.photos.map((url, i) => (
                            <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-lg border border-gray-200 overflow-hidden">
                              <img src={url} alt={`Property ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {!selected.is_verified && (
                        <button
                          onClick={() => handleVerifyListing(selected.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                        >
                          <CheckCircle className="w-3 h-3" /> Verify
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/edit-listing/${selected.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => setLandActionTarget(selected)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          selected.archived
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {selected.archived ? <><RotateCcw className="w-3 h-3" /> Restore</> : <><Archive className="w-3 h-3" /> Archive</>}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderInstallments = () => {
    const query = installmentSearch.trim().toLowerCase()
    const filtered = installments.filter((a) => {
      const matchesFilter = installmentFilter === 'all' || a.status === installmentFilter
      const matchesSearch = !query || [
        a.listing?.title,
        a.listing?.location_text,
        a.buyer?.full_name,
        a.buyer?.email,
        a.seller?.full_name,
        a.seller?.branch
      ].some((v) => String(v ?? '').toLowerCase().includes(query))
      return matchesFilter && matchesSearch
    })

    const statusStyles = {
      active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      grace_period: 'bg-amber-50 text-amber-700 border-amber-100',
      overdue: 'bg-orange-50 text-orange-700 border-orange-100',
      delinquent: 'bg-red-50 text-red-700 border-red-100',
      defaulted: 'bg-gray-50 text-gray-700 border-gray-200',
      paid_off: 'bg-blue-50 text-blue-700 border-blue-100'
    }

    return (
      <div className="space-y-5 animate-fadeIn">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl"><Wallet className="w-7 h-7 text-white" /></div>
            <div>
              <h2 className="text-2xl font-extrabold">Installment Accounts</h2>
              <p className="text-slate-100 text-sm mt-0.5">Track buyer payment obligations and delinquencies</p>
            </div>
          </div>
          <button
            onClick={() => {
              setLoading(true)
              api.get('/installments').then((res) => setInstallments(res.data)).finally(() => setLoading(false))
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-slate-800 hover:bg-slate-50 transition shadow-sm"
          >
            <Activity className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search buyer, property, branch..."
              value={installmentSearch}
              onChange={(e) => setInstallmentSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={installmentFilter}
              onChange={(e) => setInstallmentFilter(e.target.value)}
              className="pl-3 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="grace_period">Grace Period</option>
              <option value="overdue">Overdue</option>
              <option value="delinquent">Delinquent</option>
              <option value="defaulted">Defaulted</option>
              <option value="paid_off">Paid Off</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase font-bold text-gray-500">
                <tr>
                  <th className="px-5 py-3">Property</th>
                  <th className="px-5 py-3">Buyer</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Monthly</th>
                  <th className="px-5 py-3">Term</th>
                  <th className="px-5 py-3">Next Due</th>
                  <th className="px-5 py-3">Balance</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-gray-500">
                      No installment accounts found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-5 py-4 font-semibold text-gray-900">{a.listing?.title || '—'}</td>
                      <td className="px-5 py-4 text-gray-600">{a.buyer?.full_name || '—'}</td>
                      <td className="px-5 py-4 text-gray-600">{a.seller?.branch || '—'}</td>
                      <td className="px-5 py-4 font-semibold text-gray-900">{formatPeso(a.monthly_payment_amount)}</td>
                      <td className="px-5 py-4 text-gray-600">{a.term_years || 0} yr(s)</td>
                      <td className="px-5 py-4 text-gray-600">{a.next_due_date ? new Date(a.next_due_date).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-4 font-semibold text-gray-900">{formatPeso(a.remaining_balance)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border capitalize ${statusStyles[a.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {a.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderLands = () => {
    const branchStyles = {
      'Main Tagum': { color: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
      'Panabo': { color: '#0ea5e9', bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-700' },
      'Sto. Tomas': { color: '#8b5cf6', bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-700' },
      'Davao City': { color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700' },
      'Mati City': { color: '#ec4899', bg: 'bg-pink-50', border: 'border-pink-100', text: 'text-pink-700' },
      'Digos City': { color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700' }
    }
    const getStyle = (branch) => branchStyles[branch] || branchStyles['Main Tagum']

    return (
      <div className="space-y-5 animate-fadeIn">
        {/* Controls bar */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setLandView('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${landView === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutList className="w-4 h-4" /> List View
            </button>
            <button
              onClick={() => setLandView('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${landView === 'map' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Map className="w-4 h-4" /> Map View
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={landStatusFilter}
                onChange={(e) => setLandStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer min-w-[170px]"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved / Pending Payment</option>
                <option value="sold">Sold</option>
                <option value="unverified">Pending Verification</option>
              </select>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={landBranchFilter}
                onChange={(e) => setLandBranchFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer min-w-[170px]"
              >
                <option value="all">All Branches</option>
                {['Main Tagum', 'Panabo', 'Sto. Tomas', 'Davao City', 'Mati City', 'Digos City'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Archive className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={landArchiveFilter}
                onChange={(e) => setLandArchiveFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer min-w-[170px]"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
              </select>
            </div>
            <button
              onClick={() => handleExport()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
            >
              <FileText className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Search bar below list/map view tabs — hidden in map view */}
        {landView !== 'map' && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search lands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>
        )}

        {landView === 'map' ? (
          renderMapExplorer({
            data: filteredListings,
            title: 'Land Inventory Map',
            subtitle: 'Explore all properties with interactive map and branch grouping'
          })
        ) : (
          <div className="space-y-5">
            <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden h-[28rem] lg:h-[32rem] shadow-card">
              <button
                onClick={() => setAddLandOpen(true)}
                className="absolute bottom-4 left-4 z-20 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-lg"
              >
                <Plus className="w-4 h-4" /> Add Land
              </button>
              <MapView
                listings={filteredListings}
                height="100%"
                fitBounds={true}
                scrollWheelZoom={false}
                containerClassName="h-full w-full"
                adminActions={{
                  onVerify: (l) => handleVerifyListing(l.id),
                  onEdit: (l) => navigate(`/edit-listing/${l.id}`),
                  onArchive: setLandActionTarget,
                }}
              />
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-xl"><LayoutList className="w-5 h-5 text-emerald-700" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Land Inventory</h3>
                    <p className="text-xs text-gray-500">{filteredListings.length} result{filteredListings.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
              </div>
              {filteredListings.length === 0 ? (
                <EmptyState title="No listings" message="No land listings match the selected filters." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 max-h-[52rem] overflow-y-auto pr-2">
                  {filteredListings.map((l) => {
                    const style = getStyle(getBranch(l))
                    return (
                      <div key={l.id} className={`w-full bg-white border ${style.border} rounded-2xl p-0 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition overflow-hidden group`} style={{ borderLeftWidth: 4, borderLeftColor: style.color }}>
                        <div className="h-36 bg-gray-100 relative overflow-hidden">
                          {l.photos?.[0] ? (
                            <img src={l.photos[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                          ) : (
                            <MapView singleListing={l} height="100%" dragging={false} scrollWheelZoom={false} zoomControl={false} doubleClickZoom={false} showLayersControl={false} showAttribution={false} />
                          )}
                          <span className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm backdrop-blur-sm ${style.bg} ${style.text}`}>
                            {getBranch(l)}
                          </span>
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-gray-900 line-clamp-1 flex-1">{l.title}</h4>
                            <div className="flex gap-1 flex-shrink-0">
                              {!l.is_verified && (
                                <button onClick={() => handleVerifyListing(l.id)} className="inline-flex items-center px-2 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition">
                                  <CheckCircle className="w-3 h-3" />
                                </button>
                              )}
                              <button onClick={() => navigate(`/edit-listing/${l.id}`)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition">
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => setLandActionTarget(l)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                  l.archived
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                }`}
                              >
                                {l.archived ? <><RotateCcw className="w-3 h-3" /> Restore</> : <><Archive className="w-3 h-3" /> Archive</>}
                              </button>
                            </div>
                          </div>
                          <p className="text-emerald-600 font-bold text-sm mt-1">{formatPeso(l.price)}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${l.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {l.is_verified ? 'Verified' : 'Unverified'}
                            </span>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">{l.status}</span>
                            {l.archived && (
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 capitalize">Archived</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5">
                              <Maximize className="w-3.5 h-3.5 text-emerald-600" /> {l.area_sqm} sqm
                            </div>
                            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {l.lot_block_number || '—'}
                            </div>
                            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 col-span-2">
                              <User className="w-3.5 h-3.5 text-emerald-600" /> {l.seller?.full_name || 'No seller'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderMapView = () => renderMapExplorer({
    data: listings,
    title: 'Map View',
    subtitle: 'All Terrava land listings across every branch on one interactive map',
    branchFilter: mapBranchFilter,
    setBranchFilter: setMapBranchFilter
  })

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-b from-emerald-50/80 via-white to-emerald-50/40">
      {/* Sidebar */}
      <aside
        className={`md:sticky md:top-0 md:h-screen flex flex-col flex-shrink-0 md:overflow-y-auto overflow-x-hidden transition-all duration-300 ${collapsed ? 'md:w-20' : 'md:w-72'}`}
        style={{ background: 'linear-gradient(180deg, #064e3b 0%, #065f46 100%)' }}
      >
        <button
          onClick={toggleCollapsed}
          className={`hidden md:flex fixed top-1/2 -translate-y-1/2 z-50 w-8 h-20 rounded-r-xl items-center justify-center text-white shadow-lg border-l border-white/10 hover:brightness-110 hover:scale-105 transition-all duration-300 ${collapsed ? 'left-[4rem]' : 'left-[17rem]'}`}
          style={{ background: 'linear-gradient(180deg, #065f46 0%, #047857 100%)' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Logo */}
        <div className={`border-b border-white/10 ${collapsed ? 'p-4' : 'p-5'}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className={`relative bg-white p-1.5 flex items-center justify-center shadow-lg shadow-emerald-900/50 ring-2 ring-white/20 ${collapsed ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl'}`}>
              <img src="/terrava-logo.png" alt="Terrava" className="w-full h-full object-contain rounded-lg" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-emerald-900" />
            </div>
            {!collapsed && (
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
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key
            const pendingCount = key === 'lands' ? listings.filter((l) => !l.is_verified).length : 0
            return (
              <button
                key={key}
                onClick={() => selectTab(key)}
                title={label}
                className={`w-full flex items-center gap-3 rounded-xl text-sm font-semibold transition ${
                  active
                    ? 'bg-white text-emerald-900 shadow-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'justify-center px-3 py-3' : 'px-4 py-3'}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                {!collapsed && active && <span className="ml-auto w-2 h-2 bg-emerald-500 rounded-full" />}
                {!collapsed && !active && key === 'lands' && pendingCount > 0 && (
                  <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Admin profile + footer */}
        {!collapsed && (
          <div className="p-4 border-t border-white/10">
            <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-4 flex items-center gap-3 mb-3">
              <Avatar
                url={user?.photo_url}
                name={user?.full_name}
                sizeClass="w-11 h-11"
                textClass="text-sm"
                fallbackClass="bg-gradient-to-br from-emerald-400 to-emerald-600"
                className="shadow-md ring-2 ring-white/20"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.full_name || 'System Admin'}</p>
                <p className="text-xs text-emerald-200 capitalize truncate">{user?.role || 'admin'}</p>
                <p className="text-[10px] text-white/50 truncate">{user?.email || ''}</p>
              </div>
            </div>
            <p className="text-[11px] text-center text-white/40 font-medium">© 2026 Terrava</p>
            <p className="text-[10px] text-center text-white/30 mt-0.5">Multi-branch Land Portal</p>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top navbar */}
        <header className="sticky top-0 z-40 flex-shrink-0 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 sm:px-6 py-[22px] shadow-sm">
          <div className="flex items-center justify-between gap-4 h-11">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
                {activeTab === 'overview' ? 'Admin Dashboard' : TABS.find((t) => t.key === activeTab)?.label || 'Admin Dashboard'}
              </h1>
              <p className="text-xs text-gray-500 leading-tight">
                {activeTab === 'overview' ? 'Multi-branch land selling system control center' : `Terrava admin ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase() || ''}`}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative flex items-center justify-center h-9 w-9 rounded-xl hover:bg-gray-100 text-gray-600 transition"
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
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 max-h-[28rem] overflow-y-auto">
                    <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">Notifications</p>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllAsRead()}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-500 text-center">No notifications yet</p>
                    ) : (
                      notifications.map((n) => {
                        const isListing = n.type === 'listing';
                        const Icon = isListing ? LandPlot : n.type === 'transaction' ? Banknote : Info;
                        return (
                          <button
                            key={n.id}
                            onClick={() => {
                              if (!n.is_read) markAsRead(n.id);
                              if (isListing) {
                                setLandStatusFilter('unverified');
                                setActiveTab('lands');
                              }
                              setNotifOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 flex items-start gap-3 ${
                              n.is_read ? 'bg-white' : 'bg-emerald-50/40'
                            }`}
                          >
                            <div className={`mt-0.5 p-1.5 rounded-lg ${isListing ? 'bg-blue-100 text-blue-700' : n.type === 'transaction' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${n.is_read ? 'text-gray-700 font-medium' : 'text-gray-900 font-bold'}`}>{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                            </div>
                            {!n.is_read && <span className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center justify-center gap-2.5 h-11 pl-1.5 pr-3 sm:pr-3.5 rounded-xl hover:bg-gray-100 transition"
                >
                  <Avatar
                    url={user?.photo_url}
                    name={user?.full_name}
                    sizeClass="w-9 h-9"
                    textClass="text-sm"
                    fallbackClass="bg-emerald-600"
                    className="ring-2 ring-emerald-100"
                  />
                  <span className="hidden sm:block text-sm font-bold text-gray-900 leading-none truncate max-w-[160px]">
                    {user?.full_name}
                  </span>
                  <ChevronDown className="w-5 h-5 text-gray-500 hidden sm:block -ml-1" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-semibold capitalize">{user?.role}</span>
                    </div>
                    <button
                      onClick={() => { setProfileModalOpen(true); setProfileOpen(false) }}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition w-full text-left"
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                    <button
                      onClick={() => { logout(); setProfileOpen(false) }}
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

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Mobile tab pills */}
            <div className="flex md:hidden overflow-x-auto gap-2 pb-1">
              {TABS.map(({ key, label, icon: Icon }) => {
                const pendingCount = key === 'lands' ? listings.filter((l) => !l.is_verified).length : 0
                return (
                  <button
                    key={key}
                    onClick={() => selectTab(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      activeTab === key
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                    {key === 'lands' && pendingCount > 0 && (
                      <span className="ml-1 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'transactions' && renderTransactions()}
            {activeTab === 'installments' && renderInstallments()}
            {activeTab === 'blockchain' && renderBlockchain()}
            {activeTab === 'lands' && renderLands()}
            {activeTab === 'mapview' && renderMapView()}
          </div>
        </main>
      </div>

      {/* Add Land modal */}
      {addLandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl p-6 my-8 animate-fadeIn flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Add New Land</h3>
                <p className="text-xs text-gray-500">Create a new land listing for any branch.</p>
              </div>
              <button onClick={() => setAddLandOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto pr-1">
              {addLandLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <CreateListingForm
                  initialBranch=""
                  onSubmit={handleAddLandSubmit}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${userArchiveFilter === 'active' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900">{userArchiveFilter === 'active' ? 'Archive buyer account?' : 'Restore buyer account?'}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {userArchiveFilter === 'active'
                    ? 'This hides the account from active users. You can restore it later from Archives.'
                    : 'This brings the account back to the active users list.'}
                </p>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deletingUser}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition disabled:opacity-50"
                aria-label="Close confirmation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={`mt-5 rounded-xl border p-4 ${userArchiveFilter === 'active' ? 'border-amber-100 bg-amber-50' : 'border-emerald-100 bg-emerald-50'}`}>
              <p className="font-bold text-gray-900 truncate">{deleteTarget.full_name || 'Unnamed buyer'}</p>
              <p className="text-sm text-gray-600 truncate mt-0.5">{deleteTarget.email}</p>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deletingUser}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveAction}
                disabled={deletingUser}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60 ${userArchiveFilter === 'active' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {userArchiveFilter === 'active' ? <><Archive className="w-4 h-4" /> {deletingUser ? 'Archiving…' : 'Archive Account'}</> : <><RotateCcw className="w-4 h-4" /> {deletingUser ? 'Restoring…' : 'Restore Account'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Land archive/restore confirmation modal */}
      {landActionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${landActionTarget.archived ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {landActionTarget.archived ? <RotateCcw className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  {landActionTarget.archived ? 'Restore Listing' : 'Archive Listing'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {landActionTarget.archived
                    ? 'This will make the listing visible to sellers and buyers again.'
                    : 'Archived listings are hidden from sellers and buyers but remain visible to admins.'}
                </p>
              </div>
              <button
                onClick={() => setLandActionTarget(null)}
                disabled={landActionLoading}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition disabled:opacity-50"
                aria-label="Close confirmation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`mt-5 rounded-xl border p-4 ${landActionTarget.archived ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
              <p className="font-bold text-gray-900 truncate">{landActionTarget.title || 'Untitled listing'}</p>
              <p className="text-sm text-gray-600 truncate mt-0.5">{landActionTarget.location_text || 'No location'}</p>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setLandActionTarget(null)}
                disabled={landActionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLandArchiveAction}
                disabled={landActionLoading}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60 ${landActionTarget.archived ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                {landActionTarget.archived ? (
                  <><RotateCcw className="w-4 h-4" /> {landActionLoading ? 'Restoring…' : 'Restore Listing'}</>
                ) : (
                  <><Archive className="w-4 h-4" /> {landActionLoading ? 'Archiving…' : 'Archive Listing'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role edit modal */}
      {roleEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Update User Role</h3>
                <p className="text-xs text-gray-500">{roleEditUser.full_name}</p>
              </div>
              <button onClick={() => setRoleEditUser(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Role</label>
                <select
                  value={roleEditValue}
                  onChange={(e) => setRoleEditValue(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setRoleEditUser(null)}
                  className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRole}
                  className="flex-1 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  Save Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit profile modal */}
      {editProfileUser && (
        <EditUserProfileModal
          user={editProfileUser}
          onClose={() => setEditProfileUser(null)}
          onSaved={handleProfileSaved}
        />
      )}

      {/* User details modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
            <div className="sticky top-0 z-10 -mt-6 -mx-6 mb-5 px-6 pt-6 pb-4 bg-white border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  url={viewUser.photo_url}
                  name={viewUser.full_name}
                  sizeClass="w-12 h-12"
                  textClass="text-sm"
                  fallbackClass="bg-emerald-100 text-emerald-700"
                />
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{viewUser.full_name || 'User Details'}</h3>
                  <p className="text-xs text-gray-500 capitalize">{viewUser.role || 'buyer'} profile details</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setViewUser(null); setEditProfileUser(viewUser) }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </button>
                <button onClick={() => setViewUser(null)} className="p-2 rounded-xl hover:bg-gray-100 transition"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
            </div>

            <div className="space-y-5">
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-emerald-500" />
                  <h4 className="text-sm font-bold text-gray-900">Account Overview</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ProfileField label="Email Address" value={viewUser.email} wide />
                  <ProfileField label="Role" value={viewUser.role ? viewUser.role.charAt(0).toUpperCase() + viewUser.role.slice(1) : null} />
                  <ProfileField label="User ID" value={viewUser.id ? `#${viewUser.id}` : null} />
                  <ProfileField label="Joined" value={viewUser.created_at ? new Date(viewUser.created_at).toLocaleDateString() : null} />
                  <ProfileField label="Branch" value={viewUser.branch} />
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-sky-500" />
                  <h4 className="text-sm font-bold text-gray-900">Personal Information</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ProfileField label="First Name" value={viewUser.first_name} />
                  <ProfileField label="Middle Name" value={viewUser.middle_name} />
                  <ProfileField label="Last Name" value={viewUser.last_name} />
                  <ProfileField label="Name Extension" value={viewUser.extension_name} />
                  <ProfileField label="Birthdate" value={viewUser.birthdate ? new Date(viewUser.birthdate).toLocaleDateString() : null} />
                  <ProfileField label="Occupation" value={viewUser.occupation} />
                  <ProfileField label="Address" value={viewUser.address} wide />
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-violet-500" />
                  <h4 className="text-sm font-bold text-gray-900">Contact Information</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ProfileField label="Primary Phone" value={viewUser.phone} />
                  <ProfileField label="Secondary Phone" value={viewUser.phone2} />
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-amber-500" />
                  <h4 className="text-sm font-bold text-gray-900">Spouse Information</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ProfileField label="First Name" value={viewUser.spouse_first_name} />
                  <ProfileField label="Middle Name" value={viewUser.spouse_middle_name} />
                  <ProfileField label="Last Name" value={viewUser.spouse_last_name} />
                  <ProfileField label="Name Extension" value={viewUser.spouse_extension_name} />
                  <ProfileField label="Email Address" value={viewUser.spouse_email} />
                  <ProfileField label="Phone" value={viewUser.spouse_phone} />
                  <ProfileField label="Occupation" value={viewUser.spouse_occupation} wide />
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 px-6 py-4 bg-white border-t border-gray-100">
              <button
                onClick={() => setViewUser(null)}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin profile modal */}
      {profileModalOpen && (
        <AdminSettingsModal
          user={user}
          onClose={() => setProfileModalOpen(false)}
          onUserUpdated={(updatedUser) => login({ user: updatedUser, token: localStorage.getItem('token') })}
          onSellerCreated={(seller) => setUsers((current) => [seller, ...current])}
        />
      )}

      {/* Transaction detail modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-xl"><FileText className="w-6 h-6 text-emerald-700" /></div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Transaction Details</h3>
                  <p className="text-xs text-gray-500">{selectedTxn.reference_number || `TXN-${selectedTxn.id}`}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTxn(null)} className="p-2 rounded-xl hover:bg-gray-100 transition"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="md:col-span-2 bg-gradient-to-r from-emerald-700 to-emerald-900 rounded-2xl p-5 text-white flex items-center justify-between shadow-md">
                <div>
                  <p className="text-sm text-emerald-100">Total Amount</p>
                  <p className="text-3xl font-extrabold">{formatPeso(selectedTxn.amount)}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl"><PesoIcon className="w-8 h-8 text-white" /></div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 p-4 hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Status</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full border ${
                  selectedTxn.status === 'verified' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  selectedTxn.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  'bg-red-100 text-red-700 border-red-200'
                } capitalize`}>
                  {selectedTxn.status === 'verified' ? <CheckCircle className="w-3.5 h-3.5" /> : selectedTxn.status === 'pending' ? <Activity className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  {selectedTxn.status || 'pending'}
                </span>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500 p-4 hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Payment Method</p>
                </div>
                <p className="font-bold text-gray-900 capitalize">{selectedTxn.payment_method || '—'}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500 p-4 hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-purple-600">Transaction Date</p>
                </div>
                <p className="font-bold text-gray-900">{formatDate(selectedTxn.created_at || selectedTxn.createdAt)}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500 p-4 hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Branch</p>
                </div>
                <p className="font-bold text-gray-900">{selectedTxn.listing ? getBranch(selectedTxn.listing) : (selectedTxn.seller?.branch || 'Main Tagum')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-600 p-4 hover:shadow-md transition">
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-600" /> Property Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-emerald-50/50 rounded-lg p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 mb-0.5">Title</p><p className="font-semibold text-gray-900">{selectedTxn.listing?.title || '—'}</p></div>
                  <div className="bg-emerald-50/50 rounded-lg p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 mb-0.5">Location</p><p className="font-semibold text-gray-900">{selectedTxn.listing?.location_text || '—'}</p></div>
                  <div className="bg-emerald-50/50 rounded-lg p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 mb-0.5">Lot/Block</p><p className="font-semibold text-gray-900">{selectedTxn.listing?.lot_block_number || '—'}</p></div>
                  <div className="bg-emerald-50/50 rounded-lg p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 mb-0.5">Area</p><p className="font-semibold text-gray-900">{selectedTxn.listing?.area_sqm ? `${selectedTxn.listing.area_sqm} sqm` : '—'}</p></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500 p-4 hover:shadow-md transition">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><User className="w-4 h-4 text-blue-600" /> Buyer</h4>
                  <div className="space-y-2.5 text-sm">
                    <div className="bg-blue-50/50 rounded-lg p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 mb-0.5">Full Name</p><p className="font-semibold text-gray-900">{selectedTxn.buyer?.full_name || '—'}</p></div>
                    <div className="bg-blue-50/50 rounded-lg p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 mb-0.5">Email</p><p className="font-semibold text-gray-900">{selectedTxn.buyer?.email || '—'}</p></div>
                    <div className="bg-blue-50/50 rounded-lg p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 mb-0.5">Phone</p><p className="font-semibold text-gray-900">{selectedTxn.buyer?.phone || '—'}</p></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500 p-4 hover:shadow-md transition">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Store className="w-4 h-4 text-amber-600" /> Seller</h4>
                  <div className="space-y-2.5 text-sm">
                    <div className="bg-amber-50/50 rounded-lg p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-0.5">Full Name</p><p className="font-semibold text-gray-900">{selectedTxn.seller?.full_name || '—'}</p></div>
                    <div className="bg-amber-50/50 rounded-lg p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-0.5">Email</p><p className="font-semibold text-gray-900">{selectedTxn.seller?.email || '—'}</p></div>
                    <div className="bg-amber-50/50 rounded-lg p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-0.5">Phone</p><p className="font-semibold text-gray-900">{selectedTxn.seller?.phone || '—'}</p></div>
                    <div className="bg-amber-50/50 rounded-lg p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-0.5">Branch</p><p className="font-semibold text-gray-900">{selectedTxn.seller?.branch || '—'}</p></div>
                  </div>
                </div>
              </div>

              {selectedTxn.tx_hash && (
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 text-white shadow-md">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Blockchain Hash</p>
                  </div>
                  <p className="font-mono text-xs text-slate-300 break-all">{selectedTxn.tx_hash}</p>
                </div>
              )}
            </div>

            <button onClick={() => setSelectedTxn(null)} className="w-full mt-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition">Close</button>
          </div>
        </div>
      )}

      <LandDetailsModal
        isOpen={!!selectedLand}
        onClose={() => setSelectedLand(null)}
        readOnly={false}
        existingPhotos={landModalExistingPhotos}
        onSave={handleSaveListing}
        initialData={landModalInitialData}
      />

      {/* Export filter modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-xl">
                  <FileText className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Export Report</h3>
                  <p className="text-xs text-gray-500">Filter and download records</p>
                </div>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">From Date</label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Export Format</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'csv', label: 'CSV Spreadsheet' },
                    { key: 'pdf', label: 'PDF Document' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setExportFormat(key)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                        exportFormat === key
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Category</label>
                <select
                  value={exportCategory}
                  onChange={(e) => setExportCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Records</option>
                  <option value="payments">Payments Only</option>
                  <option value="land_listings">Land Listings Only</option>
                  {activeTab !== 'overview' && <option value="current_tab">Current Tab Only</option>}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={executeExport}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
              >
                Export Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
