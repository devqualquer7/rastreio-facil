'use client'
import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Receipt, RefreshCw, Search, Filter, FileText, FileSpreadsheet,
  Eye, RotateCcw, X, DollarSign, Clock, AlertTriangle,
} from 'lucide-react'
import { SectionTitle, Button, StatusPill } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { fmtBRL, fmtDate } from '@/lib/ec-utils'
import {
  getMethodInfo, methodLabel as mpMethodLabel, translateStatusDetail,
  isRejection, pendingActivity,
} from '@/lib/ec-mp-translate'

const STATUS_OPTIONS = ['todos', 'approved', 'pending', 'rejected', 'cancelled', 'refunded']
const PENDING = new Set(['pending', 'in_process', 'authorized', 'gerado'])

const REFUNDABLE  = new Set(['approved'])
const CANCELLABLE = new Set(['pending', 'in_process', 'authorized'])
function canRefund(status: string) { return REFUNDABLE.has(status) || CANCELLABLE.has(status) }

// hex → classes de tint com opacidade (borda/bg/texto) via inline style
function tint(hex: string, a: number) { return hex + Math.round(a * 255).toString(16).padStart(2, '0') }

// Chip de método (ícone + label + cor real do método) usado na tabela
function MethodChip({ typeId, methodId }: { typeId: string | null; methodId?: string | null }) {
  const m = getMethodInfo(methodId, typeId)
  const Icon = m.Icon
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold"
      style={{ color: m.color, borderColor: tint(m.color, 0.28), background: tint(m.color, 0.1) }}>
      <Icon size={12} />
      {m.label}
    </span>
  )
}
function feeRate(bruto: number, fee: number | null) {
  if (!fee || !bruto) return null
  return ((fee / bruto) * 100).toFixed(2) + '%'
}

