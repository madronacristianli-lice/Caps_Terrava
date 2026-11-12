export const BRANCHES = ['Main Tagum', 'Panabo', 'Sto. Tomas', 'Davao City', 'Mati City', 'Digos City']

// Keep the database/API key stable while presenting the full city name to users.
export const displayBranchName = (branch) => branch === 'Panabo' ? 'Panabo City' : branch

export const normalizeBranchName = (branch) => {
  const value = String(branch || '').trim()
  if (value === 'Panabo City') return 'Panabo'
  if (value === 'Tagum City' || value === 'Main Tagum City') return 'Main Tagum'
  return value
}

export const BRANCH_COORDINATES = {
  // Keep these branch centers aligned with the branch directory and the
  // add/edit GIS navigator. Panabo and Tagum are close geographically, so
  // using the wrong center can make a Panabo selection appear to stay in
  // Tagum.
  'Main Tagum': [7.4478, 125.8070],
  'Panabo': [7.3097, 125.6839],
  'Sto. Tomas': [7.1827, 125.6359],
  'Davao City': [7.0707, 125.6087],
  'Mati City': [6.9529, 126.2169],
  'Digos City': [6.7494, 125.3572],
}

export const BRANCH_ZOOM = 13
export const MINDANAO_BOUNDS = [[4.5, 119.0], [10.8, 126.9]]

// City centers used by the add/edit GIS map quick navigator. These are only
// navigation shortcuts; they do not change the listing's saved coordinates.
export const MINDANAO_CITIES = [
  { name: 'Bayugan City', center: [8.7142, 125.7480] },
  { name: 'Bislig City', center: [8.2152, 126.3166] },
  { name: 'Butuan City', center: [8.9475, 125.5406] },
  { name: 'Cabadbaran City', center: [9.1226, 125.5350] },
  { name: 'Cagayan de Oro City', center: [8.4542, 124.6319] },
  { name: 'Cotabato City', center: [7.2236, 124.2465] },
  { name: 'Dapitan City', center: [8.6561, 123.4227] },
  { name: 'Davao City', center: [7.1907, 125.4553] },
  { name: 'Digos City', center: [6.7490, 125.3572] },
  { name: 'Dipolog City', center: [8.5880, 123.3409] },
  { name: 'El Salvador City', center: [8.5630, 124.5220] },
  { name: 'General Santos City', center: [6.1164, 125.1716] },
  { name: 'Gingoog City', center: [8.8260, 125.1016] },
  { name: 'Iligan City', center: [8.2280, 124.2452] },
  { name: 'Isabela City', center: [6.7041, 121.9712] },
  { name: 'Kidapawan City', center: [7.0083, 125.0894] },
  { name: 'Koronadal City', center: [6.5007, 124.8469] },
  { name: 'Malaybalay City', center: [8.1575, 125.1278] },
  { name: 'Marawi City', center: [7.9986, 124.2928] },
  { name: 'Mati City', center: [6.9540, 126.2150] },
  { name: 'Oroquieta City', center: [8.4854, 123.8047] },
  { name: 'Ozamiz City', center: [8.1481, 123.8418] },
  { name: 'Pagadian City', center: [7.8257, 123.4370] },
  { name: 'Panabo City', center: [7.3097, 125.6839] },
  { name: 'Samal City', center: [7.0650, 125.7280] },
  { name: 'Surigao City', center: [9.7890, 125.4950] },
  { name: 'Tacurong City', center: [6.6925, 124.6764] },
  { name: 'Tagum City', center: [7.4478, 125.8070] },
  { name: 'Tangub City', center: [8.0618, 123.7474] },
  { name: 'Tandag City', center: [9.0783, 126.1982] },
  { name: 'Valencia City', center: [7.9064, 125.0940] },
  { name: 'Zamboanga City', center: [6.9214, 122.0790] },
]

export function getBranch(listing) {
  if (listing.branch) return listing.branch
  const loc = (listing.location_text || '').toLowerCase()
  if (loc.includes('panabo')) return 'Panabo'
  if (loc.includes('sto. tomas') || loc.includes('sto tomas') || loc.includes('santo tomas')) return 'Sto. Tomas'
  if (loc.includes('davao city') || loc.includes('davao')) return 'Davao City'
  if (loc.includes('mati city') || loc.includes('mati')) return 'Mati City'
  if (loc.includes('digos city') || loc.includes('digos')) return 'Digos City'
  if (loc.includes('tagum')) return 'Main Tagum'
  return 'Other'
}
