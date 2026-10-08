'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Zap, X, Copy, ExternalLink, CheckCircle2, RefreshCw,
  DollarSign, FileText, CreditCard, Landmark, Building2, Wallet,
  ChevronDown, ChevronUp, QrCode, AlertTriangle
} from 'lucide-react'
import { ModalBackdrop, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { fmtBRL } from '@/lib/ec-utils'

type Step = 'form' | 'result'

type PixResult =
  | { ok: true; code: string; qrBase64: string; via?: 'server' | 'desktop' }
  | { ok: false; reason: string; message: string }

const ALL_METHOD_IDS = ['credit_card', 'debit_card', 'pix', 'boleto', 'loterica', 'prepaid_card']

const PAYMENT_OPTIONS = [
  {
    id: 'credit_card',
    label: 'Cartão de Crédito',
    desc: 'Visa, Master, Elo, Amex…',
    icon: CreditCard,
    color: 'text-sky-400',
  },
  {
    id: 'debit_card',
    label: 'Cartão de Débito',
    desc: 'Débito em conta bancária',
    icon: Landmark,
    color: 'text-blue-400',
  },
  {
    id: 'pix',
    label: 'Pix',
    desc: 'Transferência instantânea',
    icon: Zap,
    color: 'text-emerald-400',
  },
  {
    id: 'boleto',
    label: 'Boleto Bancário',
    desc: 'Paga em qualquer banco',
    icon: FileText,
    color: 'text-amber-400',
  },
  {
    id: 'loterica',
    label: 'Lotérica / Caixa',
    desc: 'Pagamento em lotéricas',
    icon: Building2,
    color: 'text-orange-400',
  },
  {
    id: 'prepaid_card',
    label: 'Cartão Pré-pago',
    desc: 'Crédito pré-carregado',
    icon: Wallet,
    color: 'text-teal-400',
  },
]

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
        enabled ? 'bg-emerald-500' : 'bg-white/10'
      }`}
      aria-pressed={enabled}>
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
          enabled ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export function GenerateModal() {
  const { closeModal, activeCred, toast } = useApp()
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState<false | 'link' | 'pix'>(false)
  const [pix, setPix] = useState<PixResult | null>(null)
  const [pixCopied, setPixCopied] = useState(false)
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<{ link?: string; ref?: string; amount?: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [paid, setPaid] = useState<{ amount: number; method: string | null } | null>(null)
  const [selectedMethods, setSelectedMethods] = useState<string[]>(ALL_METHOD_IDS)
  const [methodsOpen, setMethodsOpen] = useState(false)

  // Load default title on mount
  useEffect(() => {
    fetch('/api/ec/settings')
      .then(r => r.json())
      .then(d => { if (d.ok && d.settings?.default_title) setTitle(d.settings.default_title) })
      .catch(() => {})
  }, [])

  function toggleMethod(id: string) {
    setSelectedMethods(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    setSelectedMethods(prev => prev.length === ALL_METHOD_IDS.length ? [] : [...ALL_METHOD_IDS])
  }

  // withPix: além do link, pede ao app desktop o Pix copia e cola já pronto
  async function generate(withPix = false) {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!amt || amt <= 0) { toast('error', 'Valor inválido'); return }
    if (!title.trim()) { toast('error', 'Título obrigatório'); return }
    if (selectedMethods.length === 0) { toast('error', 'Selecione ao menos um método de pagamento'); return }
    setLoading(withPix ? 'pix' : 'link')
    try {
      const r = await fetch('/api/ec/sales/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          title: title.trim(),
          email: email.trim() || undefined,
          selectedMethods,
          autoPix: withPix,
        })
      })
      const d = await r.json()
      if (d.ok) {
        setResult({ link: d.link, ref: d.ref, amount: amt })
        setPix(d.pix ?? null)
        setStep('result')
        if (d.pix && !d.pix.ok) {
          toast(d.pix.reason === 'rejected' ? 'error' : 'info',
            d.pix.reason === 'rejected' ? `Mercado Pago recusou o Pix: ${d.pix.message}` : 'Não deu para gerar o Pix. O link está pronto.')
        }
      } else {
        toast('error', d.error || 'Falha ao gerar link')
      }
    } catch { toast('error', 'Erro de rede') }
    finally { setLoading(false) }
  }

  function copy() {
    if (!result?.link) return
    navigator.clipboard.writeText(result.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyPix() {
    if (!pix?.ok) return
    navigator.clipboard.writeText(pix.code)
    setPixCopied(true)
    setTimeout(() => setPixCopied(false), 2000)
  }

  // Enquanto a janela mostra o link/Pix, pergunta ao servidor se já foi pago.
  // É só leitura; ao detectar, dispara o tick que registra a venda e as notificações.
  useEffect(() => {
    if (step !== 'result' || !result?.ref || paid) return
    let alive = true
    const started = Date.now()
    const timer = setInterval(async () => {
      if (Date.now() - started > 30 * 60_000) { clearInterval(timer); return }   // desiste após 30 min
      try {
        const r = await fetch('/api/ec/sales/status', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ref: result.ref }),
        })
        const d = await r.json()
        if (alive && d.ok && d.paid) {
          setPaid({ amount: Number(d.amount) || result.amount || 0, method: d.method ?? null })
          fetch('/api/ec/poll/tick', { method: 'POST' }).catch(() => {})
        }
      } catch { /* tenta de novo no próximo ciclo */ }
    }, 4000)
    return () => { alive = false; clearInterval(timer) }
  }, [step, result?.ref, paid])

  function reset() {
    setPaid(null)
    setPix(null)
    setPixCopied(false)
    setStep('form')
    setAmount('')
    setEmail('')
    setResult(null)
    setCopied(false)
    // Keep title + selectedMethods for convenience
  }

  const allSelected = selectedMethods.length === ALL_METHOD_IDS.length
  const noneSelected = selectedMethods.length === 0

  return (
    <ModalBackdrop onClose={closeModal}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative bg-gradient-to-b from-[#0d0d18]/98 to-[#09090f]/98 backdrop-blur-2xl border border-red-500/20 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(255,43,74,.2)]">

        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
        {/* BG orbs */}
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-red-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-rose-400/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 pt-6 pb-5 border-b border-red-500/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-700 to-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(255,43,74,.4)]">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <div className="font-black text-sm text-zinc-100 tracking-wide uppercase">Gerar Link</div>
              <div className="text-xs font-mono text-zinc-500 mt-0.5">
                {activeCred ? `Slot #${activeCred.slot} · ${activeCred.name}` : 'Sem conta ativa'}
              </div>
            </div>
          </div>
          <button onClick={closeModal} className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.06] flex items-center justify-center transition">
            <X size={16} />
          </button>
        </div>

        <div className="relative p-6 max-h-[80vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!activeCred?.connected && (
                  <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[13px] font-mono">
                    ⚠ Nenhuma conta ativa conectada. Ative um slot em Credenciais.
                  </div>
                )}

                <div className="space-y-4">
                  {/* Valor */}
                  <div>
                    <div className="text-xs font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase mb-2 flex items-center gap-1.5">
                      <DollarSign size={11} /> Valor (R$)
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">R$</span>
                      <input
                        type="text" inputMode="decimal" value={amount}
                        onChange={e => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
                        placeholder="0,00"
                        onKeyDown={e => e.key === 'Enter' && !loading && generate()}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 focus:bg-red-500/[0.04] transition-all"
                      />
                    </div>
                  </div>

                  {/* Título */}
                  <div>
                    <div className="text-xs font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase mb-2 flex items-center gap-1.5">
                      <FileText size={11} /> Título
                    </div>
                    <input
                      type="text" value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Ex: Produto / Serviço"
                      maxLength={100}
                      onKeyDown={e => e.key === 'Enter' && !loading && generate()}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 focus:bg-red-500/[0.04] transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <div className="text-xs font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase mb-2">
                      Email do comprador (opcional)
                    </div>
                    <input
                      type="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="comprador@email.com"
                      onKeyDown={e => e.key === 'Enter' && !loading && generate()}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 focus:bg-red-500/[0.04] transition-all"
                    />
                  </div>

                  {/* Métodos de Pagamento */}
                  <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                    {/* Accordion header */}
                    <button
                      type="button"
                      onClick={() => setMethodsOpen(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-2">
                        <CreditCard size={11} className="text-red-400" />
                        <span className="text-xs font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase">
                          Métodos de Pagamento
                        </span>
                        {!allSelected && (
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 tracking-wider">
                            {selectedMethods.length}/{ALL_METHOD_IDS.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); toggleAll() }}
                          className="text-[11px] font-mono font-bold tracking-widest text-red-400/70 hover:text-red-300 transition uppercase px-2 py-1 rounded-lg hover:bg-red-500/10">
                          {allSelected ? 'DESMARCAR' : 'MARCAR'} TODOS
                        </button>
                        {methodsOpen ? (
                          <ChevronUp size={13} className="text-zinc-500" />
                        ) : (
                          <ChevronDown size={13} className="text-zinc-500" />
                        )}
                      </div>
                    </button>

                    {/* Accordion body */}
                    <AnimatePresence>
                      {methodsOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden">
                          <div className="border-t border-white/[0.05] divide-y divide-white/[0.04]">
                            {PAYMENT_OPTIONS.map(opt => {
                              const Icon = opt.icon
                              const enabled = selectedMethods.includes(opt.id)
                              return (
                                <div key={opt.id}
                                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                                  onClick={() => toggleMethod(opt.id)}>
                                  <div className={`w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shrink-0`}>
                                    <Icon size={12} className={opt.color} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-mono text-zinc-300 leading-none mb-0.5">{opt.label}</div>
                                    <div className="text-[11px] font-mono text-zinc-500">{opt.desc}</div>
                                  </div>
                                  <Toggle enabled={enabled} onChange={() => toggleMethod(opt.id)} />
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {noneSelected && (
                      <div className="px-4 pb-3 text-xs font-mono text-red-400/80">
                        ⚠ Selecione ao menos um método
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={() => generate(false)} disabled={!!loading || !activeCred?.connected || noneSelected}
                      className="py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-zinc-200 font-black tracking-wide text-xs uppercase hover:bg-white/[0.08] hover:border-red-500/40 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {loading === 'link'
                        ? <><RefreshCw size={14} className="animate-spin" /> Gerando…</>
                        : <><Sparkles size={14} /> Gerar Link</>}
                    </button>
                    <button onClick={() => generate(true)} disabled={!!loading || !activeCred?.connected}
                      className="py-3.5 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-300 text-white font-black tracking-wide text-xs uppercase shadow-[0_0_25px_rgba(16,185,129,.4)] hover:shadow-[0_0_40px_rgba(16,185,129,.55)] active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {loading === 'pix'
                        ? <><RefreshCw size={14} className="animate-spin" /> Gerando Pix…</>
                        : <><QrCode size={14} /> Gerar Pix</>}
                    </button>
                  </div>
                  {loading === 'pix' && (
                    <div className="text-xs font-mono text-zinc-400 text-center">
                      Gerando o Pix no checkout do Mercado Pago… leva uns 10 segundos.
                    </div>
                  )}
                </div>
              </motion.div>
            ) : paid ? (
              <motion.div key="paid" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }} className="text-center py-6">
                <div className="relative w-24 h-24 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/40 blur-2xl animate-pulse" />
                  <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-500/40 to-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={48} className="text-emerald-400" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="font-black text-2xl text-emerald-400 tracking-tight">PAGAMENTO CONFIRMADO</div>
                <div className="font-black text-4xl text-zinc-100 tabular-nums mt-3">{fmtBRL(paid.amount)}</div>
                <div className="text-xs font-mono text-zinc-400 mt-2">
                  {paid.method === 'bank_transfer' || paid.method === 'pix' ? 'Pago via Pix'
                    : paid.method === 'credit_card' ? 'Pago no cartão de crédito'
                    : paid.method === 'debit_card' ? 'Pago no cartão de débito' : 'Pago'}
                  {' · Ref '}{result?.ref}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-8">
                  <button onClick={reset}
                    className="py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-zinc-200 font-bold text-xs tracking-widest uppercase hover:bg-white/[0.08] transition">
                    Gerar outro
                  </button>
                  <button onClick={closeModal}
                    className="py-3 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 text-white font-black text-xs tracking-widest uppercase hover:brightness-110 transition">
                    Fechar
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center mb-5">
                  <div className="relative w-16 h-16 mx-auto mb-3">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/40 blur-2xl animate-pulse" />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border-2 border-emerald-500/50 flex items-center justify-center">
                      <CheckCircle2 size={28} className="text-emerald-400" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="font-black text-xl text-emerald-400 tracking-tight mb-1">{pix?.ok ? 'PIX GERADO' : 'LINK GERADO'}</div>
                  <div className="text-xs font-mono text-zinc-400">{fmtBRL(result?.amount || 0)} · Ref {result?.ref}</div>
                  <div className="inline-flex items-center gap-2 mt-2.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-mono">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                    </span>
                    Aguardando pagamento…
                  </div>
                  {pix?.ok && pix.via && (
                    <div className="text-xs font-mono text-zinc-500 mt-1">
                      Gerado {pix.via === 'server' ? 'pela máquina 24h' : 'pelo seu PC'}
                    </div>
                  )}
                </div>

                {pix?.ok && (
                  <div className="mb-5">
                    <div className="flex justify-center mb-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pix.qrBase64} alt="QR Code Pix" className="w-44 h-44 rounded-xl bg-white p-1.5" />
                    </div>
                    <div className="bg-white/[0.04] border border-emerald-500/20 rounded-2xl p-4 mb-3">
                      <div className="text-xs font-mono text-zinc-500 mb-2 tracking-widest">PIX COPIA E COLA</div>
                      <div className="text-[13px] font-mono text-emerald-300 break-all leading-relaxed">{pix.code}</div>
                    </div>
                    <button onClick={copyPix}
                      className={`w-full py-3.5 rounded-xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 border ${
                        pixCopied
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-gradient-to-br from-emerald-600 to-emerald-500 border-emerald-400/40 text-white hover:shadow-[0_0_30px_rgba(16,185,129,.45)]'
                      }`}>
                      <Copy size={13} /> {pixCopied ? 'Copiado!' : 'Copiar Pix'}
                    </button>
                  </div>
                )}

                {pix && !pix.ok && (
                  <div className={`mb-4 p-3.5 rounded-xl border flex gap-3 text-[13px] font-mono leading-relaxed ${
                    pix.reason === 'rejected'
                      ? 'bg-red-500/10 border-red-500/25 text-red-300'
                      : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                  }`}>
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">
                        {pix.reason === 'rejected' ? 'Mercado Pago recusou o Pix. '
                          : pix.reason === 'offline' ? 'PC indisponível. '
                          : 'Não deu para gerar o Pix sozinho. '}
                      </span>
                      {pix.message} Use o link abaixo normalmente.
                    </div>
                  </div>
                )}

                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 mb-4">
                  <div className="text-xs font-mono text-zinc-500 mb-2 tracking-widest">LINK DE PAGAMENTO</div>
                  <div className="text-[13px] font-mono text-red-300 break-all leading-relaxed">{result?.link}</div>
                </div>

                <div className="flex gap-3 mb-4">
                  <button onClick={copy}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 border ${
                      copied
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:bg-red-500/[0.08] hover:border-red-500/30'
                    }`}>
                    <Copy size={13} /> {copied ? 'Copiado!' : 'Copiar Link'}
                  </button>
                  <a href={result?.link} target="_blank" rel="noopener"
                    className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-zinc-300 transition flex items-center justify-center">
                    <ExternalLink size={14} />
                  </a>
                </div>

                <button onClick={reset}
                  className="w-full py-2.5 rounded-xl text-zinc-500 hover:text-zinc-400 text-xs font-mono tracking-widest uppercase transition mt-4">
                  ← Gerar outro
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </ModalBackdrop>
  )
}
