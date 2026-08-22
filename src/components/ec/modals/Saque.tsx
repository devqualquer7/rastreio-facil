'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ArrowDownToLine, RefreshCw, Copy, Check, Download,
  Zap, AlertCircle, Minus, Plus, CheckCircle2
} from 'lucide-react'
import { useApp } from '@/lib/ec-store'
import { fmtBRL } from '@/lib/ec-utils'

// ── PIX estático builder ──────────────────────────────────────────────────────
function buildPixPayload(key: string, name: string, city: string): string {
  const safe = (s: string) => s.slice(0, 25).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const safeKey = key.replace(/\s/g, '').slice(0, 77)
  const safeName = (safe(name) || 'BENEFICIARIO').toUpperCase()
  const safeCity = (safe(city) || 'SAO PAULO').toUpperCase()
  function tlv(tag: string, value: string) { return `${tag}${String(value.length).padStart(2, '0')}${value}` }
  const merchantAccountInfo = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', safeKey)
  const body =
    tlv('00', '01') + tlv('26', merchantAccountInfo) + tlv('52', '0000') +
    tlv('53', '986') + tlv('58', 'BR') +
    tlv('59', safeName.slice(0, 25)) + tlv('60', safeCity.slice(0, 15)) +
    tlv('62', tlv('05', '***'))
  const full = body + '6304'
  let crc = 0xFFFF
  for (const c of full) {
    crc ^= c.charCodeAt(0) << 8
    for (let i = 0; i < 8; i++) { crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1; crc &= 0xFFFF }
  }
  return full + crc.toString(16).toUpperCase().padStart(4, '0')
}

