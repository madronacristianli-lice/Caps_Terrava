import axios from 'axios'

// The frontend and API are deployed as separate Vercel projects. Keep local
// development on the Vite proxy, but make the production fallback point to
// the backend instead of accidentally calling the frontend's /api route.
const productionApiUrl = 'https://caps-terrava-1qx5.vercel.app/api'

const api = axios.create({
  // Vite injects VITE_API_URL at build time for the deployed frontend.
  // Keep the relative fallback so local Vite proxy development still works.
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? productionApiUrl : '/api')
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.url?.startsWith('/blockchain')) {
    const ledgerToken = sessionStorage.getItem('blockchainLedgerToken')
    if (ledgerToken) {
      config.headers['X-Ledger-Authorization'] = `Bearer ${ledgerToken}`
    }
  }
  return config
})

export default api
