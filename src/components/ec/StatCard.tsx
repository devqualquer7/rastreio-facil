'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/ec-utils'

type Color = 'success' | 'danger' | 'warning' | 'primary'

const colorMap: Record<Color, { bg: string; border: string; text: string; glow: string; icon: string }> = {
  success: {
    bg: 'from-emerald-500/10 to-transparent',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_30px_rgba(34,197,94,.15)]',
    icon: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  },
  danger: {
    bg: 'from-red-500/10 to-transparent',
    border: 'border-red-500/20',
    text: 'text-red-400',
    glow: 'shadow-[0_0_30px_rgba(239,68,68,.15)]',
    icon: 'bg-red-500/15 border-red-500/30 text-red-400',
  },
  warning: {
    bg: 'from-amber-500/10 to-transparent',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,.15)]',
    icon: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  },
  primary: {
    bg: 'from-purple-500/10 to-transparent',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,.15)]',
    icon: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
  },
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color: Color
  delay?: number
  onClick?: () => void
}

export function StatCard({ icon, label, value, sub, color, delay = 0, onClick }: StatCardProps) {
  const c = colorMap[color]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 22 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f]',
        'border rounded-2xl p-5 transition-all',
        c.border, c.glow,
        onClick && 'cursor-pointer hover:scale-[1.02]'
      )}>
      {/* Radial glow */}
      <div className={cn('absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-50', `bg-gradient-radial`, c.bg.split(' ')[0])} />

      <div className="relative flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center', c.icon)}>
          {icon}
        </div>
      </div>
      <div className={cn('text-2xl font-black tabular-nums mb-1', c.text)}>{value}</div>
      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">{label}</div>
      {sub && <div className="text-[10px] font-mono text-zinc-600 mt-0.5 tabular-nums">{sub}</div>}
    </motion.div>
  )
}
