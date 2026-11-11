import { apiBaseUrl } from '../api/api.js'

// Listing photos created before persistent storage may still be stored as
// relative /uploads/... paths. Resolve those paths against the API host so
// the browser does not accidentally request them from the Vercel frontend.
const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')

export function resolveMediaUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  const mediaUrl = value.trim()

  if (/^(?:https?:|data:|blob:)/i.test(mediaUrl)) return mediaUrl

  const path = mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`
  return apiOrigin ? `${apiOrigin}${path}` : path
}
