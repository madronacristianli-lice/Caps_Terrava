import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileCheck2,
  Landmark,
  Layers3,
  LockKeyhole,
  Mail,
  Map,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import api from '../api/api.js'
import { resolveMediaUrl } from '../utils/media.js'
import MapView from '../components/MapView.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { BRANCHES, displayBranchName, getBranch } from '../utils/branches.js'

const LAND_TYPES = ['Residential', 'Commercial', 'Agricultural', 'Industrial']

const PRICE_OPTIONS = [
  { value: '', label: 'Any price' },
  { value: '1000000', label: 'Up to ₱1M' },
  { value: '2500000', label: 'Up to ₱2.5M' },
  { value: '5000000', label: 'Up to ₱5M' },
  { value: '10000000', label: 'Up to ₱10M' },
]

const featureCards = [
  { icon: Map, title: 'GIS Mapping', label: 'See the land clearly', desc: 'Explore live locations, plotted boundaries, area measurements, and branch coverage before you visit.', accent: 'from-emerald-500 to-teal-600' },
  { icon: FileCheck2, title: 'Land Verification', label: 'Review with confidence', desc: 'Listings move through Terrava’s verification workflow before they are presented to public buyers.', accent: 'from-sky-500 to-blue-600' },
  { icon: LockKeyhole, title: 'Blockchain Audit Trail', label: 'Keep payment records accountable', desc: 'Payment events can be linked to an audit record. This supports accountability without claiming independent legal title validation.', accent: 'from-violet-500 to-indigo-600' },
  { icon: WalletCards, title: 'Secure Transactions', label: 'Track every milestone', desc: 'Buyers and sellers can follow payment progress, receipts, and branch responsibility in one system.', accent: 'from-amber-500 to-orange-600' },
  { icon: Users, title: 'Role-Based Access', label: 'The right view for every role', desc: 'Buyer, seller, branch, and admin workflows stay separated while working from the same source of truth.', accent: 'from-rose-500 to-pink-600' },
]

const processSteps = [
  { number: '01', title: 'Explore verified listings', short: 'Start with a clear view of the market.', buyer: 'Search by location, land type, price, or branch. Open the map to inspect a property’s location and boundary where available.', seller: 'Create a listing with the property details, photos, and GIS information needed for administrator review.', icon: Search },
  { number: '02', title: 'Connect with a branch', short: 'Move from screen to real-world guidance.', buyer: 'Choose the branch that is convenient for you, message the seller, and arrange the next step without travelling blindly.', seller: 'Coordinate with interested buyers and keep the listing information consistent across Terrava branches.', icon: Navigation },
  { number: '03', title: 'Record the transaction', short: 'Make payment progress easier to follow.', buyer: 'View payment milestones, receipts, and the remaining balance from your buyer workspace.', seller: 'Record payments at the branch receiving them so the shared record and accountability trail stay current.', icon: CircleDollarSign },
]

const branchStyles = {
  'Main Tagum': 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Panabo: 'border-blue-200 bg-blue-50 text-blue-800',
  'Sto. Tomas': 'border-violet-200 bg-violet-50 text-violet-800',
  'Davao City': 'border-amber-200 bg-amber-50 text-amber-800',
  'Mati City': 'border-pink-200 bg-pink-50 text-pink-800',
  'Digos City': 'border-indigo-200 bg-indigo-50 text-indigo-800',
}

