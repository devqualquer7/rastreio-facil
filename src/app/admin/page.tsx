'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Users, Activity, ArrowRight, Clock } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ clients: 0, codes: 0, events: 0 })
  const [recentCodes, setRecentCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/clients').then(r => r.json()),
      fetch('/api/tracking-codes').then(r => r.json()),
    ]).then(([clients, codes]) => {
      const clientList = Array.isArray(clients) ? clients : []
      const codeList = Array.isArray(codes) ? codes : []
      let totalEvents = 0
      codeList.forEach((c: any) => totalEvents += c.events?.length || 0)
      setStats({ clients: clientList.length, codes: codeList.length, events: totalEvents })
      setRecentCodes(codeList.slice(0, 5))
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Clientes', value: stats.clients, icon: Users, href: '/admin/clients' },
    { label: 'Rastreios', value: stats.codes, icon: Package, href: '/admin/tracking-codes' },
    { label: 'Eventos', value: stats.events, icon: Activity, href: '/admin/tracking-codes' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Visão geral do sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{card.label}</span>
                <card.icon className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </div>
              <span className="text-3xl font-bold text-white">
                {loading ? '—' : card.value}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent tracking codes */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">Rastreios Recentes</h2>
          <Link href="/admin/tracking-codes" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : recentCodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
              <Package className="w-5 h-5 text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-400 font-medium">Nenhum rastreio</p>
              <p className="text-xs text-zinc-600 mt-0.5">Crie o primeiro para começar</p>
            </div>
            <Link href="/admin/tracking-codes" className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors">
              Criar rastreio
            </Link>
          </div>
        ) : (
          <div>
            {recentCodes.map((tc: any, i) => (
              <Link key={tc.id} href={`/admin/tracking-codes/${tc.code}`}>
                <div className={`flex items-center justify-between px-6 py-3.5 hover:bg-white/[0.02] transition-colors ${i < recentCodes.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                      <Package className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-mono font-medium text-zinc-200">{tc.code}</p>
                      <p className="text-xs text-zinc-600">{tc.client?.name || 'Sem cliente'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                      <Clock className="w-3 h-3" />
                      {new Date(tc.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      tc.events?.length > 0
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-white/[0.04] text-zinc-600'
                    }`}>
                      {tc.events?.length || 0} eventos
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/admin/tracking-codes">
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors group flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Novo Rastreio</p>
              <p className="text-xs text-zinc-500 mt-0.5">Criar código de rastreamento</p>
            </div>
            <Package className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
        </Link>
        <Link href="/admin/clients">
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors group flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Novo Cliente</p>
              <p className="text-xs text-zinc-500 mt-0.5">Cadastrar um cliente</p>
            </div>
            <Users className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  )
}
