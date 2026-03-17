import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Navigate, useNavigate } from 'react-router-dom'
import { Cloud, Mail, User, Cake, Trash2, ArrowLeft } from 'lucide-react'
import { useState } from 'react'

const AVATAR_ICONS = {
  tired: '😴',
  energized: '⚡',
  sick: '🤒',
  athletic: '🏃',
  important: '💼',
}

const AGE_RANGE_LABELS = {
  '13-17': 'Adolescente (13-17)',
  '18-25': 'Joven adulto (18-25)',
  '26-35': 'Adulto (26-35)',
  '36-50': 'Adulto mayor (36-50)',
  '50+': 'Senior (50+)',
}

export default function UserProfile() {
  const { user, token, deleteAccount, loading } = useAuth()
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Si no hay sesión, redirigir al home
  if (!token || !user) {
    return <Navigate to="/" replace />
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount()
      navigate('/')
    } catch (error) {
      console.error('Error al eliminar cuenta:', error)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 py-12 px-4">
      <motion.div
        className="max-w-2xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <motion.button
            onClick={() => navigate('/dashboard')}
            className="mb-6 flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            whileHover={{ x: -3 }}
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Dashboard
          </motion.button>
          <div className="flex justify-center mb-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Cloud className="w-12 h-12 text-blue-400" />
            </motion.div>
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Perfil de Usuario</h1>
          <p className="text-slate-400">Aquí están todos tus detalles</p>
        </motion.div>

        {/* Avatar Section */}
        {user.avatar_state && (
          <motion.div
            variants={itemVariants}
            className="glass rounded-2xl p-8 mb-6 text-center"
          >
            <p className="text-sm text-slate-400 mb-3">Tu Avatar</p>
            <div className="text-6xl inline-block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {AVATAR_ICONS[user.avatar_state] || '🌤️'}
            </div>
            <p className="text-slate-300 text-sm mt-3 capitalize">{user.avatar_state}</p>
          </motion.div>
        )}

        {/* User Details Grid */}
        <div className="space-y-4">
          {/* Username */}
          <motion.div
            variants={itemVariants}
            className="glass rounded-2xl p-6 flex items-start gap-4"
          >
            <div className="flex-shrink-0 pt-1">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Nombre de Usuario</p>
              <p className="text-lg font-semibold text-white">{user.username}</p>
            </div>
          </motion.div>

          {/* Email */}
          <motion.div
            variants={itemVariants}
            className="glass rounded-2xl p-6 flex items-start gap-4"
          >
            <div className="flex-shrink-0 pt-1">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Email</p>
              <p className="text-lg font-semibold text-white break-all">{user.email}</p>
            </div>
          </motion.div>

          {/* Age Range */}
          {user.age_range && (
            <motion.div
              variants={itemVariants}
              className="glass rounded-2xl p-6 flex items-start gap-4"
            >
              <div className="flex-shrink-0 pt-1">
                <Cake className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Rango de Edad</p>
                <p className="text-lg font-semibold text-white">
                  {AGE_RANGE_LABELS[user.age_range] || user.age_range}
                </p>
              </div>
            </motion.div>
          )}

          {/* User ID */}
          <motion.div
            variants={itemVariants}
            className="glass rounded-2xl p-6"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">ID de Usuario</p>
            <p className="text-sm font-mono text-slate-300 break-all">{user.id}</p>
          </motion.div>
        </div>

        {/* Additional Info */}
        <motion.div
          variants={itemVariants}
          className="glass-dark rounded-2xl p-6 mt-8"
        >
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Información Adicional</h3>
          <div className="space-y-2 text-sm text-slate-400">
            <p>
              <span className="text-slate-300 font-medium">Perfil Completado:</span>{' '}
              {user.age_range ? '✓ Sí' : '✗ No'}
            </p>
            <p>
              <span className="text-slate-300 font-medium">Estado Avatar:</span>{' '}
              {user.avatar_state ? '✓ Configurado' : '✗ Por configurar'}
            </p>
          </div>
        </motion.div>

        {/* Delete Account Button */}
        <motion.button
          variants={itemVariants}
          onClick={() => setShowDeleteModal(true)}
          className="w-full mt-8 px-6 py-3 bg-red-600/20 hover:bg-red-600/30 
                     border border-red-500/50 text-red-400 font-semibold rounded-xl
                     transition-colors flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Trash2 className="w-4 h-4" />
          Eliminar Cuenta
        </motion.button>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4"
            >
              <div className="glass-dark rounded-2xl p-8 max-w-sm w-full">
                <h2 className="text-2xl font-bold text-white mb-2">¿Eliminar Cuenta?</h2>
                <p className="text-slate-300 mb-6">
                  Esta acción es irreversible. Se eliminarán todos tus datos, tu perfil y todo el historial asociado a tu cuenta.
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold
                               rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    No, Cancelar
                  </motion.button>
                  <motion.button
                    onClick={handleDeleteAccount}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50
                               text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                  >
                    {loading ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                        />
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Sí, Eliminar
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
