'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ScrollText, RefreshCw, Trash2, Link2,
  LogIn, CheckCircle2, XCircle, Clock, Key, ShieldCheck
} from 'lucide-react'
import { SectionTitle, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { fmtDate, cn } from '@/lib/ec-utils'

type TabId = 'contas' | 'aprovados' | 'logins'

const TABS: { id: TabId; label: string; icon: any; color: string; adminOnly?: boolean }[] = [
  { id: 'contas',    label: 'Contas Conectadas', icon: Key,          color: 'text-purple-400' },
  { id: 'aprovados', label: 'Pagamentos',         icon: CheckCircle2, color: 'text-emerald-400' },
  { id: 'logins',   label: 'Logins',             icon: ShieldCheck,  color: 'text-cyan-400', adminOnly: true },
]

// Map tab → API query param
const TAB_API_MAP: Record<TabId, string> = {
  contas:    'links',
  aprovados: 'status',  // 'status' tab returns approved + rejected + status events
  logins:    'logins',
}

function levelStyle(level: string) {
  switch (level) {
    case 'approved': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25', icon: CheckCircle2, label: 'aprovado' }
    case 'rejected': return { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/25',     icon: XCircle,      label: 'recusado' }
    case 'link':     return { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/25',  icon: Link2,        label: 'conexão' }
    case 'login':    return { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/25',    icon: LogIn,        label: 'login' }
    default:         return { bg: 'bg-white/[0.04]',   text: 'text-zinc-400',    border: 'border-white/[0.08]',   icon: Clock,        label: level }
  }
}

export function Logs() {
  const { toast, isAdmin } = useApp()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabId>('contas')

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin)

  async function load(t: TabId = tab) {
    setLoading(true)
    try {
      const apiTab = TAB_API_MAP[t]
      const r = await fetch(`/api/ec/logs?tab=${apiTab}&limit=500`)
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

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5">
        {visibleTabs.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => switchTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-mono font-bold tracking-widest uppercase transition-all border',
                active
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.12]'
              )}>
              <Icon size={12} className={active ? 'text-purple-400' : t.color} />
              {t.label}
              {t.adminOnly && (
                <span className="text-[8px] font-mono text-purple-600 border border-purple-700/40 rounded px-1">ADMIN</span>
              )}
            </button>
          )
        })}
        <span className="ml-auto text-[10px] font-mono text-zinc-700">{logs.length} registros</span>
      </div>

      {/* Content */}
      <div className="bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f] border border-purple-500/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-3">
            <RefreshCw size={18} className="animate-spin text-purple-400" />
            <span className="text-xs font-mono text-zinc-500">Carregando…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <activeTabMeta.icon size={28} className="text-zinc-700 mx-auto mb-3" />
            <div className="text-xs font-mono text-zinc-600">Nenhum registro encontrado</div>
            <div className="text-[10px] font-mono text-zinc-700 mt-1">{activeTabMeta.label}</div>
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
                  className="px-4 py-3.5 flex items-start gap-3 hover:bg-purple-500/[0.02] transition group">
                  <div className={cn('w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5', s.bg, s.border)}>
                    <Icon size={13} className={s.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-[11px] font-mono text-zinc-300 leading-relaxed break-all">{log.message}</div>
                      <div className="text-[10px] font-mono text-zinc-700 flex-shrink-0 tabular whitespace-nowrap">{fmtDate(log.created_at)}</div>
                    </div>
                    {log.context && (
                      <div className="text-[10px] font-mono text-zinc-600 break-all leading-relaxed border-l-2 border-purple-700/30 pl-2 mb-1">
                        {log.context}
                      </div>
                    )}
                    <span className={cn('inline-block text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded border uppercase', s.bg, s.text, s.border)}>
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
