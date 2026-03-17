import { motion } from 'framer-motion'
import { Download, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '../../services/api'
import LoadingSpinner from '../shared/LoadingSpinner'

const AVATAR_ICONS = {
  tired: '😴', energized: '⚡', sick: '🤒', athletic: '🏃', important: '💼',
}

export default function HistoryTable({ adminPassword }) {
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', userId: '' })
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        admin_password: adminPassword,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      if (filters.dateFrom) params.set('date_from', filters.dateFrom)
      if (filters.dateTo) params.set('date_to', filters.dateTo)
      if (filters.userId) params.set('user_id', filters.userId)

      const { data } = await api.get(`/api/admin/weather-history?${params}`)
      setRecords(data.records)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [page, filters])

  const handleExportCSV = () => {
    const url = `/api/admin/export-csv?admin_password=${adminPassword}`
    const a = document.createElement('a')
    a.href = url
    a.download = 'weatherself_history.csv'
    a.click()
  }

  return (
    <motion.div
      className="glass rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-white">Historical Weather Data</h3>
        <button
          onClick={handleExportCSV}
          className="btn-ghost flex items-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">From date</label>
          <input
            type="date"
            className="input-field text-sm"
            value={filters.dateFrom}
            onChange={(e) => { setFilters((p) => ({ ...p, dateFrom: e.target.value })); setPage(0) }}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">To date</label>
          <input
            type="date"
            className="input-field text-sm"
            value={filters.dateTo}
            onChange={(e) => { setFilters((p) => ({ ...p, dateTo: e.target.value })); setPage(0) }}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">User ID</label>
          <input
            type="number"
            className="input-field text-sm"
            placeholder="All users"
            value={filters.userId}
            onChange={(e) => { setFilters((p) => ({ ...p, userId: e.target.value })); setPage(0) }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner text="Loading records…" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  {['ID', 'User', 'Date', 'Avatar', 'Temp', 'Humidity', 'Wind', 'Description', 'Type'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-500 text-xs">#{r.id}</td>
                    <td className="px-4 py-3 text-slate-300">{r.user_id ?? 'anon'}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg">{AVATAR_ICONS[r.avatar_state] ?? '🌤️'}</span>
                    </td>
                    <td className="px-4 py-3 text-amber-300 font-mono">
                      {r.temperature != null ? `${r.temperature.toFixed(1)}°C` : '—'}
                    </td>
                    <td className="px-4 py-3 text-cyan-300 font-mono">
                      {r.humidity != null ? `${r.humidity.toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-purple-300 font-mono">
                      {r.wind_speed != null ? `${r.wind_speed.toFixed(1)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">
                      {r.description ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.is_disaster ? (
                        <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                          EMERGENCY
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-slate-500 text-xs">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= total}
                className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}
