import { MINDANAO_BOUNDS } from './branches.js'

export async function readPhotoGeotag(file) {
  try {
    const { gps } = await import('exifr/dist/full.esm.mjs')
    const { latitude: lat, longitude: lng } = (await gps(file)) || {}
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { status: 'missing' }

    const [[south, west], [north, east]] = MINDANAO_BOUNDS
    if (lat < south || lat > north || lng < west || lng > east) return { status: 'outside' }
    return { status: 'located', lat, lng }
  } catch {
    return { status: 'unreadable' }
  }
}
