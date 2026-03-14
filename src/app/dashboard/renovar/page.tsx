'use client'
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Package, Zap, Copy, CheckCircle2, Clock, QrCode } from 'lucide-react'

const PLANS = [
  {
    id: 'renewal',
    icon: RefreshCw,
    title: 'Renovação 30 dias',
    desc: '200 rastreios inclusos + 30 dias de acesso',
    price: 'R$ 99,90',
    highlight: true,
    color: '#4f46e5',
  },
  {
    id: 'extra_200',
    icon: Package,
    title: '200 Rastreios Extras',
    desc: 'Adiciona 200 rastreios ao seu plano atual',
    price: 'R$ 59,90',
    highlight: false,
    color: '#7c3aed',
  },
  {
    id: 'bundle',
    icon: Zap,
    title: 'Combo Completo',
    desc: 'Renovação 30 dias + 200 rastreios extras',
    price: 'R$ 149,90',
    highlight: false,
    color: '#6d28d9',
  },
]

interface PaymentState {
  paymentId: string
  qrCode: string
  qrCodeBase64: string
  amount: number
  label: string
  status: 'pending' | 'paid' | 'failed'
}

export default function RenovarPage() {
  const [payment, setPayment] = useState<PaymentState | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const startPayment = async (planId: string) => {
    setLoading(planId); setError(''); setPayment(null)
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: planId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao gerar PIX'); setLoading(null); return }
      setPayment({ ...data, status: 'pending' })
    } catch { setError('Erro de conexão. Tente novamente.') }
    finally { setLoading(null) }
  }

  const checkStatus = useCallback(async () => {
    if (!payment || payment.status !== 'pending') return
    const res = await fetch(`/api/payments/status/${payment.paymentId}`)
    const data = await res.json()
    if (data.status === 'paid') {
      setPayment(p => p ? { ...p, status: 'paid' } : p)
    } else if (data.status === 'failed') {
      setPayment(p => p ? { ...p, status: 'failed' } : p)
    }
  }, [payment])

  // Polling a cada 5s enquanto aguarda pagamento
  useEffect(() => {
    if (!payment || payment.status !== 'pending') return
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [payment, checkStatus])

  const copyQrCode = () => {
    if (!payment) return
    navigator.clipboard.writeText(payment.qrCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Renovar / Planos</h1>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>Pagamento via PIX — confirmação instantânea</p>
      </div>

      {/* Sucesso */}
      {payment?.status === 'paid' && (
        <div className="mb-6 flex items-center gap-4 p-5 rounded-2xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <CheckCircle2 className="w-8 h-8 flex-shrink-0" style={{ color: '#34d399' }} />
          <div>
            <p className="font-bold text-white">Pagamento confirmado!</p>
            <p className="text-sm" style={{ color: '#64748b' }}>Seu plano foi atualizado. Acesse seu painel para ver as mudanças.</p>
          </div>
          <a href="/dashboard" className="ml-auto px-4 py-2 rounded-xl text-white text-sm font-semibold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>Ver painel</a>
        </div>
      )}

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Planos */}
      {!payment || payment.status !== 'pending' ? (
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {PLANS.map(plan => (
            <div key={plan.id} className="flex flex-col rounded-2xl p-6 transition-all"
              style={{
                background: plan.highlight ? `rgba(${plan.color === '#4f46e5' ? '79,70,229' : '124,58,237'},0.12)` : '#0d0d18',
                border: `1px solid ${plan.highlight ? `rgba(${plan.color === '#4f46e5' ? '99,102,241' : '139,92,246'},0.4)` : 'rgba(99,102,241,0.15)'}`,
                boxShadow: plan.highlight ? `0 0 40px rgba(79,70,229,0.15)` : 'none',
              }}>
              {plan.highlight && (
                <span className="self-start mb-3 px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                  Mais popular
                </span>
              )}
              <plan.icon className="w-6 h-6 mb-3" style={{ color: plan.highlight ? '#818cf8' : '#64748b' }} />
              <h3 className="font-bold text-white mb-1">{plan.title}</h3>
              <p className="text-xs mb-4 flex-1" style={{ color: '#64748b' }}>{plan.desc}</p>
              <div className="text-2xl font-black text-white mb-4">{plan.price}</div>
              <button onClick={() => startPayment(plan.id)} disabled={!!loading}
                className="w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: `linear-gradient(135deg,${plan.color},${plan.color}dd)`, boxShadow: `0 0 20px ${plan.color}40` }}>
                {loading === plan.id ? 'Gerando PIX...' : 'Pagar com PIX'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* QR Code PIX */
        <div className="rounded-2xl p-6 text-center" style={{ background: '#0d0d18', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="w-4 h-4 animate-pulse" style={{ color: '#818cf8' }} />
            <p className="text-sm font-semibold" style={{ color: '#818cf8' }}>Aguardando pagamento</p>
          </div>
          <p className="text-xs mb-5" style={{ color: '#64748b' }}>
            {payment.label} — <strong className="text-white">{formatPrice(payment.amount)}</strong>
          </p>

          {/* QR Code image */}
          {payment.qrCodeBase64 && (
            <div className="inline-block p-3 rounded-2xl mb-4" style={{ background: '#fff' }}>
              <img src={payment.qrCodeBase64} alt="QR Code PIX" className="w-48 h-48" />
            </div>
          )}

          {/* Código copia-cola */}
          <p className="text-xs mb-2 font-semibold uppercase tracking-wide" style={{ color: '#64748b' }}>Ou use o código PIX copia e cola:</p>
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-left overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <QrCode className="w-4 h-4 flex-shrink-0" style={{ color: '#6366f1' }} />
            <p className="text-xs font-mono flex-1 truncate" style={{ color: '#94a3b8' }}>{payment.qrCode}</p>
            <button onClick={copyQrCode} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', color: copied ? '#34d399' : '#a5b4fc' }}>
              {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
            </button>
          </div>

          <p className="text-xs" style={{ color: '#475569' }}>
            Após o pagamento, a confirmação é automática. Não feche esta janela.
          </p>

          <button onClick={() => setPayment(null)} className="mt-4 text-xs underline" style={{ color: '#64748b' }}>
            Cancelar e escolher outro plano
          </button>
        </div>
      )}
    </div>
  )
}
