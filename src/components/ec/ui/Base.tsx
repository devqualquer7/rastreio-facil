'use client'
import { cn, statusLabel, statusColor } from '@/lib/ec-utils'

// ─── SectionTitle ─────────────────────────────────────────────────────────────
export function SectionTitle({
  icon, title, subtitle, action
}: { icon?: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <div className="font-bold text-zinc-100 tracking-tight text-lg">{title}</div>
          {subtitle && <div className="text-xs font-mono text-zinc-400 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {action && (
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:justify-end">
          {action}
        </div>
      )}
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps {
  children: React.ReactNode
  variant?: 'accent' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
  icon?: React.ReactNode
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit'
}

export function Button({
  children, variant = 'outline', size = 'md', glow, icon, loading, disabled, onClick, className, type = 'button'
}: ButtonProps) {
  const base = 'relative inline-flex items-center justify-center gap-1.5 font-bold tracking-widest uppercase transition-all disabled:opacity-50 active:scale-95'

  const sizes = {
    sm:  'px-3.5 py-2 rounded-lg text-xs',
    md:  'px-4 py-2.5 rounded-xl text-[13px]',
    lg:  'px-6 py-3 rounded-xl text-xs',
  }

  const variants = {
    accent:  'bg-gradient-to-br from-[#6b0011] via-[#a8001a] to-[#c50020] text-white shadow-[0_0_20px_rgba(180,0,30,.4)] hover:shadow-[0_0_30px_rgba(180,0,30,.6)]',
    outline: 'bg-white/[0.04] border border-white/[0.1] text-zinc-300 hover:bg-white/[0.08] hover:border-white/[0.2] hover:text-zinc-100',
    ghost:   'text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.04]',
    danger:  'bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20',
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      className={cn(base, sizes[size], variants[variant], className)}>
      {loading ? (
        <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  )
}

// ─── StatusPill ───────────────────────────────────────────────────────────────
export function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn('text-[11px] font-bold tracking-[0.2em] px-2 py-0.5 rounded-full border', statusColor(status))}>
      {statusLabel(status)}
    </span>
  )
}

// ─── Modal Backdrop ───────────────────────────────────────────────────────────
export function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg">
        {children}
      </div>
    </div>
  )
}
