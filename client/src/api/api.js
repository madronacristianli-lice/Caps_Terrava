import axios from 'axios'

// The frontend is deployed on Vercel and the API is deployed on Render. Keep
// local development on the Vite proxy while production talks to the live API.
const productionApiUrl = 'https://terrava-api.onrender.com/api'
const configuredApiUrl = import.meta.env.VITE_API_URL
export const apiBaseUrl = import.meta.env.PROD && (!configuredApiUrl || configuredApiUrl === '/api')
  ? productionApiUrl
  : (configuredApiUrl || '/api')

const api = axios.create({
  // Vite injects VITE_API_URL at build time for the deployed frontend.
  // Keep the relative fallback so local Vite proxy development still works.
  baseURL: apiBaseUrl
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
