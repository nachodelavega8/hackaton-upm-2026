import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Radio, Zap } from 'lucide-react'
import { useState } from 'react'
import api from '../../services/api'

// ─── Confirmation Modal ───────────────────────────────────────────────────────
function ConfirmModal({ onConfirm, onCancel, isLoading }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isLoading ? onCancel : undefined}
      />
      <motion.div
        className="relative z-10 bg-gradient-to-br from-red-950 to-black border-2 border-red-500 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-red-900/50"
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 30 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <motion.div
          className="flex justify-center mb-5"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <div className="w-16 h-16 bg-red-600/30 border-2 border-red-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </motion.div>

        <h2 className="text-white font-black text-2xl text-center mb-2">ARE YOU SURE?</h2>
        <p className="text-red-300 text-center text-sm mb-1">
          This will trigger an <span className="font-bold text-red-200">EMERGENCY BROADCAST</span>
        </p>
        <p className="text-slate-400 text-center text-xs mb-6">
          Disaster weather data will be fetched and the AI alert will be pushed to{' '}
          <span className="text-white font-semibold">ALL connected users</span> in real time.
          This action is logged and cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600
                       text-slate-300 rounded-xl font-semibold transition-all duration-200 disabled:opacity-40"
          >
            Cancel
          </button>
          <motion.button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 bg-red-600 hover:bg-red-500 border border-red-400
                       text-white rounded-xl font-black tracking-wide transition-all duration-200
                       disabled:opacity-60 flex items-center justify-center gap-2"
            whileTap={{ scale: 0.97 }}
          >
            {isLoading ? (
              <>
                <motion.div
                  className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                />
                Sending…
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                BROADCAST NOW
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Result Modal ─────────────────────────────────────────────────────────────
function ResultModal({ result, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative z-10 bg-gradient-to-br from-slate-900 to-black border border-green-500/50 rounded-2xl p-8 max-w-lg w-full shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-500/20 border border-green-500/40 rounded-full flex items-center justify-center">
            <Radio className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-green-300 font-bold">Broadcast Sent</h3>
            <p className="text-slate-400 text-xs">
              Delivered to {result.recipients} connected user{result.recipients !== 1 ? 's' : ''}
              {' '}· ID #{result.broadcast_id}
            </p>
          </div>
        </div>
        <div className="bg-black/40 rounded-xl p-4 border border-white/5">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Broadcast message</p>
          <pre className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {result.message}
          </pre>
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600
                     text-white rounded-xl font-semibold transition-all duration-200"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── THE RED BUTTON ───────────────────────────────────────────────────────────
export default function RedButton({ adminPassword }) {
  const [phase, setPhase] = useState('idle') // idle | confirm | loading | result | error
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [clicked, setClicked] = useState(false)

  const handleButtonClick = () => {
    setClicked(true)
    setTimeout(() => setClicked(false), 400)
    setPhase('confirm')
  }

  const handleConfirm = async () => {
    setPhase('loading')
    try {
      const { data } = await api.post('/api/admin/emergency-broadcast', {
        password: adminPassword,
      })
      setResult(data)
      setPhase('result')
    } catch (err) {
      setErrorMsg(err.response?.data?.detail ?? 'Broadcast failed. Check API connection.')
      setPhase('error')
    }
  }

  const handleCancel = () => setPhase('idle')
  const handleClose = () => {
    setPhase('idle')
    setResult(null)
    setErrorMsg('')
  }

  return (
    <>
      {/* ─── THE BUTTON ─── */}
      <div className="flex flex-col items-center gap-6 py-6">
        <div className="text-center">
          <h2 className="text-white font-black text-2xl mb-1 uppercase tracking-wider">
            Emergency Broadcast
          </h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Triggers disaster weather fetch → AI alert → pushed to all connected users via WebSocket
          </p>
        </div>

        {/* Outer glow ring */}
        <div className="relative">
          <motion.div
            className="absolute inset-[-20px] rounded-full"
            animate={{
              boxShadow: [
                '0 0 20px 5px rgba(239,68,68,0.2)',
                '0 0 50px 15px rgba(239,68,68,0.5)',
                '0 0 20px 5px rgba(239,68,68,0.2)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Middle ring */}
          <motion.div
            className="absolute inset-[-10px] rounded-full border border-red-500/30"
            animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          {/* THE BUTTON */}
          <motion.button
            onClick={handleButtonClick}
            className={`
              relative w-48 h-48 rounded-full font-black text-white uppercase tracking-widest text-base
              bg-gradient-to-br from-red-500 via-red-600 to-red-800
              border-4 border-red-400/60
              flex flex-col items-center justify-center gap-2
              select-none outline-none
              transition-shadow duration-200
              animate-pulse-glow
              ${clicked ? 'animate-shake' : ''}
            `}
            style={{
              boxShadow: '0 0 30px 8px rgba(239,68,68,0.5), inset 0 -4px 8px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,255,255,0.1)',
            }}
            whileHover={{
              scale: 1.04,
              boxShadow: '0 0 60px 20px rgba(239,68,68,0.7), inset 0 -4px 8px rgba(0,0,0,0.4)',
            }}
            whileTap={{
              scale: 0.94,
              boxShadow: '0 0 15px 4px rgba(239,68,68,0.4), inset 0 4px 12px rgba(0,0,0,0.6)',
            }}
          >
            {/* Button highlight (3D effect) */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

            <AlertTriangle className="w-10 h-10 mb-1 drop-shadow-lg" />
            <span className="text-sm leading-tight text-center drop-shadow-md">EMERGENCY</span>
            <span className="text-xs opacity-80">BROADCAST</span>
          </motion.button>
        </div>

        {/* Status badge */}
        <motion.div
          className="flex items-center gap-2 px-4 py-2 bg-red-950/50 border border-red-800/50 rounded-full"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">
            System Armed
          </span>
        </motion.div>
      </div>

      {/* ─── MODALS ─── */}
      <AnimatePresence>
        {(phase === 'confirm' || phase === 'loading') && (
          <ConfirmModal
            key="confirm"
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            isLoading={phase === 'loading'}
          />
        )}
        {phase === 'result' && result && (
          <ResultModal key="result" result={result} onClose={handleClose} />
        )}
        {phase === 'error' && (
          <motion.div
            key="error"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
            <motion.div
              className="relative z-10 glass rounded-2xl p-6 max-w-sm w-full border border-red-500/40"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <p className="text-red-400 font-semibold mb-2">Broadcast Failed</p>
              <p className="text-slate-300 text-sm mb-4">{errorMsg}</p>
              <button onClick={handleClose} className="btn-ghost w-full">
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
