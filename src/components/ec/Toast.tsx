'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, Info, X, DollarSign, Zap, CreditCard } from 'lucide-react'
import { useApp } from '@/lib/ec-store'
import { fmtBRL } from '@/lib/ec-utils'
import { cn } from '@/lib/ec-utils'

// ─── Toast Stack ──────────────────────────────────────────────────────────────
export function ToastStack() {
  const { toasts, dismissToast } = useApp()

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl border shadow-lg text-sm font-mono min-w-[240px] max-w-xs',
              t.type === 'success' && 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
              t.type === 'error'   && 'bg-red-500/15 border-red-500/30 text-red-300',
              t.type === 'info'    && 'bg-red-500/15 border-red-500/25 text-red-300',
            )}>
            {t.type === 'success' && <CheckCircle2 size={15} className="flex-shrink-0" />}
            {t.type === 'error'   && <XCircle size={15} className="flex-shrink-0" />}
            {t.type === 'info'    && <Info size={15} className="flex-shrink-0" />}
            <span className="flex-1 text-[13px] leading-snug">{t.msg}</span>
            <button onClick={() => dismissToast(t.id)} className="text-current/50 hover:text-current transition flex-shrink-0">
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Payment Notification Cards ───────────────────────────────────────────────
function methodLabel(m: string) {
  if (m === 'bank_transfer' || m === 'pix') return 'PIX'
  if (m === 'credit_card') return 'Cartão'
  if (m === 'debit_card') return 'Débito'
  return m?.toUpperCase() || 'PIX'
}

export function PaymentNotifications() {
  const { pendingPayments, dismissPayment } = useApp()

  return (
    <div className="fixed top-6 right-6 z-[99] flex flex-col gap-3 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {pendingPayments.map(p => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, y: -30, scale: 0.92, x: 30 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="pointer-events-auto relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/95 via-[#0a1a0f]/95 to-[#0d1a14]/95 backdrop-blur-xl border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(34,197,94,.4)] w-72">

            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite] pointer-events-none" />
            {/* Glow orb */}
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-emerald-500/30 blur-2xl pointer-events-none" />

            {/* Top bar */}
            <div className="relative flex items-center justify-between px-4 py-2 border-b border-emerald-500/20">
              <div className="flex items-center gap-1.5">
                <Zap size={11} className="text-emerald-400" fill="currentColor" />
                <span className="text-[11px] font-mono font-bold tracking-[0.3em] text-emerald-400 uppercase">Pagamento Aprovado</span>
              </div>
              <button onClick={() => dismissPayment(p.id)} className="text-emerald-600 hover:text-emerald-400 transition">
                <X size={12} />
              </button>
            </div>

            <div className="relative px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(34,197,94,.3)]">
                  <DollarSign size={18} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-2xl text-emerald-400 tabular-nums leading-none">{fmtBRL(p.amount)}</div>
                  <div className="text-xs font-mono text-emerald-600 mt-0.5 truncate">{p.title}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-0.5">
                  <CreditCard size={10} className="text-emerald-500" />
                  <span className="text-[11px] font-mono text-emerald-500 font-bold tracking-wider">{methodLabel(p.method)}</span>
                </div>
                <div className="text-[11px] font-mono text-zinc-500 truncate">{p.slotName}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
