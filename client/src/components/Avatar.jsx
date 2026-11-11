import { useState } from 'react'
import { resolveMediaUrl } from '../utils/media.js'

export default function Avatar({ url, name = '', sizeClass = 'w-10 h-10', textClass = 'text-xs', className = '', fallbackClass = 'bg-brand-600' }) {
  const [failed, setFailed] = useState(false)

  const initials = name
    ? name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  if (url && !failed) {
    return (
      <img
        src={resolveMediaUrl(url)}
        alt={name || 'User'}
        className={`object-cover rounded-full ${sizeClass} ${className}`}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div className={`rounded-full flex items-center justify-center text-white font-bold ${fallbackClass} ${textClass} ${sizeClass} ${className}`}>
      {initials}
    </div>
  )
}
