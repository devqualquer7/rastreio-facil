'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScrollText, RefreshCw, Trash2, Link2,
  LogIn, CheckCircle2, XCircle, Clock, RotateCcw, LayoutList, ShieldCheck,
  OctagonX, AlertTriangle, ArrowLeft
} from 'lucide-react'
import { SectionTitle, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { fmtDate, cn } from '@/lib/ec-utils'

type TabId = 'todos' | 'links' | 'estornos' | 'status' | 'logins'

const TABS: { id: TabId; label: string; icon: any; adminOnly?: boolean }[] = [
  { id: 'todos',    label: 'TODOS',    icon: LayoutList   },
  { id: 'links',    label: 'LINKS',    icon: Link2        },
  { id: 'estornos', label: 'ESTORNOS', icon: RotateCcw    },
  { id: 'status',   label: 'STATUS',   icon: CheckCircle2 },
  { id: 'logins',   label: 'LOGINS',   icon: ShieldCheck, adminOnly: true },
]

function levelStyle(level: string) {
  switch (level) {
    case 'approved':
    case 'success':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: CheckCircle2, label: 'aprovado' }
    case 'rejected':
    case 'error':
      return { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     icon: XCircle,      label: 'erro' }
    case 'refund':
      return { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   icon: RotateCcw,    label: 'estorno' }
    case 'link':
      return { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/20',  icon: Link2,        label: 'link' }
    case 'login':
      return { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/20',    icon: LogIn,        label: 'login' }
    default:
      return { bg: 'bg-white/[0.03]',   text: 'text-zinc-500',    border: 'border-white/[0.06]',   icon: Clock,        label: level }
  }
}

/** Extracts the EC-xxx-xxx reference from a log message */
function extractRef(message: string): string | null {
  return message?.match(/\bEC-\d+-[A-Z0-9]+\b/)?.[0] ?? null
}

/** Extracts a short title (3rd segment after ·) from a "Link gerado · R$ x · Título · ref" message */
function extractTitle(message: string): string {
  const parts = message?.split(' · ')
  if (parts && parts.length >= 3) return parts[2]
  return message ?? ''
}

// ── Cancel confirmation modal ─────────────────────────────────────────────────
interface CancelModalProps {
  log: any
  onClose: () => void
  onConfirm: () => Promise<void>
}

function CancelModal({ log, onClose, onConfirm }: CancelModalProps) {
  const [loading, setLoading] = useState(false)
  const title = extractTitle(log.message)
  const ref   = extractRef(log.message)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && !loading) handleConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading])

  async function handleConfirm() {
    setLoading(true)
    try { await onConfirm() } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="relative z-10 w-full max-w-sm bg-gradient-to-b from-[#0d0d18]/98 to-[#09090f]/98 backdrop-blur-2xl border border-red-500/25 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(239,68,68,.2)]">

        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-red-500/12 blur-3xl pointer-events-none" />

        <div className="relative p-6 text-center">
          {/* Icon */}
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-red-500/30 blur-xl animate-pulse" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-red-500/20 to-red-500/5 border-2 border-red-500/40 flex items-center justify-center">
              <OctagonX size={24} className="text-red-400" strokeWidth={2} />
            </div>
          </div>

          {/* Title */}
          <div className="font-black text-lg text-zinc-100 tracking-tight mb-1">Cancelar link?</div>
          {title && (
            <div className="text-xs font-mono text-purple-300/80 mb-4 truncate px-2">{title}</div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-left mb-5">
            <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] font-mono text-red-300/80 leading-relaxed">
              O link vai parar de aceitar pagamentos <strong className="text-red-300">imediatamente</strong>.
              Esta ação <strong className="text-red-300">NÃO pode ser desfeita</strong>.
            </p>
          </div>

          {ref && (
            <div className="text-[9px] font-mono text-zinc-700 mb-5 tracking-widest">{ref}</div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] text-xs font-mono font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 disabled:opacity-40">
              <ArrowLeft size={12} /> Voltar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-br from-red-700 to-red-500 text-white text-xs font-black tracking-widest uppercase shadow-[0_0_20px_rgba(239,68,68,.35)] hover:shadow-[0_0_30px_rgba(239,68,68,.5)] active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
              {loading ? (
                <><RefreshCw size={12} className="animate-spin" /> Cancelando…</>
              ) : (
                <><OctagonX size={12} /> Cancelar Link</>
              )}
            </button>
          </div>

          <div className="mt-3 text-[9px] font-mono text-zinc-700 tracking-widest">
            ESC · voltar &nbsp;·&nbsp; ENTER · confirmar
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Logs component ───────────────────────────────────────────────────────
export function Logs() {
  const { toast, isAdmin } = useApp()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabId>('todos')
  const [cancelLog, setCancelLog] = useState<any | null>(null)   // log row pending cancellation
  const [canceledRefs, setCanceledRefs] = useState<Set<string>>(new Set())

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin)

  async function load(t: TabId = tab) {
    setLoading(true)
    try {
      const r = await fetch(`/api/ec/logs?tab=${t}&limit=500`)
      const d = await r.json()
      if (d.ok) setLogs(d.logs || [])
      else toast('error', d.error || 'Erro ao carregar logs')
    } catch { toast('error', 'Falha ao carregar logs') }
    finally { setLoading(false) }
  }

  async function clearLogs() {
    if (!confirm('Limpar todos os logs?')) return
    try {
      const r = await fetch('/api/ec/logs', { method: 'DELETE' })
      const d = await r.json()
      if (d.ok) { toast('success', 'Logs limpos'); setLogs([]) }
      else toast('error', 'Falha ao limpar')
    } catch { toast('error', 'Falha ao limpar') }
  }

  function switchTab(t: TabId) {
    setTab(t)
    load(t)
  }

  async function handleCancel() {
    if (!cancelLog) return
    const ref = extractRef(cancelLog.message)
    if (!ref) { toast('error', 'Referência não encontrada no log'); setCancelLog(null); return }

    const r = await fetch('/api/ec/sales/cancel', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ref }),
    })
    const d = await r.json()
    if (d.ok) {
      toast('success', 'Link cancelado com sucesso')
      setCanceledRefs(prev => new Set([...prev, ref]))
      setCancelLog(null)
    } else {
      toast('error', d.error || 'Falha ao cancelar link')
      setCancelLog(null)
    }
  }

  useEffect(() => { load() }, [])

  const activeTabMeta = TABS.find(t => t.id === tab)!

  return (
    <div>
      <SectionTitle
        icon={<ScrollText size={18} />}
        title="Logs do Sistema"
        subtitle="Registro de eventos por categoria"
        action={<>
          {isAdmin && (
            <Button variant="danger" size="md" icon={<Trash2 size={12} />} onClick={clearLogs}>
              LIMPAR
            </Button>
          )}
          <Button variant="outline" size="md" icon={<RefreshCw size={13} />} onClick={() => load()} loading={loading}>
            ATUALIZAR
          </Button>
        </>}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {visibleTabs.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-mono font-bold tracking-[0.2em] uppercase transition-all border',
                active
                  ? 'bg-red-500/12 border-red-500/30 text-red-400'
                  : 'bg-white/[0.025] border-white/[0.06] text-zinc-600 hover:text-zinc-400 hover:border-white/10 hover:bg-white/[0.04]'
              )}>
              <Icon
                size={11}
                className={active ? 'text-red-500' : 'text-zinc-600'}
              />
              {t.label}
            </button>
          )
        })}
        <span className="ml-auto text-[10px] font-mono text-zinc-700 tabular-nums">{logs.length} registros</span>
      </div>

      {/* Content */}
      <div className="bg-[#0d0d14]/80 border border-white/[0.05] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-3">
            <RefreshCw size={16} className="animate-spin text-zinc-600" />
            <span className="text-xs font-mono text-zinc-600">Carregando…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <activeTabMeta.icon size={26} className="text-zinc-800 mx-auto mb-3" />
            <div className="text-xs font-mono text-zinc-700">Nenhum registro encontrado</div>
            <div className="text-[10px] font-mono text-zinc-800 mt-1">{activeTabMeta.label}</div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto">
            {logs.map((log, i) => {
              const s = levelStyle(log.level)
              const Icon = s.icon
              const isPaymentLink = log.level === 'link' && log.message?.startsWith('Link gerado')
              const ref = isPaymentLink ? extractRef(log.message) : null
              const alreadyCanceled = ref ? canceledRefs.has(ref) : false

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.006, 0.18) }}
                  className={cn(
                    'px-4 py-3 flex items-start gap-3 transition group',
                    alreadyCanceled ? 'opacity-40' : 'hover:bg-white/[0.02]'
                  )}>
                  <div className={cn('w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5', s.bg, s.border)}>
                    <Icon size={12} className={s.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-0.5">
                      <div className="text-[11px] font-mono text-zinc-300 leading-relaxed break-all">{log.message}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-[10px] font-mono text-zinc-700 tabular-nums whitespace-nowrap">{fmtDate(log.created_at)}</div>
                        {isPaymentLink && ref && !alreadyCanceled && (
                          <button
                            onClick={() => setCancelLog(log)}
                            title="Cancelar este link"
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition">
                            <OctagonX size={13} />
                          </button>
                        )}
                        {alreadyCanceled && (
                          <span className="text-[9px] font-mono text-red-500/60 font-bold tracking-wider">CANCELADO</span>
                        )}
                      </div>
                    </div>
                    {log.username && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded border bg-red-500/10 border-red-500/25 text-red-400 uppercase mt-0.5 mr-1">
                        <LogIn size={9} /> @{log.username}
                      </span>
                    )}
                    {log.context && (
                      <div className="text-[10px] font-mono text-zinc-600 break-all leading-relaxed border-l-2 border-white/[0.06] pl-2 mt-1 mb-1">
                        {log.context}
                      </div>
                    )}
                    <span className={cn('inline-block text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded border uppercase mt-0.5', s.bg, s.text, s.border)}>
                      {s.label}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      <AnimatePresence>
        {cancelLog && (
          <CancelModal
            log={cancelLog}
            onClose={() => setCancelLog(null)}
            onConfirm={handleCancel}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
