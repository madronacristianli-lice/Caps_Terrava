import { useEffect, useRef, useState } from 'react'
import {
  X,
  MapPin,
  FileText,
  Mountain,
  Save,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Plus,
  Maximize2,
  Minimize2
} from 'lucide-react'
import MapView from './MapView.jsx'
import PesoIcon from './PesoIcon.jsx'
import { BOUNDARY_POINT_COLORS, DEFAULT_BOUNDARY_POINT_COLOR, BOUNDARY_POINT_SIZES, DEFAULT_BOUNDARY_POINT_SIZE } from '../utils/mapColors.js'

const ZONING_OPTIONS = ['Residential', 'Commercial', 'Agricultural', 'Industrial']

const TITLE_STATUS_OPTIONS = [
  'Clean Title / Individual TCT Available',
  'Part of Mother Title',
  'Under Process'
]


const TERRAIN_OPTIONS = ['Flat / Level', 'Sloped', 'Elevated']

const Section = ({ icon: Icon, title, children }) => (
  <div className="border border-slate-200 rounded-xl p-4 mb-4 bg-white">
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
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

const Input = ({ type = 'text', value, onChange, placeholder, required, min, max, step, disabled }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    required={required}
    min={min}
    max={max}
    step={step}
    disabled={disabled}
    className={`w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${
      disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
    }`}
  />
)

const Textarea = ({ value, onChange, placeholder, rows = 3, disabled }) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    disabled={disabled}
    className={`w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-none ${
      disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
    }`}
  />
)

