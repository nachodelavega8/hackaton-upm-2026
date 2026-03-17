import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useMemo, useState } from 'react'
import {
  COND_EMOJI, COND_LABEL_ES, GLOW_COLOR, HERO_GRADIENT,
  extractSuggestions, extractWeather, getCondition,
} from '../../utils/weather'

// ─── Shared markdown ──────────────────────────────────────────────────────────
const MD = {
  h2:     ({ children }) => <h2 className="text-xs font-bold text-white mt-3 mb-1">{children}</h2>,
  h3:     ({ children }) => <h3 className="text-[10px] font-semibold text-blue-300 mt-2 mb-0.5 uppercase tracking-wide">{children}</h3>,
  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
  p:      ({ children }) => <p className="text-white/70 text-xs leading-relaxed mb-1.5 last:mb-0">{children}</p>,
  ul:     ({ children }) => <ul className="list-none space-y-0.5 mb-1.5">{children}</ul>,
  li:     ({ children }) => (
    <li className="text-white/70 text-xs flex gap-1 items-start">
      <span className="text-blue-400 shrink-0 text-[10px] mt-0.5">→</span>
      <span>{children}</span>
    </li>
  ),
  hr: () => <hr className="border-white/10 my-2" />,
}


// ─── CSS keyframes injected once ─────────────────────────────────────────────
const SIM_KEYFRAMES = `
  @keyframes ws-rain  { to   { transform: translateY(110%) } }
  @keyframes ws-snow  { 0%   { opacity:0; transform:translateY(-5%) }
                        10%  { opacity:1 }
                        90%  { opacity:0.8 }
                        100% { opacity:0; transform:translateY(110%) translateX(18px) } }
  @keyframes ws-fog   { 0%,100% { opacity:.10; transform:translateX(0)   }
                        50%     { opacity:.04; transform:translateX(28px) } }
  @keyframes ws-shim  { 0%,100% { opacity:.06; transform:scaleX(1)    }
                        50%     { opacity:.13; transform:scaleX(1.015) } }
`

// ─── Simulated weather overlay ────────────────────────────────────────────────
function SimOverlay({ mode }) {
  if (mode === 'auto' || !mode) return null

  const drops = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    left:  `${(i * 4.7 + 1.3) % 100}%`,
    h:     14 + ((i * 7) % 14),
    dur:   `${0.6 + (i % 5) * 0.12}s`,
    delay: `${(i * 0.09) % 0.9}s`,
  })), [])

  const flakes = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    left:  `${(i * 5.6 + 2) % 100}%`,
    size:  3 + (i % 4),
    dur:   `${4 + (i % 5)}s`,
    delay: `${(i * 0.35) % 3}s`,
  })), [])

  return (
    <>
      <style>{SIM_KEYFRAMES}</style>

      {mode === 'rain' && drops.map((d, i) => (
        <div key={i} className="absolute top-0 rounded-full pointer-events-none"
          style={{ left: d.left, width: 1.5, height: d.h,
                   background: 'rgba(147,197,253,0.28)',
                   animation: `ws-rain ${d.dur} linear infinite`,
                   animationDelay: d.delay }} />
      ))}

      {mode === 'snow' && flakes.map((f, i) => (
        <div key={i} className="absolute top-0 rounded-full bg-white pointer-events-none"
          style={{ left: f.left, width: f.size, height: f.size, opacity: 0.7,
                   animation: `ws-snow ${f.dur} ease-in-out infinite`,
                   animationDelay: f.delay }} />
      ))}

      {mode === 'fog' && [15, 38, 60, 82].map((y, i) => (
        <div key={i} className="absolute w-full pointer-events-none"
          style={{ top: `${y}%`, height: 60,
                   background: 'linear-gradient(90deg,transparent 0%,rgba(160,170,180,.12) 40%,rgba(160,170,180,.12) 60%,transparent 100%)',
                   animation: `ws-fog ${12 + i * 4}s ease-in-out infinite`,
                   animationDelay: `${i * 2.5}s` }} />
      ))}

      {mode === 'desert' && [20, 50, 78].map((y, i) => (
        <div key={i} className="absolute w-full pointer-events-none"
          style={{ top: `${y}%`, height: 40,
                   background: 'linear-gradient(90deg,transparent 0%,rgba(251,191,36,.08) 50%,transparent 100%)',
                   animation: `ws-shim ${3 + i}s ease-in-out infinite`,
                   animationDelay: `${i * 1.2}s` }} />
      ))}
    </>
  )
}

