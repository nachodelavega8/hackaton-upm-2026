import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

function loadStoredUser() {
  try {
    const raw = localStorage.getItem('weatherself_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser)
  const [token, setToken] = useState(() => localStorage.getItem('weatherself_token'))
  const [loading, setLoading] = useState(false)

  // Keep axios header in sync with token state
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common['Authorization']
    }
  }, [token])

  const _persist = (accessToken, userData) => {
    setToken(accessToken)
    setUser(userData)
    localStorage.setItem('weatherself_token', accessToken)
    localStorage.setItem('weatherself_user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
  }

  const login = useCallback(async (username, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('/api/user/login', { username, password })
      _persist(data.access_token, data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (username, password, email) => {
    setLoading(true)
    try {
      const { data } = await api.post('/api/user/register', { username, password, email })
      _persist(data.access_token, data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('weatherself_token')
    localStorage.removeItem('weatherself_user')
    delete api.defaults.headers.common['Authorization']
  }, [])

  const updateAvatar = useCallback(async (avatarState) => {
    const { data } = await api.put('/api/user/avatar', { avatar_state: avatarState })
    setUser(data)
    localStorage.setItem('weatherself_user', JSON.stringify(data))
    return data
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
