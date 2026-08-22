'use client'
import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Receipt, RefreshCw, Search, Filter, FileText, FileSpreadsheet } from 'lucide-react'
import { SectionTitle, Button, StatusPill } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { fmtBRL, fmtDate } from '@/lib/ec-utils'

const STATUS_OPTIONS = ['todos', 'approved', 'pending', 'rejected', 'cancelled', 'refunded']

function StatBox({
  label, value, sub, color
}: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="text-[9px] font-mono font-bold tracking-[0.3em] text-current/60 uppercase mb-1.5">{label}</div>
      <div className="text-lg font-black tabular-nums leading-none">{value}</div>
      {sub && <div className="text-[10px] font-mono mt-1 text-current/50">{sub}</div>}
    </div>
  )
}

export function Extrato() {
  const { toast } = useApp()
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/ec/extrato')
      const d = await r.json()
      if (d.ok) {
        setSales(d.sales || [])
      } else {
        toast('error', d.error || 'Falha ao carregar extrato')
      }
    } catch { toast('error', 'Falha ao carregar extrato') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => sales.filter(s => {
    if (filter !== 'todos' && s.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        s.title?.toLowerCase().includes(q) ||
        s.slot_name?.toLowerCase().includes(q) ||
        s.ref?.toLowerCase().includes(q) ||
        s.external_reference?.toLowerCase().includes(q)
      )
    }
    return true
  }), [sales, filter, search])

  const stats = useMemo(() => {
    const bruto   = sales.filter(s => s.status === 'approved').reduce((a, s) => a + Number(s.amount || 0), 0)
    const liquido = sales.filter(s => s.status === 'approved').reduce((a, s) => a + Number(s.net_amount || 0), 0)
    const taxa    = bruto - liquido
    const pendente = sales.filter(s => ['gerado','pending','in_process','authorized'].includes(s.status))
                         .reduce((a, s) => a + Number(s.amount || 0), 0)
    const aprovados = sales.filter(s => s.status === 'approved').length
    const recusados = sales.filter(s => s.status === 'rejected').length
    return { bruto, liquido, taxa, pendente, aprovados, recusados }
  }, [sales])

  // ── Export CSV ─────────────────────────────────────────────────────────────
  function exportCSV() {
    const rows = [
      ['Título', 'Referência', 'Conta', 'Data', 'Bruto', 'Líquido', 'Status', 'Método'],
      ...filtered.map(s => [
        s.title ?? '',
        s.external_reference ?? s.ref ?? '',
        s.slot_name ?? '',
        new Date(s.created_at).toLocaleString('pt-BR'),
        String(Number(s.amount || 0).toFixed(2)),
        String(Number(s.net_amount || 0).toFixed(2)),
        s.status ?? '',
        s.payment_type_id ?? '',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `extrato-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast('success', 'CSV exportado')
  }

  // ── Export print/PDF ────────────────────────────────────────────────────────
  function exportPrint() {
    const rows = filtered.map(s =>
      `<tr>
        <td>${s.title ?? ''}</td>
        <td>${s.external_reference ?? s.ref ?? ''}</td>
        <td>${s.slot_name ?? ''}</td>
        <td>${new Date(s.created_at).toLocaleString('pt-BR')}</td>
        <td>R$ ${Number(s.amount || 0).toFixed(2)}</td>
        <td>R$ ${Number(s.net_amount || 0).toFixed(2)}</td>
        <td>${s.status ?? ''}</td>
      </tr>`
    ).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Extrato MP</title>
      <style>body{font-family:monospace;font-size:11px;padding:20px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
      th{background:#f0f0f0;font-weight:bold}
      h2{margin-bottom:12px}</style></head>
      <body><h2>Extrato MP — ${new Date().toLocaleDateString('pt-BR')}</h2>
      <table><thead><tr><th>Título</th><th>Referência</th><th>Conta</th><th>Data</th><th>Bruto</th><th>Líquido</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`
    const w = window.open('', '_blank')
    if (!w) { toast('error', 'Pop-up bloqueado'); return }
    w.document.write(html); w.document.close(); w.print()
  }

  return (
    <div>
      <SectionTitle
        icon={<Receipt size={18} />}
        title="Extrato MP"
        subtitle={`${sales.length} transações via API`}
        action={<>
          <Button variant="outline" size="md" icon={<FileSpreadsheet size={13} />} onClick={exportCSV}>
            CSV
          </Button>
          <Button variant="outline" size="md" icon={<FileText size={13} />} onClick={exportPrint}>
            PDF
          </Button>
          <Button variant="outline" size="md" icon={<RefreshCw size={13} />} onClick={load} loading={loading}>
            ATUALIZAR
          </Button>
        </>}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatBox label="Bruto"     value={fmtBRL(stats.bruto)}    color="bg-emerald-500/10 border-emerald-500/20 text-emerald-400" />
        <StatBox label="Líquido"   value={fmtBRL(stats.liquido)}  color="bg-cyan-500/10 border-cyan-500/20 text-cyan-400" />
        <StatBox label="Taxa MP"   value={fmtBRL(stats.taxa)}     color="bg-amber-500/10 border-amber-500/20 text-amber-400" />
        <StatBox label="Pendente"  value={fmtBRL(stats.pendente)} color="bg-blue-500/10 border-blue-500/20 text-blue-400" />
        <StatBox label="Aprovados" value={String(stats.aprovados)} color="bg-purple-500/10 border-purple-500/20 text-purple-400" />
        <StatBox label="Recusados" value={String(stats.recusados)} color="bg-red-500/10 border-red-500/20 text-red-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título, conta ou referência…"
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
                transition={{ delay: Math.min(i * 0.015, 0.3) }}
                className="px-5 py-3.5 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-1 md:gap-0 items-center hover:bg-purple-500/[0.03] transition">
                <div>
                  <div className="text-sm font-mono text-zinc-300 truncate">{s.title}</div>
                  <div className="text-[10px] font-mono text-zinc-600 tabular">
                    {s.external_reference || s.ref || `id-${s.id}`}
                  </div>
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
          {filtered.length} de {sales.length} transações
        </div>
      )}
    </div>
  )
}
