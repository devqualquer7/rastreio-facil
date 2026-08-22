'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, RefreshCw, Info, AlertTriangle, XCircle, CheckCircle2, Trash2 } from 'lucide-react'
import { SectionTitle, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { fmtDate, cn } from '@/lib/ec-utils'

interface LogEntry {
  id: number
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  context?: string
  created_at: string
}

const LEVEL_STYLES: Record<string, { icon: any; bg: string; text: string; border: string }> = {
  info:    { icon: Info,          bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20' },
  warn:    { icon: AlertTriangle, bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  error:   { icon: XCircle,       bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20' },
  success: { icon: CheckCircle2,  bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
}

export function Logs() {
  const { toast } = useApp()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [levelFilter, setLevelFilter] = useState('todos')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/ec/logs')
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

  useEffect(() => { load() }, [])

  const filtered = levelFilter === 'todos' ? logs : logs.filter(l => l.level === levelFilter)

  return (
    <div>
      <SectionTitle
        icon={<ScrollText size={18} />}
        title="Logs do Sistema"
        subtitle="Registro de eventos e erros"
        action={<>
          <Button variant="danger" size="md" icon={<Trash2 size={12} />} onClick={clearLogs}>
            LIMPAR
          </Button>
          <Button variant="outline" size="md" icon={<RefreshCw size={13} />} onClick={load} loading={loading}>
            ATUALIZAR
          </Button>
        </>}
      />

      {/* Level filter */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        {['todos', 'info', 'success', 'warn', 'error'].map(l => (
          <button key={l} onClick={() => setLevelFilter(l)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all ${
              levelFilter === l
                ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                : 'bg-white/[0.03] border border-white/[0.06] text-zinc-600 hover:border-white/[0.12] hover:text-zinc-400'
            }`}>
            {l}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-mono text-zinc-700">{filtered.length} entradas</span>
      </div>

      <div className="bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f] border border-purple-500/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-3">
            <RefreshCw size={18} className="animate-spin text-purple-400" />
            <span className="text-xs font-mono text-zinc-500">Carregando…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText size={28} className="text-zinc-700 mx-auto mb-3" />
            <div className="text-xs font-mono text-zinc-600">Nenhum log encontrado</div>
          </div>
        ) : (
          <div className="divide-y divide-purple-500/[0.05] max-h-[600px] overflow-y-auto">
            {filtered.map((log, i) => {
              const s = LEVEL_STYLES[log.level] || LEVEL_STYLES.info
              const Icon = s.icon
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.01, 0.2) }}
                  className="px-4 py-3 flex items-start gap-3 hover:bg-purple-500/[0.02] transition group">
                  <div className={cn('w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5', s.bg, s.border)}>
                    <Icon size={13} className={s.text} />
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
