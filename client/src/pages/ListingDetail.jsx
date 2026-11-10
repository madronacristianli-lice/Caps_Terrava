import { useCallback, useEffect, useState } from 'react'
import useAutoRefresh from '../hooks/useAutoRefresh.js'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import api from '../api/api.js'
import MapView from '../components/MapView.jsx'
import Spinner from '../components/Spinner.jsx'
import { SkeletonDetail } from '../components/Skeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import MilestoneTracker from '../components/MilestoneTracker.jsx'
import { MapPin, User, Phone, Maximize, Tag, CreditCard, CheckCircle, ChevronLeft, ChevronRight, UserCheck, Mail, Calendar, Home, FileText, Mountain, Zap, Droplets, Wifi, MessageCircle, ArrowLeft, X } from 'lucide-react'
import PesoIcon from '../components/PesoIcon.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import Avatar from '../components/Avatar.jsx'
import MessageSellerModal from '../components/MessageSellerModal.jsx'
import { displayBranchName } from '../utils/branches.js'

export default function ListingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPay, setShowPay] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [payment, setPayment] = useState({ amount: '', payment_method: 'cash', reference_number: '' })
  const [flyToListing, setFlyToListing] = useState(null)
  const [activePhoto, setActivePhoto] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const fetchListing = useCallback(() => {
    api.get(`/listings/${id}`)
      .then((res) => {
        setListing(res.data)
        setFlyToListing(res.data)
      })
      .catch((err) => {
        addToast(err.response?.data?.error || 'Failed to load listing', 'error')
      })
      .finally(() => setLoading(false))
  }, [id, addToast])

  useAutoRefresh(fetchListing, [fetchListing], 30000)

  useEffect(() => {
    if (!lightboxOpen) return
    const handleKey = (e) => {
      if (!listing?.photos?.length) return
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') setActivePhoto((prev) => (prev - 1 + listing.photos.length) % listing.photos.length)
      if (e.key === 'ArrowRight') setActivePhoto((prev) => (prev + 1) % listing.photos.length)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [lightboxOpen, listing?.photos?.length])

  const handlePayment = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/transactions', { listing_id: id, ...payment })
      if (res.data.eth_tx_hash) {
        addToast(`Payment recorded on blockchain & Ethereum! Tx: ${res.data.eth_tx_hash.slice(0, 14)}…`, 'success')
      } else {
        addToast('Payment recorded on blockchain', 'success')
      }
      setShowPay(false)
      navigate('/transactions')
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to record payment', 'error')
    }
  }

  if (loading) return <SkeletonDetail />
  if (!listing) return <EmptyState title="Listing not found" message="The property you are looking for does not exist." />

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-800 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{listing.title}</h1>
            {listing.branch && (
              <span className="px-2 py-0.5 rounded text-xs bg-brand-100 text-brand-700 font-medium">
                {displayBranchName(listing.branch)}
              </span>
            )}
            <FavoriteButton listingId={listing.id} size={24} className="ml-2" />
          </div>
          <button
            onClick={() => setFlyToListing(listing)}
            className="text-gray-600 mt-1 flex items-center gap-1 hover:text-brand-600 hover:underline"
            title="Show on map"
          >
            <MapPin className="w-4 h-4" /> {listing.location_text}
          </button>
          <p className="text-3xl font-bold text-brand-600 mt-3">₱{Number(listing.price).toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-card border border-gray-100 min-w-[220px]">
          <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-2"><User className="w-4 h-4" /> Seller</p>
          <div className="flex items-center gap-3">
            <Avatar url={listing.seller?.photo_url} name={listing.seller?.full_name} sizeClass="w-10 h-10" textClass="text-xs" />
            <div>
              <p className="font-bold text-gray-900 text-lg">{listing.seller?.full_name}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1.5"><Phone className="w-4 h-4 text-brand-600" /> {listing.seller?.phone}</p>
            </div>
          </div>
          {user?.role === 'buyer' && (
            <button
              onClick={() => setShowMessage(true)}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition text-sm font-semibold"
            >
              <MessageCircle className="w-4 h-4" /> Message Seller
            </button>
          )}
        </div>
      </div>

      {/* Photo Gallery */}
      {listing.photos?.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-card bg-gray-100">
          <img
            src={listing.photos[activePhoto]}
            alt={listing.title}
            onClick={() => setLightboxOpen(true)}
            className="w-full h-[300px] md:h-[400px] object-cover cursor-pointer hover:opacity-95 transition"
          />
          {listing.photos.length > 1 && (
            <>
              <button
                onClick={() => setActivePhoto((prev) => (prev - 1 + listing.photos.length) % listing.photos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActivePhoto((prev) => (prev + 1) % listing.photos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {listing.photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    className={`w-2.5 h-2.5 rounded-full transition ${i === activePhoto ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'}`}
                  />
                ))}
              </div>
            </>
          )}
          {/* Thumbnail strip */}
          {listing.photos.length > 1 && (
            <div className="flex gap-2 p-3 bg-white overflow-x-auto">
              {listing.photos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhoto(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${i === activePhoto ? 'border-brand-500 ring-1 ring-brand-300' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && listing.photos?.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-5xl w-full max-h-screen flex flex-col items-center">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={listing.photos[activePhoto]}
              alt={listing.title}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {listing.photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setActivePhoto((prev) => (prev - 1 + listing.photos.length) % listing.photos.length) }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActivePhoto((prev) => (prev + 1) % listing.photos.length) }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div className="mt-4 flex items-center gap-2 text-white/80 text-sm">
                  <span className="font-medium">{activePhoto + 1}</span>
                  <span>/</span>
                  <span>{listing.photos.length}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-[250px] md:h-[350px] rounded-2xl overflow-hidden border border-gray-200 shadow-card">
        <MapView singleListing={listing} height="100%" flyTo={flyToListing} />
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100">
        <h3 className="font-semibold text-lg mb-3 text-gray-900">Description</h3>
        <p className="text-gray-700 leading-relaxed">{listing.description || 'No description provided.'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-brand-50/50 p-4 rounded-xl flex items-center gap-3 border border-brand-100">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Maximize className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Area</p>
              <p className="font-semibold text-gray-900">{listing.area_sqm} sqm</p>
            </div>
          </div>
          <div className="bg-brand-50/50 p-4 rounded-xl flex items-center gap-3 border border-brand-100">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Tag className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="font-semibold text-gray-900 capitalize">{listing.status}</p>
            </div>
          </div>
          <div className="bg-brand-50/50 p-4 rounded-xl flex items-center gap-3 border border-brand-100">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <CheckCircle className={`w-5 h-5 ${listing.is_verified ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Verification</p>
              <p className="font-semibold text-gray-900">{listing.is_verified ? 'Verified' : 'Pending'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Listing Details */}
      <div className="bg-slate-50/80 p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Property Details</h3>
            <p className="text-sm text-gray-500 mt-1">Important information about this land</p>
          </div>
          <span className="hidden sm:inline-flex items-center rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">Listing information</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" /> Legal & Regulatory
            </h4>
            <div className="space-y-0 divide-y divide-slate-100">
              <div className="flex items-start justify-between gap-4 py-3 first:pt-0 text-sm">
                <span className="text-gray-500">Zoning</span>
                <span className="font-medium text-gray-900">{listing.zoning_classification || '—'}</span>
              </div>
              <div className="flex items-start justify-between gap-4 py-3 text-sm">
                <span className="text-gray-500">Title Status</span>
                <span className="font-medium text-gray-900">{listing.land_title_status || '—'}</span>
              </div>
              <div className="flex items-start justify-between gap-4 py-3 last:pb-0 text-sm">
                <span className="text-gray-500">Lot / Block</span>
                <span className="font-medium text-gray-900">{listing.lot_block_number || '—'}</span>
              </div>
            </div>
          </div>

          {(() => {
            const isOwnerOrAdmin = user && (user.role === 'admin' || user.role === 'seller')
            const isAssignedBuyer = user && user.role === 'buyer' && listing.assigned_buyer_id === user.id
            return isOwnerOrAdmin || isAssignedBuyer
          })() && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <PesoIcon className="w-4 h-4 text-brand-600" /> Financial Terms
              </h4>
              <div className="space-y-0 divide-y divide-slate-100">
                <div className="flex items-start justify-between gap-4 py-3 first:pt-0 text-sm">
                  <span className="text-gray-500">Reservation Fee</span>
                  <span className="font-medium text-gray-900">{listing.reservation_fee ? `₱${Number(listing.reservation_fee).toLocaleString()}` : '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-4 py-3 text-sm">
                  <span className="text-gray-500">Min. Down Payment</span>
                  <span className="font-medium text-gray-900">{listing.minimum_down_payment_pct || '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-4 py-3 text-sm">
                  <span className="text-gray-500">Cash Discount</span>
                  <span className="font-medium text-gray-900">{listing.cash_term_enabled ? `${listing.cash_term_discount_pct}%` : 'Not offered'}</span>
                </div>
                <div className="flex items-start justify-between gap-4 py-3 text-sm">
                  <span className="text-gray-500">In-House Financing</span>
                  <span className="font-medium text-gray-900">{listing.in_house_financing_enabled ? `${listing.in_house_max_term_years} yrs @ ${listing.in_house_interest_rate_pct}%` : 'Not offered'}</span>
                </div>
                <div className="flex items-start justify-between gap-4 py-3 text-sm">
                  <span className="text-gray-500">Bank / Gov Loan</span>
                  <span className="font-medium text-gray-900">{listing.bank_government_loan_enabled ? 'Supported' : 'Not supported'}</span>
                </div>
                <div className="flex items-start justify-between gap-4 py-3 text-sm">
                  <span className="text-gray-500">Monthly Payment</span>
                  <span className="font-medium text-gray-900">{listing.monthly_payment_amount ? `₱${Number(listing.monthly_payment_amount).toLocaleString()}` : '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-4 py-3 last:pb-0 text-sm">
                  <span className="text-gray-500">Late Penalty</span>
                  <span className="font-medium text-gray-900">{listing.penalty_rate_pct ? `${listing.penalty_rate_pct}%` : '—'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Mountain className="w-4 h-4 text-brand-600" /> Physical Attributes
            </h4>
            <div className="space-y-0 divide-y divide-slate-100">
              <div className="flex items-start justify-between gap-4 py-3 first:pt-0 text-sm">
                <span className="text-gray-500">Terrain</span>
                <span className="font-medium text-gray-900">{listing.terrain_topography || '—'}</span>
              </div>
              <div className="flex items-start justify-between gap-4 py-3 last:pb-0 text-sm">
                <span className="text-gray-500">Lot Configuration</span>
                <span className="font-medium text-gray-900">{listing.lot_configuration || '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-600" /> Utilities Readiness
            </h4>
            <div className="min-h-10 flex flex-wrap content-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
              {listing.utilities?.electricity_ready && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <Zap className="w-3 h-3" /> Electricity
                </span>
              )}
              {listing.utilities?.water_ready && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <Droplets className="w-3 h-3" /> Water
                </span>
              )}
              {listing.utilities?.telecom_ready && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  <Wifi className="w-3 h-3" /> Telecom/Fiber
                </span>
              )}
              {!listing.utilities?.electricity_ready && !listing.utilities?.water_ready && !listing.utilities?.telecom_ready && (
                <span className="text-sm text-gray-400">No utilities marked ready</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {showMessage && (
        <MessageSellerModal listing={listing} onClose={() => setShowMessage(false)} />
      )}

      <MilestoneTracker listing={listing} hasTransaction={listing.status === 'sold'} />

      {user?.role === 'buyer' && listing.status === 'available' && (
        <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100">
          <button
            onClick={() => setShowPay(!showPay)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <CreditCard className="w-4 h-4" /> {showPay ? 'Cancel' : 'Record Payment'}
          </button>
          {showPay && (
            <form onSubmit={handlePayment} className="mt-4 space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <input
                type="number"
                placeholder="Amount"
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={payment.amount}
                onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Reference Number"
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={payment.reference_number}
                onChange={(e) => setPayment({ ...payment, reference_number: e.target.value })}
              />
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">Submit Payment</button>
            </form>
          )}
        </div>
      )}

      {user?.role === 'seller' && listing.assignedBuyer && (
        <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <UserCheck className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-lg text-gray-900">Buyer Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-brand-50/50 rounded-xl border border-brand-100/60">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <User className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Full Name</p>
                <p className="text-sm font-semibold text-gray-900">{listing.assignedBuyer.full_name || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-brand-50/50 rounded-xl border border-brand-100/60">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Mail className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-sm font-semibold text-gray-900">{listing.assignedBuyer.email || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-brand-50/50 rounded-xl border border-brand-100/60">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Phone className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                <p className="text-sm font-semibold text-gray-900">{listing.assignedBuyer.phone || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-brand-50/50 rounded-xl border border-brand-100/60">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Phone className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Phone 2</p>
                <p className="text-sm font-semibold text-gray-900">{listing.assignedBuyer.phone2 || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-brand-50/50 rounded-xl border border-brand-100/60">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Calendar className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Birthdate</p>
                <p className="text-sm font-semibold text-gray-900">{listing.assignedBuyer.birthdate ? new Date(listing.assignedBuyer.birthdate).toLocaleDateString() : '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-brand-50/50 rounded-xl border border-brand-100/60">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Home className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Address</p>
                <p className="text-sm font-semibold text-gray-900">{listing.assignedBuyer.address || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
