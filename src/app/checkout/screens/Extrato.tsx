'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Receipt, RefreshCw, Search, Filter } from 'lucide-react'
import { SectionTitle, Button, StatusPill } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { fmtBRL, fmtDate } from '@/lib/ec-utils'

const STATUS_OPTIONS = ['todos', 'approved', 'pending', 'rejected', 'cancelled', 'refunded']

export function Extrato() {
  const { toast } = useApp()
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/ec/sales/list', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 1000 })
      })
      const d = await r.json()
      if (d.ok) setSales(d.sales || [])
    } catch { toast('error', 'Falha ao carregar extrato') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = sales.filter(s => {
    if (filter !== 'todos' && s.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        s.title?.toLowerCase().includes(q) ||
        s.slot_name?.toLowerCase().includes(q) ||
        s.ref?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const totalApproved = filtered.filter(s => s.status === 'approved').reduce((a, s) => a + Number(s.amount || 0), 0)
  const totalNet = filtered.filter(s => s.status === 'approved').reduce((a, s) => a + Number(s.net_amount || 0), 0)

  return (
    <div>
      <SectionTitle
        icon={<Receipt size={18} />}
        title="Extrato MP"
        subtitle="Histórico completo de transações"
        action={
          <Button variant="outline" size="md" icon={<RefreshCw size={13} />} onClick={load} loading={loading}>
            ATUALIZAR
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título, slot ou ref..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono text-zinc-300 outline-none focus:border-purple-500/40 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={13} className="text-zinc-600" />
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all ${
                filter === s
                  ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                  : 'bg-white/[0.03] border border-white/[0.06] text-zinc-600 hover:border-white/[0.12] hover:text-zinc-400'
              }`}>
              {s === 'todos' ? 'TODOS' : s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {filtered.some(s => s.status === 'approved') && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <div className="text-[10px] font-mono text-emerald-600 uppercase tracking-widest mb-1">Total Bruto</div>
            <div className="text-xl font-black text-emerald-400 tabular-nums">{fmtBRL(totalApproved)}</div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
            <div className="text-[10px] font-mono text-purple-600 uppercase tracking-widest mb-1">Total Líquido</div>
            <div className="text-xl font-black text-purple-400 tabular-nums">{fmtBRL(totalNet)}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f] border border-purple-500/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-3">
            <RefreshCw size={18} className="animate-spin text-purple-400" />
            <span className="text-xs font-mono text-zinc-500">Carregando…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-600 text-xs font-mono">Nenhuma transação encontrada</div>
        ) : (
          <div className="divide-y divide-purple-500/[0.06]">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] px-5 py-3 text-[10px] font-mono font-bold tracking-widest text-zinc-600 uppercase border-b border-purple-500/10">
              <div>Título / Referência</div>
              <div>Conta</div>
              <div>Data</div>
              <div>Valor</div>
              <div>Status</div>
            </div>
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="px-5 py-3.5 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-1 md:gap-0 items-center hover:bg-purple-500/[0.03] transition">
                <div>
                  <div className="text-sm font-mono text-zinc-300 truncate">{s.title}</div>
                  <div className="text-[10px] font-mono text-zinc-600 tabular">#{s.slot} · {s.ref || `id-${s.id}`}</div>
                </div>
                <div className="text-[11px] font-mono text-zinc-500 truncate">{s.slot_name}</div>
                <div className="text-[11px] font-mono text-zinc-600 tabular">{fmtDate(s.created_at)}</div>
                <div>
                  <div className="text-sm font-mono font-bold text-zinc-200 tabular">{fmtBRL(Number(s.amount))}</div>
                  {s.net_amount && s.status === 'approved' && (
                    <div className="text-[10px] font-mono text-zinc-600 tabular">líq: {fmtBRL(Number(s.net_amount))}</div>
                  )}
                </div>
                <div><StatusPill status={s.status} /></div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {!loading && (
        <div className="text-center mt-4 text-[10px] font-mono text-zinc-700">
          {filtered.length} transação(ões) · {sales.length} total
        </div>
      )}
    </div>
  )
}
