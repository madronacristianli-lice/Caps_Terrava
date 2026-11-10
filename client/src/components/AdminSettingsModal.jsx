import { useState } from 'react'
import { Building2, Eye, EyeOff, Lock, Save, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import api from '../api/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { displayBranchName } from '../utils/branches.js'

const BRANCHES = ['Main Tagum', 'Panabo', 'Sto. Tomas', 'Davao City', 'Mati City', 'Digos City']

const emptySeller = {
  first_name: '', middle_name: '', last_name: '', extension_name: '', email: '', password: '',
  phone: '', phone2: '', birthdate: '', address: '', occupation: '', branch: '',
  spouse_first_name: '', spouse_middle_name: '', spouse_last_name: '', spouse_extension_name: '',
  spouse_email: '', spouse_phone: '', spouse_occupation: ''
}

const personalFields = [
  ['first_name', 'First Name', 'text', true],
  ['middle_name', 'Middle Name', 'text'],
  ['last_name', 'Last Name', 'text', true],
  ['extension_name', 'Extension Name', 'text'],
  ['phone', 'Contact Number', 'text', true],
  ['phone2', 'Alternate Number', 'text'],
  ['birthdate', 'Birthdate', 'date', true],
  ['occupation', 'Occupation', 'text', true]
]

const spouseFields = [
  ['spouse_first_name', 'Spouse First Name'],
  ['spouse_middle_name', 'Spouse Middle Name'],
  ['spouse_last_name', 'Spouse Last Name'],
  ['spouse_extension_name', 'Spouse Extension'],
  ['spouse_email', 'Spouse Email', 'email'],
  ['spouse_phone', 'Spouse Contact Number'],
  ['spouse_occupation', 'Spouse Occupation']
]

const Field = ({ label, required, children }) => (
  <label className="block text-xs font-bold text-gray-700">
    {label}{required && <span className="text-red-500"> *</span>}
    {children}
  </label>
)

const TextInput = ({ value, onChange, type = 'text', required, placeholder = '' }) => (
  <input type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
)

export default function AdminSettingsModal({ user, onClose, onUserUpdated, onSellerCreated }) {
  const { addToast } = useToast()
  const [tab, setTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [profile, setProfile] = useState(() => Object.fromEntries([...personalFields, ...spouseFields, ['address', 'Address']].map(([key]) => [key, user?.[key] || ''])))
  const [password, setPassword] = useState({ current_password: '', new_password: '', confirm: '' })
  const [seller, setSeller] = useState(emptySeller)

  const update = (setter, key) => (event) => setter((current) => ({ ...current, [key]: event.target.value }))

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const full_name = [profile.first_name, profile.middle_name, profile.last_name, profile.extension_name].filter(Boolean).join(' ')
      const response = await api.put('/auth/profile', { ...profile, full_name })
      onUserUpdated(response.data.user)
      addToast('Admin profile updated successfully', 'success')
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to update admin profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    if (password.new_password !== password.confirm) {
      addToast('New passwords do not match', 'error')
      return
    }
    setSaving(true)
    try {
      await api.put('/auth/password', password)
      setPassword({ current_password: '', new_password: '', confirm: '' })
      addToast('Password changed successfully', 'success')
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to change password', 'error')
    } finally {
      setSaving(false)
    }
  }

  const createSeller = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await api.post('/admin/sellers', seller)
      onSellerCreated(response.data.user)
      setSeller(emptySeller)
      addToast(`Seller created and assigned to ${response.data.user.branch}`, 'success')
      setTab('profile')
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to create seller', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-bold text-gray-900">Administrator Settings</h2><p className="text-xs text-gray-500">Manage your account and verified seller access.</p></div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" aria-label="Close settings"><X className="h-5 w-5" /></button>
        </div>

        <div className="relative z-20 flex flex-shrink-0 gap-2 overflow-x-auto border-b border-gray-100 bg-white px-5 pt-3">
          {[['profile', 'Profile', Users], ['security', 'Password', Lock], ['seller', 'Add Seller', UserPlus]].map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)} className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-bold transition ${tab === key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><Icon className="h-4 w-4" />{label}</button>
          ))}
        </div>

        <div className="overflow-y-auto p-5">
          {tab === 'profile' && (
            <form onSubmit={saveProfile} className="space-y-5">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm"><p className="font-bold text-emerald-900">Administrator account</p><p className="mt-1 text-emerald-800">{user?.email} <span className="mx-1">·</span> Admin</p></div>
              <section><h3 className="mb-3 text-sm font-bold text-gray-900">Personal Details</h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{personalFields.map(([key, label, type, required]) => <Field key={key} label={label} required={required}><TextInput type={type} value={profile[key]} onChange={update(setProfile, key)} required={required} /></Field>)}<div className="sm:col-span-2"><Field label="Home Address" required><TextInput value={profile.address} onChange={update(setProfile, 'address')} required /></Field></div></div></section>
              <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4"><h3 className="mb-3 text-sm font-bold text-gray-900">Spouse Information <span className="font-normal text-gray-400">(optional)</span></h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{spouseFields.map(([key, label, type]) => <Field key={key} label={label}><TextInput type={type || 'text'} value={profile[key]} onChange={update(setProfile, key)} /></Field>)}</div></section>
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Profile'}</button>
            </form>
          )}

          {tab === 'security' && (
            <form onSubmit={changePassword} className="max-w-lg space-y-4"><div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">Use at least 8 characters, including one uppercase letter and a number or special character.</div>{[['current_password', 'Current Password'], ['new_password', 'New Password'], ['confirm', 'Confirm New Password']].map(([key, label]) => <Field key={key} label={label} required><div className="relative"><TextInput type={showPassword ? 'text' : 'password'} value={password[key]} onChange={update(setPassword, key)} required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute bottom-2.5 right-3 text-gray-400 hover:text-emerald-600">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field>)}<button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"><Lock className="h-4 w-4" />{saving ? 'Updating…' : 'Change Password'}</button></form>
          )}

          {tab === 'seller' && (
            <form onSubmit={createSeller} className="space-y-5"><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-bold">Admin verified seller onboarding</p><p className="mt-1">Only administrators can create sellers. The assigned branch is locked for the seller and cannot be changed from their profile.</p></div><section><h3 className="mb-3 text-sm font-bold text-gray-900">Seller Identity & Assignment</h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{personalFields.map(([key, label, type, required]) => <Field key={key} label={label} required={required}><TextInput type={type} value={seller[key]} onChange={update(setSeller, key)} required={required} /></Field>)}<Field label="Email Address" required><TextInput type="email" value={seller.email} onChange={update(setSeller, 'email')} required /></Field><Field label="Temporary Password" required><TextInput type="password" value={seller.password} onChange={update(setSeller, 'password')} required /><span className="mt-1 block text-[11px] font-normal text-gray-500">8+ characters, uppercase, and number/special character.</span></Field><div className="sm:col-span-2"><Field label="Home Address" required><TextInput value={seller.address} onChange={update(setSeller, 'address')} required /></Field></div><Field label="Assigned Branch" required><select value={seller.branch} onChange={update(setSeller, 'branch')} required className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="">Select branch assignment</option>{BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></Field><div className="flex items-end rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-500"><Building2 className="mr-2 h-4 w-4 text-emerald-600" />Branch is controlled by the administrator.</div></div></section><section className="rounded-2xl border border-gray-200 bg-gray-50 p-4"><h3 className="mb-3 text-sm font-bold text-gray-900">Spouse Information <span className="font-normal text-gray-400">(optional)</span></h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{spouseFields.map(([key, label, type]) => <Field key={key} label={label}><TextInput type={type || 'text'} value={seller[key]} onChange={update(setSeller, key)} /></Field>)}</div></section><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"><UserPlus className="h-4 w-4" />{saving ? 'Creating…' : 'Create Verified Seller'}</button></form>
          )}
        </div>
      </div>
    </div>
  )
}
