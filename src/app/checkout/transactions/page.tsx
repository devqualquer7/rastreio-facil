'use client'
import { useEffect, useState } from 'react'

const GATEWAYS = ['pushinpay', 'paradise', 'pixgate', 'blackcat'] as const
const GATEWAY_LABELS: Record<string, string> = {
  pushinpay: 'PushinPay',
  paradise: 'Paradise Pags',
  pixgate: 'PixGate',
  blackcat: 'BlackCat',
}

interface Tx {
  id: string
  gateway: string
  external_id: string | null
  amount: number
  description: string | null
  pix_code: string | null
  pix_base64: string | null
  status: string
  paid_at: string | null
  created_at: string
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  const [gateway, setGateway] = useState<string>('pushinpay')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [activePix, setActivePix] = useState<{ id: string; pixCode: string; pixBase64: string | null; amount: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [polling, setPolling] = useState(false)

  async function load() {
    const res = await fetch('/api/checkout/transactions')
    const data = await res.json()
    setTxs(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!activePix) return
    const interval = setInterval(async () => {
      setPolling(true)
      try {
        const res = await fetch(`/api/checkout/pix/${activePix.id}`)
        const d = await res.json()
        if (d.status === 'paid') {
          setActivePix(null)
          await load()
        }
      } finally {
        setPolling(false)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [activePix])

  async function generatePix(e: React.FormEvent) {
    e.preventDefault()
    setGenError('')
    setGenerating(true)
    try {
      const res = await fetch('/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateway, amount: parseFloat(amount), description }),
      })
      const d = await res.json()
      if (!res.ok) { setGenError(d.error ?? 'Erro ao gerar PIX'); return }
      setActivePix({ id: d.id, pixCode: d.pixCode, pixBase64: d.pixBase64, amount: d.amount })
      await load()
    } catch { setGenError('Erro de conexão') }
    finally { setGenerating(false) }
  }

  function copyPix() {
    if (!activePix) return
    navigator.clipboard.writeText(activePix.pixCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const fmt = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Transações</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Gere PIX e acompanhe pagamentos</p>
      </div>

      <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-4">
        <h2 className="text-sm font-medium text-white mb-4">Gerar PIX</h2>
        <form onSubmit={generatePix} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Gateway</label>
              <select
                value={gateway}
                onChange={e => setGateway(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
              >
                {GATEWAYS.map(g => (
                  <option key={g} value={g} className="bg-[#141414]">{GATEWAY_LABELS[g]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                placeholder="10.00"
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Descrição (opcional)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Pagamento..."
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          {genError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{genError}</p>
          )}

          <button
            type="submit"
            disabled={generating}
            className="bg-white text-black text-sm font-medium rounded-lg px-6 py-2.5 hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            {generating ? 'Gerando...' : 'Gerar PIX'}
          </button>
        </form>
      </div>

      {activePix && (
        <div className="bg-[#141414] border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-white">PIX Gerado — {fmt(activePix.amount)}</h2>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                {polling ? <span className="inline-block w-2 h-2 rounded-full bg-zinc-500 animate-pulse" /> : null}
                Aguardando pagamento...
              </p>
            </div>
            <button
              onClick={() => setActivePix(null)}
              className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              Fechar
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {activePix.pixBase64 && (
              <img
                src={`data:image/png;base64,${activePix.pixBase64}`}
                alt="QR Code PIX"
                className="w-36 h-36 rounded-lg border border-white/[0.08]"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-400 mb-1.5">Código copia e cola</p>
              <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-lg p-3 font-mono text-xs text-zinc-300 break-all select-all mb-2">
                {activePix.pixCode}
              </div>
              <button
                onClick={copyPix}
                className="text-xs bg-white/[0.06] hover:bg-white/[0.10] text-zinc-300 hover:text-white px-4 py-2 rounded-lg transition-colors"
              >
                {copied ? '✓ Copiado!' : 'Copiar código'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">Histórico</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : txs.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">Nenhuma transação ainda</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {txs.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`
                  text-xs font-semibold px-2 py-0.5 rounded-full shrink-0
                  ${tx.status === 'paid'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-zinc-500/10 text-zinc-400'}
                `}>
                  {tx.status === 'paid' ? 'PAGO' : 'PENDENTE'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 font-mono truncate">{tx.external_id ?? tx.id}</p>
                  {tx.description && <p className="text-xs text-zinc-500 truncate">{tx.description}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-white font-medium">{fmt(tx.amount)}</p>
                  <p className="text-xs text-zinc-500">{GATEWAY_LABELS[tx.gateway] ?? tx.gateway}</p>
                </div>
                <p className="text-xs text-zinc-500 shrink-0 hidden sm:block">{fmtDate(tx.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
