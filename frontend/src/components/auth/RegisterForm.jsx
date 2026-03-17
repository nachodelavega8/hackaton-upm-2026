import { motion } from 'framer-motion'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function RegisterForm({ onSwitchToLogin }) {
  const { register, loading } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    try {
      await register(form.username, form.password, form.email || null)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Registration failed. Try a different username.')
    }
  }

  return (
    <motion.div
      className="glass rounded-2xl p-8 w-full max-w-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="text-2xl font-bold text-white mb-1">Create account</h2>
      <p className="text-slate-400 text-sm mb-6">Join WeatherSelf for personalized forecasts</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Username *</label>
          <input
            type="text"
            className="input-field"
            placeholder="choose_a_username"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Email (optional)</label>
          <input
            type="email"
            className="input-field"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Password *</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input-field pr-12"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Confirm password *</label>
          <input
            type={showPw ? 'text' : 'password'}
            className="input-field"
            placeholder="Repeat password"
            value={form.confirm}
            onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
            required
          />
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

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
          {loading ? (
            <motion.div
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <>
              <UserPlus className="w-4 h-4" /> Create Account
            </>
          )}
        </button>
      </form>

      <p className="text-center text-slate-400 text-sm mt-5">
        Already registered?{' '}
        <button onClick={onSwitchToLogin} className="text-blue-400 hover:text-blue-300 font-medium">
          Sign in
        </button>
      </p>
    </motion.div>
  )
}
