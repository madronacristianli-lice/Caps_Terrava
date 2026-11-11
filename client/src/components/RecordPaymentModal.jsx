import { useState, useMemo } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import api from '../api/api.js'
import Spinner from './Spinner.jsx'
import Avatar from './Avatar.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import { X, CreditCard, Receipt, User, MapPin, CheckCircle, Printer, Landmark } from 'lucide-react'
import { displayBranchName } from '../utils/branches.js'
import { resolveMediaUrl } from '../utils/media.js'

const formatAmount = (value) => {
  const raw = String(value ?? '').replace(/,/g, '')
  if (!raw) return ''
  const [whole, decimal] = raw.split('.')
  const formatted = whole.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decimal !== undefined ? `${formatted}.${decimal.replace(/\D/g, '').slice(0, 2)}` : formatted
}

export default function RecordPaymentModal({ listing, transactions = [], onClose, onRecorded, paymentBranch = '' }) {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [payment, setPayment] = useState({
    amount: '',
    payment_method: 'cash'
  })
  const [formError, setFormError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const branch = paymentBranch || listing.seller?.branch || listing.branch || 'Main Tagum'
  const [receiptNumber] = useState(() => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(1000 + Math.random() * 9000)
    return `RCP-${date}-${random}`
  })

  const buyer = listing.assignedBuyer
  const fullAmount = Number(listing.price) || 0
  const totalPaid = useMemo(() => {
    return transactions
      .filter((t) => String(t.listing_id) === String(listing.id) && t.status === 'verified')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  }, [transactions, listing.id])
  const remaining = Math.max(fullAmount - totalPaid, 0)
  const isFullyPaid = remaining <= 0

  const recordPayment = async (amountNum) => {
    setConfirmation(null)
    setLoading(true)
    try {
      const res = await api.post('/transactions', {
        listing_id: listing.id,
        buyer_id: buyer.id,
        amount: String(payment.amount).replace(/,/g, ''),
        payment_method: payment.payment_method,
        reference_number: `${receiptNumber} | ${branch}`
      })
      const paidAfter = totalPaid + amountNum
      setReceipt({
        transaction: res.data,
        property: listing,
        buyer: buyer,
        branch,
        receiptNumber,
        amountPaid: amountNum,
        totalPaid: paidAfter,
        remaining: Math.max(fullAmount - paidAfter, 0),
        fullyPaid: paidAfter >= fullAmount,
        recordedAt: new Date().toLocaleString(),
        paymentMethod: payment.payment_method
      })
      addToast('Payment recorded successfully', 'success')
      onRecorded?.()
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to record payment', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!buyer) {
      const message = 'No buyer is assigned to this listing.'
      setFormError(message)
      addToast(message, 'error')
      return
    }
    if (isFullyPaid) {
      const message = 'This property is already fully paid.'
      setFormError(message)
      addToast(message, 'error')
      return
    }
    const amountNum = Number(String(payment.amount).replace(/,/g, ''))
    if (!payment.amount || amountNum <= 0) {
      const message = 'Enter a payment amount greater than ₱0.'
      setFormError(message)
      addToast(message, 'error')
      return
    }
    if (amountNum > remaining) {
      const message = `Payment cannot exceed the remaining balance of ₱${remaining.toLocaleString()}.`
      setFormError(message)
      addToast(message, 'error')
      return
    }

    setConfirmation({ amount: amountNum })
  }

  const handlePrint = () => {
    const content = document.getElementById('payment-receipt')
    if (!content) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    // Print only after the new document is ready, then close the temporary
    // window so it cannot leave the application looking frozen or blocked.
    const finishPrint = () => {
      if (printWindow.closed) return
      printWindow.close()
    }
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.onafterprint = finishPrint
      printWindow.print()
      window.setTimeout(finishPrint, 1000)
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - Terrava</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 0; margin: 0; color: #111827; background: #f3f4f6; display: flex; justify-content: center; }
            #payment-receipt { flex: 0 0 760px; width: 760px !important; max-width: 760px !important; margin: 20px auto; padding: 22px !important; border: 1px dashed #d1d5db !important; border-radius: 12px !important; background: #ffffff !important; }
            #payment-receipt svg { display: inline-block; vertical-align: middle; }
            #payment-receipt p { line-height: 1.35; }
            #payment-receipt > div { margin-bottom: 10px !important; }
            @media print { body { padding: 0; margin: 0; } #payment-receipt { box-shadow: none !important; } }
          </style>
        </head>
        <body>
          ${content.outerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (!buyer) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-brand-100 p-1.5 rounded-lg">
              <CreditCard className="w-5 h-5 text-brand-700" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {receipt ? 'Payment Receipt' : 'Record Payment'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {receipt ? (
          <div className="p-5 space-y-4">
            <div id="payment-receipt" style={{ background: '#ffffff', width: '100%', maxWidth: '760px', margin: '0 auto', padding: '24px', borderRadius: '16px', border: '1px dashed #d1d5db', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#111827', position: 'relative' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #d1d5db', paddingBottom: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '4px' }}>
                  <div style={{ width: '36px', height: '36px', background: '#059669', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Landmark style={{ color: '#ffffff', width: '20px', height: '20px' }} />
                  </div>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#065f46' }}>Terrava</span>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px' }}>Land Selling System</p>
                <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', color: '#065f46', background: '#d1fae5', padding: '4px 12px', borderRadius: '999px' }}>OFFICIAL RECEIPT</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', fontSize: '12px', marginBottom: '14px', maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto' }}>
                <div>
                  <p style={{ color: '#6b7280', margin: '0 0 2px' }}>Receipt No.</p>
                  <p style={{ fontWeight: '700', fontFamily: 'monospace', margin: 0, color: '#111827' }}>{receipt.receiptNumber}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#6b7280', margin: '0 0 2px' }}>Date Recorded</p>
                  <p style={{ fontWeight: '600', margin: 0, color: '#111827' }}>{receipt.recordedAt}</p>
                </div>
              </div>

              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>Property being paid for</p>
                <p style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 6px', color: '#111827' }}>{receipt.property.title}</p>
                <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin style={{ width: '14px', height: '14px', color: '#059669', flexShrink: 0 }} /> {receipt.property.location_text}
                </p>
                {receipt.property.branch && (
                  <p style={{ fontSize: '12px', color: '#4b5563', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Landmark style={{ width: '14px', height: '14px', color: '#059669', flexShrink: 0 }} /> Listing branch: {receipt.property.branch}
                  </p>
                )}
              </div>

              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>Buyer / account holder</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {receipt.buyer.photo_url ? (
                    <img
                      src={resolveMediaUrl(receipt.buyer.photo_url)}
                      alt={receipt.buyer.full_name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <User style={{ width: '24px', height: '24px', color: '#059669', flexShrink: 0 }} />
                  )}
                  <p style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#111827' }}>
                    {receipt.buyer.full_name}
                  </p>
                </div>
              </div>

              <div style={{ border: '1px solid #d1d5db', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ padding: '11px 14px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7', color: '#166534', fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Payment summary</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #f3f4f6', background: '#ffffff' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Full Amount</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>₱{fullAmount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #f3f4f6', background: '#ecfdf5' }}>
                  <span style={{ fontSize: '13px', color: '#065f46', fontWeight: '600' }}>This payment</span>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#059669' }}>₱{receipt.amountPaid.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #f3f4f6', background: '#ffffff' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Paid to date</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>₱{receipt.totalPaid.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: receipt.remaining === 0 ? '#f0fdf4' : '#fffbeb' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Balance remaining</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: receipt.remaining === 0 ? '#16a34a' : '#d97706' }}>₱{receipt.remaining.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px' }}>Payment details</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <p style={{ color: '#6b7280', margin: '0 0 2px' }}>Method</p>
                    <p style={{ fontWeight: '700', margin: 0, textTransform: 'capitalize', color: '#111827' }}>{receipt.paymentMethod}</p>
                  </div>
                  <div>
                    <p style={{ color: '#6b7280', margin: '0 0 2px' }}>Payment received at</p>
                    <p style={{ fontWeight: '600', margin: 0, color: '#111827' }}>{receipt.branch}</p>
                  </div>
                  <div>
                    <p style={{ color: '#6b7280', margin: '0 0 2px' }}>Status</p>
                    <span style={{ display: 'inline-block', fontWeight: '700', textTransform: 'capitalize', color: receipt.transaction.status === 'verified' ? '#059669' : '#d97706', background: receipt.transaction.status === 'verified' ? '#d1fae5' : '#fef3c7', padding: '3px 10px', borderRadius: '999px', fontSize: '11px' }}>{receipt.transaction.status}</span>
                  </div>
                </div>
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e5e7eb', fontSize: '11px', color: '#6b7280' }}>
                  Keep this receipt and quote the receipt number for any payment questions.
                </div>
              </div>

              {receipt.fullyPaid && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#15803d', background: '#dcfce6', border: '2px solid #86efac', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
                  <CheckCircle style={{ width: '22px', height: '22px' }} />
                  <span style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '0.04em' }}>FULLY PAID</span>
                </div>
              )}

              <div style={{ textAlign: 'center', borderTop: '2px dashed #d1d5db', paddingTop: '16px' }}>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px', fontWeight: '500' }}>Thank you for trusting Terrava!</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>This receipt is computer-generated and is valid without a signature.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="bg-brand-50/70 rounded-xl p-4 border border-brand-100 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Property</p>
                <p className="text-sm text-gray-900 font-medium">{listing.title}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Avatar url={buyer?.photo_url} name={buyer?.full_name} sizeClass="w-6 h-6" textClass="text-[10px]" />
                <span>Buyer: {buyer?.full_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-brand-100/50">
                <div>
                  <p className="text-xs text-gray-500">Full Amount</p>
                  <p className="text-lg font-bold text-gray-900">₱{fullAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Remaining</p>
                  <p className={`text-lg font-bold ${isFullyPaid ? 'text-green-600' : 'text-amber-600'}`}>
                    ₱{remaining.toLocaleString()}
                  </p>
                </div>
              </div>
              {!isFullyPaid && (
                <div>
                  <p className="text-xs text-gray-500">Total Paid So Far</p>
                  <p className="text-sm font-semibold text-brand-700">₱{totalPaid.toLocaleString()}</p>
                </div>
              )}
              {isFullyPaid && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-bold text-sm">Fully Paid</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount to Pay (PHP)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                disabled={isFullyPaid}
                placeholder={isFullyPaid ? 'Fully paid' : `e.g. ${Math.min(remaining, 50000).toLocaleString()}`}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                value={payment.amount}
                aria-invalid={Boolean(formError)}
                onChange={(e) => {
                  setFormError('')
                  setPayment({ ...payment, amount: formatAmount(e.target.value) })
                }}
              />
              {formError && <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">{formError}</p>}
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <label className="block text-xs font-medium text-gray-500 mb-0.5 flex items-center gap-1.5">
                <Landmark className="w-3 h-3" /> Branch Where Paid
              </label>
              <p className="text-sm font-bold text-gray-900">{displayBranchName(branch)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Branch is tied to the seller account</p>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <label className="block text-xs font-medium text-gray-500 mb-0.5 flex items-center gap-1.5">
                <Receipt className="w-3 h-3" /> Auto-generated Receipt No.
              </label>
              <p className="text-sm font-bold text-gray-900 font-mono">{receiptNumber}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isFullyPaid}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Spinner size="sm" /> : 'Record Payment'}
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmation)}
        title="Confirm payment recording"
        message={confirmation ? `Record ₱${confirmation.amount.toLocaleString()} from ${buyer.full_name}? This will create an official receipt and update the buyer's balance.` : ''}
        confirmLabel="Record payment"
        onCancel={() => setConfirmation(null)}
        onConfirm={() => recordPayment(confirmation.amount)}
      />
    </div>
  )
}
