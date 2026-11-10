import { useEffect, useState } from 'react'
import api from '../api/api.js'
import MapView from '../components/MapView.jsx'
import Spinner from '../components/Spinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { MapPin, CheckCircle2, Clock, Maximize, ChevronDown, ChevronLeft, ChevronRight, Receipt, Printer, Landmark, CreditCard, Wallet, Calendar, AlertTriangle } from 'lucide-react'
import PesoIcon from '../components/PesoIcon.jsx'
import { displayBranchName } from '../utils/branches.js'

export default function MyLands() {
  const [lands, setLands] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [receiptPages, setReceiptPages] = useState({})
  const receiptsPerPage = 3

  useEffect(() => {
    api.get('/listings/assigned/me')
      .then((res) => setLands(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Spinner size="lg" />
    </div>
  )

  const parseReceipt = (txn) => {
    const ref = txn.reference_number || ''
    const parts = ref.split('|').map((s) => s.trim())
    return {
      receiptNumber: parts[0] || '—',
      branch: parts[1] || txn.branch || '—',
      method: txn.payment_method || '—',
      amount: Number(txn.amount) || 0,
      date: new Date(txn.created_at).toLocaleString(),
      status: txn.status
    }
  }

  const printReceipt = (land, txn) => {
    const r = parseReceipt(txn)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - Terrava</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px 24px; color: #111827; background: #fff; max-width: 600px; margin: 0 auto; }
            .receipt { border: 1px dashed #d1d5db; border-radius: 20px; padding: 28px; background: #ffffff; }
            .header { text-align: center; border-bottom: 2px dashed #d1d5db; padding-bottom: 22px; margin-bottom: 22px; }
            .brand { display: block; text-align: center; margin-bottom: 6px; }
            .brand-name { font-size: 24px; font-weight: 800; color: #065f46; margin: 0; }
            .tagline { font-size: 13px; color: #6b7280; margin: 0 0 10px; }
            .badge { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; color: #065f46; background: #d1fae5; padding: 5px 14px; border-radius: 999px; text-transform: uppercase; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; margin-bottom: 20px; }
            .meta div { background: #f9fafb; border-radius: 10px; padding: 12px; }
            .meta p { margin: 0; color: #6b7280; }
            .meta strong { display: block; margin-top: 3px; color: #111827; font-weight: 700; }
            .card { background: #f9fafb; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
            .card-title { font-size: 11px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 10px; }
            .card-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
            .card-row:last-child { border-bottom: none; }
            .card-row span:first-child { color: #6b7280; }
            .card-row span:last-child { color: #111827; font-weight: 600; }
            .amount-card { border: 2px solid #059669; border-radius: 14px; padding: 18px; text-align: center; margin: 18px 0; background: #ecfdf5; }
            .amount-label { font-size: 12px; color: #065f46; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 6px; }
            .amount-value { font-size: 28px; font-weight: 800; color: #059669; margin: 0; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: capitalize; }
            .status-verified { background: #d1fae5; color: #047857; }
            .status-pending { background: #fef3c7; color: #b45309; }
            .status-rejected { background: #fee2e2; color: #b91c1c; }
            .footer { text-align: center; border-top: 2px dashed #d1d5db; padding-top: 18px; margin-top: 18px; }
            .footer p { margin: 0; color: #6b7280; font-size: 12px; }
            .footer .note { font-size: 11px; color: #9ca3af; margin-top: 4px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="brand">
                <h1 class="brand-name">Terrava</h1>
              </div>
              <p class="tagline">Land Selling System</p>
              <span class="badge">Official Receipt</span>
            </div>

            <div class="meta">
              <div>
                <p>Receipt No.</p>
                <strong>${r.receiptNumber}</strong>
              </div>
              <div style="text-align: right;">
                <p>Date</p>
                <strong>${r.date}</strong>
              </div>
            </div>

            <div class="card">
              <p class="card-title">Property</p>
              <div class="card-row"><span>Title</span><span>${land.title}</span></div>
              <div class="card-row"><span>Location</span><span>${land.location_text}</span></div>
              <div class="card-row"><span>Seller</span><span>${land.seller?.full_name || '—'}</span></div>
              <div class="card-row"><span>Buyer</span><span>${land.assignedBuyer?.full_name || '—'}</span></div>
            </div>

            <div class="card">
              <p class="card-title">Payment Details</p>
              <div class="card-row"><span>Method</span><span style="text-transform: capitalize;">${r.method}</span></div>
              <div class="card-row"><span>Branch Paid</span><span>${displayBranchName(r.branch)}</span></div>
              <div class="card-row"><span>Status</span><span class="status status-${r.status}">${r.status}</span></div>
            </div>

            <div class="amount-card">
              <p class="amount-label">Amount Paid</p>
              <p class="amount-value">₱${r.amount.toLocaleString()}</p>
            </div>

            <div class="footer">
              <p>Thank you for trusting Terrava!</p>
              <p class="note">This receipt serves as proof of payment and is valid without a signature.</p>
            </div>
          </div>
        </body>
      </html>
    `)
    const finishPrint = () => {
      if (!printWindow.closed) printWindow.close()
    }
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.onafterprint = finishPrint
      printWindow.print()
      window.setTimeout(finishPrint, 1000)
    }
    printWindow.document.close()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-2xl border border-brand-100 bg-white/80 px-5 py-4 shadow-sm">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">My Purchased Lands</h1>
        <p className="text-gray-500 mt-1">Properties assigned to you by a seller. Track your payment status here.</p>
      </div>

      {lands.length === 0 ? (
        <EmptyState
          title="No lands assigned yet"
          message="Once a seller assigns a property to your account, it will appear here with your payment tracker."
        />
      ) : (
        <div className="space-y-5">
          {lands.map((land) => {
            const verifiedTxns = (land.transactions || []).filter((t) => t.status === 'verified')
            const receiptPageCount = Math.max(1, Math.ceil(verifiedTxns.length / receiptsPerPage))
            const receiptPage = Math.min(receiptPages[land.id] || 1, receiptPageCount)
            const visibleReceipts = verifiedTxns.slice(
              (receiptPage - 1) * receiptsPerPage,
              receiptPage * receiptsPerPage
            )
            const totalPaid = verifiedTxns.reduce((sum, t) => sum + Number(t.amount), 0)
            const originalPrice = Number(land.price)
            const remaining = Math.max(0, originalPrice - totalPaid)
            const isFullyPaid = remaining === 0
            const paidPct = originalPrice > 0 ? Math.min(100, Math.round((totalPaid / originalPrice) * 100)) : 0
            const isExpanded = expandedId === land.id

            return (
              <div
                key={land.id}
                className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.12)] ${
                  isFullyPaid ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-400'
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${isFullyPaid ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                {/* Header */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="font-bold text-gray-900 text-lg line-clamp-1">{land.title}</h2>
                        {isFullyPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                            <Clock className="w-3.5 h-3.5" /> Pending Payment
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-brand-600" /> {land.location_text}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">Seller</p>
                      <p className="text-sm font-semibold text-gray-700">{land.seller?.full_name || '—'}</p>
                    </div>
                  </div>

                  {/* Payment breakdown */}
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200 flex flex-col items-center shadow-sm">
                      <PesoIcon className="w-4 h-4 text-gray-400 mb-1" />
                      <p className="text-xs text-gray-400 mb-0.5">Original Price</p>
                      <p className="text-sm font-bold text-gray-900">₱{originalPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-200 flex flex-col items-center shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-brand-500 mb-1" />
                      <p className="text-xs text-brand-600 mb-0.5">Total Paid</p>
                      <p className="text-sm font-bold text-brand-700">₱{totalPaid.toLocaleString()}</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center border flex flex-col items-center shadow-sm ${isFullyPaid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      {isFullyPaid ? <CheckCircle2 className="w-4 h-4 text-green-500 mb-1" /> : <Clock className="w-4 h-4 text-red-400 mb-1" />}
                      <p className={`text-xs mb-0.5 ${isFullyPaid ? 'text-green-600' : 'text-red-500'}`}>Remaining</p>
                      <p className={`text-sm font-bold ${isFullyPaid ? 'text-green-700' : 'text-red-700'}`}>
                        {isFullyPaid ? '₱0' : `₱${remaining.toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  {/* Installment schedule summary */}
                  {land.installmentAccounts?.length > 0 && (() => {
                    const account = land.installmentAccounts[0]
                    const tcp = Number(land.total_contract_price || land.price || 0)
                    const reservationFee = Number(land.reservation_fee || 0)
                    const minDownPct = Number(land.minimum_down_payment_pct || 0)
                    const downPayment = Math.round((tcp * (minDownPct / 100)) * 100) / 100
                    const balance = Math.max(tcp - reservationFee - downPayment, 0)
                    const months = (land.in_house_max_term_years || 0) * 12
                    const explicitMonthly = Number(land.monthly_payment_amount || 0)
                    const monthly = explicitMonthly > 0
                      ? explicitMonthly
                      : (months > 0 ? Math.round((balance / months) * 100) / 100 : 0)
                    const statusColors = {
                      active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                      grace_period: 'bg-amber-50 text-amber-700 border-amber-100',
                      overdue: 'bg-orange-50 text-orange-700 border-orange-100',
                      delinquent: 'bg-red-50 text-red-700 border-red-100',
                      defaulted: 'bg-gray-50 text-gray-700 border-gray-200',
                      paid_off: 'bg-blue-50 text-blue-700 border-blue-100'
                    }
                    return (
                      <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Wallet className="w-4 h-4 text-slate-600" />
                          <h3 className="text-sm font-bold text-slate-800">Installment Schedule</h3>
                          <span className={`ml-auto inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold border capitalize ${statusColors[account.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {account.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Term</p>
                            <p className="text-sm font-bold text-slate-800">{land.in_house_max_term_years || 0} yr(s)</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Monthly</p>
                            <p className="text-sm font-bold text-slate-800">₱{monthly.toLocaleString()}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Next Due</p>
                            <p className="text-sm font-bold text-slate-800">{account.next_due_date ? new Date(account.next_due_date).toLocaleDateString() : '—'}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Balance</p>
                            <p className="text-sm font-bold text-slate-800">₱{Number(account.remaining_balance || remaining).toLocaleString()}</p>
                          </div>
                        </div>
                        {['overdue', 'delinquent', 'defaulted'].includes(account.status) && (
                          <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p>
                              Your account is <strong>{account.status.replace(/_/g, ' ')}</strong>. Please settle your obligation immediately to avoid further penalties or cancellation.
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>Payment Progress</span>
                      <span className="font-bold text-brand-600">{paidPct}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-600 rounded-full transition-all duration-500"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Details / expand */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : land.id)}
                    className="mt-4 flex items-center gap-2 text-sm text-brand-600 font-semibold hover:underline"
                  >
                    <span className={`inline-flex transition-transform duration-300 ${isExpanded ? 'rotate-180 scale-110' : ''}`}>
                      <ChevronDown className="w-4 h-4" />
                    </span>
                    {isExpanded ? 'Hide Details' : 'View Details & Map'}
                  </button>
                </div>

                {/* Expanded: map + land details */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/40">
                    <div className="h-56">
                      <MapView singleListing={land} height="100%" flyTo={land} showLayersControl={false} showAttribution={false} />
                    </div>
                    <div className="p-5 grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Maximize className="w-4 h-4 text-brand-600 flex-shrink-0" />
                        <span>{land.area_sqm} sqm</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <PesoIcon className="w-4 h-4 text-brand-600 flex-shrink-0" />
                        <span>₱{originalPrice.toLocaleString()}</span>
                      </div>
                      {land.description && (
                        <div className="col-span-2 text-sm text-gray-600">{land.description}</div>
                      )}
                    </div>

                    {/* Payment transaction history / receipts */}
                    {verifiedTxns.length > 0 && (
                      <div className="px-5 pb-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Receipt className="w-4 h-4 text-brand-600" />
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment History & Receipts</p>
                        </div>
                        <div className="space-y-3">
                          {visibleReceipts.map((t) => {
                            const r = parseReceipt(t)
                            return (
                              <div key={t.id} className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="bg-white p-1.5 rounded-lg border border-brand-100">
                                      <Receipt className="w-4 h-4 text-brand-600" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-gray-900 font-mono">{r.receiptNumber}</p>
                                      <p className="text-xs text-gray-500">{r.date}</p>
                                    </div>
                                  </div>
                                  <span className={`self-start sm:self-auto inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                                    t.status === 'verified' ? 'bg-green-100 text-green-700' :
                                    t.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {t.status}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                  <div className="flex items-center gap-1.5 text-gray-600">
                                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="capitalize">{r.method}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-gray-600">
                                    <Landmark className="w-3.5 h-3.5 text-gray-400" />
                                    <span>{displayBranchName(r.branch)}</span>
                                  </div>
                                  <div className="col-span-2 flex items-center gap-1.5 text-gray-900 font-semibold">
                                    <PesoIcon className="w-3.5 h-3.5 text-brand-600" />
                                    <span>₱{r.amount.toLocaleString()}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => printReceipt(land, t)}
                                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-brand-200 text-brand-700 text-sm font-semibold hover:bg-brand-100 transition"
                                >
                                  <Printer className="w-3.5 h-3.5" /> Print Receipt
                                </button>
                              </div>
                            )
                          })}
                        </div>
                        {verifiedTxns.length > receiptsPerPage && (
                          <div className="mt-4 flex flex-col gap-3 border-t border-brand-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-gray-500">
                              Showing <span className="font-bold text-gray-700">{(receiptPage - 1) * receiptsPerPage + 1}</span>
                              {' '}to{' '}
                              <span className="font-bold text-gray-700">{Math.min(receiptPage * receiptsPerPage, verifiedTxns.length)}</span>
                              {' '}of <span className="font-bold text-gray-700">{verifiedTxns.length}</span> receipts
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setReceiptPages((pages) => ({ ...pages, [land.id]: Math.max(1, receiptPage - 1) }))}
                                disabled={receiptPage <= 1}
                                className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" /> Previous
                              </button>
                              <span className="min-w-[4.5rem] text-center text-xs font-bold text-gray-700">
                                Page {receiptPage} of {receiptPageCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => setReceiptPages((pages) => ({ ...pages, [land.id]: Math.min(receiptPageCount, receiptPage + 1) }))}
                                disabled={receiptPage >= receiptPageCount}
                                className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Next <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
