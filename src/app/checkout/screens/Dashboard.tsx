'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, DollarSign, TrendingUp, Zap, RefreshCw, Activity, Link as LinkIcon } from 'lucide-react'
import { SectionTitle, Button, StatusPill } from '@/components/ec/ui/Base'
import { StatCard } from '@/components/ec/StatCard'
import { useApp } from '@/lib/ec-store'
import { usePolling } from '@/hooks/ec-polling'
import { fmtBRL, fmtDate } from '@/lib/ec-utils'
import { playCashSound, fireOSNotification } from '@/lib/ec-notify'

export function Dashboard() {
  const { openModal, setScreen, toast, username, pushPayment } = useApp()
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const lastStatusRef = useRef<Map<number, string>>(new Map())
  const initializedRef = useRef(false)

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
      if (d.ok) {
        const list = d.sales || []
        if (initializedRef.current) {
          for (const sale of list) {
            const prev = lastStatusRef.current.get(sale.id)
            if (prev && prev !== 'approved' && sale.status === 'approved') {
              triggerPaymentNotification(sale)
            }
          }
        }
        const map = new Map<number, string>()
        for (const s of list) map.set(s.id, s.status)
        lastStatusRef.current = map
        initializedRef.current = true
        setSales(list)
      }
    } finally { setLoading(false) }
  }

  function triggerPaymentNotification(sale: any) {
    const amount = Number(sale.amount || 0)
    pushPayment({
      amount,
      title: sale.title,
      slotName: sale.slot_name,
      method: sale.payment_type_id,
      saleId: sale.id
    })
    playCashSound()
    if (typeof document !== 'undefined' && document.hidden) {
      fireOSNotification(
        `💰 Pagamento aprovado — ${fmtBRL(amount)}`,
        `${sale.title}\n${sale.slot_name}`,
        `payment-${sale.id}`
      )
    }
  }

  async function pollNow() {
    try {
      const r = await fetch('/api/ec/poll/tick', { method: 'POST' })
      const d = await r.json()
      if (d.ok) { toast('info', `Verificado ${d.checked} · alterado ${d.changed}`); load() }
    } catch { toast('error', 'Erro no poll') }
  }

  useEffect(() => { load() }, [])
  usePolling(!!username, async () => { await pollNow() })

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
        <StatCard icon={<CheckCircle2 size={20} />} label="Aprovadas" value={String(stats.approved)}
          sub={fmtBRL(stats.totalApprovedAmount)} color="success" delay={0.05} onClick={() => setScreen('extrato')} />
        <StatCard icon={<XCircle size={20} />} label="Recusadas" value={String(stats.rejected)} color="danger" delay={0.1} onClick={() => setScreen('extrato')} />
        <StatCard icon={<Clock size={20} />} label="Pendentes" value={String(stats.pending)} color="warning" delay={0.15} onClick={() => setScreen('extrato')} />
        <StatCard icon={<DollarSign size={20} />} label="Líquido" value={fmtBRL(stats.totalNetAmount)}
          sub={`taxa · ${approvalRate.toFixed(1)}%`} color="primary" delay={0.2} />
      </div>

      {(stats.approved + stats.rejected > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f] border border-purple-500/15 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-purple-400" />
              <div className="text-xs font-mono font-bold tracking-widest text-zinc-500">TAXA DE APROVAÇÃO</div>
            </div>
            <div className="text-lg font-mono font-black text-purple-400">{approvalRate.toFixed(1)}%</div>
          </div>
          <div className="h-2 bg-[#1a1a28] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${approvalRate}%` }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="h-full bg-gradient-to-r from-violet-700 via-purple-500 to-cyan-400"
            />
          </div>
          <div className="flex justify-between mt-2">
            <div className="text-[10px] font-mono text-emerald-500">{stats.approved} aprovadas</div>
            <div className="text-[10px] font-mono text-red-400">{stats.rejected} recusadas</div>
          </div>
        </motion.div>
      )}

      <div className="bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f] border border-purple-500/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon size={14} className="text-purple-400" />
            <div className="text-xs font-mono font-bold tracking-widest text-zinc-500">TRANSAÇÕES RECENTES</div>
          </div>
          <button onClick={() => setScreen('extrato')} className="text-[10px] font-mono text-zinc-600 hover:text-purple-400 tracking-widest transition">
            VER TODAS →
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="py-12 text-center text-zinc-600 text-xs font-mono">
            Nenhuma venda ainda. Clique em <span className="text-purple-400">GERAR LINK</span>.
          </div>
        ) : (
          <div className="divide-y divide-purple-500/[0.06]">
            {recent.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-purple-500/[0.03] transition">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-zinc-300 truncate">{s.title}</div>
                  <div className="text-[10px] font-mono text-zinc-600">
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
