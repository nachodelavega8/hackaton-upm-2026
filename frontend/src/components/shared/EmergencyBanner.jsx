import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useWebSocket } from '../../context/WebSocketContext'

export default function EmergencyBanner() {
  const { emergency, dismissEmergency } = useWebSocket()
  const audioRef = useRef(null)

  // Play alert sound when emergency arrives
  useEffect(() => {
    if (emergency) {
      // Create oscillator-based beep (no external audio file needed)
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.frequency.value = 880
        oscillator.type = 'square'
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 1)
      } catch {
        // Audio API unavailable in some environments — silent fail
      }
    }
  }, [emergency])

  return (
    <AnimatePresence>
      {emergency && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Dark overlay */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          {/* Emergency card */}
          <motion.div
            className="relative z-10 max-w-2xl w-full bg-gradient-to-br from-red-950 via-red-900 to-black border-2 border-red-500 rounded-2xl shadow-2xl shadow-red-500/30 overflow-hidden"
            initial={{ scale: 0.8, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Pulsing border */}
            <motion.div
              className="absolute inset-0 border-2 border-red-400 rounded-2xl pointer-events-none"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />

            {/* Header */}
            <div className="bg-red-600/30 px-6 py-4 flex items-center justify-between border-b border-red-500/40">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  <AlertTriangle className="text-red-400 w-7 h-7" />
                </motion.div>
                <div>
                  <h2 className="text-red-200 font-black text-xl tracking-wide uppercase">
                    Emergency Broadcast
                  </h2>
                  <p className="text-red-400 text-xs">
                    {emergency.timestamp
                      ? new Date(emergency.timestamp).toLocaleTimeString()
                      : 'Just now'}
                  </p>
                </div>
              </div>
              <motion.span
                className="px-3 py-1 bg-red-500/30 border border-red-500/50 text-red-300 rounded-full text-xs font-bold uppercase tracking-wider"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                CRITICAL
              </motion.span>
            </div>

            {/* Message */}
            <div className="px-6 py-5">
              <pre className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {emergency.message}
              </pre>
            </div>

            {/* Dismiss */}
            <div className="px-6 pb-5 flex justify-end">
              <button
                onClick={dismissEmergency}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-700/50 hover:bg-red-600/60
                           border border-red-500/50 text-red-200 rounded-xl font-semibold
                           transition-all duration-200 text-sm"
              >
                <X className="w-4 h-4" />
                Acknowledge &amp; Dismiss
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
