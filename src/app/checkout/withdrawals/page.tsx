'use client'
import { useEffect, useState } from 'react'

const GATEWAYS = ['pushinpay', 'paradise', 'pixgate', 'blackcat'] as const
const GATEWAY_LABELS: Record<string, string> = {
  pushinpay: 'PushinPay', paradise: 'Paradise Pags', pixgate: 'PixGate', blackcat: 'BlackCat',
}
const PIX_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave Aleatória' },
]

interface Withdrawal {
  id: string
  gateway: string
  amount: number
  pix_key: string
  pix_key_type: string
  status: string
  external_id: string | null
  created_at: string
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [gateway, setGateway] = useState('pushinpay')
  const [amount, setAmount] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [pixKeyType, setPixKeyType] = useState('cpf')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    const res = await fetch('/api/checkout/withdrawals')
    const data = await res.json()
    setWithdrawals(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/checkout/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateway, amount: parseFloat(amount), pix_key: pixKey, pix_key_type: pixKeyType }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Erro ao processar saque'); return }
      setSuccess('Saque solicitado com sucesso!')
      setAmount(''); setPixKey('')
      await load()
    } catch { setError('Erro de conexão') }
    finally { setSubmitting(false) }
  }

  const fmt = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  const statusColor = (s: string) => {
    if (s === 'completed') return 'bg-emerald-500/10 text-emerald-400'
    if (s === 'failed') return 'bg-red-500/10 text-red-400'
    return 'bg-zinc-500/10 text-zinc-400'
  }

  const statusLabel = (s: string) =>
    s === 'completed' ? 'CONCLUÍDO' : s === 'failed' ? 'FALHOU' : 'PENDENTE'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Saques</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Solicite saques para sua chave PIX</p>
      </div>

      <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-4 max-w-2xl">
        <h2 className="text-sm font-medium text-white mb-4">Novo Saque</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                placeholder="50.00"
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tipo de Chave PIX</label>
              <select
                value={pixKeyType}
                onChange={e => setPixKeyType(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
              >
                {PIX_TYPES.map(t => (
                  <option key={t.value} value={t.value} className="bg-[#141414]">{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Chave PIX</label>
              <input
                type="text"
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
                required
                placeholder="sua@chave.pix"
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{success}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="bg-white text-black text-sm font-medium rounded-lg px-6 py-2.5 hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Solicitando...' : 'Solicitar Saque'}
          </button>
        </form>
      </div>

      <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">Histórico de Saques</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : withdrawals.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-8">Nenhum saque ainda</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {withdrawals.map(w => (
              <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColor(w.status)}`}>
                  {statusLabel(w.status)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 font-mono truncate">{w.pix_key}</p>
                  <p className="text-xs text-zinc-600">{PIX_TYPES.find(t => t.value === w.pix_key_type)?.label ?? w.pix_key_type}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-white font-medium">{fmt(w.amount)}</p>
                  <p className="text-xs text-zinc-600">{GATEWAY_LABELS[w.gateway] ?? w.gateway}</p>
                </div>
                <p className="text-xs text-zinc-600 shrink-0 hidden sm:block">{fmtDate(w.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
