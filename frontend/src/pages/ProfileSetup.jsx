import { motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AGE_RANGE_OPTIONS = ['0-16', '17-30', '30-50', '50-65', '65+']

export default function ProfileSetup() {
  const { user, completeProfile, loading } = useAuth()
  const navigate = useNavigate()
  const [ageRange, setAgeRange] = useState(user?.age_range ?? '')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!ageRange) {
      setError('Selecciona un rango de edad para continuar.')
      return
    }

    try {
      await completeProfile(ageRange)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'No se pudo guardar tu perfil. Intenta de nuevo.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 flex items-center justify-center px-6 py-10">
      <motion.div
        className="glass rounded-2xl p-8 w-full max-w-xl"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-2xl font-bold text-white mb-1">Completa tu perfil</h1>
        <p className="text-slate-400 text-sm mb-6">
          Antes de entrar, necesitamos un dato para personalizar WeatherSelf.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-sm text-slate-300 mb-2">Rango de edad *</legend>

            {AGE_RANGE_OPTIONS.map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 cursor-pointer hover:border-blue-400/40"
              >
                <input
                  type="radio"
                  name="ageRange"
                  value={option}
                  checked={ageRange === option}
                  onChange={(e) => setAgeRange(e.target.value)}
                  className="accent-blue-500"
                />
                <span className="text-slate-200">{option}</span>
              </label>
            ))}
          </fieldset>

          {error && (
            <motion.p
              className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Guardando...' : 'Continuar'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
