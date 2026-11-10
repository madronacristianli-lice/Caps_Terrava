import { useState, useRef, useEffect } from 'react'
import {
  MapPin,
  FileText,
  Mountain,
  Image as ImageIcon,
  Plus,
  Upload,
  Check,
  ChevronDown,
  X,
  Search,
  Loader2,
  Maximize2,
  Minimize2
} from 'lucide-react'
import PesoIcon from './PesoIcon.jsx'
import MapView from './MapView.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import { displayBranchName, normalizeBranchName, MINDANAO_CITIES, BRANCH_COORDINATES, BRANCH_ZOOM } from '../utils/branches.js'
import { BOUNDARY_POINT_COLORS, DEFAULT_BOUNDARY_POINT_COLOR, BOUNDARY_POINT_SIZES, DEFAULT_BOUNDARY_POINT_SIZE } from '../utils/mapColors.js'

const BRANCHES = [
  'Main Tagum',
  'Panabo',
  'Sto. Tomas',
  'Davao City',
  'Mati City',
  'Digos City'
]

const ZONING_OPTIONS = [
  'Residential',
  'Commercial',
  'Agricultural',
  'Industrial'
]

const TITLE_STATUS_OPTIONS = [
  'Individual TCT Available',
  'Part of Mother Title',
  'Clean Title',
  'Under Process'
]

const formatAmount = (value) => {
  const raw = String(value ?? '').replace(/,/g, '')
  if (!raw) return ''
  const [whole, decimal] = raw.split('.')
  const formattedWhole = whole.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decimal !== undefined ? `${formattedWhole}.${decimal.replace(/\D/g, '').slice(0, 2)}` : formattedWhole
}

const numericAmount = (value) => String(value ?? '').replace(/,/g, '')


const TERRAIN_OPTIONS = [
  'Flat / Level',
  'Sloped / Rolling',
  'Elevated',
  'Terraced'
]

const LOT_CONFIG_OPTIONS = [
  'Corner Lot',
  'Inner Lot',
  'Main Road Facing',
  'End Lot'
]

const SectionCard = ({ icon: Icon, title, children, className = '' }) => (
  <div className={`bg-white shadow-sm border border-slate-200 p-6 rounded-2xl ${className}`}>
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    </div>
    {children}
  </div>
)

const Label = ({ children, required }) => (
  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
)

const Input = ({ type = 'text', value, onChange, placeholder, required, min, max, step }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    required={required}
    min={min}
    max={max}
    step={step}
    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
  />
)

const Select = ({ value, onChange, options, placeholder, disabled = false }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full appearance-none border border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => {
        const optionValue = typeof opt === 'string' ? opt : opt.value
        const optionLabel = typeof opt === 'string' ? opt : opt.label
        return (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        )
      })}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
  </div>
)

