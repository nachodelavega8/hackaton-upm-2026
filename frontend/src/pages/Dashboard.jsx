import { AnimatePresence, motion } from 'framer-motion'
import { CloudSun, MessageCircle, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import CenterPanel from '../components/dashboard/CenterPanel'
import LeftPanel from '../components/dashboard/LeftPanel'
import RightPanel from '../components/dashboard/RightPanel'
import EmergencyBanner from '../components/shared/EmergencyBanner'
import WeatherBackground from '../components/shared/WeatherBackground'
import Navbar from '../components/shared/Navbar'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../context/WebSocketContext'
import api from '../services/api'
import { extractWeather } from '../utils/weather'

const TABS = [
  { id: 'estado',    label: 'Estado',   icon: User },
  { id: 'prevision', label: 'Prevision', icon: CloudSun },
  { id: 'chat',      label: 'Chat',      icon: MessageCircle },
]
const TAB_ORDER = ['estado', 'prevision', 'chat']
const slideVariants = {
  enter:  (d) => ({ x: d > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d) => ({ x: d > 0 ? '-40%' : '40%', opacity: 0 }),
}

const ALERT_LEVEL_WEIGHT = { amarillo: 1, naranja: 2, rojo: 3 }

function toPulseLevel(severity) {
  const s = String(severity ?? '').toLowerCase().trim()
  if (s === 'rojo' || s === 'critical' || s === 'emergencia') return 'rojo'
  if (s === 'naranja' || s === 'warning' || s === 'importante') return 'naranja'
  if (s === 'amarillo' || s === 'info' || s === 'precaucion' || s === 'precaución') return 'amarillo'
  return null
}

function getHighestAlertLevel(alerts) {
  let highest = null
  for (const alert of alerts ?? []) {
    const level = toPulseLevel(alert?.severity)
    if (!level) continue
    if (!highest || ALERT_LEVEL_WEIGHT[level] > ALERT_LEVEL_WEIGHT[highest]) highest = level
  }
  return highest
}

function ResizeHandle({ onDelta }) {
  const dragging = useRef(false)
  const lastX    = useRef(0)
  const onMouseDown = (e) => {
    dragging.current = true
    lastX.current = e.clientX
    e.preventDefault()
    const onMove = (ev) => {
      if (!dragging.current) return
      onDelta(ev.clientX - lastX.current)
      lastX.current = ev.clientX
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  return (
    <div
      className="shrink-0 w-3 h-full flex items-center justify-center cursor-col-resize group select-none"
      onMouseDown={onMouseDown}
    >
      <div className="w-px h-12 rounded-full bg-white/10 group-hover:bg-white/35 group-active:bg-blue-400/60 transition-colors duration-150" />
    </div>
  )
}

const MODE_BG_DESC = {
  rain: 'Lluvia fuerte', fog: 'Niebla densa', desert: 'Despejado extremo', snow: 'Nevada',
}

export default function Dashboard() {
  const { user, updateAvatar, deleteAccount, loading: authLoading } = useAuth()
  const { emergency, dismissEmergency, notifications, emergencyClearedAt } = useWebSocket()

  const [avatarState,     setAvatarState]     = useState(user?.avatar_state ?? 'energized')
  const [profile,         setProfile]         = useState(null)
  const [weatherData,     setWeatherData]     = useState(null)
  const [loading,         setLoading]         = useState(false)
  const [autoSend,        setAutoSend]        = useState(null)
  const [forecastDone,    setForecastDone]    = useState(false)
  const [simulatedMode,   setSimulatedMode]   = useState('auto')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteError,     setDeleteError]     = useState('')
  const [activeTab,       setActiveTab]       = useState('prevision')
  const [tabDir,          setTabDir]          = useState(1)
  const [leftW,           setLeftW]           = useState(280)
  const [rightW,          setRightW]          = useState(310)
  const [activeAlertLevel, setActiveAlertLevel] = useState(null)
  const [selectedDayOffset, setSelectedDayOffset] = useState(0)

  useEffect(() => { setForecastDone(false) }, [simulatedMode])

  const handleAvatarSelect = async (profileObj) => {
    const isProfile = typeof profileObj !== 'string'
    const state     = isProfile ? profileObj.prompt_key : profileObj
    //Formulario para determinar el estado del usuario
    setAvatarState(state)
    if (isProfile) {
      setProfile(profileObj)
      setWeatherData(null)
      setForecastDone(false)
      const physLabel = {
        energized: 'lleno de energia', normal: 'bien', tired: 'cansado', sick: 'enfermo',
      }[profileObj.physical] ?? profileObj.physical
      const mentalLabel = {
        focused: 'enfocado', scattered: 'disperso', blocked: 'bloqueado', anxious: 'ansioso',
      }[profileObj.mental] ?? profileObj.mental
      const expLabel = {
        outdoors: 'todo el dia fuera', some: 'fuera algunos ratos',
        commute: 'solo en desplazamientos', indoors: 'en casa',
      }[profileObj.exposure] ?? profileObj.exposure
      setAutoSend({
        text: `Soy ${user?.username ?? 'usuario'}, hoy estoy ${physLabel}, mentalmente ${mentalLabel} y voy a estar ${expLabel}. Dame mi previsión meteorológica personalizada para hoy.`,
        id: Date.now(),
      })
    }
    const backendKey = isProfile
      ? ({ sick: 'sick', tired: 'tired', energized: 'energized' }[profileObj.physical] ?? 'energized')
      : profileObj
    try { await updateAvatar(backendKey) } catch { /* non-critical */ }
  }

  const handleReset = () => {
    setProfile(null)
    setAvatarState(user?.avatar_state ?? 'energized')
    setWeatherData(null)
    setForecastDone(false)
    setSelectedDayOffset(0)
  }

  const fetchWeather = useCallback(async (targetOffset = selectedDayOffset) => {
    if (loading) return
    setLoading(true)
    try {
      const parsedTargetOffset = typeof targetOffset === 'number'
        ? targetOffset
        : Number.parseInt(targetOffset, 10)
      const resolvedTargetOffset = Number.isInteger(parsedTargetOffset)
        ? Math.max(0, Math.min(3, parsedTargetOffset))
        : selectedDayOffset
      const modeParam = simulatedMode !== 'auto' ? `&mode=${simulatedMode}` : ''
      const dayParam = `&target_day_offset=${resolvedTargetOffset}`
      const { data } = await api.get(`/api/weather/current?avatar_state=${avatarState}${modeParam}${dayParam}`)
      setWeatherData(data)
      setForecastDone(true)
    } catch (err) {
      console.error('Weather fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [avatarState, simulatedMode, selectedDayOffset, loading])

  const refreshActiveAlerts = useCallback(async () => {
    try {
      const { data } = await api.get('/api/alerts/')
      setActiveAlertLevel(getHighestAlertLevel(data))
    } catch {
      // Keep current visual state if alerts endpoint temporarily fails.
    }
  }, [])

  useEffect(() => {
    refreshActiveAlerts()
    const timer = setInterval(refreshActiveAlerts, 20_000)
    return () => clearInterval(timer)
  }, [refreshActiveAlerts])

  useEffect(() => {
    if (!emergencyClearedAt) return
    setActiveAlertLevel(null)
    refreshActiveAlerts()
  }, [emergencyClearedAt, refreshActiveAlerts])

  useEffect(() => {
    const latest = notifications?.[0]
    if (!latest || latest.type !== 'ALERT_NOTIFICATION') return
    const incomingLevel = toPulseLevel(latest.severity)
    if (!incomingLevel) return

    setActiveAlertLevel((prev) => {
      if (!prev) return incomingLevel
      return ALERT_LEVEL_WEIGHT[incomingLevel] > ALERT_LEVEL_WEIGHT[prev] ? incomingLevel : prev
    })
  }, [notifications])

  const openDeleteModal  = () => { setDeleteError(''); setShowDeleteModal(true) }
  const closeDeleteModal = () => { if (!authLoading) setShowDeleteModal(false) }
  const confirmDelete    = async () => {
    setDeleteError('')
    try { await deleteAccount() } catch (err) {
      const d = err.response?.data?.detail
      setDeleteError(typeof d === 'string' ? d : 'No se pudo eliminar la cuenta.')
    }
  }

  const switchTab = (id) => {
    const from = TAB_ORDER.indexOf(activeTab)
    const to   = TAB_ORDER.indexOf(id)
    setTabDir(to > from ? 1 : -1)
    setActiveTab(id)
  }

  const bgWeather   = simulatedMode !== 'auto' ? { description: MODE_BG_DESC[simulatedMode] } : (weatherData?.weather_data ?? null)
  const { temp }    = extractWeather(weatherData?.weather_data ?? {})
  const leftProps   = { user, profile, onSelect: handleAvatarSelect, onReset: handleReset }
  const centerProps = {
    weatherData,
    loading,
    onRefresh: fetchWeather,
    forecastDone,
    simulatedMode,
    onModeChange: setSimulatedMode,
    selectedDayOffset,
    onSelectDayOffset: setSelectedDayOffset,
  }
  const rightProps  = { weatherData, avatarState, autoSend, simulatedMode, emergency, onDismissEmergency: dismissEmergency }
  const pulseLevel = toPulseLevel(emergency?.severity) ?? activeAlertLevel
  const pulseBorderClass = pulseLevel === 'rojo' ? 'border-red-500' : pulseLevel === 'naranja' ? 'border-orange-400' : 'border-yellow-400'

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Borde de alerta por severidad */}
      {pulseLevel && (
        <div className={`
          fixed inset-0 pointer-events-none z-50
          border-4
          ${pulseBorderClass}
          animate-emergency-pulse
        `} />
      )}
      <EmergencyBanner />
      <WeatherBackground weatherData={bgWeather} />
      <Navbar simulatedMode={simulatedMode} onResetMode={() => setSimulatedMode('auto')} onDeleteAccount={openDeleteModal} />

      {/*DESKTOP*/}
      <div className="hidden lg:flex flex-1 min-h-0 p-2 overflow-hidden relative z-10">
        <div className="shrink-0 min-h-0" style={{ width: leftW }}>
          <LeftPanel {...leftProps} />
        </div>
        <ResizeHandle onDelta={(d) => setLeftW((w) => Math.max(200, Math.min(420, w + d)))} />
        <div className="flex-1 min-w-0 min-h-0">
          <CenterPanel {...centerProps} />
        </div>
        <ResizeHandle onDelta={(d) => setRightW((w) => Math.max(240, Math.min(500, w - d)))} />
        <div className="shrink-0 min-h-0" style={{ width: rightW }}>
          <RightPanel {...rightProps} />
        </div>
      </div>

      {/*MOBILE*/}
      <div className="lg:hidden flex-1 min-h-0 flex flex-col overflow-hidden relative z-10">
        <div className="flex-1 overflow-hidden relative p-3">
          <AnimatePresence mode="wait" custom={tabDir}>
            <motion.div
              key={activeTab}
              custom={tabDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-3"
            >
              {activeTab === 'estado'    && <LeftPanel   {...leftProps} />}
              {activeTab === 'prevision' && <CenterPanel {...centerProps} />}
              {activeTab === 'chat'      && <RightPanel  {...rightProps} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="shrink-0 border-t border-white/10 bg-slate-950/80 backdrop-blur-md">
          <div className="flex">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => switchTab(id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors
                    ${isActive ? 'text-blue-400' : 'text-white/40 hover:text-white/60'}`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                  {isActive && (
                    <motion.div
                      className="w-1 h-1 rounded-full bg-blue-400"
                      layoutId="tab-dot"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Temperature badge mobile */}
      {temp != null && (
        <motion.div
          className="lg:hidden fixed top-14 right-4 z-20 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white text-sm font-bold"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {Math.round(temp)}C
        </motion.div>
      )}

      {/*Delete account modal*/}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeDeleteModal} />
            <motion.div
              className="relative z-10 glass rounded-2xl p-6 w-full max-w-md border border-red-500/40"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            >
              <h3 className="text-white text-lg font-bold text-center mb-1">Eliminar tu cuenta?</h3>
              <p className="text-white/40 text-sm text-center">Esta accion no se puede deshacer.</p>
              {deleteError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-3">
                  {deleteError}
                </p>
              )}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={confirmDelete}
                  disabled={authLoading}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 border border-red-400 text-white font-semibold disabled:opacity-60"
                >
                  {authLoading ? 'Eliminando...' : 'Si, eliminar'}
                </button>
                <button
                  onClick={closeDeleteModal}
                  disabled={authLoading}
                  className="flex-1 py-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600 text-slate-200 font-semibold disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
