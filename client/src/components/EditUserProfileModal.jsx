import { useState, useEffect } from 'react'
import { X, Save, User, Mail, Phone, MapPin, Briefcase, Calendar, Home, Store, Users } from 'lucide-react'
import api from '../api/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { displayBranchName } from '../utils/branches.js'

const BRANCHES = ['Main Tagum', 'Panabo', 'Sto. Tomas', 'Davao City', 'Mati City', 'Digos City']

const FIELD_CONFIG = [
  { key: 'first_name', label: 'First Name', icon: User, required: true, col: 'half' },
  { key: 'middle_name', label: 'Middle Name', icon: User, col: 'half' },
  { key: 'last_name', label: 'Last Name', icon: User, required: true, col: 'half' },
  { key: 'extension_name', label: 'Extension Name', icon: User, col: 'half' },
  { key: 'email', label: 'Email Address', icon: Mail, required: true, type: 'email', col: 'full', disabled: true },
  { key: 'phone', label: 'Contact Number', icon: Phone, required: true, col: 'half' },
  { key: 'phone2', label: 'Alternate Number', icon: Phone, col: 'half' },
  { key: 'birthdate', label: 'Birthdate', icon: Calendar, required: true, type: 'date', col: 'half' },
  { key: 'occupation', label: 'Occupation', icon: Briefcase, required: true, col: 'half' },
  { key: 'address', label: 'Home Address', icon: Home, required: true, col: 'full' },
  { key: 'branch', label: 'Assigned Branch', icon: Store, required: true, type: 'select', col: 'full' }
]

const SPOUSE_FIELDS = [
  { key: 'spouse_first_name', label: 'Spouse First Name', icon: User, col: 'half' },
  { key: 'spouse_middle_name', label: 'Spouse Middle Name', icon: User, col: 'half' },
  { key: 'spouse_last_name', label: 'Spouse Last Name', icon: User, col: 'half' },
  { key: 'spouse_extension_name', label: 'Spouse Extension', icon: User, col: 'half' },
  { key: 'spouse_email', label: 'Spouse Email', icon: Mail, type: 'email', col: 'half' },
  { key: 'spouse_phone', label: 'Spouse Contact Number', icon: Phone, col: 'half' },
  { key: 'spouse_occupation', label: 'Spouse Occupation', icon: Briefcase, col: 'full' }
]

export default function EditUserProfileModal({ user, onClose, onSaved }) {
  const { addToast } = useToast()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const initial = {}
    ;[...FIELD_CONFIG, ...SPOUSE_FIELDS].forEach(({ key }) => {
      initial[key] = user?.[key] || ''
    })
    setForm(initial)
  }, [user])

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const requiredMissing = FIELD_CONFIG.filter((f) => f.required && !form[f.key]?.trim()).map((f) => f.label)
    if (requiredMissing.length > 0) {
      addToast(`Please fill in: ${requiredMissing.join(', ')}`, 'error')
      return
    }
    if (form.branch && !BRANCHES.includes(form.branch)) {
      addToast('Please select a valid branch', 'error')
      return
    }

    setSaving(true)
    try {
      const res = await api.put(`/admin/users/${user.id}/profile`, form)
      onSaved(res.data.user)
      addToast(`${user.full_name}'s profile updated successfully`, 'success')
      onClose()
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const renderField = ({ key, label, icon: Icon, required, type = 'text', col, disabled }) => {
    const inputClass = `mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100 disabled:text-gray-500 ${type === 'select' ? 'appearance-none' : ''}`
    return (
      <div key={key} className={col === 'full' ? 'sm:col-span-2' : ''}>
        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
          <Icon className="w-3.5 h-3.5 text-emerald-600" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        {type === 'select' ? (
          <select value={form[key] || ''} onChange={update(key)} required={required} disabled={disabled} className={inputClass}>
            <option value="">Select branch</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{displayBranchName(b)}</option>)}
          </select>
        ) : (
          <input type={type} value={form[key] || ''} onChange={update(key)} required={required} disabled={disabled} className={inputClass} />
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><User className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
              <p className="text-xs text-gray-500">Update {user?.full_name}'s complete information.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 max-h-[calc(90vh-130px)] space-y-5">
          <section>
            <h3 className="mb-3 text-sm font-bold text-gray-900 flex items-center gap-2"><User className="w-4 h-4 text-emerald-600" /> Personal Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{FIELD_CONFIG.map(renderField)}</div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-bold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" /> Spouse Information <span className="font-normal text-gray-400">(Optional)</span></h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{SPOUSE_FIELDS.map(renderField)}</div>
          </section>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Profile'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
