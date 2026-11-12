import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polygon, Popup, Marker, CircleMarker, Polyline, LayersControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Home, Building2, Wheat, Factory, MapPinned, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { BRANCH_COORDINATES, BRANCH_ZOOM, MINDANAO_BOUNDS } from '../utils/branches.js'
import { DEFAULT_BOUNDARY_POINT_COLOR, DEFAULT_BOUNDARY_POINT_SIZE } from '../utils/mapColors.js'
import { resolveMediaUrl } from '../utils/media.js'
import 'leaflet/dist/leaflet.css'

const ZONING_STYLES = {
  Residential: { icon: Home, color: '#2563eb', bg: '#dbeafe' },
  Commercial: { icon: Building2, color: '#d97706', bg: '#fef3c7' },
  Agricultural: { icon: Wheat, color: '#16a34a', bg: '#dcfce7' },
  Industrial: { icon: Factory, color: '#7c3aed', bg: '#ede9fe' },
}

function ZoningBadge({ classification, showIcon = true }) {
  if (!classification) return null
  const style = ZONING_STYLES[classification] || { icon: MapPinned, color: '#6b7280', bg: '#f3f4f6' }
  const Icon = style.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: style.bg, color: style.color,
      fontSize: 14, fontWeight: 700, padding: '4px 10px',
      borderRadius: 999, marginLeft: 'auto',
    }}>
      {showIcon && <Icon size={20} />}
      {classification}
    </span>
  )
}

function ZoningIconCircle({ classification }) {
  if (!classification) return null
  const style = ZONING_STYLES[classification] || { icon: MapPinned, color: '#6b7280', bg: '#f3f4f6' }
  const Icon = style.icon
  return (
    <div style={{
      position: 'absolute', top: -14, left: -14, zIndex: 3,
      width: 48, height: 48, borderRadius: '50%',
      background: style.bg, color: style.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      border: '3px solid #fff',
    }}>
      <Icon size={25} />
    </div>
  )
}

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Keep the neutral map view aligned with the main branch instead of the old
// Tagum/Panabo mixed coordinate that was previously used here.
const defaultCenter = BRANCH_COORDINATES['Main Tagum']

function getCentroid(coords) {
  if (!coords || coords.length === 0) return null
  const sum = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0])
  return [sum[1] / coords.length, sum[0] / coords.length]
}

function getLatLngCentroid(points) {
  if (!points || points.length === 0) return null
  const sum = points.reduce((acc, [lat, lng]) => [acc[0] + lat, acc[1] + lng], [0, 0])
  return [sum[0] / points.length, sum[1] / points.length]
}

function formatPeso(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '₱0.00'
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function canViewFinancing(user, listing) {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'seller') return true
  if (user.role === 'buyer') {
    const isAssigned = listing.assigned_buyer_id && String(listing.assigned_buyer_id) === String(user.id)
    return isAssigned && listing.status !== 'available'
  }
  return false
}


function createPhotoIcon(listing, isActive) {
  const size = isActive ? 56 : 46
  const style = ZONING_STYLES[listing.zoning_classification] || { icon: MapPinned, color: '#6b7280', bg: '#f3f4f6' }
  const borderColor = isActive ? '#1d4ed8' : style.color
  const iconPaths = {
    Residential: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9 21v-6h6v6"/>',
    Commercial: '<path d="M4 21V5h10v16M14 9h6v12M7 8h4M7 12h4M7 16h4M17 13h1M17 17h1"/>',
    Agricultural: '<path d="M12 21V8M12 12C8 12 5 9 5 5c4 0 7 3 7 7M12 16c4 0 7-3 7-7-4 0-7 3-7 7"/>',
    Industrial: '<path d="M4 21V9l6 4V9l6 4V5h4v16M2 21h20M7 17h2M12 17h2M17 17h2"/>',
  }
  const iconSvg = `<svg width="${isActive ? 30 : 24}" height="${isActive ? 30 : 24}" viewBox="0 0 24 24" fill="none" stroke="${style.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPaths[listing.zoning_classification] || iconPaths.Residential}</svg>`

  const inner = `<div style="
        width:${size}px;height:${size}px;border-radius:50%;
        border:3px solid ${borderColor};
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
        background:${style.bg};
        display:flex;align-items:center;justify-content:center;
        color:${style.color};font-size:${isActive ? 27 : 22}px;font-weight:800;
      ">${iconSvg}</div>`

  const pointer = `<div style="
      width:0;height:0;margin:0 auto;
      border-left:7px solid transparent;
      border-right:7px solid transparent;
      border-top:9px solid ${borderColor};
    "></div>`

  return L.divIcon({
    className: 'listing-photo-marker',
    html: `<div class="listing-photo-marker-content" style="display:flex;flex-direction:column;align-items:center;">${inner}${pointer}</div>`,
    iconSize: [size, size + 9],
    iconAnchor: [size / 2, size + 9],
    popupAnchor: [0, -(size + 9)],
  })
}

