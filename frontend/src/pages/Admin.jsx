import { motion } from 'framer-motion'
import { Activity, Bell, Database, Radio, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLogin from '../components/admin/AdminLogin'
import AlertManager from '../components/admin/AlertManager'
import HistoryTable from '../components/admin/HistoryTable'
import MeteoChart from '../components/admin/MeteoChart'
import RedButton from '../components/admin/RedButton'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import api from '../services/api'

const TABS = [
  { id: 'overview',  label: 'Resumen',     icon: Activity },
  { id: 'emergency', label: 'Emergencia',  icon: Radio },
  { id: 'alerts',    label: 'Alertas',     icon: Bell },
  { id: 'history',   label: 'Historial',   icon: Database },
  { id: 'users',     label: 'Usuarios',    icon: Users },
]

function StatsCard({ label, value, icon: Icon, color }) {
  return (
    <motion.div
      className="glass rounded-xl p-5 flex items-center gap-4"
      whileHover={{ scale: 1.02 }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-white">{value ?? '—'}</p>
      </div>
    </motion.div>
  )
}

export default function Admin() {
  const [adminPassword, setAdminPassword] = useState(
    () => sessionStorage.getItem('weatherself_admin_pw') ?? ''
  )
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [usersError, setUsersError] = useState('')
  const [deletingUserId, setDeletingUserId] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const handleLoginSuccess = (pw) => {
    setAdminPassword(pw)
    sessionStorage.setItem('weatherself_admin_pw', pw)
  }

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const { data } = await api.get(`/api/admin/stats?admin_password=${adminPassword}`)
      setStats(data)
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchUsers = async () => {
    setUsersError('')
    try {
      const { data } = await api.get(`/api/admin/users?admin_password=${adminPassword}`)
      setUsers(data)
    } catch (err) {
      setUsersError(err.response?.data?.detail ?? 'No se pudieron cargar los usuarios')
    }
  }

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`¿Eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`)
    if (!confirmed) return

    setDeletingUserId(user.id)
    setUsersError('')
    try {
      await api.delete(`/api/admin/users/${user.id}?admin_password=${encodeURIComponent(adminPassword)}`)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      fetchStats()
    } catch (err) {
      setUsersError(err.response?.data?.detail ?? 'No se pudo eliminar el usuario')
    } finally {
      setDeletingUserId(null)
    }
  }

  useEffect(() => {
    if (!adminPassword) return
    fetchStats()
  }, [adminPassword])

  useEffect(() => {
    if (!adminPassword || activeTab !== 'users') return
    fetchUsers()
  }, [activeTab, adminPassword])

  if (!adminPassword) {
    return <AdminLogin onSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between glass-dark sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-600/30 border border-purple-500/40 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="font-black text-white text-lg">Admin WeatherSelf</h1>
            <p className="text-slate-500 text-xs">Centro de Control</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-green-400 text-xs font-medium">
              {stats?.connected_ws_clients ?? 0} conectados
            </span>
          </motion.div>
          <Link to="/dashboard" className="btn-ghost text-xs">← Volver a la app</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ─── OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {statsLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner text="Cargando estadísticas…" /></div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard label="Usuarios Totales" value={stats.total_users} icon={Users} color="bg-blue-500/20 text-blue-400" />
                  <StatsCard label="Registros Meteorológicos" value={stats.total_weather_records} icon={Database} color="bg-emerald-500/20 text-emerald-400" />
                  <StatsCard label="Alertas Activas" value={stats.active_alerts} icon={Bell} color="bg-amber-500/20 text-amber-400" />
                  <StatsCard label="Alertas de Emergencia" value={stats.emergency_broadcasts} icon={Radio} color="bg-red-500/20 text-red-400" />
                </div>
                <MeteoChart adminPassword={adminPassword} />
              </>
            ) : null}
          </motion.div>
        )}

        {/* ─── EMERGENCY (RED BUTTON) ─── */}
        {activeTab === 'emergency' && (
          <motion.div
            className="glass rounded-2xl border border-red-900/30 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Warning stripe */}
            <div className="bg-gradient-to-r from-red-950 via-red-900/50 to-red-950 border-b border-red-800/40 px-6 py-4">
              <div className="flex items-center gap-3">
                <Radio className="w-5 h-5 text-red-400" />
                <div>
                  <h2 className="font-black text-red-200 uppercase tracking-wide">Sistema de Alerta de Emergencia</h2>
                  <p className="text-red-400/80 text-xs">
                    Selecciona causa, severidad o detén la alerta activa · {stats?.connected_ws_clients ?? 0} usuarios conectados en tiempo real
                  </p>
                </div>
              </div>
            </div>
            <RedButton adminPassword={adminPassword} />
          </motion.div>
        )}

        {/* ─── ALERTS ─── */}
        {activeTab === 'alerts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AlertManager adminPassword={adminPassword} />
          </motion.div>
        )}

        {/* ─── HISTORY ─── */}
        {activeTab === 'history' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <HistoryTable adminPassword={adminPassword} />
          </motion.div>
        )}

        {/* ─── USERS ─── */}
        {activeTab === 'users' && (
          <motion.div
            className="glass rounded-2xl p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h3 className="font-bold text-white mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Usuarios Registrados ({users.length})
            </h3>
            {usersError && (
              <p className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {usersError}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5">
                    {['ID', 'Usuario', 'Email', 'Estado', 'Registro', 'Acciones'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <td className="px-4 py-3 text-slate-500 text-xs">#{u.id}</td>
                      <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{u.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-lg">
                          {{'tired':'😴','energized':'⚡','sick':'🤒','athletic':'🏃','important':'💼'}[u.avatar_state] ?? '🌤️'}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">{u.avatar_state}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={deletingUserId === u.id}
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingUserId === u.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
