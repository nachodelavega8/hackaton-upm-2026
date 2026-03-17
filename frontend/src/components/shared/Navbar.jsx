import { motion } from 'framer-motion'
import { Cloud, LogOut, Settings, Wifi, WifiOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useWebSocket } from '../../context/WebSocketContext'

const AVATAR_ICONS = {
  tired: '😴', energized: '⚡', sick: '🤒', athletic: '🏃', important: '💼',
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { connected } = useWebSocket()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <motion.nav
      className="sticky top-0 z-50 glass-dark border-b border-white/10"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Cloud className="w-7 h-7 text-blue-400" />
          </motion.div>
          <span className="font-black text-xl bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            WeatherSelf
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* WS indicator */}
          <div className="flex items-center gap-1.5">
            {connected ? (
              <>
                <motion.div
                  className="w-2 h-2 bg-green-400 rounded-full"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <Wifi className="w-4 h-4 text-green-400" />
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-slate-500 rounded-full" />
                <WifiOff className="w-4 h-4 text-slate-500" />
              </>
            )}
          </div>

          {/* User avatar + name */}
          {user && (
            <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-full">
              <span className="text-lg">{AVATAR_ICONS[user.avatar_state] ?? '🌤️'}</span>
              <span className="text-sm text-slate-200 font-medium">{user.username}</span>
            </div>
          )}

          {/* Admin link */}
          <Link to="/admin" className="btn-ghost text-xs py-1.5 px-3">
            <Settings className="w-4 h-4" />
          </Link>

          {/* Logout */}
          {user && (
            <button onClick={handleLogout} className="btn-ghost text-xs py-1.5 px-3">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.nav>
  )
}
