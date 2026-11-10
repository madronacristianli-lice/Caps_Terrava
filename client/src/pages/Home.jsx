import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/api.js'
import MapView from '../components/MapView.jsx'
import Spinner from '../components/Spinner.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Search, Plus, MapPin, ExternalLink, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import { BRANCHES, displayBranchName, getBranch } from '../utils/branches.js'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [branch, setBranch] = useState('all')
  const [flyTo, setFlyTo] = useState(null)
  const [listingPage, setListingPage] = useState(1)
  const listingsPerPage = 9

  useEffect(() => {
    setLoading(true)
    setLoadError('')
    api.get('/listings')
      .then((res) => setListings(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        setListings([])
        setLoadError(err.response?.data?.error || 'Unable to load land listings. Please try again.')
      })
      .finally(() => setLoading(false))
  }, [])

  const available = listings.filter((l) => l.status === 'available')
  const filtered = available.filter((l) => {
    const matchesSearch = (l.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.location_text || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.branch || '').toLowerCase().includes(search.toLowerCase())
    const matchesBranch = branch === 'all' || getBranch(l) === branch
    return matchesSearch && matchesBranch
  })
  const grouped = Object.fromEntries(
    BRANCHES.map((b) => [b, available.filter((l) => getBranch(l) === b)])
  )
  const busiestBranch = branch === 'all'
    ? BRANCHES.reduce((current, candidate) => (
      grouped[candidate].length > (grouped[current]?.length || 0) ? candidate : current
    ), BRANCHES[0])
    : null

  useEffect(() => {
    if (branch !== 'all' || !filtered.length || !busiestBranch) return
    setFlyTo((current) => current?.branch === busiestBranch ? current : { branch: busiestBranch })
  }, [branch, search, listings, busiestBranch, filtered.length])

  useEffect(() => {
    setListingPage(1)
  }, [search, branch, listings.length])

  const listingPageCount = Math.max(1, Math.ceil(filtered.length / listingsPerPage))
  const currentListingPage = Math.min(listingPage, listingPageCount)
  const visibleListings = filtered.slice(
    (currentListingPage - 1) * listingsPerPage,
    currentListingPage * listingsPerPage
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Explore Land Listings</h1>
          <p className="text-gray-600 mt-1">Browse verified properties with GIS maps and blockchain-backed records.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {(!user || user.role === 'seller' || user.role === 'admin') && (
            <Link to="/create-listing" className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition shadow-sm">
              <Plus className="w-4 h-4" /> Post a Listing
            </Link>
          )}
        </div>
      </div>

      <div className="h-[300px] md:h-[400px] rounded-2xl overflow-hidden border border-gray-200 shadow-card">
        <MapView listings={filtered} height="100%" flyTo={flyTo} />
      </div>

      {loadError && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
          <p className="font-semibold text-red-800">Listings could not be loaded</p>
          <p className="mt-1 text-sm text-red-700/80">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
        </div>
        <div className="relative min-w-[180px]">
          <select
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value)
              if (e.target.value !== 'all') setFlyTo({ branch: e.target.value })
              else setFlyTo(null)
            }}
            className="w-full appearance-none pl-4 pr-10 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm cursor-pointer"
          >
            <option value="all">All Branches ({available.length})</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>{displayBranchName(b)} ({grouped[b].length})</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {filtered.length === 0 ? (
            <EmptyState title="No listings found" message="Try adjusting your search or be the first to post a property." />
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleListings.map((listing) => (
                <div
                  key={listing.id}
                  onClick={() => navigate('/map', { state: { selectedListing: listing } })}
                  className="group bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                >
                  <div className="h-48 bg-gray-100 relative overflow-hidden rounded-t-2xl">
                    <MapView
                      singleListing={listing}
                      height="100%"
                      dragging={false}
                      scrollWheelZoom={false}
                      zoomControl={false}
                      doubleClickZoom={false}
                      showLayersControl={false}
                      showAttribution={false}
                    />
                    <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/90 text-brand-700 shadow-sm backdrop-blur-sm">
                        {getBranch(listing)}
                      </span>
                      <div className="flex items-center gap-2">
                        <FavoriteButton
                          listingId={listing.id}
                          size={18}
                          className="w-8 h-8 rounded-lg bg-white/90 shadow-sm backdrop-blur-sm items-center justify-center hover:bg-white"
                        />
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-600/90 text-white shadow-sm backdrop-blur-sm pointer-events-none">
                          <ExternalLink className="w-3 h-3" /> View Map
                        </span>
                      </div>
                    </div>
                    <span className={`absolute bottom-3 left-3 z-10 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-sm pointer-events-none ${
                      (listing.zoning_classification || (/commercial/i.test(listing.title || '') ? 'Commercial' : '')).toLowerCase() === 'commercial' ? 'bg-amber-100/95 text-amber-700' :
                      (listing.zoning_classification || '').toLowerCase() === 'agricultural' ? 'bg-green-100/95 text-green-700' :
                      (listing.zoning_classification || '').toLowerCase() === 'industrial' ? 'bg-violet-100/95 text-violet-700' :
                      'bg-blue-100/95 text-blue-700'
                    }`}>
                      {listing.zoning_classification || (/commercial/i.test(listing.title || '') ? 'Commercial' : 'Land')}
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 group-hover:text-brand-700 transition">{listing.title}</h3>
                    <p className="text-brand-600 font-bold text-lg">₱{Number(listing.price).toLocaleString()}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded-lg">{listing.area_sqm} sqm</span>
                      <span className="line-clamp-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0 text-brand-600" /> {listing.location_text}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">Seller: {listing.seller?.full_name}</p>
                  </div>
                </div>
                ))}
              </div>
              {filtered.length > listingsPerPage && (
                <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500">
                    Showing <span className="font-bold text-gray-700">{(currentListingPage - 1) * listingsPerPage + 1}</span>
                    {' '}to{' '}
                    <span className="font-bold text-gray-700">{Math.min(currentListingPage * listingsPerPage, filtered.length)}</span>
                    {' '}of <span className="font-bold text-gray-700">{filtered.length}</span> listings
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
            </div>
          )}
        </>
      )}
    </div>
  )
}
