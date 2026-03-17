import axios from 'axios'

// In local dev the Vite proxy forwards relative URLs to localhost:8000.
// When accessed via ngrok (or any non-localhost host), VITE_API_BASE_URL must
// point to the backend ngrok URL so browsers can reach it directly.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',   // bypass ngrok browser-warning page
  },
})

// Attach stored token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('weatherself_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// On 401 — clear session and redirect to home
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('weatherself_token')
      localStorage.removeItem('weatherself_user')
      if (!window.location.pathname.includes('/admin')) {
        window.location.href = '/'
      }
    }
    return Promise.reject(err)
  },
)

export default api