const formatPrice = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 'Price on request'
  return `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}

const formatCount = (value) => (value == null ? '—' : Number(value).toLocaleString('en-PH'))

function FadeIn({ children, className = '', delay = 0 }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function PropertyVisual({ listing }) {
  const [imageFailed, setImageFailed] = useState(false)
  const photo = Array.isArray(listing.photos) && listing.photos.length > 0 ? listing.photos[0] : null

  if (photo && !imageFailed) {
    return <img src={resolveMediaUrl(photo)} alt={listing.title || 'Land listing'} onError={() => setImageFailed(true)} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
  }

  return <MapView singleListing={listing} height="100%" dragging={false} scrollWheelZoom={false} doubleClickZoom={false} showLayersControl={false} showAttribution={false} containerClassName="h-full w-full" />
}

function SectionHeading({ eyebrow, title, description, light = false }) {
  return (
    <div className="max-w-2xl">
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${light ? 'border-white/15 bg-white/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </span>
      <h2 className={`mt-4 text-3xl font-black tracking-tight md:text-5xl ${light ? 'text-white' : 'text-slate-950 dark:text-white'}`}>{title}</h2>
      {description && <p className={`mt-4 max-w-xl text-base leading-relaxed md:text-lg ${light ? 'text-white/65' : 'text-slate-600 dark:text-slate-300'}`}>{description}</p>}
    </div>
  )
}

function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const selected = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    if (!open) return undefined
    const handleOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={dropdownRef} className="relative">
      <span className="sr-only">{label}</span>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-left text-sm font-semibold text-slate-700 outline-none transition hover:border-emerald-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:border-emerald-500 dark:focus:bg-slate-900"
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" aria-label={label} className="absolute left-0 right-0 z-[80] mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1 text-white shadow-2xl shadow-slate-950/30">
          {options.map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={`flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm transition ${option.value === value ? 'bg-emerald-700 font-bold text-white' : 'text-slate-100 hover:bg-slate-700'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PropertyCard({ listing, onMap }) {
  const reduceMotion = useReducedMotion()
  const verified = listing.is_verified !== false
  const branch = getBranch(listing)
  return (
    <motion.article layout={!reduceMotion} whileHover={reduceMotion ? undefined : { y: -6 }} transition={{ duration: 0.22 }} className="group overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.07)] transition-shadow hover:shadow-[0_20px_55px_rgba(6,78,59,0.14)] dark:border-slate-800 dark:bg-slate-900">
      <div className="relative h-52 overflow-hidden bg-slate-100">
        <PropertyVisual listing={listing} />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-slate-950/45 to-transparent p-4">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">{displayBranchName(branch)}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}><BadgeCheck className="h-3.5 w-3.5" />{verified ? 'Verified listing' : 'Review status'}</span>
        </div>
        <div className="absolute bottom-3 left-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-bold text-white backdrop-blur">{listing.zoning_classification || 'Land property'}</div>
      </div>
      <div className="p-5">
        <h3 className="line-clamp-1 text-lg font-extrabold text-slate-950 dark:text-white">{listing.title || 'Land listing'}</h3>
        <div className="mt-3 flex items-end justify-between gap-3"><p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatPrice(listing.price)}</p><span className="whitespace-nowrap text-sm font-semibold text-slate-500">{Number(listing.area_sqm || 0).toLocaleString('en-PH')} sqm</span></div>
        <p className="mt-3 flex min-h-10 items-start gap-2 text-sm leading-relaxed text-slate-500 dark:text-slate-300"><MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" /><span className="line-clamp-2">{listing.location_text || 'Location available in listing details'}</span></p>
        <div className="mt-5 flex gap-2"><Link to={`/listing/${listing.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-emerald-600">View details <ArrowRight className="h-4 w-4" /></Link><button type="button" onClick={() => onMap(listing)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"><Map className="h-4 w-4" /> Map</button></div>
      </div>
    </motion.article>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [activeStep, setActiveStep] = useState(0)
  const [processRole, setProcessRole] = useState('buyer')
  const [previewListing, setPreviewListing] = useState(null)

  useEffect(() => {
    let mounted = true
    api.get('/listings').then((res) => { if (mounted) setListings(Array.isArray(res.data) ? res.data : []) }).catch(() => { if (mounted) setListings([]) }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const publicListings = useMemo(() => listings.filter((listing) => !listing.archived), [listings])

  const filteredListings = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const numericMax = maxPrice ? Number(maxPrice) : null
    return publicListings.filter((listing) => {
      const matchesQuery = !normalized || [listing.title, listing.location_text, getBranch(listing)].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized))
      const matchesType = !type || listing.zoning_classification === type
      const matchesPrice = !numericMax || Number(listing.price) <= numericMax
      return matchesQuery && matchesType && matchesPrice
    })
  }, [maxPrice, publicListings, query, type])

  const featuredListings = useMemo(() => {
    if (query.trim() || type || maxPrice) return filteredListings.slice(0, 6)
    return publicListings.slice(0, 3)
  }, [filteredListings, maxPrice, publicListings, query, type])

  const branchCounts = useMemo(() => {
    const counts = Object.fromEntries(BRANCHES.map((branch) => [branch, 0]))
    publicListings.forEach((listing) => { const branch = getBranch(listing); if (counts[branch] !== undefined) counts[branch] += 1 })
    return counts
  }, [publicListings])

  const stats = [
    { label: 'Verified listings', value: loading ? '—' : formatCount(publicListings.length), icon: BadgeCheck },
    { label: 'Active branches', value: loading ? '—' : formatCount(Object.values(branchCounts).filter(Boolean).length), icon: Building2 },
    { label: 'Mapped properties', value: loading ? '—' : formatCount(publicListings.filter((listing) => listing.polygon_geojson?.coordinates?.[0]).length), icon: Map },
    { label: 'Land categories', value: loading ? '—' : formatCount(new Set(publicListings.map((listing) => listing.zoning_classification).filter(Boolean)).size), icon: Layers3 },
  ]

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  const submitSearch = (event) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('search', query.trim())
    if (type) params.set('type', type)
    if (maxPrice) params.set('maxPrice', maxPrice)
    const suffix = params.toString()
    if (user) navigate(`/map${suffix ? `?${suffix}` : ''}`)
    else scrollTo('properties')
  }
  const openMap = () => {
    if (user) navigate('/map')
    else scrollTo('map-preview')
  }
  const viewListingOnMap = (listing) => {
    if (user) navigate('/map', { state: { selectedListing: listing } })
    else {
      setPreviewListing(listing)
      scrollTo('map-preview')
    }
  }
  const browseBranch = (branch) => {
    if (user) navigate(`/map?branch=${encodeURIComponent(branch)}`)
    else {
      setQuery(branch)
      setType('')
      setMaxPrice('')
      scrollTo('properties')
    }
  }
  const heroListing = publicListings.find((listing) => listing.photos?.length > 0)
  const heroPhoto = heroListing?.photos?.[0]
  const mapPreviewListings = publicListings.slice(0, 12)
  const currentStep = processSteps[activeStep]
  const CurrentStepIcon = currentStep.icon

  return (
    <div className="landing-flow flex flex-col overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <section id="top" className="order-1 relative isolate overflow-hidden bg-brand-950 text-white">
        {heroPhoto && <img src={resolveMediaUrl(heroPhoto)} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-20 mix-blend-screen" />}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_18%,rgba(52,211,153,0.28),transparent_30%),radial-gradient(circle_at_86%_78%,rgba(20,184,166,0.24),transparent_32%),linear-gradient(115deg,rgba(2,44,34,0.97),rgba(6,95,70,0.92),rgba(2,44,34,0.96))]" />
        <div className="absolute -right-32 top-20 -z-10 h-96 w-96 rounded-full border border-emerald-300/10 bg-emerald-400/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.03fr_0.97fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
          <motion.div initial={reduceMotion ? false : { opacity: 0, x: -20 }} animate={reduceMotion ? undefined : { opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-emerald-100 shadow-lg backdrop-blur"><ShieldCheck className="h-4 w-4 text-emerald-300" />Land decisions with more clarity</div>
            <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">See the land.<span className="block text-emerald-300">Know the record.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-emerald-50/75 sm:text-xl">Terrava connects verified land listings, GIS mapping, branch guidance, and payment records in one practical workspace for the Philippines.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-extrabold text-brand-900 shadow-xl transition hover:-translate-y-0.5 hover:bg-emerald-50">Start exploring <ArrowRight className="h-5 w-5" /></Link><button type="button" onClick={() => scrollTo('properties')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10">Browse live listings <ChevronDown className="h-5 w-5" /></button></div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-emerald-100/75"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Map-first discovery</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Branch-aware support</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Accountable payment records</span></div>
          </motion.div>
          <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 18 }} animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.12 }} className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-emerald-400/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.8rem] border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur-xl"><div className="relative h-[360px] overflow-hidden rounded-[1.35rem] bg-emerald-950 sm:h-[440px]">
              <MapView listings={mapPreviewListings} height="100%" fitBounds showLayersControl={false} showAttribution />
              <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-3"><div className="rounded-2xl border border-white/20 bg-slate-950/65 px-4 py-3 text-white shadow-lg backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Live map preview</p><p className="mt-1 text-sm font-bold">Verified properties near your next visit</p></div><div className="rounded-xl border border-white/20 bg-white/90 px-3 py-2 text-right text-slate-900 shadow-lg backdrop-blur"><p className="text-lg font-black text-emerald-700">{loading ? '—' : formatCount(mapPreviewListings.length)}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">shown on map</p></div></div>
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3"><div className="rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow-lg backdrop-blur"><MapPin className="mr-1 inline h-3.5 w-3.5 text-emerald-700" />Davao Region coverage</div><button type="button" onClick={openMap} className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-extrabold text-white shadow-lg transition hover:bg-emerald-800">Open map <ExternalLink className="h-3.5 w-3.5" /></button></div>
            </div></div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-white [clip-path:ellipse(65%_100%_at_50%_100%)] dark:bg-slate-950" />
      </section>

      <section className="relative z-10 mx-auto -mt-2 max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <form onSubmit={submitSearch} className="rounded-[1.5rem] border border-emerald-100 bg-white p-4 shadow-[0_20px_60px_rgba(6,78,59,0.14)] dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Search the live inventory</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Use real Terrava records to narrow your next visit.</p>
              </div>
              <span className="text-xs font-bold text-slate-400">{loading ? 'Loading listings…' : `${filteredListings.length} matching listing${filteredListings.length === 1 ? '' : 's'}`}</span>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
              <label className="relative block">
                <span className="sr-only">Search by location or title</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, location, or branch" className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900" />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"><X className="h-4 w-4" /></button>}
              </label>
              <FilterDropdown label="Property type" value={type} options={[{ value: '', label: 'All land types' }, ...LAND_TYPES.map((landType) => ({ value: landType, label: landType }))]} onChange={setType} />
              <FilterDropdown label="Maximum price" value={maxPrice} options={PRICE_OPTIONS} onChange={setMaxPrice} />
              <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-emerald-800">Search <ArrowRight className="h-4 w-4" /></button>
            </div>
          </form>
        </FadeIn>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">{stats.map((stat, index) => { const Icon = stat.icon; return <FadeIn key={stat.label} delay={index * 0.05}><div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6"><div className="flex items-center justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><Icon className="h-5 w-5" /></div><BarChart3 className="h-4 w-4 text-slate-300" /></div><p className="mt-5 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{stat.value}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{stat.label}</p></div></FadeIn> })}</div></section>

      <section id="properties" className="bg-slate-50/80 py-20 dark:bg-slate-900/70"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><FadeIn className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><SectionHeading eyebrow={query.trim() || type || maxPrice ? 'Search results' : 'Live inventory'} title={query.trim() || type || maxPrice ? 'Properties matching your search' : 'Featured land properties'} description="These cards are loaded from Terrava’s public listing records. Open a property to inspect the details or take it to the interactive map." /><button type="button" onClick={openMap} className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 md:self-end dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300">Explore all listings <ArrowRight className="h-4 w-4" /></button></FadeIn>{loading ? <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[28rem] animate-pulse rounded-[1.4rem] bg-white shadow-sm dark:bg-slate-800" />)}</div> : featuredListings.length > 0 ? <motion.div layout={!reduceMotion} className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{featuredListings.map((listing) => <PropertyCard key={listing.id} listing={listing} onMap={viewListingOnMap} />)}</motion.div> : <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900"><Search className="mx-auto h-8 w-8 text-slate-400" /><h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No matching public listings</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-300">Try another location, category, or price range. The search is using the current verified inventory.</p><button type="button" onClick={() => { setQuery(''); setType(''); setMaxPrice('') }} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800">Clear filters <X className="h-4 w-4" /></button></div>}</div></section>

      <section id="map-preview" className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8 lg:py-28"><FadeIn><SectionHeading eyebrow="Explore spatially" title="See where every opportunity sits." description="The same Leaflet map used by Terrava’s buyer experience is available before sign-in, so visitors can understand location and boundaries before they plan a branch visit." /><div className="mt-8 space-y-4">{[{ icon: Map, title: 'Clickable property markers', text: 'Open a listing from the map and continue into its full details.' }, { icon: Landmark, title: 'Verified GeoJSON boundaries', text: 'When a listing includes a boundary, the land shape is drawn directly on the map.' }, { icon: Navigation, title: 'Branch-aware discovery', text: 'Start with a branch filter when a location is already in mind.' }].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><Icon className="h-5 w-5" /></div><div><h3 className="font-extrabold text-slate-900 dark:text-white">{title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-300">{text}</p></div></div>)}</div><button type="button" onClick={openMap} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-extrabold text-white transition hover:bg-emerald-800">Open the full map <ArrowRight className="h-4 w-4" /></button></FadeIn><FadeIn delay={0.08} className="relative"><div className="absolute -inset-5 rounded-[2rem] bg-emerald-100/70 blur-2xl dark:bg-emerald-950/40" /><div className="relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-2 shadow-[0_22px_70px_rgba(6,78,59,0.16)] dark:border-slate-800 dark:bg-slate-900"><div className="relative h-[430px] overflow-hidden rounded-[1.2rem] bg-slate-100 sm:h-[520px]"><MapView listings={previewListing ? [previewListing] : mapPreviewListings} height="100%" fitBounds showLayersControl={false} showAttribution /><div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-white/30 bg-slate-950/75 px-4 py-3 text-white shadow-lg backdrop-blur"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Interactive preview</p><p className="mt-1 text-sm font-semibold">{previewListing ? 'Showing the property you selected' : 'Click a marker to inspect a listing'}</p></div></div></div></FadeIn></section>

      <section id="branches" className="bg-emerald-50/70 py-20 dark:bg-emerald-950/30"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><FadeIn><SectionHeading eyebrow="Browse by location" title="Start with the branch that works for you." description="Explore live listing counts by Terrava branch, then open the map already focused on that area." /></FadeIn><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{BRANCHES.map((branch, index) => { const count = branchCounts[branch] || 0; return <FadeIn key={branch} delay={index * 0.04}><button type="button" onClick={() => browseBranch(branch)} className={`group flex min-h-28 w-full items-center justify-between gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900 ${branchStyles[branch] || 'border-slate-200 text-slate-800'}`}><span className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 shadow-sm"><Building2 className="h-5 w-5" /></span><span><span className="block font-extrabold">{branch}</span><span className="mt-1 block text-xs font-semibold opacity-70">{count} public listing{count === 1 ? '' : 's'}</span></span></span><ArrowRight className="h-5 w-5 flex-shrink-0 transition group-hover:translate-x-1" /></button></FadeIn> })}</div></div></section>

      <section id="about" className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:py-28"><FadeIn><SectionHeading eyebrow="Why Terrava" title="A clearer path from land discovery to accountable records." description="Terrava brings the parts of a land transaction that are usually scattered across messages, maps, and paper receipts into one role-aware workspace." /><div className="mt-8 grid gap-3 sm:grid-cols-2">{['Live listing discovery', 'Branch coordination', 'Payment milestone visibility', 'Administrator review workflow'].map((item) => <div key={item} className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{item}</div>)}</div></FadeIn><FadeIn delay={0.08} className="rounded-[1.7rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm dark:border-emerald-900 dark:from-emerald-950/60 dark:to-slate-900 sm:p-8"><div className="flex items-center justify-between gap-3 border-b border-emerald-900/10 pb-5 dark:border-white/10"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Built for practical trust</p><h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">One shared picture of the transaction</h3></div><div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg sm:flex"><ShieldCheck className="h-6 w-6" /></div></div><div className="mt-6 space-y-4">{[['Map context', 'Know the approximate location and land boundary before visiting.'], ['Workflow context', 'See whether a listing is available, under review, reserved, or progressing through payment.'], ['Record context', 'Keep receipts and payment events connected to the property and receiving branch.']].map(([title, text], index) => <div key={title} className="flex gap-3"><span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white">0{index + 1}</span><div><p className="font-extrabold text-slate-900 dark:text-white">{title}</p><p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{text}</p></div></div>)}</div></FadeIn></section>

      <section id="features" className="bg-brand-950 py-20 text-white lg:py-28"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><FadeIn><SectionHeading light eyebrow="Platform capabilities" title="Technology that supports the people doing the work." description="Each capability is designed to reduce confusion without hiding the human and legal steps that still matter in a land transaction." /></FadeIn><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-5">{featureCards.map(({ icon: Icon, title, label, desc, accent }, index) => <FadeIn key={title} delay={index * 0.04} className="h-full"><motion.article whileHover={reduceMotion ? undefined : { y: -6 }} className="h-full rounded-[1.4rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl transition hover:border-white/20 hover:bg-white/[0.1]"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} shadow-lg`}><Icon className="h-6 w-6 text-white" /></div><h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-300">{label}</p><p className="mt-4 text-sm leading-relaxed text-white/60">{desc}</p></motion.article></FadeIn>)}</div></div></section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><FadeIn className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><SectionHeading eyebrow="How Terrava works" title="A guided flow for buyers and sellers." description="Select a step to see how the same platform supports both sides of the transaction." /><div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">{['buyer', 'seller'].map((role) => <button key={role} type="button" onClick={() => setProcessRole(role)} className={`min-h-11 rounded-lg px-4 text-sm font-extrabold capitalize transition ${processRole === role ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-700 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'}`}>{role} view</button>)}</div></FadeIn><div className="mt-10 grid gap-8 lg:grid-cols-[0.75fr_1.25fr]"><div className="space-y-3">{processSteps.map((step, index) => { const Icon = step.icon; const active = index === activeStep; return <button key={step.number} type="button" onClick={() => setActiveStep(index)} className={`flex min-h-20 w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${active ? 'border-emerald-500 bg-emerald-50 shadow-md dark:border-emerald-500 dark:bg-emerald-950/40' : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900'}`}><span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${active ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-xs font-black uppercase tracking-widest text-slate-400">{step.number}</span><span className="mt-1 block truncate font-extrabold text-slate-900 dark:text-white">{step.title}</span></span><ArrowRight className={`ml-auto h-4 w-4 flex-shrink-0 transition ${active ? 'translate-x-1 text-emerald-700' : 'text-slate-300'}`} /></button> })}</div><AnimatePresence mode="wait"><motion.div key={`${activeStep}-${processRole}`} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }} className="relative overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-emerald-800 to-brand-950 p-7 text-white shadow-xl sm:p-10"><div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-emerald-400/15 blur-2xl" /><div className="relative"><div className="flex items-center justify-between gap-4"><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Step {currentStep.number}</span><CurrentStepIcon className="h-8 w-8 text-emerald-300" /></div><h3 className="mt-10 text-3xl font-black tracking-tight sm:text-4xl">{currentStep.title}</h3><p className="mt-3 text-lg font-semibold text-emerald-200">{currentStep.short}</p><p className="mt-6 max-w-xl text-base leading-relaxed text-white/70">{processRole === 'buyer' ? currentStep.buyer : currentStep.seller}</p><div className="mt-10 flex items-center gap-2 text-sm font-bold text-white/70"><Clock3 className="h-4 w-4 text-emerald-300" />Clear next steps, visible from the start</div></div></motion.div></AnimatePresence></div></section>

      <section id="contact" className="bg-slate-50/80 py-20 dark:bg-slate-900/70 lg:py-28"><div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8"><FadeIn><SectionHeading eyebrow="Talk to Terrava" title="Have a property or a question? Start with a real person." description="Use the contact details already provided by the system or create an account to enter the buyer or seller workflow." /><div className="mt-8 space-y-4"><a href="mailto:info@terrava.ph" className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><Mail className="h-5 w-5" /></span><span><span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Email</span><span className="mt-1 block font-extrabold text-slate-900 dark:text-white">info@terrava.ph</span></span></a><a href="tel:+639120000001" className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><Phone className="h-5 w-5" /></span><span><span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Main office</span><span className="mt-1 block font-extrabold text-slate-900 dark:text-white">+63 912 000 0001 · Tagum City</span></span></a></div></FadeIn><FadeIn delay={0.08} className="rounded-[1.7rem] bg-brand-950 p-7 text-white shadow-xl sm:p-10"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Start with the right workspace</p><h3 className="mt-3 text-3xl font-black">Ready to explore Terrava?</h3></div><Building2 className="h-8 w-8 text-emerald-300" /></div><p className="mt-4 max-w-xl leading-relaxed text-white/65">Create an account when you are ready to message sellers, save properties, manage listings, or track a payment record.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-brand-900 hover:bg-emerald-50">Create an account <ArrowRight className="h-4 w-4" /></Link><Link to="/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-bold text-white hover:bg-white/10">Sign in <ExternalLink className="h-4 w-4" /></Link></div></FadeIn></div></section>

      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-700 to-brand-950 px-4 py-20 text-center text-white"><div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-300/15 blur-3xl" /><div className="relative mx-auto max-w-3xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">A better first step</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Find your next land opportunity with more clarity.</h2><p className="mx-auto mt-5 max-w-2xl text-white/70">Explore the live map, compare what matters, and connect with a Terrava branch when you are ready.</p><Link to="/register" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-extrabold text-brand-900 shadow-xl transition hover:-translate-y-0.5 hover:bg-emerald-50">Get started with Terrava <ArrowRight className="h-5 w-5" /></Link></div></section>
    </div>
  )
}