const Select = ({ value, onChange, options, placeholder, disabled }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full appearance-none border border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${
        disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
      }`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
  </div>
)

export default function LandDetailsModal({ isOpen, onClose, initialData = {}, existingPhotos = [], onSave, readOnly = false }) {
  const MAX_PHOTOS = 10
  const [form, setForm] = useState({
    title: '',
    description: '',
    total_area_sqm: '',
    latitude: '',
    longitude: '',
    polygon_points: [],
    boundary_point_colors: [],
    boundary_point_sizes: [],
    lot_block_number: '',
    zoning_classification: '',
    land_title_status: '',
    total_contract_price: '',
    reservation_fee: '',
    minimum_down_payment_pct: '',
    cash_term_enabled: false,
    cash_term_discount_pct: '',
    in_house_financing_enabled: false,
    in_house_max_term_years: '',
    in_house_interest_rate_pct: '',
    bank_government_loan_enabled: false,
    penalty_rate_pct: '5.00',
    monthly_payment_amount: '',
    terrain_topography: '',
    utilities: {
      electricity_ready: false,
      water_ready: false,
      telecom_ready: false
    }
  })

  useEffect(() => {
    if (isOpen && initialData) {
      setMapExpanded(false)
      const coords = initialData.polygon_geojson?.coordinates?.[0] || []
      const points = coords.length > 1
        ? coords.slice(0, -1).map(([lng, lat]) => [lat, lng])
        : coords.map(([lng, lat]) => [lat, lng])
      setForm((prev) => ({
        ...prev,
        ...initialData,
        polygon_points: initialData.polygon_points || points,
        boundary_point_colors: initialData.boundary_point_colors || initialData.polygon_geojson?.properties?.point_colors || [],
        boundary_point_sizes: initialData.boundary_point_sizes || initialData.polygon_geojson?.properties?.point_sizes || [],
        utilities: {
          electricity_ready: false,
          water_ready: false,
          telecom_ready: false,
          ...initialData.utilities
        }
      }))
    }
  }, [isOpen, initialData])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const [pointColor, setPointColor] = useState(DEFAULT_BOUNDARY_POINT_COLOR)
  const [pointSize, setPointSize] = useState(DEFAULT_BOUNDARY_POINT_SIZE)
  const [mapExpanded, setMapExpanded] = useState(false)

  const addPolygonPoint = () => {
    if (readOnly) return
    const lat = parseFloat(form.latitude)
    const lng = parseFloat(form.longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      alert('Please enter a valid latitude and longitude first.')
      return
    }
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
    if (readOnly) return
    setForm((prev) => ({
      ...prev,
      polygon_points: prev.polygon_points.filter((_, i) => i !== index),
      boundary_point_colors: (prev.boundary_point_colors || []).filter((_, i) => i !== index),
      boundary_point_sizes: (prev.boundary_point_sizes || []).filter((_, i) => i !== index)
    }))
  }

  const addMapPolygonPoint = ([lat, lng]) => {
    if (readOnly) return
    setForm((prev) => ({
      ...prev,
      polygon_points: [...prev.polygon_points, [lat, lng]],
      boundary_point_colors: [...(prev.boundary_point_colors || []), pointColor],
      boundary_point_sizes: [...(prev.boundary_point_sizes || []), pointSize]
    }))
  }

  const [existing, setExisting] = useState(existingPhotos)
  const [newPhotos, setNewPhotos] = useState([])
  const [newPreviews, setNewPreviews] = useState([])
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const photoInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setExisting(existingPhotos)
      setNewPhotos([])
      setNewPreviews([])
      setLightboxOpen(false)
      setLightboxIndex(0)
    }
  }, [isOpen])

  const allPhotos = [...existing, ...newPreviews]

  useEffect(() => {
    if (!lightboxOpen) return
    const handleKey = (e) => {
      if (allPhotos.length === 0) return
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') setLightboxIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length)
      if (e.key === 'ArrowRight') setLightboxIndex((prev) => (prev + 1) % allPhotos.length)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [lightboxOpen, allPhotos.length])

  const remainingSlots = MAX_PHOTOS - existing.length - newPhotos.length

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    if (files.length > remainingSlots) {
      alert(`You can only upload up to ${MAX_PHOTOS} photos total. ${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} remaining.`)
      return
    }
    setNewPhotos((prev) => [...prev, ...files])
    setNewPreviews((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))])
  }

  const removeNewPhoto = (index) => {
    URL.revokeObjectURL(newPreviews[index])
    setNewPhotos((prev) => prev.filter((_, i) => i !== index))
    setNewPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingPhoto = (index) => {
    setExisting((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveChanges = () => {
    onSave?.({
      ...form,
      photos: newPhotos,
      removedExistingPhotos: existingPhotos.filter((url) => !existing.includes(url))
    })
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.()
  }

  if (!isOpen) return null

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end"
    >
      <div className="w-full md:w-[450px] bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-emerald-600">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">Land Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
          {/* Technical & Spatial */}
          <Section icon={MapPin} title="Technical & Spatial">
            <div className="space-y-4">
              <div>
                <Label required>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g. 500 sqm Agricultural Lot"
                  required
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Property description and notable features"
                  disabled={readOnly}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Total Land Area (sqm)</Label>
                  <Input
                    type="number"
                    value={form.total_area_sqm}
                    onChange={(e) => updateField('total_area_sqm', e.target.value)}
                    placeholder="e.g. 500"
                    required
                    min={1}
                    step={0.01}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label>Lot & Block Number</Label>
                  <Input
                    value={form.lot_block_number}
                    onChange={(e) => updateField('lot_block_number', e.target.value)}
                    placeholder="e.g. Block 5, Lot 12"
                    disabled={readOnly}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    value={form.latitude}
                    onChange={(e) => updateField('latitude', e.target.value)}
                    placeholder="e.g. 7.4458"
                    step="any"
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    value={form.longitude}
                    onChange={(e) => updateField('longitude', e.target.value)}
                    placeholder="e.g. 125.8093"
                    step="any"
                    disabled={readOnly}
                  />
                </div>
              </div>

              {/* GIS Boundary Map */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <Label>GIS Boundary Map</Label>
                  <span className="text-xs font-medium text-emerald-700">{form.polygon_points.length} point{form.polygon_points.length === 1 ? '' : 's'} added</span>
                </div>
                {!readOnly && (
                  <>
                    <p className="text-xs text-slate-500 mb-3">Click anywhere on the map to drop a boundary point, or type lat/lng above and press Add Point.</p>
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        type="button"
                        onClick={addPolygonPoint}
                        disabled={!form.latitude || !form.longitude}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Point
                      </button>
                      {form.polygon_points.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, polygon_points: [], boundary_point_colors: [], boundary_point_sizes: [], latitude: '', longitude: '' }))}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-50 transition"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="mr-1 text-xs font-semibold text-slate-600">Point color:</span>
                      {BOUNDARY_POINT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setPointColor(color.value)}
                          title={color.name}
                          aria-label={`Use ${color.name} for the next boundary point`}
                          aria-pressed={pointColor === color.value}
                          className={`h-6 w-6 rounded-full border-2 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 ${pointColor === color.value ? 'border-slate-900 ring-2 ring-emerald-200' : 'border-white'}`}
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
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 ${pointSize === size.value ? 'border-slate-900 bg-white text-slate-900 ring-2 ring-emerald-200' : 'border-slate-300 bg-white text-slate-500'}`}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                    {form.polygon_points.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {form.polygon_points.map(([lat, lng], idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
                            style={{ backgroundColor: BOUNDARY_POINT_COLORS.find((color) => color.value === (form.boundary_point_colors?.[idx] || DEFAULT_BOUNDARY_POINT_COLOR))?.swatch || '#d1fae5', color: '#14532d' }}
                          >
                            P{idx + 1}: {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
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
                  </>
                )}
                {readOnly && form.polygon_points.length === 0 && (
                  <p className="text-xs text-slate-500 mb-3">No boundary polygon has been set for this listing.</p>
                )}
                <div className={mapExpanded ? 'fixed inset-4 z-[80] rounded-2xl border-2 border-emerald-200 bg-white p-2 shadow-2xl sm:inset-8' : 'relative h-[280px]'}>
                  <button
                    type="button"
                    onClick={() => setMapExpanded((expanded) => !expanded)}
                    title={mapExpanded ? 'Close expanded map' : 'Expand map'}
                    aria-label={mapExpanded ? 'Close expanded map' : 'Expand map'}
                    className="absolute left-3 top-3 z-[1001] inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-emerald-800 shadow-lg backdrop-blur transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {mapExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <MapView
                    listings={[]}
                    height="100%"
                    boundaryPoints={form.polygon_points}
                    boundaryPointColors={form.boundary_point_colors}
                    boundaryPointSizes={form.boundary_point_sizes}
                    onAddBoundaryPoint={readOnly ? null : addMapPolygonPoint}
                    scrollWheelZoom={false}
                    fitBoundary
                    initialSatellite={false}
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* Legal & Regulatory */}
          <Section icon={FileText} title="Legal & Regulatory">
            <div className="space-y-4">
              <div>
                <Label required>Zoning Classification</Label>
                <Select
                  value={form.zoning_classification}
                  onChange={(e) => updateField('zoning_classification', e.target.value)}
                  options={ZONING_OPTIONS}
                  placeholder="Select zoning"
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label required>Land Title Status</Label>
                <Select
                  value={form.land_title_status}
                  onChange={(e) => updateField('land_title_status', e.target.value)}
                  options={TITLE_STATUS_OPTIONS}
                  placeholder="Select title status"
                  disabled={readOnly}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Property Photos</Label>
                  <span className="text-xs font-medium text-emerald-700">
                    {existing.length + newPhotos.length} / {MAX_PHOTOS}
                  </span>
                </div>
                {existing.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {existing.map((url, i) => (
                      <div key={`existing-${i}`} className="relative group aspect-square rounded-xl border border-slate-200 overflow-hidden cursor-pointer" onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}>
                        <img src={url} alt={`Property ${i + 1}`} className="w-full h-full object-cover" />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeExistingPhoto(i)}
                            className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-red-500 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {newPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {newPreviews.map((src, i) => (
                      <div key={`new-${i}`} className="relative group aspect-square rounded-xl border border-emerald-200 overflow-hidden cursor-pointer" onClick={() => { setLightboxIndex(existing.length + i); setLightboxOpen(true) }}>
                        <img src={src} alt={`New upload ${i + 1}`} className="w-full h-full object-cover" />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeNewPhoto(i)}
                            className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-red-500 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {existing.length === 0 && newPreviews.length === 0 && (
                  <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center mb-3">
                    {readOnly ? 'No photos available for this listing.' : `No photos yet. Click below to upload up to ${MAX_PHOTOS} photos.`}
                  </div>
                )}
                {!readOnly && remainingSlots > 0 && (
                  <>
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
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-emerald-500 hover:bg-emerald-50/30 hover:text-emerald-600 transition"
                    >
                      <ImageIcon className="w-6 h-6" />
                      <span className="text-sm font-medium text-center">
                        Click to upload up to {remainingSlots} more photo{remainingSlots === 1 ? '' : 's'}
                      </span>
                      <span className="text-xs text-slate-400">Maximum {MAX_PHOTOS} photos total</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </Section>

          {/* Financial Milestones */}
          <Section icon={PesoIcon} title="Financial Milestones">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Total Contract Price (PHP)</Label>
                  <Input
                    type="number"
                    value={form.total_contract_price}
                    onChange={(e) => updateField('total_contract_price', e.target.value)}
                    placeholder="e.g. 2500000"
                    required
                    min={0}
                    step={0.01}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label required>Required Reservation Fee (PHP)</Label>
                  <Input
                    type="number"
                    value={form.reservation_fee}
                    onChange={(e) => updateField('reservation_fee', e.target.value)}
                    placeholder="e.g. 25000"
                    required
                    min={0}
                    step={0.01}
                    disabled={readOnly}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label required>Overdue Penalty Rate (%)</Label>
                  <Input
                    type="number"
                    value={form.penalty_rate_pct}
                    onChange={(e) => updateField('penalty_rate_pct', e.target.value)}
                    placeholder="2–5"
                    required
                    min={0}
                    max={100}
                    step={0.01}
                    disabled={readOnly}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Monthly Payment Amount (PHP)</Label>
                  <Input
                    type="number"
                    value={form.monthly_payment_amount}
                    onChange={(e) => updateField('monthly_payment_amount', e.target.value)}
                    placeholder="e.g. 15000"
                    required
                    min={0}
                    step={0.01}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label>Computed Penalty per Missed Month</Label>
                  <div className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-slate-50">
                    ₱{Number((Number(form.monthly_payment_amount || 0) * (Number(form.penalty_rate_pct || 0) / 100)).toFixed(2)).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Financing Options</h4>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.cash_term_enabled}
                      onChange={(e) => updateField('cash_term_enabled', e.target.checked)}
                      disabled={readOnly}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">Cash term enabled</span>
                  </label>
                  {form.cash_term_enabled && (
                    <div>
                      <Label>Cash Term Discount (%)</Label>
                      <Input
                        type="number"
                        value={form.cash_term_discount_pct}
                        onChange={(e) => updateField('cash_term_discount_pct', e.target.value)}
                        placeholder="e.g. 10"
                        min={0}
                        max={100}
                        step={0.01}
                        disabled={readOnly}
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.in_house_financing_enabled}
                      onChange={(e) => updateField('in_house_financing_enabled', e.target.checked)}
                      disabled={readOnly}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">In-house financing enabled</span>
                  </label>
                  {form.in_house_financing_enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label required>Max Term (Years)</Label>
                        <Input
                          type="number"
                          value={form.in_house_max_term_years}
                          onChange={(e) => updateField('in_house_max_term_years', e.target.value)}
                          placeholder="e.g. 5"
                          required={form.in_house_financing_enabled}
                          min={1}
                          max={30}
                          step={1}
                          disabled={readOnly}
                        />
                      </div>
                      <div>
                        <Label>Interest Rate (%)</Label>
                        <Input
                          type="number"
                          value={form.in_house_interest_rate_pct}
                          onChange={(e) => updateField('in_house_interest_rate_pct', e.target.value)}
                          placeholder="e.g. 10"
                          min={0}
                          max={100}
                          step={0.01}
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.bank_government_loan_enabled}
                      onChange={(e) => updateField('bank_government_loan_enabled', e.target.checked)}
                      disabled={readOnly}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">Bank / Government loan enabled</span>
                  </label>
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
            </div>
          </Section>

          {/* Physical & Infrastructure */}
          <Section icon={Mountain} title="Physical & Infrastructure">
            <div className="space-y-4">
              <div>
                <Label required>Terrain Topography</Label>
                <Select
                  value={form.terrain_topography}
                  onChange={(e) => updateField('terrain_topography', e.target.value)}
                  options={TERRAIN_OPTIONS}
                  placeholder="Select terrain type"
                  disabled={readOnly}
                />
              </div>
            </div>
          </Section>
        </div>

        {/* Photo lightbox */}
        {lightboxOpen && allPhotos.length > 0 && (
          <div
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
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
                src={allPhotos[lightboxIndex]}
                alt={`Property ${lightboxIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              {allPhotos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length) }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev + 1) % allPhotos.length) }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="mt-4 flex items-center gap-2 text-white/80 text-sm">
                    <span className="font-medium">{lightboxIndex + 1}</span>
                    <span>/</span>
                    <span>{allPhotos.length}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!readOnly && (
          <div className="border-t border-slate-100 p-5 bg-white flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleSaveChanges}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
