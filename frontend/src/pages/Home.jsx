import { AnimatePresence, motion } from 'framer-motion'
import { Cloud } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user, needsProfileSetup } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // Cambio de "modo" entre login y registro

  // Si el usuario ya tiene la sesión iniciada, regirige a home (para futuro botón de "recuerdame")
  if (user) {
    navigate(needsProfileSetup ? '/perfil' : '/dashboard', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 flex flex-col">
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
            style={{
              left: `${10 + i * 8}%`,
              top: `${20 + (i % 4) * 20}%`,
            }}
            animate={{
              y: [-10, 10, -10],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 3 + i * 0.4,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/*Logo*/}
        <motion.div
          className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="mb-6"
          >
            <div className="w-20 h-20 bg-blue-600/20 border-2 border-blue-500/40 rounded-3xl flex items-center justify-center">
              <Cloud className="w-10 h-10 text-blue-400" />
            </div>
          </motion.div>

          <h1 className="text-5xl font-black text-white mb-4 leading-tight">
            Weather
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Self
            </span>
          </h1>
          
          {/* Mensaje de debajo del logo */}
          <p className="text-slate-300 text-xl mb-6 max-w-md">
            El clima que se adapta a ti, impulsado por IA
          </p>
        </motion.div>

        {/* Panel de formulario inicio/registro */}
        <motion.div
          className="flex items-center justify-center px-8 py-16 lg:min-w-[480px]"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <LoginForm key="login" onSwitchToRegister={() => setMode('register')} />
            ) : (
              <RegisterForm key="register" onSwitchToLogin={() => setMode('login')} />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
