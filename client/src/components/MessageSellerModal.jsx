import { useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import api from '../api/api.js'
import Spinner from './Spinner.jsx'
import { X, MessageCircle, Send, Landmark, User } from 'lucide-react'
import { displayBranchName } from '../utils/branches.js'

export default function MessageSellerModal({ listing, preferredBranch, onClose, onSent }) {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    try {
      await api.post('/inquiries', { listing_id: listing.id, message })
      addToast('Message sent to seller', 'success')
      onSent?.()
      onClose()
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to send message', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-brand-100 p-1.5 rounded-lg">
              <MessageCircle className="w-5 h-5 text-brand-700" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Message Seller</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-brand-50/70 rounded-xl p-4 border border-brand-100 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span className="font-medium">{listing.seller?.full_name || 'Seller'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Landmark className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span>Branch: {displayBranchName(preferredBranch || listing.seller?.branch || listing.branch || '—')}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your message</label>
            <textarea
              rows="5"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm resize-none"
              placeholder="Example: I am interested in this land. May I know the payment terms and schedule for a site visit?"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              The seller will be notified and can reply through the Messages page.
            </p>
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
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Spinner size="sm" /> : <><Send className="w-4 h-4" /> Send Message</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
