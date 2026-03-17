import { motion } from 'framer-motion'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function RegisterForm({ onSwitchToLogin }) {
  const { register, loading } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  //Gestión de error --> Si la contraseña no coincide o es demasiado corta
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    try {
      await register(form.username, form.email, form.password, form.confirm)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Error de registro. Prueba con otro usuario o correo.')
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
      <h2 className="text-2xl font-bold text-white mb-1">Crear cuenta</h2>
      <p className="text-slate-400 text-sm mb-6">Únete a WeatherSelf para previsiones personalizadas</p>

      {/*Text-box nombre de usuario*/}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Nombre de usuario *</label>
          <input
            type="text"
            className="input-field"
            placeholder="nombre_usuario"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            required
            autoFocus
          />
        </div>

        {/*Text-box correo*/}
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Email *</label>
          <input
            type="email"
            className="input-field"
            placeholder="tu_email@ejemplo.com"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
        </div>

        {/*Text-box contraseña*/}
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Contraseña *</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input-field pr-12"
              placeholder="Mínimo 6 caracteres"
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

        {/*Text-box confirmar contraseña*/}
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Confirmar contraseña *</label>
          <input
            type={showPw ? 'text' : 'password'}
            className="input-field"
            placeholder="Repite la contraseña"
            value={form.confirm}
            onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
            required
          />
        </div>

        {/* Texto de error en registro (contraseña)*/}
        {error && (
          <motion.p
            className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.p>
        )}

        {/*Botón de registro*/}
        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
          {loading ? (
            <motion.div
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <>
              <UserPlus className="w-4 h-4" /> Crear cuenta
            </>
          )}
        </button>
      </form>

      {/*Botón para volver al log-in*/}
      <p className="text-center text-slate-400 text-sm mt-5">
        ¿Ya estás registrado?{' '}
        <button onClick={onSwitchToLogin} className="text-blue-400 hover:text-blue-300 font-medium">
          Iniciar sesión
        </button>
      </p>
    </motion.div>
  )
}
