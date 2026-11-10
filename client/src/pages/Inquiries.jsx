import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import api from '../api/api.js'
import Spinner from '../components/Spinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { MessageCircle, Send, Reply, Clock, Home, User, CheckCircle, Map, Search, X } from 'lucide-react'

export default function Inquiries() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyId, setReplyId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')

  const isSeller = user?.role === 'seller'
  const isBuyer = user?.role === 'buyer'

  const fetchInquiries = () => {
    setLoading(true)
    api.get('/inquiries')
      .then((res) => setInquiries(res.data))
      .catch(() => addToast('Failed to load messages', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchInquiries()
  }, [])

  const handleReply = async (inquiryId) => {
    if (!replyText.trim()) return
    setSending(true)
    try {
      await api.put(`/inquiries/${inquiryId}/reply`, { reply: replyText })
      addToast('Reply sent', 'success')
      setReplyId(null)
      setReplyText('')
      fetchInquiries()
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to send reply', 'error')
    } finally {
      setSending(false)
    }
  }

  const formatDate = (value) => {
    if (!value) return null
    const d = new Date(value)
    if (isNaN(d.getTime())) return null
    return d.toLocaleString()
  }

  const getInquiryTimestamp = (inquiry) => (
    inquiry.created_at || inquiry.createdAt || inquiry.updated_at || inquiry.updatedAt || null
  )

  const q = search.toLowerCase()
  const filteredInquiries = inquiries.filter((inq) => {
    if (!q) return true
    return (
      (inq.listing?.title || '').toLowerCase().includes(q) ||
      (inq.buyer?.full_name || '').toLowerCase().includes(q) ||
      (inq.message || '').toLowerCase().includes(q) ||
      (inq.reply || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-brand-100 bg-white/80 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-brand-100 p-2.5 rounded-xl shadow-sm">
            <MessageCircle className="w-6 h-6 text-brand-700" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              {isSeller ? 'Inquiries from buyers about your listings.' : 'Your messages to sellers.'}
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages..."
            className="pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-full sm:w-64 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : filteredInquiries.length === 0 ? (
        <EmptyState
          title={inquiries.length === 0 ? "No messages yet" : "No matching messages"}
          message={isSeller
            ? (inquiries.length === 0 ? "Buyers will appear here when they message you about a listing." : "Try a different search term.")
            : (inquiries.length === 0 ? "Message a seller from a listing page to start a reservation." : "Try a different search term.")}
        />
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((inq) => (
            <div
              key={inq.id}
              className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.11)] sm:p-6 ${
                inq.reply ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-400'
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-1 ${inq.reply ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="mt-0.5 rounded-lg bg-brand-50 p-1.5">
                    <Home className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Property inquiry</p>
                    <span className="block truncate text-base font-bold text-gray-900">{inq.listing?.title || 'Listing'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${inq.reply ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {inq.reply ? 'Replied' : 'Awaiting reply'}
                  </span>
                  {inq.listing && (
                    <button
                      onClick={() => navigate('/map', { state: { selectedListing: inq.listing } })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                    >
                      <Map className="w-3.5 h-3.5" /> View Map
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500" title={getInquiryTimestamp(inq) || ''}>
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{formatDate(getInquiryTimestamp(inq)) || 'Timestamp unavailable'}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-600" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{isSeller ? 'Buyer message' : 'Your message'}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {isSeller ? (inq.buyer?.full_name || 'Buyer') : 'You'}
                  </span>
                </div>
                <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{inq.message}</p>
              </div>

              {inq.reply ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      {isSeller ? 'Your reply' : 'Seller reply'}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{inq.reply}</p>
                </div>
              ) : isSeller ? (
                <div className="mt-2">
                  {replyId === inq.id ? (
                    <div className="space-y-3">
                      <textarea
                        rows="3"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your reply..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setReplyId(null); setReplyText('') }}
                          className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReply(inq.id)}
                          disabled={sending}
                          className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-60 flex items-center gap-2"
                        >
                          {sending ? <Spinner size="sm" /> : <><Send className="w-4 h-4" /> Send Reply</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyId(inq.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
                    >
                      <Reply className="w-4 h-4" /> Reply
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-semibold text-amber-700">
                  <Clock className="h-4 w-4" /> Waiting for seller reply
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
