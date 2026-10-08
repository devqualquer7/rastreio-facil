'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/ec-utils'

type Color = 'success' | 'danger' | 'warning' | 'primary'

const colorMap: Record<Color, { glowRGBA: string; border: string; text: string; icon: string; line: string }> = {
  success: {
    glowRGBA: 'rgba(16,185,129,0.16)',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    icon: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    line: 'via-emerald-500/50',
  },
  danger: {
    glowRGBA: 'rgba(239,68,68,0.16)',
    border: 'border-red-500/20',
    text: 'text-red-400',
    icon: 'bg-red-500/15 border-red-500/30 text-red-400',
    line: 'via-red-500/50',
  },
  warning: {
    glowRGBA: 'rgba(245,158,11,0.16)',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    icon: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    line: 'via-amber-500/50',
  },
  primary: {
    glowRGBA: 'rgba(244,63,94,0.16)',
    border: 'border-rose-500/25',
    text: 'text-rose-300',
    icon: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
    line: 'via-rose-500/50',
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
      whileHover={onClick ? { y: -4 } : undefined}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl p-5 border transition-shadow duration-300',
        c.border,
        onClick && 'cursor-pointer'
      )}
      style={{
        background: 'linear-gradient(158deg, rgba(22,4,14,0.9) 0%, rgba(10,2,8,0.96) 100%)',
        boxShadow: `0 0 0 1px rgba(255,255,255,0.02) inset, 0 18px 40px rgba(0,0,0,0.4), 0 0 30px ${c.glowRGBA}`,
      }}
    >
      {/* top hairline */}
      <div className={cn('absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent to-transparent', c.line)} />
      {/* radial corner glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle, ${c.glowRGBA}, transparent 68%)` }} />

      <div className="relative flex items-start justify-between mb-3.5">
        <div className={cn('w-11 h-11 rounded-xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-105', c.icon)}>
          {icon}
        </div>
      </div>
      <div className={cn('relative text-3xl font-black tabular-nums leading-none mb-1.5', c.text)}
        style={{ textShadow: `0 0 24px ${c.glowRGBA}` }}>
        {value}
      </div>
      <div className="relative text-xs font-mono text-zinc-400 uppercase tracking-[0.22em]">{label}</div>
      {sub && <div className="relative text-xs font-mono text-zinc-500 mt-1 tabular-nums">{sub}</div>}
    </motion.div>
  )
}
