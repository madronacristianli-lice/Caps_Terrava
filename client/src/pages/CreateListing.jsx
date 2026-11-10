import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import api from '../api/api.js'
import CreateListingForm from '../components/CreateListingForm.jsx'
import Spinner from '../components/Spinner.jsx'
import { ArrowLeft } from 'lucide-react'

export default function CreateListing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleFormSubmit = async (payload) => {
    console.log('CreateListingForm payload:', payload)

    setLoading(true)
    const data = new FormData()
    data.append('title', payload.title || '')
    data.append('description', payload.description || '')
    data.append('price', payload.total_contract_price || payload.price || '')
    data.append('area_sqm', payload.area_sqm || '')
    data.append('location_text', payload.location_text || '')
    data.append('branch', payload.branch || user?.branch || '')
    if (payload.polygon_geojson) {
      data.append('polygon_geojson', JSON.stringify(payload.polygon_geojson))
    }

    const extraData = {
      zoning_classification: payload.zoning_classification,
      land_title_status: payload.land_title_status,
      total_contract_price: payload.total_contract_price,
      reservation_fee: payload.reservation_fee,
      minimum_down_payment_pct: payload.minimum_down_payment_pct,
      cash_term_enabled: payload.cash_term_enabled,
      cash_term_discount_pct: payload.cash_term_discount_pct,
      in_house_financing_enabled: payload.in_house_financing_enabled,
      in_house_max_term_years: payload.in_house_max_term_years,
      in_house_interest_rate_pct: payload.in_house_interest_rate_pct,
      bank_government_loan_enabled: payload.bank_government_loan_enabled,
      terrain_topography: payload.terrain_topography,
      lot_configuration: payload.lot_configuration,
      utilities: payload.utilities
    }
    data.append('extra_data', JSON.stringify(extraData))

    if (payload.photos && payload.photos.length > 0) {
      payload.photos.forEach((file) => data.append('photos', file))
    }

    try {
      await api.post('/listings', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (payload._draftKey) localStorage.removeItem(payload._draftKey)
      addToast('Listing posted successfully!', 'success')
      navigate('/')
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to create listing', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Post a Land Listing</h1>
        <p className="text-sm text-gray-500 mt-1">Enter complete property details to publish a new land listing.</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-emerald-700">
            <Spinner size="md" />
            <span className="font-semibold">Posting listing...</span>
          </div>
        </div>
      )}

      {!loading && (
        <CreateListingForm
          initialBranch={user?.branch || ''}
          branchLocked={user?.role === 'seller'}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  )
}
