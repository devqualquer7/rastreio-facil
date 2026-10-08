'use client'
import { motion } from 'framer-motion'
import { X, CheckCircle2, Circle, Zap, Sparkles, Lock } from 'lucide-react'
import { ModalBackdrop } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { cn } from '@/lib/ec-utils'

export function SwitchAccountModal() {
  const { closeModal, creds, activeCred, toast, refreshCreds, isAdmin } = useApp()

  async function activate(slot: number) {
    try {
      const r = await fetch('/api/ec/creds/setactive', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slot })
      })
      const d = await r.json()
      if (d.ok) {
        toast('success', `Slot #${slot} ativado`)
        await refreshCreds()
        closeModal()
      } else {
        toast('error', d.error || 'Falha')
      }
    } catch { toast('error', 'Erro de rede') }
  }

  return (
    <ModalBackdrop onClose={closeModal}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative bg-gradient-to-b from-[#0d0d18]/98 to-[#09090f]/98 backdrop-blur-2xl border border-red-500/20 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(255,43,74,.15)]">

        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 pt-6 pb-5 border-b border-red-500/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <Zap size={16} className="text-red-400" />
            </div>
            <div>
              <div className="font-black text-sm text-zinc-100 tracking-wide uppercase">Trocar Conta</div>
              <div className="text-xs font-mono text-zinc-500 mt-0.5">{creds.length} slots disponíveis</div>
            </div>
          </div>
          <button onClick={closeModal} className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.06] flex items-center justify-center transition">
            <X size={16} />
          </button>
        </div>

        <div className="relative p-4 space-y-2 max-h-80 overflow-y-auto">
          {creds.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs font-mono">Nenhuma conta cadastrada</div>
          ) : [...creds].sort((a, b) => {
            const rank = (c: (typeof creds)[number]) => c.is_active ? 0 : c.health_status === 'banned' ? 3 : c.locked ? 2 : 1
            return rank(a) - rank(b) || a.slot - b.slot
          }).map((c, i) => {
            const isActive = c.is_active
            const banned = c.health_status === 'banned'
            const blocked = !!c.locked && !isAdmin   // bloqueada pelo admin: aparece, mas não dá para escolher
            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => !isActive && !banned && !blocked && activate(c.slot)}
                disabled={isActive || banned || blocked}
                className={cn(
                  'relative w-full rounded-2xl p-4 text-left transition-all group overflow-hidden',
                  isActive
                    ? 'bg-gradient-to-br from-red-500/20 via-red-500/8 to-transparent border border-red-500/40 shadow-[0_0_20px_rgba(255,43,74,.15)]'
                    : banned
                      ? 'bg-red-500/5 border border-red-500/20 opacity-60 cursor-not-allowed'
                    : blocked
                      ? 'bg-ec-purple/[0.08] border border-ec-purple/35 opacity-80 cursor-not-allowed'
                      : 'bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] hover:border-red-500/25 cursor-pointer'
                )}>
                {isActive && (
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-red-500/20 blur-2xl pointer-events-none" />
                )}
                <div className="relative flex items-center gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-xl border-2 flex items-center justify-center font-black text-sm flex-shrink-0',
                    isActive ? 'bg-gradient-to-br from-red-700 to-red-500 border-red-400/60 text-white shadow-[0_0_15px_rgba(255,43,74,.4)]'
                    : banned ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-white/[0.04] border-white/[0.1] text-zinc-400'
                  )}>
                    {c.slot}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('font-bold text-sm truncate', isActive ? 'text-red-200' : banned ? 'text-red-400' : 'text-zinc-300')}>
                      {c.name}
                      {c.locked && <Lock size={11} className="inline ml-1.5 -mt-0.5 text-ec-purple" aria-label="Bloqueada para os usuários" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isActive ? (
                        <><Sparkles size={9} className="text-red-400" /><span className="text-[11px] font-mono text-red-400 tracking-wider">ATIVO</span></>
                      ) : banned ? (
                        <span className="text-[11px] font-mono text-red-400 tracking-wider">BANIDA</span>
                      ) : blocked ? (
                        <span className="text-[11px] font-mono text-ec-purple tracking-wider">BLOQUEADA PELO ADMINISTRADOR</span>
                      ) : c.connected ? (
                        <><CheckCircle2 size={9} className="text-emerald-400" /><span className="text-[11px] font-mono text-emerald-500 tracking-wider">Conectado</span></>
                      ) : (
                        <><Circle size={9} className="text-zinc-500" /><span className="text-[11px] font-mono text-zinc-500 tracking-wider">Desconectado</span></>
                      )}
                    </div>
                  </div>
                  {!isActive && !banned && c.connected && (
                    <div className="text-[11px] font-mono text-zinc-500 group-hover:text-red-400 tracking-widest uppercase transition">
                      Ativar →
                    </div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </ModalBackdrop>
  )
}
