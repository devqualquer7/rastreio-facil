'use client'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ArrowDownToLine, RefreshCw, QrCode, Copy, Check, Download,
  Zap, AlertCircle, ChevronRight, Minus, Plus
} from 'lucide-react'
import { useApp } from '@/lib/ec-store'
import { fmtBRL } from '@/lib/ec-utils'

// ── PIX estático builder ──────────────────────────────────────────────────────
function buildPixPayload(key: string, name: string, city: string): string {
  const safe = (s: string) => s.slice(0, 25).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const safeKey = key.replace(/\s/g, '').slice(0, 77)
  const safeName = (safe(name) || 'BENEFICIARIO').toUpperCase()
  const safeCity = (safe(city) || 'SAO PAULO').toUpperCase()
  function tlv(tag: string, value: string) { return `${tag}${String(value.length).padStart(2,'0')}${value}` }
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
function QRCard({ item, amount, gateway }: { item: any; amount: number; gateway: string }) {
  const [dataUrl, setDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!item.pixCode && !item.payload) return
    const code = item.pixCode || item.payload
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center bg-[#0c0c14] border border-white/[0.08] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="w-full px-4 py-2.5 flex items-center justify-between border-b border-white/[0.06]">
        <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
          {item.index ? `#${item.index}` : 'PIX Estático'}
        </div>
        <div className="text-[10px] font-mono text-emerald-400 font-bold">{fmtBRL(amount)}</div>
      </div>

      {/* QR */}
      <div className="py-5 px-4 flex flex-col items-center gap-4">
        {loading ? (
          <div className="w-44 h-44 flex items-center justify-center">
            <RefreshCw size={20} className="animate-spin text-purple-400" />
          </div>
        ) : dataUrl ? (
          <div className="bg-white rounded-xl p-2.5 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <img src={dataUrl} alt="QR PIX" className="w-44 h-44 block" style={{ imageRendering: 'pixelated' }} />
          </div>
        ) : (
          <div className="w-44 h-44 flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5">
            <div className="text-[10px] font-mono text-red-400 text-center px-3">Erro ao gerar QR</div>
          </div>
        )}

        {/* Copia e cola truncado */}
        <div className="w-full text-[9px] font-mono text-zinc-700 break-all leading-relaxed max-h-10 overflow-hidden text-center">
          {(item.pixCode || item.payload || '').slice(0, 80)}{(item.pixCode || item.payload || '').length > 80 ? '…' : ''}
        </div>
      </div>

      {/* Actions */}
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
    </motion.div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function SaqueModal() {
  const { closeModal, toast } = useApp()

  // Gateway info
  const [activeGw, setActiveGw] = useState<string>('')
  const [gwLabel, setGwLabel] = useState('')
  const [pixEstatico, setPixEstatico] = useState<{ key: string; name: string; city: string } | null>(null)
  const [loadingGw, setLoadingGw] = useState(true)

  // Form
  const [amount, setAmount] = useState('')
  const [quantity, setQuantity] = useState(1)

  // Results
  const [items, setItems] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    loadGatewayInfo()
  }, [])

  async function loadGatewayInfo() {
    setLoadingGw(true)
    try {
      const r = await fetch('/api/ec/gateways')
      const d = await r.json()
      if (!d.ok) return
      const active = d.activeGw as string
      setActiveGw(active)
      const gw = d.gateways?.find((g: any) => g.id === active)
      setGwLabel(gw?.label || active)

      if (active === 'pix_estatico') {
        // pix_estatico fields are not secret so redacted == actual values
        setPixEstatico({
          key: gw?.redacted?.pix_key || '',
          name: gw?.redacted?.beneficiary || '',
          city: gw?.redacted?.city || '',
        })
      }
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
        body: JSON.stringify({ amount: amt, quantity, description: `Saque R$ ${amt.toFixed(2)}` })
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

  function reset() { setItems([]); setDone(false); setAmount(''); setQuantity(1) }

  // Static PIX payload
  const staticPayload = pixEstatico?.key ? buildPixPayload(pixEstatico.key, pixEstatico.name, pixEstatico.city) : ''

  const amountNum = parseFloat(amount.replace(',', '.')) || 0

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
                {loadingGw ? 'Carregando…' : activeGw ? `via ${gwLabel}` : 'Nenhum gateway ativo'}
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
          {loadingGw ? (
            <div className="py-20 flex items-center justify-center gap-3">
              <RefreshCw size={18} className="animate-spin text-purple-400" />
              <span className="text-xs font-mono text-zinc-500">Carregando gateway…</span>
            </div>

          ) : !activeGw ? (
            <div className="py-16 flex flex-col items-center gap-3 px-6">
              <AlertCircle size={28} className="text-amber-400" />
              <div className="text-sm font-mono text-amber-400 text-center">Nenhum gateway configurado</div>
              <div className="text-[11px] font-mono text-zinc-600 text-center">
                Vá em Gateways PIX e configure e ative um gateway antes de gerar saques.
              </div>
            </div>

          ) : activeGw === 'pix_estatico' ? (
            /* ── PIX ESTÁTICO ── */
            <div className="p-6 flex flex-col items-center gap-5">
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em] text-center">
                PIX Estático — escaneie para pagar qualquer valor
              </div>
              {staticPayload ? (
                <QRCard
                  item={{ pixCode: staticPayload, payload: staticPayload }}
                  amount={0}
                  gateway="pix_estatico"
                />
              ) : (
                <div className="py-8 text-center">
                  <div className="text-[11px] font-mono text-red-400">Chave PIX não encontrada</div>
                  <div className="text-[10px] font-mono text-zinc-600 mt-1">Configure a chave PIX estática nas Gateways.</div>
                </div>
              )}
            </div>

          ) : done && items.length > 0 ? (
            /* ── RESULTS ── */
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
                  <QRCard key={item.index} item={item} amount={amountNum} gateway={activeGw} />
                ))}
              </div>
            </div>

          ) : (
            /* ── FORM ── */
            <div className="p-6 space-y-6">
              {/* Active gateway pill */}
              <div className="flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                <Zap size={12} className="text-emerald-400" />
                <span className="text-[11px] font-mono text-zinc-400">Gateway ativa:</span>
                <span className="text-[11px] font-mono font-bold text-emerald-400">{gwLabel}</span>
              </div>

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
              {amountNum > 0 && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between bg-purple-500/8 border border-purple-500/15 rounded-xl px-4 py-3">
                  <div className="text-[11px] font-mono text-zinc-500">Total a gerar</div>
                  <div className="text-base font-black text-purple-300 tabular-nums">
                    {quantity}× {fmtBRL(amountNum)} = {fmtBRL(amountNum * quantity)}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Footer — generate button (only in form state) */}
        {!loadingGw && activeGw && activeGw !== 'pix_estatico' && !done && (
          <div className="px-6 py-4 border-t border-purple-500/10">
            <button
              onClick={generate}
              disabled={generating || !amount}
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