function resolveFlyTo(target) {
  if (!target) return null
  if (typeof target === 'string') {
    const coords = BRANCH_COORDINATES[target]
    return coords ? { center: coords, zoom: BRANCH_ZOOM } : null
  }

  // Prefer the property's own geometry/location first so clicking a listing zooms in close.
  const polygonCoords = target.polygon_geojson?.coordinates?.[0]
  const polygonCenter = getCentroid(polygonCoords)
  if (polygonCenter) {
    return { center: polygonCenter, zoom: target.zoom || 17 }
  }

  const loc = target.location_text || ''
  const locMatch = loc.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/)
  if (locMatch) {
    const lat = parseFloat(locMatch[1])
    const lng = parseFloat(locMatch[2])
    if (!isNaN(lat) && !isNaN(lng)) {
      return { center: [lat, lng], zoom: target.zoom || 17 }
    }
  }

  if (target.center && Array.isArray(target.center)) {
    return { center: target.center, zoom: target.zoom || BRANCH_ZOOM }
  }

  if (target.branch && BRANCH_COORDINATES[target.branch]) {
    return { center: BRANCH_COORDINATES[target.branch], zoom: target.zoom || BRANCH_ZOOM }
  }

  return null
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    const resolved = resolveFlyTo(target)
    if (!resolved) return
    map.flyTo(resolved.center, resolved.zoom, { duration: 1.2 })
  }, [map, target])
  return null
}

function FitBounds({ listings }) {
  const map = useMap()
  useEffect(() => {
    const coords = (listings || []).map((l) => {
      const polygon = l.polygon_geojson?.coordinates?.[0]
      if (polygon) return getCentroid(polygon)
      const loc = l.location_text || ''
      const match = loc.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/)
      if (match) return [parseFloat(match[1]), parseFloat(match[2])]
      return null
    }).filter(Boolean)
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 14 })
    }
  }, [map, listings])
  return null
}

function FitBoundary({ points }) {
  const map = useMap()

  useEffect(() => {
    if (!points || points.length === 0) return

    if (points.length === 1) {
      map.flyTo(points[0], 17, { duration: 0.8 })
      return
    }

    map.fitBounds(L.latLngBounds(points), {
      padding: [24, 24],
      maxZoom: 17,
      animate: true,
      duration: 0.8,
    })
  }, [map, points])

  return null
}

function MapResizeHandler() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    let frame = 0
    const refreshSize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => map.invalidateSize({ animate: false, pan: false }))
    }
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refreshSize) : null
    observer?.observe(container)
    refreshSize()
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [map])

  return null
}

function BoundaryPointPicker({ onAddPoint }) {
  useMapEvents({
    click: (event) => onAddPoint?.([event.latlng.lat, event.latlng.lng])
  })
  return null
}

