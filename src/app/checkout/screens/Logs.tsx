'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScrollText, RefreshCw, Trash2, Link2,
  LogIn, CheckCircle2, XCircle, Clock, RotateCcw, LayoutList, ShieldCheck,
  OctagonX, AlertTriangle, ArrowLeft, Copy, Check
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
      return { bg: 'bg-ec-blue/10',    text: 'text-ec-blue',     border: 'border-ec-blue/25',     icon: Link2,        label: 'link' }
    case 'login':
      return { bg: 'bg-ec-purple/10',  text: 'text-ec-purple',   border: 'border-ec-purple/25',   icon: LogIn,        label: 'login' }
    default:
      return { bg: 'bg-white/[0.03]',   text: 'text-zinc-400',    border: 'border-white/[0.06]',   icon: Clock,        label: level }
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
            <div className="text-xs font-mono text-red-300/80 mb-4 truncate px-2">{title}</div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-left mb-5">
            <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-[13px] font-mono text-red-300/80 leading-relaxed">
              O link vai parar de aceitar pagamentos <strong className="text-red-300">imediatamente</strong>.
              Esta ação <strong className="text-red-300">NÃO pode ser desfeita</strong>.
            </p>
          </div>

          {ref && (
            <div className="text-[11px] font-mono text-zinc-500 mb-5 tracking-widest">{ref}</div>
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

          <div className="mt-3 text-[11px] font-mono text-zinc-500 tracking-widest">
            ESC · voltar &nbsp;·&nbsp; ENTER · confirmar
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const TAB_STORAGE_KEY = 'ec_logs_tab'

// ── Main Logs component ───────────────────────────────────────────────────────
export function Logs() {
  const { toast, isAdmin } = useApp()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabId>(() => {
    try { return (localStorage.getItem(TAB_STORAGE_KEY) as TabId) || 'todos' } catch { return 'todos' }
  })
  const [cancelLog, setCancelLog] = useState<any | null>(null)
  const [canceledRefs, setCanceledRefs] = useState<Set<string>>(new Set())
  const [copiedRef, setCopiedRef] = useState<string | null>(null)

  // Keep a ref to the active tab so the auto-refresh interval always fetches the right data
  const tabRef = useRef<TabId>(tab)

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin)

  async function load(t: TabId = tabRef.current) {
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
    tabRef.current = t
    setTab(t)
    try { localStorage.setItem(TAB_STORAGE_KEY, t) } catch {}
    load(t)
  }

  async function handleCopy(log: any) {
    const url = log.link
    if (!url) { toast('error', 'Link não encontrado'); return }
    const ref = extractRef(log.message) ?? ''
    try {
      await navigator.clipboard.writeText(url)
      setCopiedRef(ref)
      setTimeout(() => setCopiedRef(r => r === ref ? null : r), 2000)
    } catch {
      toast('error', 'Falha ao copiar')
    }
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

  // Load on mount + auto-refresh every 15 s so new logs appear without manual refresh
  useEffect(() => {
    load()
    const interval = setInterval(() => load(), 15_000)
    return () => clearInterval(interval)
  }, [])

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
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono font-bold tracking-[0.2em] uppercase transition-all border',
                active
                  ? 'bg-ec-red/10 border-ec-red/40 text-ec-red'
                  : 'bg-ec-card border-ec-line text-ec-dim hover:text-ec-text hover:border-ec-line-glow'
              )}>
              <Icon size={13} />
              {t.label}
            </button>
          )
        })}
        <span className="ml-auto text-xs font-mono text-zinc-500 tabular-nums">{logs.length} registros</span>
      </div>

      {/* Content */}
      <div className="bg-ec-card border border-ec-line rounded-xl overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="py-16 flex items-center justify-center gap-3">
            <RefreshCw size={16} className="animate-spin text-zinc-500" />
            <span className="text-xs font-mono text-zinc-500">Carregando…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <activeTabMeta.icon size={26} className="text-ec-muted mx-auto mb-3" />
            <div className="text-xs font-mono text-zinc-500">Nenhum registro encontrado</div>
            <div className="text-xs font-mono text-ec-muted mt-1">{activeTabMeta.label}</div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05] max-h-[calc(100vh-240px)] min-h-[200px] overflow-y-auto">
            {logs.map(log => {
              const s = levelStyle(log.level)
              const Icon = s.icon
              const isPaymentLink = log.level === 'link' && log.message?.startsWith('Link gerado')
              const ref = isPaymentLink ? extractRef(log.message) : null
              const alreadyCanceled = ref ? canceledRefs.has(ref) : false
              const isCopied = ref ? copiedRef === ref : false
              const hasLink = isPaymentLink && !!log.link

              return (
                <div
                  key={log.id}
                  className={cn(
                    'px-5 py-3.5 flex items-start gap-3.5 transition',
                    alreadyCanceled ? 'opacity-45' : 'hover:bg-ec-card2/60'
                  )}>
                  <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center shrink-0', s.bg, s.border)}>
                    <Icon size={15} className={s.text} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn('text-[11px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded border uppercase', s.bg, s.text, s.border)}>
                        {s.label}
                      </span>
                      {log.username && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded border border-ec-line bg-ec-card2 text-ec-dim">
                          <LogIn size={10} /> @{log.username}
                        </span>
                      )}
                      <span className="text-xs font-mono text-ec-muted tabular-nums whitespace-nowrap">{fmtDate(log.created_at)}</span>
                    </div>
                    <div className="text-sm font-mono text-ec-text leading-relaxed break-words">{log.message}</div>
                    {log.context && (
                      <div className="text-xs font-mono text-ec-dim break-all leading-relaxed mt-1">{log.context}</div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {/* Ações — só para links de pagamento não cancelados */}
                    {isPaymentLink && ref && !alreadyCanceled && (
                      <>
                        {hasLink && (
                          <button
                            onClick={() => handleCopy(log)}
                            title="Copiar link de pagamento"
                            className={cn(
                              'h-8 px-2.5 rounded-lg border text-[11px] font-mono font-bold tracking-wider uppercase transition flex items-center gap-1.5',
                              isCopied
                                ? 'bg-ec-green/15 text-ec-green border-ec-green/30'
                                : 'bg-ec-card2 border-ec-line text-ec-dim hover:text-ec-text hover:border-ec-line-glow'
                            )}>
                            {isCopied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                          </button>
                        )}
                        <button
                          onClick={() => setCancelLog(log)}
                          title="Cancelar este link"
                          className="h-8 px-2.5 rounded-lg border border-ec-line bg-ec-card2 text-[11px] font-mono font-bold tracking-wider uppercase text-ec-dim hover:text-ec-red hover:border-ec-red/40 hover:bg-ec-red/10 transition flex items-center gap-1.5">
                          <OctagonX size={12} /> Cancelar
                        </button>
                      </>
                    )}
                    {alreadyCanceled && (
                      <span className="text-[11px] font-mono text-ec-red font-bold tracking-wider px-2 py-1 rounded border border-ec-red/30 bg-ec-red/10">CANCELADO</span>
                    )}
                  </div>
                </div>
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