const FileDrop = ({ label, accept, preview, fileName, isPdf, inputRef, onChange, onClear }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      className="hidden"
      onChange={onChange}
    />
    {!preview ? (
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-emerald-500 hover:bg-emerald-50/30 transition text-slate-500 hover:text-emerald-600"
      >
        <Upload className="w-6 h-6" />
        <span className="text-sm font-medium">Click to upload {accept.includes('pdf') ? 'PDF or image' : 'image'}</span>
        <span className="text-xs text-slate-400">Accepted: {accept}</span>
      </button>
    ) : (
      <div className="relative rounded-xl border border-slate-200 overflow-hidden group">
        {isPdf ? (
          <div className="bg-slate-50 p-6 flex items-center gap-3">
            <FileText className="w-8 h-8 text-emerald-600" />
            <span className="text-sm text-slate-700 truncate">{fileName || 'Selected file'}</span>
          </div>
        ) : (
          <img src={preview} alt="Preview" className="w-full h-40 object-cover" />
        )}
        <button
          type="button"
          onClick={onClear}
          className="absolute top-2 right-2 p-1 bg-white/90 rounded-full text-slate-600 hover:text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )}
  </div>
)

export default function CreateListingForm({ onSubmit, initialBranch = '', initialData = null, existingPhotos = [], existingPhotoGeotags = [], isEdit = false, branchLocked = false }) {
  const buildInitialState = () => {
    const data = initialData || {}
    const coords = data.polygon_geojson?.coordinates?.[0] || []
    const points = coords.length > 1 ? coords.slice(0, -1).map(([lng, lat]) => [lat, lng]) : coords.map(([lng, lat]) => [lat, lng])
    return {
      title: data.title || '',
      description: data.description || '',
      branch: branchLocked
        ? normalizeBranchName(initialBranch || data.branch || '')
        : normalizeBranchName(data.branch || initialBranch || ''),
      location_text: data.location_text || '',
      area_sqm: data.area_sqm || '',
      total_area_sqm: data.total_area_sqm || data.area_sqm || '',
      latitude: data.latitude || (points[0] ? points[0][0] : ''),
      longitude: data.longitude || (points[0] ? points[0][1] : ''),
      polygon_points: data.polygon_points || points,
      boundary_point_colors: data.boundary_point_colors || data.polygon_geojson?.properties?.point_colors || [],
      boundary_point_sizes: data.boundary_point_sizes || data.polygon_geojson?.properties?.point_sizes || [],
      zoning_classification: data.zoning_classification || '',
      land_title_status: data.land_title_status || '',
      total_contract_price: data.total_contract_price || data.price || '',
      reservation_fee: data.reservation_fee || '',
      minimum_down_payment_pct: data.minimum_down_payment_pct || '',
      cash_term_enabled: data.cash_term_enabled || false,
      cash_term_discount_pct: data.cash_term_discount_pct || '',
      in_house_financing_enabled: data.in_house_financing_enabled || false,
      in_house_max_term_years: data.in_house_max_term_years || '',
      in_house_interest_rate_pct: data.in_house_interest_rate_pct || '',
      bank_government_loan_enabled: data.bank_government_loan_enabled || false,
      penalty_rate_pct: data.penalty_rate_pct || '5.00',
      monthly_payment_amount: data.monthly_payment_amount || '',
      terrain_topography: data.terrain_topography || '',
      lot_configuration: data.lot_configuration || '',
      utilities: {
        electricity_ready: false,
        water_ready: false,
        telecom_ready: false,
        ...data.utilities
      },
      lot_block_number: data.lot_block_number || ''
    }
  }

  const [form, setForm] = useState(buildInitialState)
  const [mapCity, setMapCity] = useState('')
  const initialBranchCenter = !initialData ? BRANCH_COORDINATES[normalizeBranchName(initialBranch)] : null
  const [mapCityFocus, setMapCityFocus] = useState(initialBranchCenter ? { center: initialBranchCenter, zoom: BRANCH_ZOOM } : null)
  const [mapSearchQuery, setMapSearchQuery] = useState('')
  const [mapSearchResults, setMapSearchResults] = useState([])
  const [mapSearchLoading, setMapSearchLoading] = useState(false)
  const [mapSearchError, setMapSearchError] = useState('')
  const [pointColor, setPointColor] = useState(DEFAULT_BOUNDARY_POINT_COLOR)
  const [pointSize, setPointSize] = useState(DEFAULT_BOUNDARY_POINT_SIZE)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [photos, setPhotos] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [tctPreview, setTctPreview] = useState(null)
  const [taxPreview, setTaxPreview] = useState(null)
  const [formErrors, setFormErrors] = useState([])
  const [draftRestored, setDraftRestored] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const photoInputRef = useRef(null)
  const tctInputRef = useRef(null)
  const taxInputRef = useRef(null)
  const errorSummaryRef = useRef(null)
  const draftKey = `terrava-listing-draft:${isEdit ? `edit-${initialData?.id || 'unknown'}` : 'new'}`

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftKey)
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft)
        setForm((current) => ({
          ...current,
          ...parsedDraft,
          utilities: { ...current.utilities, ...(parsedDraft.utilities || {}) },
          polygon_points: Array.isArray(parsedDraft.polygon_points) ? parsedDraft.polygon_points : current.polygon_points
        }))
        setDraftRestored(true)
      }
    } catch {
      localStorage.removeItem(draftKey)
    } finally {
      setDraftLoaded(true)
    }
  }, [draftKey])

  useEffect(() => {
    if (!draftLoaded) return
    try {
      localStorage.setItem(draftKey, JSON.stringify(form))
    } catch {
      // Draft saving is helpful but must never block listing submission.
    }
  }, [draftKey, draftLoaded, form])

  useEffect(() => {
    if (formErrors.length > 0) errorSummaryRef.current?.focus()
  }, [formErrors])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateNested = (section, field, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }))
  }

  const addPolygonPoint = () => {
    const lat = parseFloat(form.latitude)
    const lng = parseFloat(form.longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      alert('Please enter a valid latitude and longitude first.')
      return
    }
    setMapCityFocus(null)
    setForm((prev) => ({
      ...prev,
      polygon_points: [...prev.polygon_points, [lat, lng]],
      boundary_point_colors: [...(prev.boundary_point_colors || []), pointColor],
      boundary_point_sizes: [...(prev.boundary_point_sizes || []), pointSize],
      latitude: '',
      longitude: ''
    }))
  }

  const removePolygonPoint = (index) => {
    setForm((prev) => ({
      ...prev,
      polygon_points: prev.polygon_points.filter((_, i) => i !== index),
      boundary_point_colors: (prev.boundary_point_colors || []).filter((_, i) => i !== index),
      boundary_point_sizes: (prev.boundary_point_sizes || []).filter((_, i) => i !== index)
    }))
  }

  const addMapPolygonPoint = ([latitude, longitude]) => {
    setMapCityFocus(null)
    setForm((prev) => ({
      ...prev,
      polygon_points: [...prev.polygon_points, [latitude, longitude]],
      boundary_point_colors: [...(prev.boundary_point_colors || []), pointColor],
      boundary_point_sizes: [...(prev.boundary_point_sizes || []), pointSize]
    }))
  }

  const handleMapCityChange = (cityName) => {
    setMapCity(cityName)
    const city = MINDANAO_CITIES.find((item) => item.name === cityName)
    setMapCityFocus(city ? { center: city.center, zoom: 13 } : null)
  }

  const handleBranchChange = (branch) => {
    const normalizedBranch = normalizeBranchName(branch)
    updateField('branch', normalizedBranch)
    const center = BRANCH_COORDINATES[normalizedBranch]
    setMapCity('')
    setMapCityFocus(center ? { center, zoom: BRANCH_ZOOM } : null)
  }

  const searchMapLocation = async (event) => {
    event?.preventDefault()
    const query = mapSearchQuery.trim()
    if (query.length < 3) {
      setMapSearchResults([])
      setMapSearchError('Enter at least 3 characters to search.')
      return
    }

    setMapSearchLoading(true)
    setMapSearchError('')
    setMapSearchResults([])

    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        q: `${query}, Mindanao, Philippines`,
        addressdetails: '1',
        countrycodes: 'ph',
        bounded: '1',
        viewbox: '119.0,10.8,126.9,4.5',
        limit: '5'
      })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { Accept: 'application/json' }
      })
      if (!response.ok) throw new Error('Search service unavailable')

      const results = (await response.json()).filter((result) => {
        const lat = Number(result.lat)
        const lon = Number(result.lon)
        return lat >= 4.5 && lat <= 10.8 && lon >= 119.0 && lon <= 126.9
      })

      if (results.length === 0) {
        setMapSearchError('No Mindanao locations found. Try a street name with its city.')
      } else {
        setMapSearchResults(results)
      }
    } catch {
      setMapSearchError('Map search is temporarily unavailable. You can still use the city list or latitude/longitude fields.')
    } finally {
      setMapSearchLoading(false)
    }
  }

  const selectMapSearchResult = (result) => {
    const center = [Number(result.lat), Number(result.lon)]
    setMapSearchQuery(result.display_name)
    setMapSearchResults([])
    setMapSearchError('')
    setMapCity('')
    setMapCityFocus({ center, zoom: 17 })
  }

  const MAX_PHOTOS = 10

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files)
    const currentTotal = (isEdit ? existingPhotos.length : 0) + photos.length
    if (currentTotal + files.length > MAX_PHOTOS) {
      const remaining = Math.max(0, MAX_PHOTOS - currentTotal)
      alert(`You can upload up to ${MAX_PHOTOS} photos total. You may only add ${remaining} more.`)
      e.target.value = ''
      return
    }
    setPhotos((prev) => [...prev, ...files])
    setPhotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
  }

  const removePhoto = (index) => {
    URL.revokeObjectURL(photoPreviews[index])
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFileSelect = (e, field, setPreview) => {
    const file = e.target.files?.[0]
    if (!file) return
    updateField(field, file)
    setPreview(URL.createObjectURL(file))
  }

  const clearFile = (field, setPreview) => {
    updateField(field, null)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const validateForm = () => {
    const errors = []
    const area = Number(form.area_sqm)
    const price = Number(numericAmount(form.total_contract_price))
    const reservationFee = Number(numericAmount(form.reservation_fee))
    const downPayment = Number(form.minimum_down_payment_pct)
    const monthlyPayment = Number(numericAmount(form.monthly_payment_amount))
    const penalty = Number(form.penalty_rate_pct)

    if (!form.title.trim()) errors.push('Enter a listing title.')
    if (!form.branch) errors.push('Select the branch responsible for this listing.')
    if (!form.location_text.trim()) errors.push('Enter the specific land location.')
    if (!Number.isFinite(area) || area <= 0) errors.push('Area must be greater than 0 sqm.')
    if (!form.zoning_classification) errors.push('Select a zoning classification.')
    if (!form.land_title_status) errors.push('Select the land title status.')
    if (!Number.isFinite(price) || price <= 0) errors.push('Enter a contract price greater than 0.')
    if (!Number.isFinite(reservationFee) || reservationFee < 0) errors.push('Enter a valid reservation fee.')
    if (Number.isFinite(price) && Number.isFinite(reservationFee) && reservationFee > price) {
      errors.push('Reservation fee cannot be greater than the contract price.')
    }
    if (!Number.isFinite(downPayment) || downPayment < 1 || downPayment > 40) {
      errors.push('Minimum down payment must be between 1% and 40%.')
    }
    if (!Number.isFinite(monthlyPayment) || monthlyPayment < 0) errors.push('Enter a valid monthly payment amount.')
    if (!Number.isFinite(penalty) || penalty < 0 || penalty > 100) errors.push('Late payment penalty must be between 0% and 100%.')
    if (!form.terrain_topography) errors.push('Select the terrain topography.')
    if (!form.lot_configuration) errors.push('Select the lot configuration.')
    if (form.polygon_points.length > 0 && form.polygon_points.length < 3) {
      errors.push('Add at least 3 boundary points, or remove the incomplete boundary.')
    }

    return errors
  }

  const clearDraft = () => {
    localStorage.removeItem(draftKey)
    setDraftRestored(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const errors = validateForm()
    setFormErrors(errors)
    if (errors.length > 0) {
      return
    }

    setConfirmation({ type: 'submit' })
  }

  const submitListing = () => {
    setConfirmation(null)

    const polygon_geojson = form.polygon_points.length >= 3
      ? {
          type: 'Polygon',
          coordinates: [[...form.polygon_points, form.polygon_points[0]].map(([lat, lng]) => [lng, lat])],
          properties: {
            ...(initialData?.polygon_geojson?.properties || {}),
            point_colors: form.boundary_point_colors || [],
            point_sizes: form.boundary_point_sizes || []
          }
        }
      : null

    const payload = {
      ...form,
      total_contract_price: numericAmount(form.total_contract_price),
      reservation_fee: numericAmount(form.reservation_fee),
      monthly_payment_amount: numericAmount(form.monthly_payment_amount),
      polygon_geojson,
      photos,
      _draftKey: draftKey
    }

    console.log('CreateListingForm payload:', payload)
    onSubmit?.(payload)
  }

  const confirmReset = () => {
    setConfirmation(null)
    clearDraft()
    setForm(isEdit ? buildInitialState() : { ...buildInitialState(), branch: normalizeBranchName(initialBranch || '') })
    setFormErrors([])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl mx-auto">
      {draftRestored && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div>
            <p className="font-semibold">Saved draft restored</p>
            <p className="text-xs mt-0.5 text-emerald-700">Your text, financial details, and map points were recovered. Uploaded files need to be selected again.</p>
          </div>
          <button type="button" onClick={clearDraft} className="shrink-0 text-xs font-semibold text-emerald-800 underline hover:text-emerald-950">
            Discard draft
          </button>
        </div>
      )}

      {formErrors.length > 0 && (
        <div ref={errorSummaryRef} tabIndex="-1" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none">
          <p className="font-bold">Please correct the following before submitting:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {formErrors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}

      {/* Basic Information */}
      <SectionCard icon={MapPin} title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Label required>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. 500 sqm Agricultural Lot in Tagum"
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe the land, surroundings, access roads, nearby landmarks..."
              rows={4}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-none"
            />
          </div>
          <div>
            <Label required>Branch</Label>
            <Select
              value={form.branch}
              onChange={(e) => handleBranchChange(e.target.value)}
              options={BRANCHES.map((branch) => ({ value: branch, label: displayBranchName(branch) }))}
              placeholder="Select branch"
              disabled={branchLocked}
            />
            {branchLocked && (
              <p className="mt-1.5 text-xs text-slate-500">
                Your seller account is assigned to {displayBranchName(initialBranch)}. Listings can only be created in this branch.
              </p>
            )}
          </div>
          <div>
            <Label required>Specific Location Text</Label>
            <Input
              value={form.location_text}
              onChange={(e) => updateField('location_text', e.target.value)}
              placeholder="e.g. Purok 4, Barangay Apokon"
              required
            />
          </div>
        </div>
      </SectionCard>

      {/* Spatial & GIS Data */}
      <SectionCard icon={MapPin} title="Spatial & GIS Data">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label required>Area (sqm)</Label>
            <Input
              type="number"
              value={form.area_sqm}
              onChange={(e) => updateField('area_sqm', e.target.value)}
              placeholder="e.g. 500"
              required
              min={1}
              step={0.01}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Add Bounding Polygon Points</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="number"
                value={form.latitude}
                onChange={(e) => updateField('latitude', e.target.value)}
                placeholder="Latitude"
                step="any"
              />
              <Input
                type="number"
                value={form.longitude}
                onChange={(e) => updateField('longitude', e.target.value)}
                placeholder="Longitude"
                step="any"
              />
            </div>
            <button
              type="button"
              onClick={addPolygonPoint}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" /> Add Point
            </button>

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="mr-1 text-xs font-semibold text-slate-600">Point color:</span>
              {BOUNDARY_POINT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setPointColor(color.value)}
                  title={color.name}
                  aria-label={`Use ${color.name} for the next boundary point`}
                  aria-pressed={pointColor === color.value}
                  className={`h-7 w-7 rounded-full border-2 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 ${pointColor === color.value ? 'border-slate-900 ring-2 ring-emerald-200' : 'border-white'}`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
              <span className="text-[11px] text-slate-500">Applies to the next point</span>
              <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden="true" />
              <span className="mr-1 text-xs font-semibold text-slate-600">Point size:</span>
              {BOUNDARY_POINT_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => setPointSize(size.value)}
                  title={size.name}
                  aria-label={`Use ${size.name} point size for the next boundary point`}
                  aria-pressed={pointSize === size.value}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 ${pointSize === size.value ? 'border-slate-900 bg-white text-slate-900 ring-2 ring-emerald-200' : 'border-slate-300 bg-white text-slate-500'}`}
                >
                  {size.label}
                </button>
              ))}
            </div>

            {form.polygon_points.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {form.polygon_points.map(([lat, lng], idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{ backgroundColor: BOUNDARY_POINT_COLORS.find((color) => color.value === (form.boundary_point_colors?.[idx] || DEFAULT_BOUNDARY_POINT_COLOR))?.swatch || '#d1fae5', color: '#14532d' }}
                  >
                    P{idx + 1}: {lat.toFixed(5)}, {lng.toFixed(5)}
                    <button
                      type="button"
                      onClick={() => removePolygonPoint(idx)}
                      className="hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <Label>GIS Boundary Map</Label>
              <span className="text-xs font-medium text-emerald-700">{form.polygon_points.length} point{form.polygon_points.length === 1 ? '' : 's'} added</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">Click anywhere on the map to drop a boundary point, or type lat/lng above and press Add Point. You can add 3 or more points to draw any shape — triangle, square, pentagon, hexagon, etc. There is no maximum point limit.</p>
            <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <label htmlFor="gis-city-navigator" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-emerald-800">
                Quick map navigation
              </label>
              <div
                role="search"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') searchMapLocation(event)
                }}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                    <input
                      value={mapSearchQuery}
                      onChange={(e) => { setMapSearchQuery(e.target.value); setMapSearchError(''); setMapSearchResults([]) }}
                      placeholder="Search a street, avenue, road, or landmark"
                      aria-label="Search a Mindanao street, avenue, road, or landmark"
                      className="w-full rounded-lg border border-emerald-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => searchMapLocation()}
                    disabled={mapSearchLoading}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70"
                  >
                    {mapSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span className="hidden sm:inline">Search</span>
                  </button>
                </div>
                <select
                  id="gis-city-navigator"
                  value={mapCity}
                  onChange={(e) => handleMapCityChange(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 sm:max-w-md"
                >
                  <option value="">Jump to a Mindanao city…</option>
                  {MINDANAO_CITIES.map((city) => (
                    <option key={city.name} value={city.name}>{city.name}</option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Search is limited to Mindanao and only moves the map. It does not save a boundary until you click the map or add coordinates. Search powered by OpenStreetMap Nominatim.</p>
              {mapSearchError && <p role="status" className="mt-2 text-xs font-semibold text-red-700">{mapSearchError}</p>}
              {mapSearchResults.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm">
                  {mapSearchResults.map((result) => (
                    <button
                      key={`${result.place_id}-${result.lat}-${result.lon}`}
                      type="button"
                      onClick={() => selectMapSearchResult(result)}
                      className="block w-full border-b border-slate-100 px-3 py-2.5 text-left text-xs text-slate-700 transition last:border-b-0 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                    >
                      <span className="block font-semibold text-slate-900">{result.name || result.display_name.split(',')[0]}</span>
                      <span className="mt-0.5 block truncate text-slate-500">{result.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={mapExpanded ? 'fixed inset-4 z-[80] rounded-2xl border-2 border-emerald-200 bg-white p-2 shadow-2xl sm:inset-8' : 'relative h-[320px]'}>
              <button
                type="button"
                onClick={() => setMapExpanded((expanded) => !expanded)}
                title={mapExpanded ? 'Close expanded map' : 'Expand map'}
                aria-label={mapExpanded ? 'Close expanded map' : 'Expand map'}
                className="absolute left-3 top-3 z-[1001] inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-emerald-800 shadow-lg backdrop-blur transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {mapExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
              <MapView
                listings={[]}
                height="100%"
                flyTo={mapCityFocus}
                boundaryPoints={form.polygon_points}
                boundaryPointColors={form.boundary_point_colors}
                boundaryPointSizes={form.boundary_point_sizes}
                onAddBoundaryPoint={addMapPolygonPoint}
                initialSatellite={false}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Legal & Regulatory Documentation */}
      <SectionCard icon={FileText} title="Legal & Regulatory Documentation">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label required>Zoning Classification</Label>
            <Select
              value={form.zoning_classification}
              onChange={(e) => updateField('zoning_classification', e.target.value)}
              options={ZONING_OPTIONS}
              placeholder="Select zoning"
            />
          </div>
          <div>
            <Label required>Land Title Status</Label>
            <Select
              value={form.land_title_status}
              onChange={(e) => updateField('land_title_status', e.target.value)}
              options={TITLE_STATUS_OPTIONS}
              placeholder="Select title status"
            />
          </div>
          <FileDrop
            label="Transfer Certificate of Title (TCT) Scanned Copy"
            accept=".pdf,.jpg,.jpeg,.png"
            preview={tctPreview}
            fileName={form.tct_file?.name}
            isPdf={form.tct_file?.type?.includes('pdf')}
            inputRef={tctInputRef}
            onChange={(e) => handleFileSelect(e, 'tct_file', setTctPreview)}
            onClear={() => clearFile('tct_file', setTctPreview)}
          />
          <FileDrop
            label="Latest Tax Declaration Receipt"
            accept=".pdf,.jpg,.jpeg,.png"
            preview={taxPreview}
            fileName={form.tax_declaration_file?.name}
            isPdf={form.tax_declaration_file?.type?.includes('pdf')}
            inputRef={taxInputRef}
            onChange={(e) => handleFileSelect(e, 'tax_declaration_file', setTaxPreview)}
            onClear={() => clearFile('tax_declaration_file', setTaxPreview)}
          />
        </div>
      </SectionCard>

      {/* Advanced Financial Configurations */}
      <SectionCard icon={PesoIcon} title="Advanced Financial Configurations">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <Label required>Total Contract Price (PHP)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={formatAmount(form.total_contract_price)}
              onChange={(e) => updateField('total_contract_price', formatAmount(e.target.value))}
              placeholder="e.g. 2,500,000"
              required
              min={0}
              step={0.01}
            />
          </div>
          <div>
            <Label required>Required Reservation Fee (PHP)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={formatAmount(form.reservation_fee)}
              onChange={(e) => updateField('reservation_fee', formatAmount(e.target.value))}
              placeholder="e.g. 25,000"
              required
              min={0}
              step={0.01}
            />
          </div>
          <div>
            <Label required>Minimum Down Payment Percentage</Label>
            <Input
              type="number"
              value={form.minimum_down_payment_pct}
              onChange={(e) => updateField('minimum_down_payment_pct', e.target.value)}
              placeholder="1–40"
              required
              min={1}
              max={40}
              step={1}
            />
          </div>
          <div>
            <Label required>Monthly Payment Amount (PHP)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={formatAmount(form.monthly_payment_amount)}
              onChange={(e) => updateField('monthly_payment_amount', formatAmount(e.target.value))}
              placeholder="e.g. 15,000"
              required
              min={0}
              step={0.01}
            />
          </div>
          <div>
            <Label required>Late Payment Penalty (%)</Label>
            <Input
              type="number"
              value={form.penalty_rate_pct}
              onChange={(e) => updateField('penalty_rate_pct', e.target.value)}
              placeholder="2–5"
              required
              min={0}
              max={100}
              step={0.01}
            />
          </div>
        </div>

        <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
          <p className="font-semibold mb-1">Payment Reminder Policy</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Buyers receive a friendly reminder during the 30-day grace period.</li>
            <li>If unpaid after 30 days (31–60 days), a <strong>{form.penalty_rate_pct || 5}% penalty</strong> is added to the monthly dues.</li>
            <li>61–90 days delinquent: demand letter sent and account flagged for admin review.</li>
            <li>90+ days overdue: contract is cancelled and the lot becomes available again.</li>
          </ul>
        </div>

        <p className="text-xs text-slate-500 pt-2">Financing options, penalty rate, and utility details are managed by the listing owner.</p>
      </SectionCard>

      {/* Physical Attributes & Infrastructure */}
      <SectionCard icon={Mountain} title="Physical Attributes & Infrastructure">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label required>Terrain Topography</Label>
            <Select
              value={form.terrain_topography}
              onChange={(e) => updateField('terrain_topography', e.target.value)}
              options={TERRAIN_OPTIONS}
              placeholder="Select terrain type"
            />
          </div>
          <div>
            <Label required>Lot Configuration Profile</Label>
            <Select
              value={form.lot_configuration}
              onChange={(e) => updateField('lot_configuration', e.target.value)}
              options={LOT_CONFIG_OPTIONS}
              placeholder="Select lot configuration"
            />
          </div>
        </div>
      </SectionCard>

      {/* Photos */}
      <SectionCard icon={ImageIcon} title="Property Photos">
        <div>
          {isEdit && existingPhotos.length > 0 && (
            <div className="mb-4">
              <Label>Current Photos</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {existingPhotos.map((url, i) => {
                  const isGeotagged = existingPhotoGeotags.some((tag) => tag.url === url)
                  return (
                    <div key={i} className="relative group w-24 h-24">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-lg border" />
                      {isGeotagged && (
                        <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" /> Geotagged
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <input
            ref={photoInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
          <button
            type="button"
            disabled={(isEdit ? existingPhotos.length : 0) + photos.length >= MAX_PHOTOS}
            onClick={() => photoInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition ${
              (isEdit ? existingPhotos.length : 0) + photos.length >= MAX_PHOTOS
                ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 text-slate-500 hover:text-emerald-600'
            }`}
          >
            <ImageIcon className="w-6 h-6" />
            <span className="text-sm font-medium">
              {isEdit ? 'Upload new property photos' : 'Click to upload property photos'}
            </span>
            <span className="text-xs text-slate-400">
              {(isEdit ? existingPhotos.length : 0) + photos.length} / {MAX_PHOTOS} photos
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              Photos with GPS metadata will be automatically geotagged
            </span>
          </button>
          {photoPreviews.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative group w-24 h-24">
                  <img src={src} alt="" className="w-full h-full object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Submit */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={() => setConfirmation({ type: 'reset' })}
          className="px-6 py-3 text-sm font-semibold text-slate-600 hover:text-slate-800 transition"
        >
          {isEdit ? 'Revert Changes' : 'Reset'}
        </button>
        <button
          type="submit"
          className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200 transition flex items-center gap-2"
        >
          <Check className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Submit Listing'}
        </button>
      </div>

      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.type === 'reset' ? 'Clear this listing form?' : (isEdit ? 'Save listing changes?' : 'Submit listing for review?')}
        message={confirmation?.type === 'reset'
          ? (isEdit ? 'This will discard your current edits and restore the last saved listing.' : 'This will clear the form and remove the saved draft from this browser.')
          : (isEdit ? 'Your changes will be saved to this listing. You can still edit it later.' : 'The listing will be sent for review and saved in Terrava.')}
        confirmLabel={confirmation?.type === 'reset' ? 'Clear form' : (isEdit ? 'Save changes' : 'Submit listing')}
        tone={confirmation?.type === 'reset' ? 'danger' : 'brand'}
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmation?.type === 'reset' ? confirmReset : submitListing}
      />
    </form>
  )
}