// ── QR card individual ────────────────────────────────────────────────────────
function QRCard({ item, amount, paid }: { item: any; amount: number; paid?: boolean }) {
  const [dataUrl, setDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const code = item.pixCode || item.payload
    if (!code) return
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(code, { width: 280, margin: 2, color: { dark: '#000', light: '#fff' }, errorCorrectionLevel: 'M' })
        .then(url => { setDataUrl(url); setLoading(false) })
        .catch(() => setLoading(false))
    }).catch(() => setLoading(false))
  }, [item])

  function copy() {
    const code = item.pixCode || item.payload || ''
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function download() {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `pix-${item.index || 1}.png`
    a.click()
  }

  const isError = !item.ok && item.error

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={`flex flex-col items-center border rounded-2xl overflow-hidden ${
        isError
          ? 'bg-red-500/5 border-red-500/20'
          : 'bg-[#0c0c14] border-white/[0.08]'
      }`}>

      {/* Header */}
      <div className="w-full px-4 py-2.5 flex items-center justify-between border-b border-white/[0.06]">
        <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
          {item.index ? `#${item.index}` : 'PIX'}
        </div>
        {amount > 0 && <div className="text-[10px] font-mono text-emerald-400 font-bold">{fmtBRL(amount)}</div>}
      </div>

      {/* QR */}
      <div className="py-5 px-4 flex flex-col items-center gap-4 w-full">
        {isError ? (
          <div className="w-44 h-24 flex flex-col items-center justify-center gap-2">
            <AlertCircle size={20} className="text-red-400" />
            <div className="text-[10px] font-mono text-red-400 text-center px-2">{item.error}</div>
          </div>
        ) : loading ? (
          <div className="w-44 h-44 flex items-center justify-center">
            <RefreshCw size={20} className="animate-spin text-purple-400" />
          </div>
        ) : dataUrl ? (
          <div className="relative">
            <div className={`bg-white rounded-xl p-2.5 shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all ${paid ? 'opacity-40' : ''}`}>
              <img src={dataUrl} alt="QR PIX" className="w-44 h-44 block" style={{ imageRendering: 'pixelated' }} />
            </div>
            {paid && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl z-10 pointer-events-none">
                <div className="bg-emerald-500 rounded-2xl px-5 py-3 flex flex-col items-center gap-1 shadow-[0_0_24px_rgba(16,185,129,0.7)]">
                  <Check size={22} className="text-white" strokeWidth={3} />
                  <div className="text-white font-black text-sm tracking-[0.25em]">PAGO</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-44 h-44 flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5">
            <div className="text-[10px] font-mono text-red-400 text-center px-3">Erro ao gerar QR</div>
          </div>
        )}

        {!isError && (
          <div className="w-full text-[9px] font-mono text-zinc-700 break-all leading-relaxed max-h-10 overflow-hidden text-center">
            {(item.pixCode || item.payload || '').slice(0, 80)}
            {(item.pixCode || item.payload || '').length > 80 ? '…' : ''}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isError && (
        <div className="flex gap-2 w-full px-3 pb-3">
          <button onClick={copy}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-mono font-bold tracking-wider uppercase transition-all ${
              copied
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                : 'bg-purple-500/15 border border-purple-500/25 text-purple-300 hover:bg-purple-500/25'
            }`}>
            {copied ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
          </button>
          {dataUrl && (
            <button onClick={download}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 hover:text-zinc-300 transition">
              <Download size={11} />
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ── Gateway radio card ────────────────────────────────────────────────────────
function GatewayCard({ gw, selected, onSelect }: { gw: any; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left ${
        selected
          ? 'bg-emerald-500/12 border-emerald-500/40 shadow-[0_0_14px_rgba(16,185,129,0.18)]'
          : 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.14]'
      }`}>
      {/* Radio dot */}
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        selected ? 'border-emerald-400' : 'border-zinc-600'
      }`}>
        {selected && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold truncate transition-colors ${selected ? 'text-emerald-300' : 'text-zinc-300'}`}>
          {gw.label}
        </div>
        {gw.id === 'pix_estatico' && (
          <div className="text-[9px] font-mono text-zinc-600 mt-0.5">Escaneie · qualquer valor</div>
        )}
      </div>

      {selected && <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />}
    </button>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function SaqueModal() {
  const { closeModal, toast } = useApp()

  // Gateways
  const [allGateways, setAllGateways] = useState<any[]>([])
  const [selectedGw, setSelectedGw] = useState<string>('')
  const [loadingGw, setLoadingGw] = useState(true)

  // Form
  const [amount, setAmount] = useState('')
  const [quantity, setQuantity] = useState(1)

  // Results
  const [items, setItems] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)
  const [paidStatuses, setPaidStatuses] = useState<Record<string, string>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { loadGatewayInfo() }, [])

  // Poll for saque payment confirmations after generation
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (!done || items.length === 0) return

    const ids = items.filter(i => i.ok && i.externalId).map(i => i.externalId as string)
    if (ids.length === 0) return

    async function poll() {
      try {
        const r = await fetch('/api/ec/saque/status', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ externalIds: ids })
        })
        const d = await r.json()
        if (d.ok) setPaidStatuses(d.statuses)
      } catch {}
    }

    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [done, items])

  async function loadGatewayInfo() {
    setLoadingGw(true)
    try {
      const r = await fetch('/api/ec/gateways')
      const d = await r.json()
      if (!d.ok) return
      const configured: any[] = (d.gateways ?? []).filter((g: any) => g.configured)
      setAllGateways(configured)
      // Pre-select the active gateway if it's configured, otherwise first configured
      const activeId = d.activeGw as string
      const preselect = configured.find((g: any) => g.id === activeId) ? activeId : (configured[0]?.id ?? '')
      setSelectedGw(preselect)
    } catch {}
    finally { setLoadingGw(false) }
  }

  function adjustQty(delta: number) {
    setQuantity(q => Math.min(50, Math.max(1, q + delta)))
  }

  async function generate() {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!amt || amt <= 0) { toast('error', 'Informe um valor válido'); return }
    setGenerating(true)
    setDone(false)
    setItems([])
    try {
      const r = await fetch('/api/ec/pix/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: amt, quantity, description: `Saque R$ ${amt.toFixed(2)}`, gatewayId: selectedGw })
      })
      const d = await r.json()
      if (d.ok) {
        setItems(d.items)
        setDone(true)
        if (d.successCount < d.total) {
          toast('error', `${d.successCount}/${d.total} gerados — alguns falharam`)
        } else {
          toast('success', `${d.successCount} PIX gerado${d.successCount > 1 ? 's' : ''} com sucesso`)
        }
      } else {
        toast('error', d.error || 'Falha ao gerar')
      }
    } catch { toast('error', 'Erro de rede') }
    finally { setGenerating(false) }
  }

  function reset() { setItems([]); setDone(false); setAmount(''); setQuantity(1); setPaidStatuses({}) }

  // Derived
  const selectedGwInfo = allGateways.find(g => g.id === selectedGw)
  const isPixEstatico = selectedGw === 'pix_estatico'
  const pixEstaticoData = isPixEstatico
    ? { key: selectedGwInfo?.redacted?.pix_key || '', name: selectedGwInfo?.redacted?.beneficiary || '', city: selectedGwInfo?.redacted?.city || '' }
    : null
  const staticPayload = pixEstaticoData?.key ? buildPixPayload(pixEstaticoData.key, pixEstaticoData.name, pixEstaticoData.city) : ''
  const amountNum = parseFloat(amount.replace(',', '.')) || 0
  const noneConfigured = !loadingGw && allGateways.length === 0
  const hasDynamicGateways = allGateways.some(g => g.id !== 'pix_estatico')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-gradient-to-br from-[#0f0f1a] to-[#0a0a0f] border border-purple-500/20 rounded-3xl shadow-[0_0_60px_rgba(168,85,247,0.15)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-400/20 border border-emerald-500/30 flex items-center justify-center">
              <ArrowDownToLine size={16} className="text-emerald-400" />
            </div>
            <div>
              <div className="font-black text-base text-zinc-100">Saque</div>
              <div className="text-[10px] font-mono text-zinc-600">
                {loadingGw
                  ? 'Carregando…'
                  : selectedGwInfo
                    ? `via ${selectedGwInfo.label}`
                    : 'Nenhum gateway configurado'}
              </div>
            </div>
          </div>
          <button onClick={closeModal}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.08] flex items-center justify-center transition">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading */}
          {loadingGw && (
            <div className="py-20 flex items-center justify-center gap-3">
              <RefreshCw size={18} className="animate-spin text-purple-400" />
              <span className="text-xs font-mono text-zinc-500">Carregando gateways…</span>
            </div>
          )}

          {/* No gateways */}
          {noneConfigured && (
            <div className="py-16 flex flex-col items-center gap-3 px-6">
              <AlertCircle size={28} className="text-amber-400" />
              <div className="text-sm font-mono text-amber-400 text-center">Nenhum gateway configurado</div>
              <div className="text-[11px] font-mono text-zinc-600 text-center">
                Vá em Gateways PIX e configure pelo menos um gateway antes de gerar saques.
              </div>
            </div>
          )}

          {/* PIX Estático view */}
          {!loadingGw && !noneConfigured && isPixEstatico && (
            <div className="p-6 flex flex-col gap-6">
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em] text-center">
                PIX Estático — escaneie para pagar qualquer valor
              </div>
              {staticPayload ? (
                <div className="flex justify-center">
                  <QRCard item={{ pixCode: staticPayload, payload: staticPayload }} amount={0} />
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="text-[11px] font-mono text-red-400">Chave PIX não encontrada</div>
                  <div className="text-[10px] font-mono text-zinc-600 mt-1">Configure a chave PIX estática nas Gateways.</div>
                </div>
              )}

              {/* Gateway selector (only if more than one gateway) */}
              {allGateways.length > 1 && (
                <div>
                  <div className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2.5">
                    Gateway
                  </div>
                  <div className="flex flex-col gap-2">
                    {allGateways.map((gw: any) => (
                      <GatewayCard
                        key={gw.id}
                        gw={gw}
                        selected={selectedGw === gw.id}
                        onSelect={() => { setSelectedGw(gw.id); reset() }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results view */}
          {!loadingGw && !noneConfigured && !isPixEstatico && done && items.length > 0 && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  {items.filter(i => i.ok).length} de {items.length} gerados · {fmtBRL(amountNum)} cada
                </div>
                <button onClick={reset}
                  className="text-[10px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 transition">
                  <RefreshCw size={10} /> Novo saque
                </button>
              </div>

              <div className={`grid gap-3 ${items.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2 sm:grid-cols-3'}`}>
                {items.map((item) => (
                  <QRCard key={item.index} item={item} amount={amountNum} paid={!!(item.externalId && paidStatuses[item.externalId] === 'paid')} />
                ))}
              </div>
            </div>
          )}

          {/* Form view */}
          {!loadingGw && !noneConfigured && !isPixEstatico && !done && (
            <div className="p-6 space-y-5">
              {/* Amount */}
              <div>
                <div className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2">
                  Valor por PIX
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={e => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
                    placeholder="0,00"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-xl font-black text-zinc-100 outline-none focus:border-purple-500/50 transition-all tabular-nums"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <div className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2">
                  Quantidade de links
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => adjustQty(-5)}
                    className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] text-[10px] font-mono font-bold transition">
                    -5
                  </button>
                  <button onClick={() => adjustQty(-1)}
                    className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] flex items-center justify-center transition">
                    <Minus size={14} />
                  </button>
                  <div className="flex-1 text-center text-2xl font-black text-zinc-100 tabular-nums">{quantity}</div>
                  <button onClick={() => adjustQty(1)}
                    className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] flex items-center justify-center transition">
                    <Plus size={14} />
                  </button>
                  <button onClick={() => adjustQty(5)}
                    className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] text-[10px] font-mono font-bold transition">
                    +5
                  </button>
                </div>
                <div className="mt-2 text-[10px] font-mono text-zinc-700 text-center">máx. 50 por vez</div>
              </div>

              {/* Summary */}
              <AnimatePresence>
                {amountNum > 0 && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="flex items-center justify-between bg-purple-500/8 border border-purple-500/15 rounded-xl px-4 py-3">
                    <div className="text-[11px] font-mono text-zinc-500">Total a gerar</div>
                    <div className="text-base font-black text-purple-300 tabular-nums">
                      {quantity}× {fmtBRL(amountNum)} = {fmtBRL(amountNum * quantity)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Gateway selector */}
              {allGateways.length > 1 && (
                <div>
                  <div className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2.5">
                    Gateway
                  </div>
                  <div className="flex flex-col gap-2">
                    {allGateways.map((gw: any) => (
                      <GatewayCard
                        key={gw.id}
                        gw={gw}
                        selected={selectedGw === gw.id}
                        onSelect={() => { setSelectedGw(gw.id); reset() }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Single gateway pill (when only one configured dynamic gw) */}
              {hasDynamicGateways && allGateways.length === 1 && (
                <div className="flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                  <Zap size={12} className="text-emerald-400" />
                  <span className="text-[11px] font-mono text-zinc-400">Gateway:</span>
                  <span className="text-[11px] font-mono font-bold text-emerald-400">{selectedGwInfo?.label}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — generate button */}
        {!loadingGw && !noneConfigured && !isPixEstatico && !done && (
          <div className="px-6 py-4 border-t border-purple-500/10">
            <button
              onClick={generate}
              disabled={generating || !amount || !selectedGw}
              className="w-full py-4 rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-500 to-cyan-400 text-white font-black tracking-widest text-sm uppercase shadow-[0_0_25px_rgba(16,185,129,.3)] hover:shadow-[0_0_40px_rgba(16,185,129,.5)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
              {generating ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando {quantity} PIX…</>
              ) : (
                <><ArrowDownToLine size={16} /> Gerar {quantity} {quantity === 1 ? 'PIX' : 'PIX'} · {fmtBRL(amountNum || 0)}</>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
