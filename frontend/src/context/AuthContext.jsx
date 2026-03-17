import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

// Variable explicitly prepared for future system_prompt integration.
export const SYSTEM_PROMPT_PROFILE_CONTEXT_KEY = 'weatherself_system_prompt_context'
export const SYSTEM_PROMPT_AGE_RANGE_FIELD = 'age_range'

function loadStoredUser() {
  try {
    const raw = localStorage.getItem('weatherself_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function buildSystemPromptProfileContext(ageRange) {
  if (!ageRange) return null
  return {
    [SYSTEM_PROMPT_AGE_RANGE_FIELD]: ageRange,
  }
}

function persistSystemPromptProfileContext(ageRange) {
  const next = buildSystemPromptProfileContext(ageRange)
  if (next) {
    localStorage.setItem(SYSTEM_PROMPT_PROFILE_CONTEXT_KEY, JSON.stringify(next))
  } else {
    localStorage.removeItem(SYSTEM_PROMPT_PROFILE_CONTEXT_KEY)
  }
  return next
}

export function AuthProvider({ children }) {
  const initialUser = loadStoredUser()
  const [user, setUser] = useState(initialUser)
  const [systemPromptProfileContext, setSystemPromptProfileContext] = useState(() =>
    buildSystemPromptProfileContext(initialUser?.age_range),
  )
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
    setSystemPromptProfileContext(persistSystemPromptProfileContext(userData?.age_range))
    localStorage.setItem('weatherself_token', accessToken)
    localStorage.setItem('weatherself_user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
  }

  const login = useCallback(async (email, username, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('/api/user/login', { email, username, password })
      _persist(data.access_token, data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (username, email, password, confirmPassword) => {
    setLoading(true)
    try {
      const { data } = await api.post('/api/user/register', {
        username,
        email,
        password,
        confirm_password: confirmPassword,
      })
      _persist(data.access_token, data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    setSystemPromptProfileContext(null)
    localStorage.removeItem('weatherself_token')
    localStorage.removeItem('weatherself_user')
    localStorage.removeItem(SYSTEM_PROMPT_PROFILE_CONTEXT_KEY)
    delete api.defaults.headers.common['Authorization']
  }, [])

  const deleteAccount = useCallback(async () => {
    setLoading(true)
    try {
      await api.delete('/api/user/me')
      logout()
    } finally {
      setLoading(false)
    }
  }, [logout])

  const completeProfile = useCallback(async (ageRange) => {
    setLoading(true)
    try {
      const { data } = await api.put('/api/user/profile', { age_range: ageRange })
      setUser(data)
      localStorage.setItem('weatherself_user', JSON.stringify(data))
      setSystemPromptProfileContext(persistSystemPromptProfileContext(data.age_range))
      return data
    } finally {
      setLoading(false)
    }
  }, [])

  const updateAvatar = useCallback(async (avatarState) => {
    const { data } = await api.put('/api/user/avatar', { avatar_state: avatarState })
    setUser(data)
    localStorage.setItem('weatherself_user', JSON.stringify(data))
    setSystemPromptProfileContext(persistSystemPromptProfileContext(data.age_range))
    return data
  }, [])

  const needsProfileSetup = Boolean(user && !user.age_range)

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        deleteAccount,
        updateAvatar,
        completeProfile,
        needsProfileSetup,
        systemPromptProfileContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
