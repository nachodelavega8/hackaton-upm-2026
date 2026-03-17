import { motion } from 'framer-motion'
import { Lock, Shield } from 'lucide-react'
import { useState } from 'react'
import api from '../../services/api'

export default function AdminLogin({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/admin/login', { password })
      onSuccess(password)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Invalid admin password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <motion.div
        className="glass rounded-2xl p-8 w-full max-w-sm"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col items-center gap-3 mb-7">
          <div className="w-14 h-14 bg-purple-600/20 border border-purple-500/40 rounded-2xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-purple-400" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 text-sm">WeatherSelf Control Center</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Admin Password</label>
            <div className="relative">
              <input
                type="password"
                className="input-field pl-10"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>
          </div>

          {error && (
            <motion.p
              className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-600"
          >
            {loading ? (
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Access Panel
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
