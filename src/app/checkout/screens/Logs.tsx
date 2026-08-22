'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ScrollText, RefreshCw, Trash2, Link2,
  LogIn, CheckCircle2, XCircle, Clock, RotateCcw, LayoutList, ShieldCheck
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

export function Logs() {
  const { toast, isAdmin } = useApp()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabId>('todos')

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

      {/* Tabs — style matching the design reference */}
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
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.006, 0.18) }}
                  className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition group">
                  <div className={cn('w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5', s.bg, s.border)}>
                    <Icon size={12} className={s.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-0.5">
                      <div className="text-[11px] font-mono text-zinc-300 leading-relaxed break-all">{log.message}</div>
                      <div className="text-[10px] font-mono text-zinc-700 shrink-0 tabular-nums whitespace-nowrap">{fmtDate(log.created_at)}</div>
                    </div>
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
    </div>
  )
}
