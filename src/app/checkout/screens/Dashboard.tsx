'use client'
import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, DollarSign, TrendingUp, Zap, RefreshCw, Activity, Link as LinkIcon } from 'lucide-react'
import { SectionTitle, Button, StatusPill } from '@/components/ec/ui/Base'
import { StatCard } from '@/components/ec/StatCard'
import { useApp } from '@/lib/ec-store'
import { fmtBRL, fmtDate } from '@/lib/ec-utils'

// Última lista recebida: ao voltar para o Dashboard os números aparecem na hora,
// em vez de zerarem enquanto a API responde.
let salesCache: any[] | null = null

export function Dashboard() {
  const { openModal, setScreen, toast, username } = useApp()
  const [sales, setSales] = useState<any[]>(salesCache ?? [])
  const [loaded, setLoaded] = useState(salesCache !== null)
  const [loading, setLoading] = useState(false)

  const stats = useMemo(() => {
    const s = { total: 0, approved: 0, rejected: 0, pending: 0, cancelled: 0, refunded: 0, totalApprovedAmount: 0, totalNetAmount: 0 }
    for (const x of sales) {
      s.total++
      if (x.status === 'approved') { s.approved++; s.totalApprovedAmount += Number(x.amount || 0); s.totalNetAmount += Number(x.net_amount || 0) }
      else if (x.status === 'rejected') s.rejected++
      else if (['gerado', 'pending', 'in_process', 'authorized'].includes(x.status)) s.pending++
      else if (x.status === 'cancelled') s.cancelled++
      else if (x.status === 'refunded') s.refunded++
    }
    return s
  }, [sales])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/ec/sales/list', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 500 })
      })
      const d = await r.json()
      if (d.ok) { salesCache = d.sales || []; setSales(salesCache!) }
    } catch { /* mantém o que já está na tela */ }
    finally { setLoading(false); setLoaded(true) }
  }

  async function pollNow() {
    try {
      const r = await fetch('/api/ec/poll/tick', { method: 'POST' })
      const d = await r.json()
      if (d.ok) { toast('info', `Verificado ${d.checked} · alterado ${d.changed}`); load() }
    } catch { toast('error', 'Erro no poll') }
  }

  useEffect(() => {
    load()
    // A página já busca as vendas a cada 15s para as notificações — reaproveita
    // essa lista para manter o Dashboard ao vivo sem outra requisição.
    function onSales(e: Event) {
      const list = (e as CustomEvent).detail
      if (Array.isArray(list)) { salesCache = list; setSales(list); setLoaded(true) }
    }
    window.addEventListener('ec:sales', onSales)
    return () => window.removeEventListener('ec:sales', onSales)
  }, [])

  const dash = (v: string) => (loaded ? v : '—')

  const approvalRate = useMemo(() => {
    const fin = stats.approved + stats.rejected
    return fin === 0 ? 0 : (stats.approved / fin) * 100
  }, [stats])

  const recent = sales.slice(0, 8)

  return (
    <div>
      <SectionTitle
        icon={<Activity size={18} />}
        title="Dashboard"
        subtitle="Panorama das suas vendas"
        action={<>
          <Button variant="outline" size="md" icon={<RefreshCw size={13} />} onClick={pollNow} loading={loading}>
            VERIFICAR AGORA
          </Button>
          <Button variant="accent" size="md" icon={<Zap size={13} />} onClick={() => openModal('generate')}>
            GERAR LINK
          </Button>
        </>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<CheckCircle2 size={20} />} label="Aprovadas" value={dash(String(stats.approved))}
          sub={loaded ? fmtBRL(stats.totalApprovedAmount) : undefined} color="success" delay={0.05} onClick={() => setScreen('extrato')} />
        <StatCard icon={<XCircle size={20} />} label="Recusadas" value={dash(String(stats.rejected))} color="danger" delay={0.1} onClick={() => setScreen('extrato')} />
        <StatCard icon={<Clock size={20} />} label="Pendentes" value={dash(String(stats.pending))} color="warning" delay={0.15} onClick={() => setScreen('extrato')} />
        <StatCard icon={<DollarSign size={20} />} label="Líquido" value={dash(fmtBRL(stats.totalNetAmount))}
          sub={loaded ? `taxa · ${approvalRate.toFixed(1)}%` : undefined} color="primary" delay={0.2} />
      </div>

      {(stats.approved + stats.rejected > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f] border border-red-600/15 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-red-400" />
              <div className="text-xs font-mono font-bold tracking-widest text-zinc-400">TAXA DE APROVAÇÃO</div>
            </div>
            <div className="text-lg font-mono font-black text-red-400">{approvalRate.toFixed(1)}%</div>
          </div>
          <div className="h-2 bg-[#1a1a28] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${approvalRate}%` }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="h-full bg-gradient-to-r from-[#6b0011] via-[#a8001a] to-[#c50020]"
            />
          </div>
          <div className="flex justify-between mt-2">
            <div className="text-xs font-mono text-emerald-500">{stats.approved} aprovadas</div>
            <div className="text-xs font-mono text-red-400">{stats.rejected} recusadas</div>
          </div>
        </motion.div>
      )}

      <div className="bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f] border border-red-600/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-red-600/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon size={14} className="text-red-400" />
            <div className="text-xs font-mono font-bold tracking-widest text-zinc-400">TRANSAÇÕES RECENTES</div>
          </div>
          <button onClick={() => setScreen('extrato')} className="text-xs font-mono text-zinc-500 hover:text-red-400 tracking-widest transition">
            VER TODAS →
          </button>
        </div>
        {!loaded ? (
          <div className="divide-y divide-red-600/[0.06]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded bg-white/[0.07]" style={{ width: `${38 + (i % 3) * 12}%` }} />
                  <div className="h-2.5 w-1/4 rounded bg-white/[0.04]" />
                </div>
                <div className="h-3.5 w-20 rounded bg-white/[0.07]" />
                <div className="h-5 w-16 rounded-full bg-white/[0.05]" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs font-mono">
            Nenhuma venda ainda. Clique em <span className="text-red-400">GERAR LINK</span>.
          </div>
        ) : (
          <div className="divide-y divide-red-600/[0.06]">
            {recent.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-red-600/[0.03] transition">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-zinc-300 truncate">{s.title}</div>
                  <div className="text-xs font-mono text-zinc-500">
                    Slot #{s.slot} · {s.slot_name} · {fmtDate(s.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-sm font-mono font-bold text-zinc-200">{fmtBRL(Number(s.amount))}</div>
                  <StatusPill status={s.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