// ── Stat box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="text-[9px] font-mono font-bold tracking-[0.3em] text-current/60 uppercase mb-1.5">{label}</div>
      <div className="text-lg font-black tabular-nums leading-none">{value}</div>
    </div>
  )
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function DetailModal({ sale, onClose }: { sale: any; onClose: () => void }) {
  const bruto   = Number(sale.amount || 0)
  const liquido = Number(sale.net_amount || 0)
  const fee     = sale.fee != null ? Number(sale.fee) : (bruto && liquido ? bruto - liquido : null)
  const rate    = feeRate(bruto, fee)
  const [emailVisible, setEmailVisible] = useState(false)

  const method    = getMethodInfo(sale.payment_method_id, sale.payment_type_id)
  const MIcon     = method.Icon
  const isPending = PENDING.has(sale.status)
  const rejected  = sale.status === 'rejected' || sale.status === 'cancelled'
  const showReject = rejected && isRejection(sale.status_detail)
  const activity  = isPending
    ? pendingActivity(sale.payment_type_id, sale.payment_method_id, sale.status_detail)
    : null

  const rows = [
    { k: 'ID MP',           v: sale.id },
    { k: 'MOTIVO / DETALHE', v: translateStatusDetail(sale.status_detail) },
    { k: 'DESCRIÇÃO',       v: sale.title || '—' },
    { k: 'REF. EXTERNA',    v: sale.external_reference || '—' },
    {
      k: 'E-MAIL PAG.',
      v: emailVisible
        ? (sale.payer_email || '—')
        : <span className="cursor-pointer text-zinc-500 hover:text-zinc-300 transition" onClick={() => setEmailVisible(true)}>
            {sale.payer_email ? '•••••••••••• (clique para ver)' : '—'}
          </span>
    },
    { k: 'CRIADO EM',       v: sale.created_at ? fmtDate(sale.created_at) : '—' },
    { k: 'APROVADO EM',     v: sale.date_approved ? fmtDate(sale.date_approved) : '—' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-sm bg-[#120009] border border-red-900/25 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/50 to-transparent" />
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.25em] text-red-400 uppercase mb-1">
              <Eye size={12} />
              DETALHES DO PAGAMENTO
            </div>
            <div className="text-[11px] font-mono text-zinc-500">ID: {sale.id}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition">
            <X size={15} />
          </button>
        </div>

        {/* Method + Status badges */}
        <div className="flex items-center gap-2 px-5 py-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold"
            style={{ color: method.color, borderColor: tint(method.color, 0.38), background: tint(method.color, 0.12) }}>
            <MIcon size={13} />
            {method.label.toUpperCase()}
          </div>
          <StatusPill status={sale.status} />
        </div>

        {/* Atividade — pagamento pendente (PIX aguardando / cartão em processamento) */}
        {activity && (
          <div className="mx-5 mb-4 rounded-2xl p-4 border"
            style={{ borderColor: tint(activity.color, 0.3), background: tint(activity.color, 0.08) }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Clock size={13} style={{ color: activity.color }} />
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase" style={{ color: activity.color }}>
                {activity.label}
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-400 leading-relaxed">{activity.detail}</div>
          </div>
        )}

        {/* Motivo da recusa — traduzido + código MP */}
        {showReject && (
          <div className="mx-5 mb-4 rounded-2xl p-4 border border-red-500/30 bg-red-500/[0.08]">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle size={13} className="text-red-400" />
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-red-400">Recusado</span>
            </div>
            <div className="text-sm font-mono font-bold text-red-300 mb-1">{translateStatusDetail(sale.status_detail)}</div>
            <div className="text-[10px] font-mono text-zinc-500 leading-relaxed">
              Código MP: <span className="text-zinc-400">{sale.status_detail}</span>
            </div>
          </div>
        )}

        {/* Financial summary */}
        <div className="mx-5 mb-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          <div className="text-[9px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-3 flex items-center gap-1.5">
            <DollarSign size={10} /> RESUMO FINANCEIRO
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-mono text-zinc-400">Valor bruto</span>
              <span className="text-sm font-mono font-bold text-zinc-200 tabular-nums">{fmtBRL(bruto)}</span>
            </div>
            {fee != null && fee > 0 && (
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-mono text-red-400">
                  Taxa MP{rate ? ` (${rate})` : ''}
                </span>
                <span className="text-sm font-mono font-bold text-red-400 tabular-nums">-{fmtBRL(fee)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-white/[0.06] flex justify-between items-baseline">
              <span className="text-xs font-mono font-bold tracking-widest text-zinc-300 uppercase">Valor Líquido</span>
              <span className="text-sm font-mono font-black text-emerald-400 tabular-nums">{fmtBRL(liquido || bruto)}</span>
            </div>
          </div>
          {sale.status === 'approved' && (
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-zinc-600">
              <MIcon size={11} />
              Pagamento à vista via {method.label}
            </div>
          )}
        </div>

        {/* Data rows */}
        <div className="px-5 pb-5 space-y-2">
          {rows.map(({ k, v }) => (
            <div key={k} className="flex justify-between items-start gap-3 text-[11px]">
              <span className="font-mono text-zinc-600 uppercase tracking-wider flex-shrink-0 pt-0.5" style={{ fontSize: '9px', letterSpacing: '0.2em' }}>{k}</span>
              <span className="font-mono text-zinc-300 text-right break-all">{v}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// ── Refund modal ──────────────────────────────────────────────────────────────
function RefundModal({ sale, slotName, onClose, onDone }: {
  sale: any; slotName: string; onClose: () => void; onDone: () => void
}) {
  const { toast } = useApp()
  const [loading, setLoading] = useState(false)
  const isCancel = CANCELLABLE.has(sale.status)

  async function confirm() {
    setLoading(true)
    try {
      const r = await fetch('/api/ec/extrato/refund', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payment_id: sale.id }),
      })
      const d = await r.json()
      if (d.ok) {
        toast('success', isCancel ? 'Pagamento cancelado com sucesso' : 'Estorno realizado com sucesso')
        onDone()
      } else {
        toast('error', d.error || 'Falha ao processar')
      }
    } catch { toast('error', 'Erro de rede') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-sm bg-[#120009] border border-red-900/25 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/50 to-transparent" />
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.25em] text-red-400 uppercase">
            <RotateCcw size={12} />
            {isCancel ? 'CANCELAR PAGAMENTO' : 'ESTORNAR PAGAMENTO'}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Account */}
          <div className="text-[11px] font-mono text-zinc-500">Usando conta: <span className="text-zinc-300">{slotName}</span></div>

          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-[11px] font-mono text-zinc-400 leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5 flex-shrink-0">⚠</span>
              <span>
                Pagamentos <span className="text-emerald-400 font-bold">aprovados</span> serão estornados integralmente.
                Pagamentos <span className="text-amber-400 font-bold">pendentes</span> serão cancelados.
                A ação é irreversível.
              </span>
            </div>
          </div>

          {/* Payment info */}
          <div>
            <div className="text-[9px] font-mono font-bold tracking-[0.25em] text-zinc-600 uppercase mb-1.5">ID DO PAGAMENTO</div>
            <div className="bg-white/[0.04] border border-red-500/30 rounded-xl px-4 py-2.5 font-mono text-sm text-zinc-200 tabular-nums">
              {sale.id}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-600">{sale.title}</span>
              <span className="text-zinc-400 font-bold tabular-nums">{fmtBRL(Number(sale.amount))}</span>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={confirm}
            disabled={loading}
            className="w-full py-3 rounded-xl font-mono text-xs font-bold tracking-[0.2em] uppercase transition-all
              bg-amber-500/90 hover:bg-amber-500 text-black disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <RotateCcw size={13} />}
            {loading ? 'PROCESSANDO…' : 'PROSSEGUIR'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function Extrato() {
  const { toast } = useApp()
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [detailSale, setDetailSale] = useState<any>(null)
  const [refundSale, setRefundSale] = useState<any>(null)
  const [slotName, setSlotName] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/ec/extrato')
      const d = await r.json()
      if (d.ok) {
        setSales(d.sales || [])
        if (d.sales?.length) setSlotName(d.sales[0].slot_name || '')
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
        s.external_reference?.toLowerCase().includes(q) ||
        String(s.id).includes(q)
      )
    }
    return true
  }), [sales, filter, search])

  const stats = useMemo(() => {
    const bruto   = sales.filter(s => s.status === 'approved').reduce((a, s) => a + Number(s.amount || 0), 0)
    const liquido = sales.filter(s => s.status === 'approved').reduce((a, s) => a + Number(s.net_amount || 0), 0)
    const taxa    = bruto - liquido
    const pendente = sales.filter(s => ['gerado', 'pending', 'in_process', 'authorized'].includes(s.status))
                         .reduce((a, s) => a + Number(s.amount || 0), 0)
    const aprovados = sales.filter(s => s.status === 'approved').length
    const recusados = sales.filter(s => s.status === 'rejected').length
    return { bruto, liquido, taxa, pendente, aprovados, recusados }
  }, [sales])

  // ── CSV ─────────────────────────────────────────────────────────────────────
  function exportCSV() {
    const rows = [
      ['ID', 'Título', 'Referência', 'Conta', 'Data', 'Bruto', 'Líquido', 'Método', 'Status'],
      ...filtered.map(s => [
        s.id,
        s.title ?? '',
        s.external_reference ?? s.ref ?? '',
        s.slot_name ?? '',
        new Date(s.created_at).toLocaleString('pt-BR'),
        String(Number(s.amount || 0).toFixed(2)),
        String(Number(s.net_amount || 0).toFixed(2)),
        mpMethodLabel(s.payment_method_id, s.payment_type_id),
        s.status ?? '',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `extrato-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('success', 'CSV exportado')
  }

  // ── Print/PDF ────────────────────────────────────────────────────────────────
  function exportPrint() {
    const rows = filtered.map(s =>
      `<tr>
        <td>${s.id}</td>
        <td>${s.title ?? ''}</td>
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
      <table><thead><tr><th>ID</th><th>Título</th><th>Conta</th><th>Data</th><th>Bruto</th><th>Líquido</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`
    const w = window.open('', '_blank')
    if (!w) { toast('error', 'Pop-up bloqueado'); return }
    w.document.write(html); w.document.close(); w.print()
  }

  const GRID = '2fr 1fr 1fr 1fr 0.9fr auto auto'

  return (
    <>
      <div>
        <SectionTitle
          icon={<Receipt size={18} />}
          title="Extrato MP"
          subtitle={`${sales.length} transações via API`}
          action={<>
            <Button variant="outline" size="md" icon={<FileSpreadsheet size={13} />} onClick={exportCSV}>CSV</Button>
            <Button variant="outline" size="md" icon={<FileText size={13} />} onClick={exportPrint}>PDF</Button>
            <Button variant="accent" size="md" icon={<RefreshCw size={13} />} onClick={load} loading={loading}>ATUALIZAR</Button>
          </>}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatBox label="Bruto"     value={fmtBRL(stats.bruto)}     color="bg-emerald-500/10 border-emerald-500/25 text-emerald-400" />
          <StatBox label="Líquido"   value={fmtBRL(stats.liquido)}   color="bg-emerald-500/10 border-emerald-500/20 text-emerald-300" />
          <StatBox label="Taxa MP"   value={`-${fmtBRL(stats.taxa)}`} color="bg-red-500/10 border-red-500/25 text-red-400" />
          <StatBox label="Pendente"  value={fmtBRL(stats.pendente)}  color="bg-amber-500/10 border-amber-500/25 text-amber-400" />
          <StatBox label="Aprovados" value={String(stats.aprovados)} color="bg-white/[0.04] border-white/10 text-zinc-100" />
          <StatBox label="Recusados" value={String(stats.recusados)} color="bg-red-500/10 border-red-500/25 text-red-400" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, conta, ID ou referência…"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono text-zinc-300 outline-none focus:border-red-600/40 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} className="text-zinc-600" />
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all ${
                  filter === s
                    ? 'bg-red-600/20 border border-red-600/40 text-red-300'
                    : 'bg-white/[0.03] border border-white/[0.06] text-zinc-600 hover:border-white/[0.12] hover:text-zinc-400'
                }`}>
                {s === 'todos' ? 'TODOS' : s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-gradient-to-br from-[#12000c] to-[#0a0006] border border-red-900/15 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-3">
              <RefreshCw size={18} className="animate-spin text-red-400" />
              <span className="text-xs font-mono text-zinc-500">Carregando…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-600 text-xs font-mono">Nenhuma transação encontrada</div>
          ) : (
            <div className="divide-y divide-red-900/[0.12]">
              {/* Header */}
              <div className="hidden md:grid px-5 py-3 text-[10px] font-mono font-bold tracking-widest text-zinc-600 uppercase border-b border-red-900/15"
                style={{ gridTemplateColumns: GRID, gap: '0 12px' }}>
                <div>Título / Referência</div>
                <div>Conta</div>
                <div>Data</div>
                <div>Valor</div>
                <div>Método</div>
                <div>Status</div>
                <div className="text-right">Ações</div>
              </div>

              {filtered.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  className="px-5 py-3.5 hover:bg-red-600/[0.04] transition"
                >
                  {/* Desktop layout */}
                  <div className="hidden md:grid items-center"
                    style={{ gridTemplateColumns: GRID, gap: '0 12px' }}>
                    {/* Title */}
                    <div>
                      <div className="text-sm font-mono text-zinc-300 truncate">{s.title}</div>
                      <div className="text-[10px] font-mono text-zinc-600 tabular-nums">
                        {s.external_reference || s.ref || `id-${s.id}`}
                      </div>
                    </div>
                    {/* Conta */}
                    <div className="text-[11px] font-mono text-zinc-500 truncate">{s.slot_name}</div>
                    {/* Data */}
                    <div className="text-[11px] font-mono text-zinc-600 tabular-nums">{fmtDate(s.created_at)}</div>
                    {/* Valor */}
                    <div>
                      <div className="text-sm font-mono font-bold text-zinc-200 tabular-nums">{fmtBRL(Number(s.amount))}</div>
                      {s.net_amount && s.status === 'approved' && (
                        <div className="text-[10px] font-mono text-zinc-600 tabular-nums">líq: {fmtBRL(Number(s.net_amount))}</div>
                      )}
                    </div>
                    {/* Método */}
                    <div><MethodChip typeId={s.payment_type_id} methodId={s.payment_method_id} /></div>
                    {/* Status */}
                    <div><StatusPill status={s.status} /></div>
                    {/* Ações */}
                    <div className="flex items-center gap-1.5 justify-end">
                      {canRefund(s.status) && (
                        <button
                          title="Estornar / Cancelar"
                          onClick={() => { setRefundSale(s); setSlotName(s.slot_name || '') }}
                          className="p-1.5 rounded-lg border border-transparent text-zinc-600 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      <button
                        title="Ver detalhes"
                        onClick={() => setDetailSale(s)}
                        className="p-1.5 rounded-lg border border-transparent text-zinc-600 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="md:hidden flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono text-zinc-300 truncate">{s.title}</div>
                      <div className="text-[10px] font-mono text-zinc-600 flex items-center gap-2">
                        {fmtDate(s.created_at)} <MethodChip typeId={s.payment_type_id} methodId={s.payment_method_id} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div>
                        <div className="text-sm font-mono font-bold text-zinc-200 tabular-nums text-right">{fmtBRL(Number(s.amount))}</div>
                        <StatusPill status={s.status} />
                      </div>
                      {canRefund(s.status) && (
                        <button
                          onClick={() => { setRefundSale(s); setSlotName(s.slot_name || '') }}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-amber-400 transition"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setDetailSale(s)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 transition"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
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

      {/* Modals */}
      <AnimatePresence>
        {detailSale && (
          <DetailModal
            key="detail"
            sale={detailSale}
            onClose={() => setDetailSale(null)}
          />
        )}
        {refundSale && (
          <RefundModal
            key="refund"
            sale={refundSale}
            slotName={slotName}
            onClose={() => setRefundSale(null)}
            onDone={() => { setRefundSale(null); load() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
