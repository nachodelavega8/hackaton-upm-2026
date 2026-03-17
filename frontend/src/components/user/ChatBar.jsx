import { AnimatePresence, motion } from 'framer-motion'
import { Send, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import api from '../../services/api'

const AVATAR_META = {
  tired:     { icon: '😴', color: 'text-slate-400' },
  energized: { icon: '⚡', color: 'text-yellow-400' },
  sick:      { icon: '🤒', color: 'text-green-400' },
  athletic:  { icon: '🏃', color: 'text-orange-400' },
  important: { icon: '💼', color: 'text-blue-400' },
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 bg-blue-400 rounded-full"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

export default function ChatBar({ avatarState = 'energized' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)
  const historyRef = useRef(null)

  const meta = AVATAR_META[avatarState] ?? AVATAR_META.energized

  // Scroll history to bottom on new messages
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setExpanded(true)
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      const { data } = await api.post('/api/chat/', {
        user_prompt: text,
        avatar_state: avatarState,
      })
      setMessages((prev) => [...prev, { role: 'ai', text: data.response }])
    } catch (err) {
      const detail = err.response?.data?.detail ?? 'Error al contactar la IA. Intenta de nuevo.'
      setMessages((prev) => [...prev, { role: 'ai', text: `⚠️ ${detail}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      {/* Chat history panel — slides up when there are messages */}
      <AnimatePresence>
        {expanded && messages.length > 0 && (
          <motion.div
            className="max-w-4xl mx-auto px-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div
              ref={historyRef}
              className="bg-slate-900/95 backdrop-blur border border-white/10 border-b-0
                         rounded-t-2xl px-4 py-3 space-y-3 overflow-y-auto"
              style={{ maxHeight: '40vh' }}
            >
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {msg.role === 'ai' && (
                    <span className="text-lg shrink-0 mt-0.5">{meta.icon}</span>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-lg">{meta.icon}</span>
                  <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-3 py-2">
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom input bar */}
      <div className="bg-slate-900/95 backdrop-blur border-t border-white/10 shadow-2xl">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Avatar indicator */}
            <div className="shrink-0 flex items-center gap-1.5">
              <span className="text-xl">{meta.icon}</span>
              <Sparkles className={`w-3.5 h-3.5 ${meta.color}`} />
            </div>

            {/* Input */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Pregúntame sobre el tiempo, qué llevar puesto, si salir hoy…"
                disabled={loading}
                className="w-full bg-slate-800 border border-slate-700 hover:border-slate-600
                           focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30
                           text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm
                           outline-none transition-all duration-200 pr-10"
              />
            </div>

            {/* Send button */}
            <motion.button
              onClick={send}
              disabled={!input.trim() || loading}
              className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700
                         disabled:text-slate-500 text-white p-2.5 rounded-xl transition-colors"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>

          <p className="text-slate-600 text-xs mt-1.5 text-center">
            IA meteorológica · modo <span className={`font-medium ${meta.color}`}>{avatarState}</span> · Enter para enviar
          </p>
        </div>
      </div>
    </div>
  )
}
