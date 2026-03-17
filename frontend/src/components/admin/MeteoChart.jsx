import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../../services/api'
import LoadingSpinner from '../shared/LoadingSpinner'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-slate-400 mb-2 text-xs">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value?.toFixed(1)}{p.name === 'Humidity' ? '%' : p.name === 'Wind' ? ' km/h' : '°C'}
        </p>
      ))}
    </div>
  )
}

export default function MeteoChart({ adminPassword }) {
  const [data, setData] = useState([])
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: d } = await api.get(`/api/admin/chart-data?admin_password=${adminPassword}&days=${days}`)
      setData(d)
    } catch {
      setError('Failed to load chart data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [days])

  return (
    <motion.div
      className="glass rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-white">Meteorological Trends</h3>
        <div className="flex gap-2">
          {[3, 7, 14].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                days === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner text="Loading chart data…" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm text-center py-8">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">
          No data available for the selected period
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
            />
            <Line
              type="monotone"
              dataKey="temperature"
              name="Temperature"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="humidity"
              name="Humidity"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="wind_speed"
              name="Wind"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}
