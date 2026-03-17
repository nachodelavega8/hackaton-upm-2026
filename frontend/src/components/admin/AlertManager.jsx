import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '../../services/api'
import LoadingSpinner from '../shared/LoadingSpinner'

const SEVERITY_STYLES = {
  info:     'severity-info',
  warning:  'severity-warning',
  critical: 'severity-critical',
}

function AlertForm({ onSubmit, onCancel, adminPassword }) {
  const [form, setForm] = useState({ title: '', message: '', severity: 'info' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to create alert')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="glass rounded-xl p-5 border border-blue-500/20"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Bell className="w-4 h-4 text-blue-400" /> New Alert
      </h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          className="input-field"
          placeholder="Alert title"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          required
        />
        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Alert message…"
          value={form.message}
          onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          required
        />
        <select
          className="input-field"
          value={form.severity}
          onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}
        >
          <option value="info">ℹ️  Info</option>
          <option value="warning">⚠️  Warning</option>
          <option value="critical">🔴 Critical</option>
        </select>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <motion.div
                className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              'Create Alert'
            )}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost px-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export default function AlertManager({ adminPassword }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/api/alerts/all?admin_password=${adminPassword}`)
      setAlerts(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const handleCreate = async (form) => {
    await api.post(`/api/alerts/?admin_password=${adminPassword}`, form)
    setShowForm(false)
    fetchAlerts()
  }

  const handleToggle = async (alert) => {
    await api.put(`/api/alerts/${alert.id}?admin_password=${adminPassword}`, {
      is_active: !alert.is_active,
    })
    fetchAlerts()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this alert?')) return
    await api.delete(`/api/alerts/${id}?admin_password=${adminPassword}`)
    fetchAlerts()
  }

  return (
    <motion.div
      className="glass rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" />
          Alert Management
        </h3>
        <button
          onClick={() => setShowForm((p) => !p)}
          className="btn-primary flex items-center gap-2 text-sm py-2"
        >
          <Plus className="w-4 h-4" />
          New Alert
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="mb-4">
            <AlertForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              adminPassword={adminPassword}
            />
          </div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner text="Loading alerts…" />
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">No alerts yet</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              className={`rounded-xl p-4 border flex items-start gap-3 ${
                alert.is_active ? SEVERITY_STYLES[alert.severity] : 'bg-slate-800/40 border-slate-700/50 opacity-50'
              }`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: alert.is_active ? 1 : 0.5, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {alert.severity}
                  </span>
                  {!alert.is_active && (
                    <span className="text-xs text-slate-500">(inactive)</span>
                  )}
                </div>
                <p className="font-semibold text-sm">{alert.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{alert.message}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggle(alert)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-xs"
                  title={alert.is_active ? 'Deactivate' : 'Activate'}
                >
                  {alert.is_active ? '⏸️' : '▶️'}
                </button>
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
