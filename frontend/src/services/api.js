import axios from 'axios'

const api = axios.create({
  baseURL: '',          // Uses Vite proxy → /api routes to http://localhost:8000
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
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
