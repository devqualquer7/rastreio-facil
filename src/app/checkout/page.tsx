'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MPAccount {
  slot: number
  mp_user_id: string
  public_key: string
  is_active: boolean
  connected: boolean
}

export default function CheckoutDashboard() {
  const [txs, setTxs] = useState<any[]>([])
  const [mpAccounts, setMpAccounts] = useState<MPAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/checkout/transactions').then(r => r.json()),
      fetch('/api/checkout/mp-accounts').then(r => r.json()),
    ]).then(([t, m]) => {
      setTxs(Array.isArray(t) ? t : [])
      setMpAccounts(Array.isArray(m) ? m : [])
    }).finally(() => setLoading(false))
  }, [])

  const stats = txs.reduce((acc, tx) => {
    acc.total++
    acc.totalAmount += tx.amount ?? 0
    if (tx.status === 'paid') { acc.paid++; acc.paidAmount += tx.amount ?? 0 }
    else acc.pending++
    return acc
  }, { total: 0, paid: 0, pending: 0, totalAmount: 0, paidAmount: 0 })

  const fmt = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const recent = txs.slice(0, 10)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Visão geral do seu painel</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Transações', value: stats.total.toString() },
          { label: 'Pagas', value: stats.paid.toString(), sub: fmt(stats.paidAmount) },
          { label: 'Pendentes', value: stats.pending.toString() },
          { label: 'Volume Total', value: fmt(stats.totalAmount) },
        ].map(s => (
          <div key={s.label} className="bg-[#141414] border border-white/[0.06] rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
            <p className="text-xl font-semibold text-white">{s.value}</p>
            {s.sub && <p className="text-xs text-emerald-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {mpAccounts.length > 0 && (
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-4">
          <h2 className="text-sm font-medium text-white mb-3">Contas Mercado Pago Globais</h2>
          <div className="space-y-2">
            {mpAccounts.map(acc => (
              <div key={acc.slot} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-semibold">
                  {acc.slot}
                </span>
                <span className="text-sm text-zinc-300 font-mono truncate flex-1">{acc.mp_user_id}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Ativa</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/checkout/gateways" className="bg-[#141414] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-colors">
          <p className="text-sm font-medium text-white mb-1">Configurar Gateways</p>
          <p className="text-xs text-zinc-500">Configure suas credenciais de pagamento</p>
        </Link>
        <Link href="/checkout/transactions" className="bg-[#141414] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-colors">
          <p className="text-sm font-medium text-white mb-1">Gerar PIX</p>
          <p className="text-xs text-zinc-500">Crie novas cobranças PIX</p>
        </Link>
      </div>

      {recent.length > 0 && (
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <h2 className="text-sm font-medium text-white">Transações Recentes</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recent.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tx.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                  {tx.status === 'paid' ? 'PAGO' : 'PENDENTE'}
                </span>
                <span className="text-sm text-zinc-300 font-mono flex-1 truncate">{tx.external_id ?? tx.id}</span>
                <span className="text-sm text-white font-medium">{fmt(tx.amount)}</span>
                <span className="text-xs text-zinc-600 capitalize">{tx.gateway}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
