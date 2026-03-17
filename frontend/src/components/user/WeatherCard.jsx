import { motion } from 'framer-motion'
import { Droplets, Eye, RefreshCw, Thermometer, Wind } from 'lucide-react'
import LoadingSpinner from '../shared/LoadingSpinner'

const AVATAR_META = {
  tired:     { icon: '😴', label: 'Tired',        bg: 'from-slate-800 to-slate-900',   accent: 'text-slate-300' },
  energized: { icon: '⚡', label: 'Energized',    bg: 'from-yellow-900 to-amber-950', accent: 'text-yellow-300' },
  sick:      { icon: '🤒', label: 'Sick',          bg: 'from-emerald-900 to-teal-950', accent: 'text-emerald-300' },
  athletic:  { icon: '🏃', label: 'Athletic',      bg: 'from-orange-900 to-red-950',   accent: 'text-orange-300' },
  important: { icon: '💼', label: 'Important Day', bg: 'from-blue-900 to-indigo-950',  accent: 'text-blue-300' },
}

function MetricPill({ icon, label, value, unit }) {
  if (value == null) return null
  return (
    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
      <span className="text-slate-400">{icon}</span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-white">
          {typeof value === 'number' ? value.toFixed(1) : value}{unit}
        </p>
      </div>
    </div>
  )
}

export default function WeatherCard({ data, loading, onRefresh }) {
  if (loading) {
    return (
      <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[200px] justify-center">
        <LoadingSpinner size="lg" />
        <p className="text-slate-400 text-sm">Fetching your personalized forecast…</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4 text-slate-400">
        <span className="text-5xl">🌤️</span>
        <p className="text-sm">Select your avatar state and get your forecast</p>
      </div>
    )
  }

  const meta = AVATAR_META[data.avatar_state] ?? AVATAR_META.energized
  const w = data.weather_data ?? {}

  const temp = w.temperature ?? w.temp ?? w.main?.temp
  const humidity = w.humidity ?? w.main?.humidity
  const windSpeed = w.wind_speed ?? w.wind?.speed
  const feelsLike = w.feels_like ?? w.main?.feels_like
  const uvIndex = w.uv_index ?? w.uvi
  const desc = w.description ?? w.weather?.[0]?.description

  return (
    <motion.div
      className={`bg-gradient-to-br ${meta.bg} rounded-2xl border border-white/10 overflow-hidden`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <motion.span
            className="text-4xl"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            {meta.icon}
          </motion.span>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${meta.accent}`}>
              {meta.label} Mode
            </p>
            {desc && <p className="text-slate-300 text-sm capitalize">{desc}</p>}
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics row */}
      <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricPill icon={<Thermometer className="w-4 h-4" />} label="Temperature" value={temp} unit="°C" />
        <MetricPill icon={<Droplets className="w-4 h-4" />} label="Humidity" value={humidity} unit="%" />
        <MetricPill icon={<Wind className="w-4 h-4" />} label="Wind" value={windSpeed} unit=" km/h" />
        {feelsLike != null && (
          <MetricPill icon={<Eye className="w-4 h-4" />} label="Feels like" value={feelsLike} unit="°C" />
        )}
        {uvIndex != null && (
          <MetricPill icon="☀️" label="UV Index" value={uvIndex} unit="" />
        )}
      </div>

      {/* LLM Response */}
      <div className="px-6 pb-6">
        <div className="bg-black/30 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">AI Analysis</span>
          </div>
          <pre className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {data.llm_response}
          </pre>
        </div>
      </div>
    </motion.div>
  )
}
