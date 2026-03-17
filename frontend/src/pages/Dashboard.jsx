import { motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import AvatarSelector from '../components/user/AvatarSelector'
import HistoryDashboard from '../components/user/HistoryDashboard'
import WeatherCard from '../components/user/WeatherCard'
import Navbar from '../components/shared/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Dashboard() {
  const { user, updateAvatar } = useAuth()
  const [avatarState, setAvatarState] = useState(user?.avatar_state ?? 'energized')
  const [weatherData, setWeatherData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAvatarSelect = async (state) => {
    setAvatarState(state)
    try {
      await updateAvatar(state)
    } catch {
      // non-critical
    }
  }

  const fetchWeather = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/api/weather/current?avatar_state=${avatarState}`)
      setWeatherData(data)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to fetch weather. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [avatarState])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/20">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-black text-white">
              Hello, <span className="text-blue-400">{user?.username}</span> 👋
            </h1>
            <p className="text-slate-400 text-sm">Get your personalized forecast</p>
          </div>
        </motion.div>

        {/* Avatar selector */}
        <motion.div
          className="glass rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AvatarSelector selected={avatarState} onSelect={handleAvatarSelect} />

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <motion.button
              onClick={fetchWeather}
              disabled={loading}
              className="btn-primary flex-1 text-base py-3 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                  />
                  Analyzing…
                </>
              ) : (
                <>☁️ Get My Forecast</>
              )}
            </motion.button>
          </div>

          {error && (
            <motion.p
              className="mt-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}
        </motion.div>

        {/* Weather Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <WeatherCard data={weatherData} loading={loading} onRefresh={fetchWeather} />
        </motion.div>

        {/* History */}
        <motion.div
          className="glass rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <HistoryDashboard />
        </motion.div>
      </div>
    </div>
  )
}
