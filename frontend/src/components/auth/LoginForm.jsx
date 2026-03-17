import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function LoginForm({ onSwitchToRegister }) {
  const { login, loading } = useAuth()
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  //Gestionar errores en inicio de sesión
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(form.email, form.username, form.password)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Error de inicio de sesión. Revisa tus credenciales.')
    }
  }

  return (
    <motion.div
      className="glass rounded-2xl p-8 w-full max-w-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/*Texto principal de creación de cuenta*/}
      <h2 className="text-2xl font-bold text-white mb-1">Bienvenido de nuevo</h2>
      <p className="text-slate-400 text-sm mb-6">Inicia sesión en tu cuenta de WeatherSelf</p>

      {/*Text-box correo*/}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Email</label>
          <input
            type="email"
            className="input-field"
            placeholder="tu_email@ejemplo.com"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
            autoFocus
          />
        </div>

        {/*Text-box nombre de usuario*/}
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Nombre de usuario</label>
          <input
            type="text"
            className="input-field"
            placeholder="tu_usuario"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            required
          />
        </div>

        {/*Text-box contraseña*/}
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Contraseña</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input-field pr-12"
              placeholder="••••••••"
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

        {/* Texto de error en inicio de sesión*/}
        {error && (
          <motion.p
            className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.p>
        )}

        {/*Botón de inicio de sesión*/}
        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
          {loading ? (
            <motion.div
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <>
              <LogIn className="w-4 h-4" /> Iniciar sesión
            </>
          )}
        </button>
      </form>

      {/*Botón crear cuenta nueva (registro)*/}
      <p className="text-center text-slate-400 text-sm mt-5">
        ¿No tienes cuenta?{' '}
        <button onClick={onSwitchToRegister} className="text-blue-400 hover:text-blue-300 font-medium">
          Crear cuenta
        </button>
      </p>
    </motion.div>
  )
}
