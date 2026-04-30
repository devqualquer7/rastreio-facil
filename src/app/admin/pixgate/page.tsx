'use client'

import { useState, useEffect } from 'react'
import { Copy, QrCode, RefreshCw, CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react'

interface Payment {
  id: string
  userId: string
  type: string
  amount: number
  status: string
  pushinpayId: string
  qrCode: string
  createdAt: string
  username?: string
}

interface User {
  id: string
  username: string
  email?: string
}

export default function PixGatePage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showQR, setShowQR] = useState<string | null>(null)
  const [qrData, setQrData] = useState<{ qrCode: string; qrCodeBase64: string; label: string; amount: number } | null>(null)
  const [copied, setCopied] = useState(false)

  // Form state
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('renewal')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerDocument, setCustomerDocument] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [paymentsRes, usersRes] = await Promise.all([
        fetch('/api/admin/pixgate'),
        fetch('/api/admin/users'),
      ])
      if (paymentsRes.ok) {
        const data = await paymentsRes.json()
        setPayments(data.payments || [])
      }
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users || data || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }
    setLoading(false)
  }

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return alert('Selecione um usuario')
    setCreating(true)
    try {
      const res = await fetch('/api/admin/pixgate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          planType: selectedPlan,
          customerName,
          customerEmail,
          customerPhone,
          customerDocument,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setQrData({
          qrCode: data.qrCode,
          qrCodeBase64: data.qrCodeBase64,
          label: data.label,
          amount: data.amount,
        })
        setShowQR(data.paymentId)
        loadData()
      } else {
        alert(data.error || 'Erro ao criar pagamento')
      }
    } catch (err) {
      alert('Erro ao criar pagamento')
    }
    setCreating(false)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />
      case 'expired': case 'failed': return <XCircle className="w-4 h-4 text-red-400" />
      default: return <Clock className="w-4 h-4 text-zinc-400" />
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'paid': return 'Pago'
      case 'pending': return 'Pendente'
      case 'expired': return 'Expirado'
      case 'failed': return 'Falhou'
      default: return status
    }
  }

  const plans = [
    { value: 'renewal', label: 'Renovacao 30 dias - R$ 99,90' },
    { value: 'extra_200', label: '200 Rastreios Extras - R$ 59,90' },
    { value: 'bundle', label: 'Renovacao + 400 Extras - R$ 149,90' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">PixGate</h1>
          <p className="text-zinc-400 text-sm">Gerar cobrancas PIX via PixGate</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Create Payment Form */}
      <div className="bg-[#1a1a2e] border border-white/[0.06] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-violet-400" />
          Nova Cobranca PIX
        </h2>
        <form onSubmit={handleCreatePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Usuario *</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Selecione...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username}{u.email ? ` (${u.email})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Plano *</label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              {plans.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Nome do cliente</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Opcional"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Opcional"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Telefone</label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="11999999999"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">CPF</label>
            <input
              type="text"
              value={customerDocument}
              onChange={(e) => setCustomerDocument(e.target.value)}
              placeholder="00000000000"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={creating || !selectedUser}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {creating ? 'Gerando...' : 'Gerar PIX'}
            </button>
          </div>
        </form>
      </div>

      {/* QR Code Modal */}
      {showQR && qrData && (
        <div className="bg-[#1a1a2e] border border-violet-500/30 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-violet-400" />
            PIX Gerado - {qrData.label}
          </h3>
          <p className="text-zinc-400 text-sm mb-4">Valor: R$ {(qrData.amount / 100).toFixed(2)}</p>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {qrData.qrCodeBase64 && (
              <img src={qrData.qrCodeBase64} alt="QR Code PIX" className="w-48 h-48 rounded-lg bg-white p-2" />
            )}
            <div className="flex-1">
              <label className="block text-sm text-zinc-400 mb-1">Copia e Cola:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={qrData.qrCode}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-mono"
                />
                <button
                  onClick={() => copyToClipboard(qrData.qrCode)}
                  className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setShowQR(null); setQrData(null) }}
            className="mt-4 text-sm text-zinc-500 hover:text-zinc-300"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-[#1a1a2e] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white">Pagamentos Recentes</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center text-zinc-500">Carregando...</div>
        ) : payments.length === 0 ? (
          <div className="p-6 text-center text-zinc-500">Nenhum pagamento encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-white/[0.06]">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Plano</th>
                  <th className="px-6 py-3">Valor</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 50).map((p) => (
                  <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-6 py-3 text-sm text-zinc-300 font-mono">{String(p.id).substring(0, 8)}</td>
                    <td className="px-6 py-3 text-sm text-zinc-300">{p.username || p.userId}</td>
                    <td className="px-6 py-3 text-sm text-zinc-400">{p.type}</td>
                    <td className="px-6 py-3 text-sm text-white font-medium">R$ {(p.amount / 100).toFixed(2)}</td>
                    <td className="px-6 py-3">
                      <span className="flex items-center gap-1.5 text-sm">
                        {getStatusIcon(p.status)}
                        {getStatusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-500">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
