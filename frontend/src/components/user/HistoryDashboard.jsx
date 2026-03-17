import { motion } from 'framer-motion'
import { Calendar, Droplets, Thermometer, Wind } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '../../services/api'
import LoadingSpinner from '../shared/LoadingSpinner'

const AVATAR_ICONS = {
  tired: '😴', energized: '⚡', sick: '🤒', athletic: '🏃', important: '💼',
}

function HistoryItem({ record, index }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(record.created_at)

  return (
    <motion.div
      className="glass rounded-xl overflow-hidden cursor-pointer hover:border-white/20 transition-colors"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      onClick={() => setExpanded((p) => !p)}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">{AVATAR_ICONS[record.avatar_state] ?? '🌤️'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {record.is_disaster && (
              <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-semibold">
                EMERGENCY
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300 truncate mt-0.5">
            {record.description ?? 'Weather record'}
          </p>
        </div>

        {/* Metrics */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          {record.temperature != null && (
            <span className="flex items-center gap-1">
              <Thermometer className="w-3 h-3" />
              {record.temperature.toFixed(1)}°C
            </span>
          )}
          {record.humidity != null && (
            <span className="flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              {record.humidity.toFixed(0)}%
            </span>
          )}
          {record.wind_speed != null && (
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3" />
              {record.wind_speed.toFixed(1)} km/h
            </span>
          )}
        </div>

        <motion.span
          className="text-slate-500 text-xs ml-2"
          animate={{ rotate: expanded ? 180 : 0 }}
        >
          ▾
        </motion.span>
      </div>

      {/* Expanded LLM response */}
      {expanded && record.llm_response && (
        <motion.div
          className="px-4 pb-4 border-t border-white/5"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
        >
          <div className="mt-3 bg-black/20 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">AI response</p>
            <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {record.llm_response}
            </pre>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default function HistoryDashboard() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchHistory = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/api/weather/history?limit=7')
      setRecords(data)
    } catch {
      setError('Could not load weather history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          7-Day History
        </h3>
        <button onClick={fetchHistory} className="text-xs text-blue-400 hover:text-blue-300">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner text="Loading history…" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm text-center py-4">{error}</p>
      ) : records.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">
          No history yet — fetch your first weather briefing above!
        </p>
      ) : (
        <div className="space-y-2">
          {records.map((r, i) => (
            <HistoryItem key={r.id} record={r} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
