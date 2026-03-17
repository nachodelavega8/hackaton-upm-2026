import { AnimatePresence, motion } from 'framer-motion'

const AVATARS = [
  {
    id: 'tired',
    icon: '😴',
    label: 'Tired',
    desc: 'Ultra-brief, just the essentials',
    color: 'from-slate-700 to-slate-800',
    ring: 'ring-slate-500',
    glow: 'shadow-slate-500/30',
  },
  {
    id: 'energized',
    icon: '⚡',
    label: 'Energized',
    desc: 'Full detail, activity suggestions',
    color: 'from-yellow-700 to-amber-800',
    ring: 'ring-yellow-500',
    glow: 'shadow-yellow-500/30',
  },
  {
    id: 'sick',
    icon: '🤒',
    label: 'Sick',
    desc: 'Health warnings, stay safe',
    color: 'from-emerald-800 to-teal-900',
    ring: 'ring-emerald-500',
    glow: 'shadow-emerald-500/30',
  },
  {
    id: 'athletic',
    icon: '🏃',
    label: 'Athletic',
    desc: 'UV, wind, training windows',
    color: 'from-orange-700 to-red-800',
    ring: 'ring-orange-500',
    glow: 'shadow-orange-500/30',
  },
  {
    id: 'important',
    icon: '💼',
    label: 'Important Day',
    desc: 'Outfit, commute, professional',
    color: 'from-blue-800 to-indigo-900',
    ring: 'ring-blue-500',
    glow: 'shadow-blue-500/30',
  },
]

export default function AvatarSelector({ selected, onSelect }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">How are you feeling?</h3>
      <div className="grid grid-cols-5 gap-3">
        {AVATARS.map((avatar) => {
          const isActive = selected === avatar.id
          return (
            <motion.button
              key={avatar.id}
              onClick={() => onSelect(avatar.id)}
              className={`
                relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200
                bg-gradient-to-br ${avatar.color}
                ${isActive
                  ? `ring-2 ${avatar.ring} shadow-lg ${avatar.glow}`
                  : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/20'
                }
              `}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className="text-3xl"
                animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
              >
                {avatar.icon}
              </motion.span>
              <span className="text-xs font-semibold text-white">{avatar.label}</span>

              {/* Active indicator */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>

      {/* Selected avatar description */}
      <AnimatePresence mode="wait">
        {selected && (
          <motion.p
            key={selected}
            className="text-slate-400 text-sm"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
          >
            {AVATARS.find((a) => a.id === selected)?.desc}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