// ─── Mode selector ────────────────────────────────────────────────────────────
const MODES = [
  { id: 'auto',   icon: '☀️', title: 'Datos reales' },
  { id: 'rain',   icon: '🌧️', title: 'Lluvia'        },
  { id: 'fog',    icon: '🌫️', title: 'Niebla'        },
  { id: 'desert', icon: '🏜️', title: 'Desierto'      },
  { id: 'snow',   icon: '❄️', title: 'Nieve'         },
]

function ModePicker({ current, onChange }) {
  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-0.5
                    bg-black/30 backdrop-blur-sm rounded-full px-1.5 py-1 border border-white/10">
      {MODES.map(({ id, icon, title }) => (
        <button
          key={id}
          title={title}
          onClick={() => onChange(id)}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-sm
                      transition-all duration-150
                      ${current === id
                        ? 'bg-white/20 ring-1 ring-white/40 scale-110'
                        : 'opacity-40 hover:opacity-70 hover:bg-white/10'
                      }`}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}

// ─── Mini calendar (today + next 3 days) ─────────────────────────────────────
const FORECAST_DAY_LABELS = ['Hoy', 'Mañana', '+2 días', '+3 días']

function MiniCalendar({ selectedOffset = 0, onSelectOffset }) {
  const days = useMemo(() => {
    return Array.from({ length: 4 }, (_, offset) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() + offset)
      return {
        offset,
        label: FORECAST_DAY_LABELS[offset],
        weekday: date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''),
        month: date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
        day: date.getDate(),
        iso: date.toISOString().slice(0, 10),
      }
    })
  }, [])

  return (
    <div className="w-full max-w-[320px] bg-white/5 backdrop-blur-sm rounded-2xl p-2.5 border border-white/10">
      <p className="text-center text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-2">
        Día de predicción
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {days.map((dayInfo) => {
          const isSelected = selectedOffset === dayInfo.offset
          return (
            <button
              key={dayInfo.iso}
              onClick={() => onSelectOffset?.(dayInfo.offset)}
              className={`rounded-xl border px-2 py-2 text-center transition-all
                ${isSelected
                  ? 'border-blue-400/80 bg-blue-500/15 text-blue-100 shadow-lg shadow-blue-900/30'
                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white/85'}
              `}
            >
              <p className="text-[9px] uppercase tracking-wider">{dayInfo.label}</p>
              <p className="text-sm font-bold mt-0.5">{dayInfo.day}</p>
              <p className="text-[9px] capitalize opacity-80">{dayInfo.weekday} · {dayInfo.month}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Data pill ────────────────────────────────────────────────────────────────
function Pill({ icon, label }) {
  if (label == null) return null
  return (
    <span className="flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-sm text-white/80">
      <span>{icon}</span>
      {label}
    </span>
  )
}

// ─── Suggestion pill ──────────────────────────────────────────────────────────
const SUG_STYLE = {
  alert: 'bg-amber-500/15 border-amber-500/30 text-amber-200',
  tip:   'bg-blue-500/15  border-blue-500/30  text-blue-200',
  gear:  'bg-green-500/15 border-green-500/30 text-green-200',
  time:  'bg-purple-500/15 border-purple-500/30 text-purple-200',
}
function SuggestionsRow({ suggestions }) {
  if (!suggestions?.length) return null
  const hasAlert = suggestions.some(s => s.type === 'alert')
  return (
    <motion.div
      className={`w-full rounded-xl px-2.5 py-2 border ${
        hasAlert ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/8 bg-white/3'
      }`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {hasAlert && (
        <motion.div className="flex items-center gap-1.5 mb-1.5"
          animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <span className="text-amber-300/60 text-[9px] font-medium uppercase tracking-wider">Avisos</span>
        </motion.div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, i) => (
          <motion.span
            key={i}
            className={`flex items-center gap-1 border rounded-full px-2.5 py-1 text-[11px] font-medium ${SUG_STYLE[s.type] ?? SUG_STYLE.tip}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
          >
            {s.icon && <span className="text-xs leading-none">{s.icon}</span>}
            {s.text}
          </motion.span>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onFetch, loading, selectedDayOffset = 0 }) {
  const targetLabel = FORECAST_DAY_LABELS[selectedDayOffset] ?? 'Hoy'
  return (
    <div className="flex flex-col items-center gap-5">
      <motion.span className="text-[70px] opacity-20 leading-none"
        animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}>
        ☁️
      </motion.span>
      <p className="text-white/25 text-sm text-center max-w-[220px]">
        Completa el test de estado y obtén tu previsión personalizada
      </p>
      <motion.button
        onClick={() => onFetch?.()}
        disabled={loading}
        className="px-7 py-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600
                   text-white font-bold text-sm shadow-xl shadow-blue-900/30
                   hover:from-blue-400 hover:to-purple-500 transition-all disabled:opacity-50"
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <motion.span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
            Analizando…
          </span>
        ) : `☁️ Obtener previsión (${targetLabel})`}
      </motion.button>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="flex flex-col items-center gap-4 w-full animate-pulse">
      <div className="w-16 h-16 rounded-full bg-white/10" />
      <div className="w-36 h-12 rounded-xl bg-white/10" />
      <div className="flex gap-2">
        <div className="w-24 h-7 rounded-full bg-white/10" />
        <div className="w-20 h-7 rounded-full bg-white/10" />
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CenterPanel({
  weatherData, loading, onRefresh,
  forecastDone, simulatedMode = 'auto', onModeChange,
  selectedDayOffset = 0, onSelectDayOffset,
}) {
  const [analysisOpen, setAnalysisOpen] = useState(false)

  // Resolve displayed weather (real API data only)
  const effectiveRaw = weatherData?.weather_data ?? {}
  const { temp, tempMin, humidity, windSpeed, uvIndex, desc } = extractWeather(effectiveRaw)

  const condition  = getCondition(desc ?? '')
  const glow       = GLOW_COLOR[condition]
  const hasData    = weatherData != null
  const hasDisplay = hasData

  const { suggestions } = hasData
    ? extractSuggestions(weatherData.llm_response ?? '')
    : { suggestions: [] }

  const updatedAt = hasData
    ? new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : null

  const selectedDayLabel = FORECAST_DAY_LABELS[selectedDayOffset] ?? 'Hoy'
  const targetDateLabel = weatherData?.target_date
    ? new Date(`${weatherData.target_date}T00:00:00`).toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : null

  const handleSelectForecastDay = (offset) => {
    if (offset === selectedDayOffset) return
    onSelectDayOffset?.(offset)
    if (weatherData && !loading) {
      setAnalysisOpen(false)
      onRefresh?.(offset)
    }
  }

  const gradient = HERO_GRADIENT[condition]

  return (
    <div className={`relative flex flex-col h-full rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-br ${gradient}`}>

      {/* Mode picker */}
      <ModePicker current={simulatedMode} onChange={onModeChange} />

      {/* Simulated visual overlay */}
      <SimOverlay mode={simulatedMode} />

      {/* Refresh icon when data is loaded */}
      {hasDisplay && (
        <motion.button
          onClick={() => onRefresh?.()}
          disabled={loading}
          className="absolute top-3 right-3 z-10 text-white/25 hover:text-white/65 transition-colors disabled:opacity-20"
          whileTap={{ scale: 0.88 }}
          animate={loading ? { rotate: 360 } : { rotate: 0 }}
          transition={loading ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : {}}
          title="Actualizar previsión"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </motion.button>
      )}

      {/* Scrollable content */}
      <div
        className="flex-1 flex flex-col px-5 gap-4 overflow-y-auto relative z-[1]"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Main weather content — centered when alone */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <AnimatePresence mode="wait">
          {loading && !hasDisplay ? (
            <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Skeleton />
            </motion.div>

          ) : !hasDisplay ? (
            <motion.div key="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <EmptyState onFetch={onRefresh} loading={loading} selectedDayOffset={selectedDayOffset} />
            </motion.div>

          ) : (
            <motion.div
              key={`data-${condition}-${simulatedMode}`}
              className="flex flex-col items-center gap-3 w-full py-3"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {/* Condition icon */}
              <motion.span className="leading-none" style={{ fontSize: 64 }}
                animate={{ scale: [1, 1.06, 1], y: [0, -3, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
                {COND_EMOJI[condition] ?? '🌤️'}
              </motion.span>

              {/* ── Mini calendar ── */}
              <MiniCalendar selectedOffset={selectedDayOffset} onSelectOffset={handleSelectForecastDay} />

              {/* Giant temperature */}
              <div className="text-center">
                <motion.p
                  key={temp}
                  className="font-black text-white leading-none"
                  style={{
                    fontSize: 'clamp(3.5rem, 9vw, 5.5rem)',
                    textShadow: `0 0 50px ${glow}, 0 0 100px ${glow}`,
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                  {temp != null ? `${Math.round(temp)}°` : '—°'}
                  <span className="text-2xl font-light text-white/35 ml-1">C</span>
                </motion.p>

                {tempMin != null && (
                  <p className="text-white/30 text-base mt-0.5">mín {Math.round(tempMin)}°C</p>
                )}

                <p className="text-white/50 text-lg mt-1.5">
                  {desc || COND_LABEL_ES[condition] || 'Sin descripción'}
                </p>
              </div>

              {/* Data pills */}
              <div className="flex flex-wrap gap-2 justify-center">
                {humidity  != null && <Pill icon="💧" label={`${Math.round(humidity)}% hum.`} />}
                {windSpeed != null && <Pill icon="💨" label={`${Math.round(windSpeed)} km/h`} />}
                {uvIndex   != null && <Pill icon="☀️" label={`UV ${uvIndex}`} />}
              </div>

              {/* Suggestions row */}
              <SuggestionsRow suggestions={suggestions} />

              {/* Timestamp */}
              {updatedAt && (
                <p className="text-white/20 text-[10px] text-center">
                  Predicción para {targetDateLabel ?? selectedDayLabel.toLowerCase()} · actualizado a las {updatedAt}
                </p>
              )}

              {/* ── Collapsible AI analysis ── */}
              {hasData && weatherData?.llm_response && (
                <div className="w-full">
                  <button
                    onClick={() => setAnalysisOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl
                               bg-white/5 border border-white/8 text-white/35 hover:text-white/55
                               text-[11px] transition-colors"
                  >
                    <span>Análisis IA</span>
                    <motion.span animate={{ rotate: analysisOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>▾</motion.span>
                  </button>
                  <AnimatePresence>
                    {analysisOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1 p-3 rounded-xl bg-white/5 border border-white/8 max-h-52 overflow-y-auto"
                          style={{ scrollbarWidth: 'none' }}>
                          <ReactMarkdown components={MD}>
                            {extractSuggestions(weatherData.llm_response).cleanText}
                          </ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
        </div>{/* end flex-1 centered */}


      </div>
    </div>
  )
}