function MapStyleToggle({ showAttribution = true, initialSatellite = true }) {
  const [satellite, setSatellite] = useState(initialSatellite)
  const toggle = () => setSatellite((current) => !current)
  return (
    <>
      <TileLayer
        attribution={showAttribution ? (satellite ? 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community' : '&copy; OpenStreetMap contributors') : ''}
        url={satellite ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
      />
      <button type="button" onClick={toggle} title="Switch map style" aria-label={`Switch to ${satellite ? 'standard' : 'satellite'} map`} style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, border: '1px solid rgba(15,23,42,.15)', borderRadius: 10, background: 'rgba(255,255,255,.95)', color: '#064e3b', padding: '9px 12px', fontSize: 12, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,.18)', cursor: 'pointer' }}>
        {satellite ? 'Satellite' : 'Map'}
      </button>
    </>
  )
}

function DraftBoundary({ points, pointColors = [], pointSizes = [] }) {
  if (!points?.length) return null

  return (
    <>
      {points.length >= 3 ? (
        <Polygon positions={points} pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.2, weight: 3 }} />
      ) : (
        <Polyline positions={points} pathOptions={{ color: '#059669', weight: 3, dashArray: '6 6' }} />
      )}
      {points.map((point, index) => {
        const color = pointColors[index] || DEFAULT_BOUNDARY_POINT_COLOR
        const radius = Number(pointSizes[index]) || DEFAULT_BOUNDARY_POINT_SIZE
        return (
          <CircleMarker key={`${point[0]}-${point[1]}-${index}`} center={point} radius={radius} pathOptions={{ color, fillColor: '#ffffff', fillOpacity: 1, weight: 3 }}>
            <Popup>Boundary point {index + 1}</Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

function AdminPopupActions({ listing, actions }) {
  if (!actions) return null
  const { onVerify, onEdit, onArchive } = actions
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 0, paddingTop: 0 }}>
      {onVerify && !listing.is_verified && (
        <button
          onClick={() => onVerify(listing)}
          style={{ width: 70, justifyContent: 'center', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 7, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Confirm
        </button>
      )}
      {onEdit && (
        <button
          onClick={() => onEdit(listing)}
          style={{ width: 70, justifyContent: 'center', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 7, background: '#ecfdf5', color: '#047857', border: '1px solid #86efac', cursor: 'pointer' }}
        >
          Edit
        </button>
      )}
      {onArchive && listing.is_verified && (
        <button
          onClick={() => onArchive(listing)}
          style={{ width: 70, justifyContent: 'center', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 7, background: listing.archived ? '#ecfdf5' : '#f3f4f6', color: listing.archived ? '#059669' : '#374151', border: listing.archived ? '1px solid #a7f3d0' : '1px solid #d1d5db', cursor: 'pointer' }}
        >
          {listing.archived ? 'Restore' : 'Archive'}
        </button>
      )}
    </div>
  )
}

function ActivePolygon({ listing, isActive, onSelect, adminActions }) {
  const polygonRef = useRef(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const { user } = useAuth()
  const showFinancing = canViewFinancing(user, listing)

  useEffect(() => {
    if (isActive && polygonRef.current) {
      polygonRef.current.openPopup()
    }
  }, [isActive])

  const coords = listing.polygon_geojson?.coordinates?.[0]
  if (!coords) return null
  const latLngs = coords.map((c) => [c[1], c[0]])
  const center = getCentroid(coords)

  const popupContent = (
    <Popup>
      <div style={{ minWidth: 180 }}>
        {listing.photos?.[0] && (
          <div style={{ position: 'relative', margin: '0 4px 12px', borderRadius: 10, overflow: 'visible', height: 100, border: '1px solid #d1d5db', background: '#f8fafc' }}>
            <img src={resolveMediaUrl(listing.photos[photoIndex % listing.photos.length])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
            <ZoningIconCircle classification={listing.zoning_classification} />
            {listing.photos.length > 1 && (
              <button type="button" onClick={() => setPhotoIndex((index) => (index + 1) % listing.photos.length)} title="Next photo" aria-label="Next photo" style={{ position: 'absolute', bottom: 8, right: 8, width: 22, minWidth: 22, height: 22, minHeight: 22, padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, background: '#047857', color: '#fff', border: '2px solid #fff', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,.3)' }}>
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        )}
        <p style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.25, marginBottom: 8, color: '#111827' }}>{listing.title}</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ fontSize: 15, color: '#059669', fontWeight: 800, margin: 0 }}>₱{Number(listing.price).toLocaleString()}</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: listing.status === 'available' ? '#059669' : listing.status === 'sold' ? '#2563eb' : '#d97706', textTransform: 'capitalize' }}>{listing.status}</span>
            <ZoningBadge classification={listing.zoning_classification} showIcon={false} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
          <p style={{ fontSize: 15, color: '#374151', fontWeight: 800, margin: 0 }}>{Number(listing.area_sqm).toLocaleString()} sqm</p>
        </div>
        {listing.location_text && (
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 0 }}>{listing.location_text}</p>
        )}
        {listing.description && (
          <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.35, margin: '6px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {listing.description}
          </p>
        )}
        {adminActions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <AdminPopupActions listing={listing} actions={adminActions} />
          </div>
        )}
        {showFinancing && listing.monthly_payment_amount && (
          <div style={{ fontSize: 11, color: '#374151', marginTop: 6, padding: '6px 8px', background: '#f3f4f6', borderRadius: 6 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Payment Terms</div>
            {listing.in_house_max_term_years ? (
              <div>Term: {listing.in_house_max_term_years} year(s)</div>
            ) : null}
            <div>Monthly: {formatPeso(listing.monthly_payment_amount)}</div>
            {listing.penalty_rate_pct ? (
              <div>Late penalty: {listing.penalty_rate_pct}%</div>
            ) : null}
          </div>
        )}
        {listing.installmentAccounts?.[0]?.status && (
          <p style={{ fontSize: 11, marginTop: 6, color: '#6b7280', fontWeight: 500 }}>
            Installment: {listing.installmentAccounts[0].status.replace(/_/g, ' ')}
          </p>
        )}
      </div>
    </Popup>
  )

  return (
    <>
      <Polygon
        ref={polygonRef}
        positions={latLngs}
        pathOptions={{
          color: isActive ? '#2563eb' : '#10b981',
          fillColor: isActive ? '#3b82f6' : '#10b981',
          fillOpacity: isActive ? 0.45 : 0.2,
          weight: isActive ? 4 : 2,
        }}
        eventHandlers={{
          click: () => onSelect?.(listing),
          dblclick: () => onSelect?.(listing),
        }}
      >
        {popupContent}
      </Polygon>
      {center && (
        <Marker
          position={center}
          icon={createPhotoIcon(listing, isActive)}
          eventHandlers={{
            click: () => onSelect?.(listing),
            dblclick: () => onSelect?.(listing),
          }}
        >
          {popupContent}
        </Marker>
      )}
    </>
  )
}

function PhotoGeotagMarkers({ geotags, isDraft = false }) {
  if (!geotags?.length) return null

  return (
    <>
      {geotags.map((tag, i) => (
        <CircleMarker
          key={isDraft ? tag.url : i}
          center={[tag.lat, tag.lng]}
          radius={isDraft ? 9 : 5}
          bubblingMouseEvents={!isDraft}
          pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }}
        >
          <Popup>
            <div style={{ minWidth: 140, textAlign: 'center' }}>
              <img
                src={resolveMediaUrl(tag.url)}
                alt=""
                style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }}
              />
              <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>Photo geotag</p>
              <p style={{ fontSize: 10, color: '#6b7280' }}>{Number(tag.lat).toFixed(5)}, {Number(tag.lng).toFixed(5)}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  )
}

function FallbackMarker({ listing, isActive, onSelect, adminActions }) {
  const markerRef = useRef(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const { user } = useAuth()
  const showFinancing = canViewFinancing(user, listing)

  useEffect(() => {
    if (isActive && markerRef.current) {
      markerRef.current.openPopup()
    }
  }, [isActive])

  const loc = listing.location_text || ''
  const match = loc.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/)
  if (!match) return null
  const lat = parseFloat(match[1])
  const lng = parseFloat(match[2])
  if (isNaN(lat) || isNaN(lng)) return null

  return (
    <Marker
      ref={markerRef}
      position={[lat, lng]}
      icon={createPhotoIcon(listing, isActive)}
      eventHandlers={{
        click: () => onSelect?.(listing),
        dblclick: () => onSelect?.(listing),
      }}
    >
      <Popup>
        <div style={{ minWidth: 180 }}>
          {listing.photos?.[0] && (
            <div style={{ position: 'relative', margin: '0 4px 12px', borderRadius: 10, overflow: 'visible', height: 100, border: '1px solid #d1d5db', background: '#f8fafc' }}>
              <img src={resolveMediaUrl(listing.photos[photoIndex % listing.photos.length])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
              <ZoningIconCircle classification={listing.zoning_classification} />
              {listing.photos.length > 1 && (
                <button type="button" onClick={() => setPhotoIndex((index) => (index + 1) % listing.photos.length)} title="Next photo" aria-label="Next photo" style={{ position: 'absolute', bottom: 8, right: 8, width: 22, minWidth: 22, height: 22, minHeight: 22, padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, background: '#047857', color: '#fff', border: '2px solid #fff', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,.3)' }}>
                  <ChevronRight size={13} />
                </button>
              )}
            </div>
          )}
          <p style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.25, marginBottom: 8, color: '#111827' }}>{listing.title}</p>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontSize: 15, color: '#059669', fontWeight: 800, margin: 0 }}>₱{Number(listing.price).toLocaleString()}</p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: listing.status === 'available' ? '#059669' : listing.status === 'sold' ? '#2563eb' : '#d97706', textTransform: 'capitalize' }}>{listing.status}</span>
              <ZoningBadge classification={listing.zoning_classification} showIcon={false} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
            <p style={{ fontSize: 15, color: '#374151', fontWeight: 800, margin: 0 }}>{Number(listing.area_sqm).toLocaleString()} sqm</p>
          </div>
          {listing.location_text && (
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 0 }}>{listing.location_text}</p>
          )}
          {listing.description && (
            <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.35, margin: '6px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {listing.description}
            </p>
          )}
          {adminActions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <AdminPopupActions listing={listing} actions={adminActions} />
            </div>
          )}
          {showFinancing && listing.monthly_payment_amount && (
            <div style={{ fontSize: 11, color: '#374151', marginTop: 6, padding: '6px 8px', background: '#f3f4f6', borderRadius: 6 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Payment Terms</div>
              {listing.in_house_max_term_years ? (
                <div>Term: {listing.in_house_max_term_years} year(s)</div>
              ) : null}
              <div>Monthly: {formatPeso(listing.monthly_payment_amount)}</div>
              {listing.penalty_rate_pct ? (
                <div>Late penalty: {listing.penalty_rate_pct}%</div>
              ) : null}
            </div>
          )}
          {listing.installmentAccounts?.[0]?.status && (
            <p style={{ fontSize: 11, marginTop: 6, color: '#6b7280', fontWeight: 500 }}>
              Installment: {listing.installmentAccounts[0].status.replace(/_/g, ' ')}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

export default function MapView({
  listings,
  height = '500px',
  singleListing = null,
  flyTo = null,
  onSelectListing = null,
  selectedListingId = null,
  dragging = true,
  scrollWheelZoom = true,
  zoomControl = true,
  doubleClickZoom = true,
  boundaryPoints = [],
  boundaryPointColors = [],
  boundaryPointSizes = [],
  draftPhotoGeotags = [],
  onAddBoundaryPoint = null,
  fitBounds = false,
  adminActions = null,
  containerClassName = null,
  showLayersControl = true,
  showAttribution = false,
  fitBoundary = false,
  initialSatellite = true,
}) {
  const selectListingRef = useRef(onSelectListing)
  useEffect(() => { selectListingRef.current = onSelectListing }, [onSelectListing])

  const handleSelectListing = useCallback((listing) => {
    selectListingRef.current?.(listing)
  }, [])

  const display = singleListing ? [singleListing] : listings || []

  const firstCoords = display.find((l) => l.polygon_geojson?.coordinates?.[0])?.polygon_geojson?.coordinates?.[0]
  const center = getCentroid(firstCoords) || getLatLngCentroid(boundaryPoints) || defaultCenter
  const initialZoom = boundaryPoints.length > 0 ? 17 : 14

  return (
    <div style={{ height }} className={containerClassName || 'rounded-lg overflow-hidden border shadow'}>
      <MapContainer
        center={center}
        zoom={initialZoom}
        maxBounds={MINDANAO_BOUNDS}
        maxBoundsViscosity={1}
        minZoom={7}
        scrollWheelZoom={scrollWheelZoom}
        wheelDebounceTime={80}
        wheelPxPerZoomLevel={120}
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
        preferCanvas={true}
        dragging={dragging}
        zoomControl={false}
        doubleClickZoom={doubleClickZoom}
        attributionControl={showAttribution}
        style={{ height: '100%', width: '100%' }}
      >
        <MapResizeHandler />
        {showLayersControl ? <MapStyleToggle showAttribution={showAttribution} initialSatellite={initialSatellite} /> : (
          <TileLayer
            attribution={showAttribution ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' : ''}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        <FlyTo target={flyTo} />
        {fitBoundary && <FitBoundary points={boundaryPoints} />}
        {fitBounds && <FitBounds listings={display} />}
        {onAddBoundaryPoint && <BoundaryPointPicker onAddPoint={onAddBoundaryPoint} />}
        <DraftBoundary points={boundaryPoints} pointColors={boundaryPointColors} pointSizes={boundaryPointSizes} />
        <PhotoGeotagMarkers geotags={draftPhotoGeotags} isDraft />
        {display.map((listing) => {
          const isActive = selectedListingId
            ? listing.id === selectedListingId
            : flyTo?.id === listing.id
          const hasPolygon = !!listing.polygon_geojson?.coordinates?.[0]
          return hasPolygon ? (
            <ActivePolygon
              key={listing.id}
              listing={listing}
              isActive={isActive}
              onSelect={handleSelectListing}
              adminActions={adminActions}
            />
          ) : (
            <FallbackMarker
              key={listing.id}
              listing={listing}
              isActive={isActive}
              onSelect={handleSelectListing}
              adminActions={adminActions}
            />
          )
        })}
        {display.map((listing) => (
          <PhotoGeotagMarkers key={`geotags-${listing.id}`} geotags={listing.photo_geotags} />
        ))}
      </MapContainer>
    </div>
  )
}
