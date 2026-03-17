import { motion } from 'framer-motion'

export default function LoadingSpinner({ size = 'md', text = null }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className={`${sizes[size]} border-2 border-blue-500/30 border-t-blue-500 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      {text && <p className="text-slate-400 text-sm">{text}</p>}
    </div>
  )
}
