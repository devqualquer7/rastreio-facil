'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ScrollText, RefreshCw, Trash2, Link2, RotateCcw,
  Activity, LogIn, CheckCircle2, XCircle, Clock
} from 'lucide-react'
import { SectionTitle, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { fmtDate, cn } from '@/lib/ec-utils'

type TabId = 'todos' | 'links' | 'estornos' | 'status' | 'logins'

const TABS: { id: TabId; label: string; icon: any; color: string }[] = [
  { id: 'todos',    label: 'Todos',    icon: ScrollText,   color: 'text-zinc-400' },
  { id: 'links',    label: 'Links',    icon: Link2,        color: 'text-purple-400' },
  { id: 'estornos', label: 'Estornos', icon: RotateCcw,    color: 'text-amber-400' },
  { id: 'status',   label: 'Status',   icon: Activity,     color: 'text-cyan-400' },
  { id: 'logins',   label: 'Logins',   icon: LogIn,        color: 'text-emerald-400' },
]

function levelStyle(level: string) {
  switch (level) {
    case 'approved': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25', icon: CheckCircle2 }
    case 'rejected': return { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/25',     icon: XCircle }
    case 'link':     return { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/25',  icon: Link2 }
    case 'refund':   return { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/25',   icon: RotateCcw }
    case 'status':   return { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/25',    icon: Activity }
    case 'login':    return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', icon: LogIn }
    default:         return { bg: 'bg-white/[0.04]',   text: 'text-zinc-400',    border: 'border-white/[0.08]',   icon: Clock }
  }
}

export function Logs() {
  const { toast } = useApp()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabId>('todos')

  async function load(t: TabId = tab) {
    setLoading(true)
    try {
      const r = await fetch(`/api/ec/logs?tab=${t}&limit=500`)
      const d = await r.json()
      if (d.ok) setLogs(d.logs || [])
    } catch { toast('error', 'Falha ao carregar logs') }
    finally { setLoading(false) }
  }

  async function clearLogs() {
    if (!confirm('Limpar todos os logs?')) return
    try {
      const r = await fetch('/api/ec/logs', { method: 'DELETE' })
      const d = await r.json()
      if (d.ok) { toast('success', 'Logs limpos'); setLogs([]) }
    } catch { toast('error', 'Falha ao limpar') }
  }

  function switchTab(t: TabId) {
    setTab(t)
    load(t)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <SectionTitle
        icon={<ScrollText size={18} />}
        title="Logs do Sistema"
        subtitle="Registro completo de eventos"
        action={<>
          <Button variant="danger" size="md" icon={<Trash2 size={12} />} onClick={clearLogs}>
            LIMPAR
          </Button>
          <Button variant="outline" size="md" icon={<RefreshCw size={13} />} onClick={() => load()} loading={loading}>
            ATUALIZAR
          </Button>
        </>}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-wrap mb-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-1.5">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => switchTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-mono font-bold tracking-widest uppercase transition-all flex-1 sm:flex-none justify-center',
                active
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.03]'
              )}>
              <Icon size={12} className={active ? 'text-purple-400' : t.color} />
              {t.label}
            </button>
          )
        })}
        <span className="ml-auto text-[10px] font-mono text-zinc-700 px-2">{logs.length} entradas</span>
      </div>

      <div className="bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f] border border-purple-500/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-3">
            <RefreshCw size={18} className="animate-spin text-purple-400" />
            <span className="text-xs font-mono text-zinc-500">Carregando…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText size={28} className="text-zinc-700 mx-auto mb-3" />
            <div className="text-xs font-mono text-zinc-600">Nenhum log encontrado</div>
          </div>
        ) : (
          <div className="divide-y divide-purple-500/[0.05] max-h-[600px] overflow-y-auto">
            {logs.map((log, i) => {
              const s = levelStyle(log.level)
              const Icon = s.icon
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.008, 0.2) }}
                  className="px-4 py-3 flex items-start gap-3 hover:bg-purple-500/[0.02] transition group">
                  <div className={cn('w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5', s.bg, s.border)}>
                    <Icon size={12} className={s.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[11px] font-mono text-zinc-300 leading-relaxed break-all">{log.message}</div>
                      <div className="text-[10px] font-mono text-zinc-700 flex-shrink-0 tabular">{fmtDate(log.created_at)}</div>
                    </div>
                    {log.context && (
                      <div className="mt-1 text-[10px] font-mono text-zinc-600 break-all leading-relaxed border-l-2 border-zinc-700/50 pl-2">
                        {log.context}
                      </div>
                    )}
                    <div className={cn('inline-block mt-1 text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded border uppercase', s.bg, s.text, s.border)}>
                      {log.level}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
