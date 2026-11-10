import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import api from '../api/api.js'
import Avatar from '../components/Avatar.jsx'
import { User, Mail, Phone, Shield, MapPin, Calendar, Edit3, Save, X, Lock, Eye, EyeOff, Landmark, Users, Camera, Trash2, Loader2 } from 'lucide-react'
import { displayBranchName } from '../utils/branches.js'

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 p-4 bg-brand-50/50 rounded-xl border border-brand-100/60">
    <div className="bg-brand-100 p-2 rounded-lg flex-shrink-0">
      <Icon className="w-4 h-4 text-brand-700" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 break-words">{value || <span className="text-gray-400 italic">Not provided</span>}</p>
    </div>
  </div>
)

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label} {!required && <span className="text-gray-400 font-normal text-xs">(optional)</span>}
    </label>
    {children}
  </div>
)

export default function Profile() {
  const { user, setAuthUser } = useAuth()
  const { addToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    middle_name: user?.middle_name || '',
    last_name: user?.last_name || '',
    extension_name: user?.extension_name || '',
    phone: user?.phone || '',
    phone2: user?.phone2 || '',
    birthdate: user?.birthdate || '',
    address: user?.address || '',
    occupation: user?.occupation || '',
    spouse_first_name: user?.spouse_first_name || '',
    spouse_middle_name: user?.spouse_middle_name || '',
    spouse_last_name: user?.spouse_last_name || '',
    spouse_extension_name: user?.spouse_extension_name || '',
    spouse_email: user?.spouse_email || '',
    spouse_phone: user?.spouse_phone || '',
    spouse_occupation: user?.spouse_occupation || '',
  })

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm) {
      addToast('New passwords do not match', 'error'); return
    }
    setPwLoading(true)
    try {
      await api.put('/auth/password', { current_password: pwForm.current_password, new_password: pwForm.new_password })
      addToast('Password changed successfully!', 'success')
      setPwForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to change password', 'error')
    } finally {
      setPwLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const full_name = [form.first_name, form.middle_name, form.last_name, form.extension_name]
        .filter(Boolean).join(' ')
      const res = await api.put('/auth/profile', { ...form, full_name })
      setAuthUser(res.data.user)
      addToast('Profile updated successfully!', 'success')
      setEditing(false)
    } catch (err) {
      addToast(err.response?.data?.error || 'Update failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const confirmPhotoUpload = async () => {
    if (!photoFile) return
    setPhotoLoading(true)
    try {
      const fd = new FormData()
      fd.append('photo', photoFile)
      const res = await api.post('/auth/profile/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAuthUser(res.data.user)
      addToast('Profile photo updated', 'success')
    } catch (err) {
      addToast(err.response?.data?.error || 'Upload failed', 'error')
    } finally {
      setPhotoLoading(false)
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }

  const cancelPhotoUpload = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handlePhotoRemove = async () => {
    if (!user?.photo_url) return
    if (!window.confirm('Remove your current profile photo?')) return
    setPhotoLoading(true)
    try {
      const res = await api.delete('/auth/profile/photo')
      setAuthUser(res.data.user)
      addToast('Profile photo removed', 'success')
    } catch (err) {
      addToast(err.response?.data?.error || 'Remove failed', 'error')
    } finally {
      setPhotoLoading(false)
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  const computedAge = user?.age ?? (user?.birthdate
    ? (() => {
        const today = new Date()
        const dob = new Date(user.birthdate)
        let age = today.getFullYear() - dob.getFullYear()
        if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) age--
        return age
      })()
    : null)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative flex-shrink-0">
            <Avatar
              url={user?.photo_url}
              name={user?.full_name}
              sizeClass="w-20 h-20"
              textClass="text-2xl"
              className="shadow-lg"
            />
            <label
              className={`absolute -bottom-1 -right-1 p-1.5 rounded-full bg-brand-600 text-white shadow-md cursor-pointer hover:bg-brand-700 transition ${photoLoading ? 'opacity-70' : ''}`}
            >
              {photoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoSelect}
                disabled={photoLoading}
              />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900 truncate">{user?.full_name || '—'}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-700 capitalize">{user?.role}</span>
              <span className="text-gray-400 text-sm">{user?.email}</span>
            </div>
            {user?.photo_url && (
              <button
                onClick={handlePhotoRemove}
                disabled={photoLoading}
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-red-600 hover:text-red-700 transition"
              >
                <Trash2 className="w-3 h-3" /> Remove photo
              </button>
            )}
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition flex-shrink-0 ${
              editing ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            {editing ? <><X className="w-4 h-4" /> Cancel</> : <><Edit3 className="w-4 h-4" /> Edit Profile</>}
          </button>
        </div>
      </div>

      {/* Photo upload confirmation modal */}
      {photoPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Update Profile Photo?</h2>
              <button
                onClick={cancelPhotoUpload}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center mb-6">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-32 h-32 rounded-2xl object-cover border-4 border-brand-100 shadow-lg"
              />
            </div>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will replace your current profile photo.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelPhotoUpload}
                disabled={photoLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmPhotoUpload}
                disabled={photoLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition flex items-center justify-center gap-2"
              >
                {photoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {photoLoading ? 'Uploading...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!editing ? (
        /* ── View mode ── */
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={User} label="First Name" value={user?.first_name} />
            <InfoRow icon={User} label="Middle Name" value={user?.middle_name} />
            <InfoRow icon={User} label="Last Name" value={user?.last_name} />
            <InfoRow icon={User} label="Extension Name" value={user?.extension_name} />
            <InfoRow icon={Mail} label="Email Address" value={user?.email} />
            <InfoRow icon={Shield} label="Role" value={user?.role} />
            <InfoRow icon={Landmark} label="Branch" value={displayBranchName(user?.branch)} />
            <InfoRow icon={Phone} label="Contact Number 1" value={user?.phone} />
            <InfoRow icon={Phone} label="Contact Number 2" value={user?.phone2} />
            <InfoRow icon={Calendar} label="Birthdate" value={user?.birthdate} />
            <InfoRow icon={Calendar} label="Age" value={computedAge ? `${computedAge} years old` : null} />
            <InfoRow icon={Shield} label="Occupation" value={user?.occupation} />
            <div className="sm:col-span-2">
              <InfoRow icon={MapPin} label="Home Address" value={user?.address} />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-brand-100 p-1.5 rounded-lg"><Users className="w-4 h-4 text-brand-700" /></div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Spouse Information</h3>
              <span className="text-xs text-gray-400">(Optional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={User} label="Spouse First Name" value={user?.spouse_first_name} />
              <InfoRow icon={User} label="Spouse Middle Name" value={user?.spouse_middle_name} />
              <InfoRow icon={User} label="Spouse Last Name" value={user?.spouse_last_name} />
              <InfoRow icon={User} label="Spouse Extension Name" value={user?.spouse_extension_name} />
              <InfoRow icon={Mail} label="Spouse Email" value={user?.spouse_email} />
              <InfoRow icon={Phone} label="Spouse Contact Number" value={user?.spouse_phone} />
              <div className="sm:col-span-2">
                <InfoRow icon={Shield} label="Spouse Occupation" value={user?.spouse_occupation} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Edit mode ── */
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Edit Personal Information</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" required>
                <input type="text" className="input-field" value={form.first_name} onChange={set('first_name')} required />
              </Field>
              <Field label="Middle Name">
                <input type="text" className="input-field" value={form.middle_name} onChange={set('middle_name')} />
              </Field>
              <Field label="Last Name" required>
                <input type="text" className="input-field" value={form.last_name} onChange={set('last_name')} required />
              </Field>
              <Field label="Extension Name">
                <input type="text" placeholder="Jr., Sr., III…" className="input-field" value={form.extension_name} onChange={set('extension_name')} />
              </Field>
            </div>

            <div className="border-t border-gray-100 pt-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Role">
                <div className="input-field bg-gray-100 text-gray-600 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-gray-400" /> {user?.role}
                </div>
              </Field>
              <Field label="Branch">
                <div className="input-field bg-gray-100 text-gray-600 flex items-center">
                  <Landmark className="w-4 h-4 mr-2 text-gray-400" /> {user?.branch ? displayBranchName(user.branch) : <span className="text-gray-400 italic">Not assigned</span>}
                </div>
              </Field>
            </div>

            <div className="border-t border-gray-100 pt-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contact Number 1" required>
                <input type="text" className="input-field" value={form.phone} onChange={set('phone')} required />
              </Field>
              <Field label="Contact Number 2">
                <input type="text" className="input-field" value={form.phone2} onChange={set('phone2')} />
              </Field>
              <Field label="Birthdate" required>
                <input type="date" className="input-field" value={form.birthdate} onChange={set('birthdate')} required />
              </Field>
              <Field label="Occupation" required>
                <input type="text" className="input-field" value={form.occupation} onChange={set('occupation')} required />
              </Field>
            </div>

            <Field label="Home Address" required>
              <input type="text" className="input-field" value={form.address} onChange={set('address')} required />
            </Field>

            <div className="border border-gray-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900">Spouse Information</h3>
                <span className="text-xs text-gray-400">(Optional)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Spouse First Name">
                  <input type="text" className="input-field bg-white rounded-xl" value={form.spouse_first_name} onChange={set('spouse_first_name')} />
                </Field>
                <Field label="Spouse Middle Name">
                  <input type="text" className="input-field bg-white rounded-xl" value={form.spouse_middle_name} onChange={set('spouse_middle_name')} />
                </Field>
                <Field label="Spouse Last Name">
                  <input type="text" className="input-field bg-white rounded-xl" value={form.spouse_last_name} onChange={set('spouse_last_name')} />
                </Field>
                <Field label="Spouse Extension Name">
                  <input type="text" placeholder="Jr., Sr., III…" className="input-field bg-white rounded-xl" value={form.spouse_extension_name} onChange={set('spouse_extension_name')} />
                </Field>
                <Field label="Spouse Email">
                  <input type="email" className="input-field bg-white rounded-xl" value={form.spouse_email} onChange={set('spouse_email')} />
                </Field>
                <Field label="Spouse Contact Number">
                  <input type="text" className="input-field bg-white rounded-xl" value={form.spouse_phone} onChange={set('spouse_phone')} />
                </Field>
              </div>
              <Field label="Spouse Occupation">
                <input type="text" className="input-field bg-white rounded-xl" value={form.spouse_occupation} onChange={set('spouse_occupation')} />
              </Field>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Password Change */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="bg-brand-100 p-1.5 rounded-lg"><Lock className="w-5 h-5 text-brand-700" /></div>
          <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          {[{ key: 'current', label: 'Current Password', field: 'current_password' },
            { key: 'new', label: 'New Password', field: 'new_password' },
            { key: 'confirm', label: 'Confirm New Password', field: 'confirm' }].map(({ key, label, field }) => (
            <div key={field}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={showPw[key] ? 'text' : 'password'}
                  className="input-field pr-10"
                  value={pwForm[field]}
                  onChange={(e) => setPwForm({ ...pwForm, [field]: e.target.value })}
                  required
                  minLength={field === 'current_password' ? undefined : 6}
                />
                <button type="button" onClick={() => setShowPw((s) => ({ ...s, [key]: !s[key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={pwLoading} className="btn-primary disabled:opacity-60">
            <Lock className="w-4 h-4" />{pwLoading ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
