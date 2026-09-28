'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Zap, X, Copy, ExternalLink, CheckCircle2, RefreshCw,
  DollarSign, FileText, CreditCard, Landmark, Building2, Wallet,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { ModalBackdrop, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { fmtBRL } from '@/lib/ec-utils'

type Step = 'form' | 'result'

const ALL_METHOD_IDS = ['credit_card', 'debit_card', 'pix', 'boleto', 'loterica', 'prepaid_card']

const PAYMENT_OPTIONS = [
  {
    id: 'credit_card',
    label: 'Cartão de Crédito',
    desc: 'Visa, Master, Elo, Amex…',
    icon: CreditCard,
    color: 'text-violet-400',
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
    color: 'text-cyan-400',
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
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<{ link?: string; ref?: string; amount?: number } | null>(null)
  const [copied, setCopied] = useState(false)
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

  async function generate() {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!amt || amt <= 0) { toast('error', 'Valor inválido'); return }
    if (!title.trim()) { toast('error', 'Título obrigatório'); return }
    if (selectedMethods.length === 0) { toast('error', 'Selecione ao menos um método de pagamento'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/ec/sales/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          title: title.trim(),
          email: email.trim() || undefined,
          selectedMethods,
        })
      })
      const d = await r.json()
      if (d.ok) {
        setResult({ link: d.link, ref: d.ref, amount: amt })
        setStep('result')
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

  function reset() {
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
        className="relative bg-gradient-to-b from-[#0d0d18]/98 to-[#09090f]/98 backdrop-blur-2xl border border-purple-500/20 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(168,85,247,.2)]">

        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
        {/* BG orbs */}
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 pt-6 pb-5 border-b border-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-700 to-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,.4)]">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <div className="font-black text-sm text-zinc-100 tracking-wide uppercase">Gerar Link</div>
              <div className="text-[10px] font-mono text-zinc-600 mt-0.5">
                {activeCred ? `Slot #${activeCred.slot} · ${activeCred.name}` : 'Sem conta ativa'}
              </div>
            </div>
          </div>
          <button onClick={closeModal} className="w-8 h-8 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] flex items-center justify-center transition">
            <X size={16} />
          </button>
        </div>

        <div className="relative p-6 max-h-[80vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!activeCred?.connected && (
                  <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11px] font-mono">
                    ⚠ Nenhuma conta ativa conectada. Ative um slot em Credenciais.
                  </div>
                )}

                <div className="space-y-4">
                  {/* Valor */}
                  <div>
                    <div className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                      <DollarSign size={11} /> Valor (R$)
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm">R$</span>
                      <input
                        type="text" inputMode="decimal" value={amount}
                        onChange={e => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
                        placeholder="0,00"
                        onKeyDown={e => e.key === 'Enter' && generate()}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 focus:bg-purple-500/[0.04] transition-all"
                      />
                    </div>
                  </div>

                  {/* Título */}
                  <div>
                    <div className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                      <FileText size={11} /> Título
                    </div>
                    <input
                      type="text" value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Ex: Produto / Serviço"
                      maxLength={100}
                      onKeyDown={e => e.key === 'Enter' && generate()}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 focus:bg-purple-500/[0.04] transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <div className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2">
                      Email do comprador (opcional)
                    </div>
                    <input
                      type="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="comprador@email.com"
                      onKeyDown={e => e.key === 'Enter' && generate()}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 focus:bg-purple-500/[0.04] transition-all"
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
                        <CreditCard size={11} className="text-purple-400" />
                        <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase">
                          Métodos de Pagamento
                        </span>
                        {!allSelected && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 tracking-wider">
                            {selectedMethods.length}/{ALL_METHOD_IDS.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); toggleAll() }}
                          className="text-[9px] font-mono font-bold tracking-widest text-purple-400/70 hover:text-purple-300 transition uppercase px-2 py-1 rounded-lg hover:bg-purple-500/10">
                          {allSelected ? 'DESMARCAR' : 'MARCAR'} TODOS
                        </button>
                        {methodsOpen ? (
                          <ChevronUp size={13} className="text-zinc-600" />
                        ) : (
                          <ChevronDown size={13} className="text-zinc-600" />
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
                                    <div className="text-[11px] font-mono text-zinc-300 leading-none mb-0.5">{opt.label}</div>
                                    <div className="text-[9px] font-mono text-zinc-600">{opt.desc}</div>
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
                      <div className="px-4 pb-3 text-[10px] font-mono text-red-400/80">
                        ⚠ Selecione ao menos um método
                      </div>
                    )}
                  </div>

                  <button onClick={generate} disabled={loading || !activeCred?.connected || noneSelected}
                    className="relative w-full py-3.5 rounded-2xl bg-gradient-to-br from-violet-700 via-purple-500 to-cyan-300 text-white font-black tracking-wide text-sm uppercase shadow-[0_0_25px_rgba(168,85,247,.45)] hover:shadow-[0_0_40px_rgba(168,85,247,.6)] active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                    {loading ? (
                      <><RefreshCw size={14} className="animate-spin" /> Gerando…</>
                    ) : (
                      <><Sparkles size={14} /> Gerar Link de Pagamento <Zap size={14} fill="white" /></>
                    )}
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
                  <div className="font-black text-xl text-emerald-400 tracking-tight mb-1">LINK GERADO</div>
                  <div className="text-xs font-mono text-zinc-500">{fmtBRL(result?.amount || 0)} · Ref {result?.ref}</div>
                </div>

                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 mb-4">
                  <div className="text-[10px] font-mono text-zinc-600 mb-2 tracking-widest">LINK DE PAGAMENTO</div>
                  <div className="text-[11px] font-mono text-purple-300 break-all leading-relaxed">{result?.link}</div>
                </div>

                <div className="flex gap-3 mb-4">
                  <button onClick={copy}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 border ${
                      copied
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:bg-purple-500/[0.08] hover:border-purple-500/30'
                    }`}>
                    <Copy size={13} /> {copied ? 'Copiado!' : 'Copiar Link'}
                  </button>
                  <a href={result?.link} target="_blank" rel="noopener"
                    className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 hover:text-zinc-300 transition flex items-center justify-center">
                    <ExternalLink size={14} />
                  </a>
                </div>

                <button onClick={reset}
                  className="w-full py-2.5 rounded-xl text-zinc-600 hover:text-zinc-400 text-[10px] font-mono tracking-widest uppercase transition mt-4">
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
